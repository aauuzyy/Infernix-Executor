/**
 * Infernix Main Process Wrapper
 * 
 * This wrapper loads the original obfuscated main.obf.cjs and adds
 * additional features like Discord Rich Presence without modifying
 * the original Xeno backend.
 */

const { app, ipcMain } = require('electron');
const pkg = require('../package.json');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');

// Override the app name so Discord's native game detection shows
// "INFERNIX" instead of "infernix-executor"
app.setName('INFERNIX');
app.setVersion(pkg.version);
// Critical for Discord and Windows taskbar to show correct name
if (process.platform === 'win32') {
  app.setAppUserModelId('INFERNIX');
}

// Detect GPU-process crashes that can also blank the window
app.on('gpu-process-crashed', (event, killed, exitCode) => {
  console.error(`[Infernix] GPU process crashed (killed=${killed}, exitCode=${exitCode})`);
});

// Load Discord RPC module (will init on app.whenReady)
const { setRPCState } = require('./discord-rpc.cjs');

// Make setRPCState available globally so main.obf.cjs can use it
global.setRPCState = setRPCState;

// Fix: main.obf.cjs uses APP_VERSION as an unassigned global for the fetch webhook.
// Set it here before loading so the correct version is sent.
global.APP_VERSION = pkg.version;
console.log('[Infernix] Set global APP_VERSION to', pkg.version);

// Patch global.fetch BEFORE loading main.obf.cjs so outgoing webhook calls
// that use fetch() with the hardcoded "version":"1.3.1" get rewritten.
const _origFetch = global.fetch.bind(global);
global.fetch = async function(url, options) {
  if (options && typeof options.body === 'string' && options.body.includes('1.3.1')) {
    options = {
      ...options,
      body: options.body.replace(/"version"\s*:\s*"1\.3\.1"/g, `"version":"${pkg.version}"`)
    };
  }
  return _origFetch(url, options);
};

// Patch JSON.stringify BEFORE loading main.obf.cjs so any serialized payload
// containing the hardcoded version "1.3.1" (in any field) gets the real version.
// This also ensures Content-Length is computed correctly since the patched string
// is returned directly from JSON.stringify before Buffer.byteLength is called.
const _origStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  const result = _origStringify(value, replacer, space);
  if (typeof result === 'string' && result.includes('1.3.1')) {
    return result.replace(/1\.3\.1/g, pkg.version);
  }
  return result;
};

// Dev mode: allow multiple instances for collab testing.
// --multi-instance: set a separate userData path so Electron's single-instance
// lock uses a completely different socket — the two instances never interact.
if (process.argv.includes('--multi-instance')) {
  app.setPath('userData', path.join(__dirname, '..', 'dev-instance-2-data'));
  app.requestSingleInstanceLock = () => true; // belt-and-suspenders patch
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR SUPPRESSION for main.obf.cjs timer spam
// main.obf.cjs throws "Render frame was disposed" repeatedly when the renderer
// reloads (e.g. dev HMR, loading→app transition). We wrap timers, intercept
// console.error, and patch WebContents.send to silence this harmless noise.
// ═══════════════════════════════════════════════════════════════════════════

const _isObfNoise = (err) => {
  const text = err instanceof Error ? (err.stack || err.message || '') : String(err || '');
  return text.includes('main.obf.cjs') || text.includes('Render frame was disposed') || text.includes('webFrameMain');
};

// 1. Wrap setInterval / setTimeout callbacks created by main.obf.cjs
const _origSetInterval = global.setInterval;
global.setInterval = function(callback, delay, ...args) {
  const wrapped = (...innerArgs) => {
    try {
      callback(...innerArgs);
    } catch (err) {
      if (_isObfNoise(err)) return;
      throw err;
    }
  };
  return _origSetInterval(wrapped, delay, ...args);
};
const _origSetTimeout = global.setTimeout;
global.setTimeout = function(callback, delay, ...args) {
  const wrapped = (...innerArgs) => {
    try {
      callback(...innerArgs);
    } catch (err) {
      if (_isObfNoise(err)) return;
      throw err;
    }
  };
  return _origSetTimeout(wrapped, delay, ...args);
};

// 2. Patch WebContents.send so it never throws on a destroyed frame
const { WebContents } = require('electron');
if (WebContents && WebContents.prototype && WebContents.prototype.send) {
  const _origWcSend = WebContents.prototype.send;
  WebContents.prototype.send = function(channel, ...args) {
    if (this.isDestroyed()) return;
    try {
      return _origWcSend.call(this, channel, ...args);
    } catch (err) {
      if (_isObfNoise(err)) return;
      throw err;
    }
  };
}

// 4. Safety nets for anything that still leaks through
process.on('uncaughtException', (err) => {
  if (_isObfNoise(err)) return;
  console.error('[Infernix] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  if (_isObfNoise(reason)) return;
  console.error('[Infernix] Unhandled Rejection:', reason);
});

// Load the original obfuscated Xeno backend
require('./main.obf.cjs');

// Block main.obf.cjs from opening Chrome DevTools — we use PowerShell instead.
// Patching at the webContents instance level as soon as any are created.
app.on('web-contents-created', (event, wc) => {
  wc.openDevTools = function(...args) {
    // Silently ignore DevTools open requests; PowerShell debug console handles logs
    return;
  };

  // Renderer crash diagnostics + auto-reload so users never get stuck on a blank screen
  wc.on('render-process-gone', (event, details) => {
    console.error(`[Infernix] Renderer process gone: ${details.reason} (exitCode=${details.exitCode})`);
    if (details.reason === 'crashed' || details.reason === 'killed' || details.reason === 'oom') {
      try {
        if (!wc.isDestroyed()) wc.reload();
      } catch (_) {}
    }
  });
  wc.on('unresponsive', () => {
    console.error('[Infernix] Renderer unresponsive');
  });
});

// ─── OVERRIDES & ADDITIONS ──────────────────────────────────────────────────
// These handlers either override hardcoded values in main.obf.cjs or add
// missing handlers that main.obf.cjs does not include.

// Fix: main.obf.cjs has CURRENT_VERSION='1.3.1' hardcoded — override with real version
ipcMain.removeHandler('get-current-version');
ipcMain.handle('get-current-version', async () => pkg.version);

// Check latest version from the website's hidden meta tag
ipcMain.removeHandler('check-web-version');
ipcMain.handle('check-web-version', async () => {
  return new Promise((resolve) => {
    const req = https.get('https://infernix.vercel.app/', { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const match = data.match(/<meta[^>]+name=["']infernix-version["'][^>]+content=["']([^"']+)["']/i)
                   || data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']infernix-version["']/i);
        if (match && match[1]) {
          resolve({ ok: true, version: match[1].trim() });
        } else {
          resolve({ ok: false, error: 'Version meta tag not found' });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Request timed out' }); });
  });
});

// Fix: main.obf.cjs does not register 'open-external' — add it here
const { shell } = require('electron');
ipcMain.removeHandler('open-external');
ipcMain.handle('open-external', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
  }
  return { ok: true };
});

// Allow renderer to drive Discord RPC state (attached/idle/executing)
ipcMain.handle('set-rpc-state', async (event, state) => {
  setRPCState(state);
  return { ok: true };
});

// Fix: main.obf.cjs does not have 'record-execution' handler.
// Writes directly to the same execution-history.json that get-execution-history reads.
ipcMain.handle('record-execution', async (event, { scriptName, script }) => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const dir = path.join(localAppData, 'Infernix');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const historyPath = path.join(dir, 'execution-history.json');

    let history = [];
    if (fs.existsSync(historyPath)) {
      try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}
    }

    const entry = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      scriptName: scriptName || 'Untitled Script',
      script: (script || '').substring(0, 2000),
      success: true,
      timestamp: Date.now(),
      client: null
    };

    history.push(entry);
    if (history.length > 100) history = history.slice(-100);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Fix: main.obf.cjs does not expose get-execution-history, clear-execution-history,
// or delete-history-items. Add them here so the UI can read/manage script history.
const HISTORY_PATH = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Infernix', 'execution-history.json');
};
const readHistory = () => {
  try {
    const p = HISTORY_PATH();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return []; }
};
const writeHistory = (history) => {
  const p = HISTORY_PATH();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(history, null, 2));
};
const recordHistoryEntry = (scriptName, script) => {
  try {
    const history = readHistory();
    history.push({
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      scriptName: scriptName || 'Untitled Script',
      script: (script || '').substring(0, 2000),
      success: true,
      timestamp: Date.now(),
      client: null
    });
    if (history.length > 100) history = history.slice(-100);
    writeHistory(history);
  } catch (e) {
    console.error('[Infernix] Failed to record execution history:', e.message);
  }
};

ipcMain.removeHandler('get-execution-history');
ipcMain.handle('get-execution-history', async () => {
  const history = readHistory();
  return history;
});

ipcMain.removeHandler('clear-execution-history');
ipcMain.handle('clear-execution-history', async () => {
  try { writeHistory([]); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.removeHandler('delete-history-items');
ipcMain.handle('delete-history-items', async (event, ids) => {
  try {
    const history = readHistory().filter(item => !ids.includes(item.id));
    writeHistory(history);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ═══════════════════════════════════════════════════════════════════════════
// KEY VALIDATION — dual-table lookup (keys + premium_keys)
// ═══════════════════════════════════════════════════════════════════════════

function fetchSupabaseJson(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(urlStr);
    const req = https.request(
      { hostname, path: pathname + (search || ''), method: 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, json: null, raw: data }); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

try { ipcMain.removeHandler('validate-key'); } catch {}
ipcMain.handle('validate-key', async (event, { key, supabaseUrl, supabaseAnonKey }) => {
  const now = new Date().toISOString();
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Accept': 'application/json',
  };

  // Query both tables in parallel
  const [normalRes, premiumRes] = await Promise.all([
    fetchSupabaseJson(
      `${supabaseUrl}/rest/v1/keys?key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(now)}&select=key,expires_at&limit=1`,
      headers
    ),
    fetchSupabaseJson(
      `${supabaseUrl}/rest/v1/premium_keys?key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(now)}&select=key,expires_at&limit=1`,
      headers
    ),
  ]);

  const premiumRows = Array.isArray(premiumRes.json) ? premiumRes.json : [];
  if (premiumRows.length > 0) {
    return { ok: true, found: true, key, type: 'premium', expires_at: premiumRows[0].expires_at };
  }

  const normalRows = Array.isArray(normalRes.json) ? normalRes.json : [];
  if (normalRows.length > 0) {
    return { ok: true, found: true, key, type: 'normal', expires_at: normalRows[0].expires_at };
  }

  return { ok: true, found: false, key, type: null, expires_at: null };
});

// ═══════════════════════════════════════════════════════════════════════════
// AI GENERATION — Gemini 2.5 Flash + Kimi K2.6
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = 'AIzaSyAPie1yJnK1E0PQJ_2B1UQEjppMk2Uplws';
const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const KIMI_API_KEY  = 'sk-kimi-Ooj7Zmy3x7ZVjQLrfsHyW158bOD01FvttAfYeLh7ygLC0Imate90IJiVgOylRegS';
const KIMI_API_URL  = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_MODEL    = 'kimi-k2-6';

const GROQ_API_KEY  = process.env.GROQ_API_KEY || '';
// NOTE: Set GROQ_API_KEY env var before running;
const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';

function toGeminiBody(messages) {
  let systemInstruction = null;
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === 'user') {
      const parts = [{ text: msg.content || '' }];
      if (Array.isArray(msg.images)) {
        for (const img of msg.images) {
          parts.push({ inlineData: { mimeType: img.mimeType || 'image/png', data: img.data } });
        }
      }
      contents.push({ role: 'user', parts });
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content || '' }] });
    }
  }
  const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  return body;
}

function toOpenAIFromGemini(geminiRes) {
  const candidate = geminiRes.candidates?.[0];
  if (!candidate) {
    return { choices: [{ message: { content: 'Sorry, I could not generate a response.' } }] };
  }
  const parts = candidate.content?.parts || [];
  let text = '';
  const images = [];
  for (const part of parts) {
    if (part.text) {
      text += part.text;
    } else if (part.inlineData) {
      images.push({ mimeType: part.inlineData.mimeType || 'image/png', data: part.inlineData.data });
    }
  }
  const msg = { content: text };
  if (images.length > 0) msg.images = images;
  return { choices: [{ message: msg }] };
}

function toOpenAIFromKimi(kimiRes) {
  const choice = kimiRes.choices?.[0];
  if (!choice) {
    return { choices: [{ message: { content: 'Sorry, I could not generate a response.' } }] };
  }
  const msg = choice.message || {};
  return {
    choices: [{
      message: {
        content: msg.content || '',
        reasoning_content: msg.reasoning_content || '',
      }
    }]
  };
}

function geminiGenerate(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(toGeminiBody(messages));
    const url = new URL(GEMINI_API_URL);
    url.searchParams.set('key', GEMINI_API_KEY);

    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      rejectUnauthorized: true,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            const code = res.statusCode || 0;
            const msg = json.error.message || 'API Error';
            console.error(`[Infernix AI] Gemini error ${code}: ${msg}`);
            if (code === 429 || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
              reject(new Error(`429: ${msg}`));
            } else if (code === 503) {
              reject(new Error('503: Gemini is temporarily unavailable. Please try again in a moment.'));
            } else if (code === 500) {
              reject(new Error('500: Gemini server error. Please try again.'));
            } else {
              reject(new Error(msg));
            }
          } else {
            resolve(toOpenAIFromGemini(json));
          }
        } catch (e) {
          console.error('[Infernix AI] Gemini parse error:', data.slice(0, 500));
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Request failed: ${e.message}`)));
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(postData);
    req.end();
  });
}

function kimiGenerate(messages, model = KIMI_MODEL) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content || '(image attached)' })),
      temperature: 0.7,
    });

    const req = https.request({
      hostname: 'api.moonshot.cn', port: 443, path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      rejectUnauthorized: true,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            const code = res.statusCode || 0;
            const msg = json.error.message || 'API Error';
            console.error(`[Infernix AI] Kimi error ${code}: ${msg}`);
            if (code === 401 || code === 403) {
              reject(new Error('401: Premium AI key invalid. Contact support.'));
            } else if (code === 429) {
              reject(new Error('429: Premium AI rate limited. Try again shortly.'));
            } else {
              reject(new Error(msg));
            }
          } else {
            resolve(toOpenAIFromKimi(json));
          }
        } catch (e) {
          console.error('[Infernix AI] Kimi parse error:', data.slice(0, 500));
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Request failed: ${e.message}`)));
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

function groqGenerate(messages, model = GROQ_MODEL) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: messages.map(m => {
        const out = { role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content || '' };
        return out;
      }),
      temperature: 0.7,
      max_tokens: 2000,
    });

    const req = https.request({
      hostname: 'api.groq.com', port: 443, path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      rejectUnauthorized: true,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            const code = res.statusCode || 0;
            const msg = json.error.message || 'API Error';
            console.error(`[Infernix AI] Groq error ${code}: ${msg}`);
            if (code === 429) {
              reject(new Error('429: Groq rate limited. Try again shortly.'));
            } else if (code === 401 || code === 403) {
              reject(new Error('401: Groq API key invalid.'));
            } else {
              reject(new Error(msg));
            }
          } else {
            resolve(toOpenAIFromKimi(json));
          }
        } catch (e) {
          console.error('[Infernix AI] Groq parse error:', data.slice(0, 500));
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Request failed: ${e.message}`)));
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

try { ipcMain.removeHandler('ai-generate'); } catch {}
ipcMain.handle('ai-generate', async (event, { messages, provider, model }) => {
  const prov = provider || 'groq';
  if (prov === 'gemini') {
    return { choices: [{ message: { content: 'Gemini is currently disabled. Please switch to Groq or Kimi in the model picker.' } }] };
  }
  if (prov === 'kimi') {
    try {
      return await kimiGenerate(messages, model || KIMI_MODEL);
    } catch (err) {
      const msg = err?.message || '';
      const isRateLimit = msg.includes('429');
      const isAuthError = msg.includes('401') || msg.includes('403');
      if (isRateLimit || isAuthError) {
        throw err;
      }
      console.error('[Infernix] Kimi failed, falling back to Groq:', err.message);
      return groqGenerate(messages);
    }
  }
  return groqGenerate(messages, model || GROQ_MODEL);
});

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG CONSOLE — Real PowerShell window showing live console output
// ═══════════════════════════════════════════════════════════════════════════

const DEBUG_LOG_PATH = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Infernix', 'debug.log');
};

let debugLogStream = null;
let debugConsoleProcess = null;

const ensureDebugLog = () => {
  const logPath = DEBUG_LOG_PATH();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (!debugLogStream) {
    debugLogStream = fs.createWriteStream(logPath, { flags: 'a' });
  }
  return logPath;
};

const writeToDebugLog = (level, args) => {
  if (!debugLogStream) return;
  const timestamp = new Date().toISOString();
  const message = args.map(a => {
    if (typeof a === 'object') try { return JSON.stringify(a); } catch { return String(a); }
    return String(a);
  }).join(' ');
  debugLogStream.write(`[${timestamp}] [${level}] ${message}\n`);
};

// Hook console methods so they write to the debug log file
const _origConsoleLog = console.log;
const _origConsoleError = console.error;
const _origConsoleWarn = console.warn;

console.log = function(...args) { writeToDebugLog('LOG', args); _origConsoleLog.apply(console, args); };
console.error = function(...args) {
  const text = args.map(a => (a instanceof Error ? (a.stack || a.message) : String(a))).join(' ');
  if (text.includes('Render frame was disposed') || text.includes('webFrameMain')) return;
  writeToDebugLog('ERROR', args);
  _origConsoleError.apply(console, args);
};
console.warn = function(...args) { writeToDebugLog('WARN', args); _origConsoleWarn.apply(console, args); };

const openDebugConsole = () => {
  const logPath = ensureDebugLog();
  // Clear old log on new console open
  fs.writeFileSync(logPath, `[${new Date().toISOString()}] === Infernix Debug Console ===\n`, 'utf-8');

  // Use `start` via cmd.exe to guarantee a visible console window on Windows.
  // `start` is the only reliable way to open a new window from a GUI parent.
  const psCommand = `$host.UI.RawUI.WindowTitle = 'Infernix Debug Console'; Write-Host 'Infernix Debug Console - Live log output...' -ForegroundColor Cyan; Get-Content -Path '${logPath.replace(/'/g, "''")}' -Wait`;
  const cmd = `start "" powershell.exe -NoExit -Command "${psCommand.replace(/"/g, '\\"')}"`;
  exec(cmd, (err) => {
    if (err) console.error('[Infernix DebugConsole] exec error:', err.message);
    else console.log('[Infernix DebugConsole] PowerShell window spawned via start');
  });
};

const closeDebugConsole = () => {
  // Close any PowerShell window with our title
  exec('taskkill /FI "WINDOWTITLE eq Infernix Debug Console" /F /IM powershell.exe', (err) => {
    if (err) console.error('[Infernix DebugConsole] taskkill error:', err.message);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTO ATTACH — main.obf.cjs never included this, so we implement it here
// ═══════════════════════════════════════════════════════════════════════════

let autoAttachAddon = null;
const loadAutoAttachAddon = () => {
  try {
    const resourcesPath = process.resourcesPath || path.join(__dirname, '..');
    const candidates = app.isPackaged
      ? [path.join(resourcesPath, 'bin', 'xeno.node')]
      : [path.join(__dirname, '..', 'bin', 'xeno.node')];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        autoAttachAddon = require(p);
        console.log('[Infernix AutoAttach] Addon reference acquired from', p);
        return true;
      }
    }
  } catch (e) {
    console.error('[Infernix AutoAttach] Failed to acquire addon:', e.message);
  }
  return false;
};

// In-memory settings cache (avoids reading disk every second)
let mainSettings = { autoAttach: true, autoExecute: false };
const SETTINGS_FILE = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Infernix', 'settings.json');
};

const loadMainSettings = () => {
  try {
    const f = SETTINGS_FILE();
    if (fs.existsSync(f)) {
      const parsed = JSON.parse(fs.readFileSync(f, 'utf-8'));
      mainSettings = { ...mainSettings, ...parsed };
    }
  } catch (e) {
    console.error('[Infernix AutoAttach] Settings load error:', e.message);
  }
};

// Watch for settings changes without hammering disk
fs.watchFile(SETTINGS_FILE(), { interval: 2000 }, () => {
  loadMainSettings();
  console.log('[Infernix AutoAttach] Settings reloaded. autoAttach =', mainSettings.autoAttach);
});

// Also update in-memory when renderer saves settings
try { ipcMain.removeHandler('save-settings'); } catch {}
ipcMain.handle('save-settings', async (event, settings) => {
  const prevDebugConsole = !!mainSettings.debugConsole;
  mainSettings = { ...mainSettings, ...settings };
  // Persist to disk
  try {
    const f = SETTINGS_FILE();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    return { ok: false, error: e.message };
  }
  // Open/close debug console immediately when setting changes
  if (mainSettings.debugConsole && !prevDebugConsole) {
    openDebugConsole();
  } else if (!mainSettings.debugConsole && prevDebugConsole) {
    closeDebugConsole();
  }
  return { ok: true };
});

// IPC: renderer can request debug console open/close directly
try { ipcMain.removeHandler('toggle-debug-console'); } catch {}
ipcMain.handle('toggle-debug-console', async (event, enabled) => {
  mainSettings.debugConsole = !!enabled;
  if (mainSettings.debugConsole) {
    openDebugConsole();
    console.log('[Infernix DebugConsole] Opened via IPC');
  } else {
    closeDebugConsole();
    console.log('[Infernix DebugConsole] Closed via IPC');
  }
  return { ok: true, enabled: mainSettings.debugConsole };
});

// Auto-attach state for UI visibility
let autoAttachLastAttempt = 0;
let autoAttachAttempts = 0;
let autoAttachSuccessPids = new Set();

const runAutoAttach = () => {
  if (!mainSettings.autoAttach) return;
  if (!autoAttachAddon || typeof autoAttachAddon.attach !== 'function') return;

  try {
    const clientsJson = autoAttachAddon.getClients?.() || '[]';
    const clients = JSON.parse(clientsJson);
    const now = Date.now();

    const currentPids = new Set(clients.map(c => String(Array.isArray(c) ? c[0] : c.pid)));

    // Clean up departed PIDs
    for (const pid of autoAttachSuccessPids) {
      if (!currentPids.has(pid)) autoAttachSuccessPids.delete(pid);
    }

    // Count how many are already attached
    const attachedCount = clients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3).length;

    // If there are unattached clients, or zero clients at all, we should try attach.
    // getClients() often returns [] before the first attach — so we must call attach()
    // blindly when no clients are present, just like the manual Attach button does.
    const needsAttach = attachedCount === 0;

    // Global cooldown: only attempt attach once every 3s
    if (!needsAttach || (now - autoAttachLastAttempt < 3000)) return;

    autoAttachLastAttempt = now;
    autoAttachAttempts++;
    console.log('[Infernix AutoAttach] Blind attempt #' + autoAttachAttempts + ' — clients=' + clients.length + ' attached=' + attachedCount);

    try {
      autoAttachAddon.attach();
      console.log('[Infernix AutoAttach] attach() executed');
    } catch (e) {
      console.error('[Infernix AutoAttach] attach() threw:', e.message);
    }

    // Notify renderer
    const wins = require('electron').BrowserWindow.getAllWindows();
    for (const w of wins) {
      if (!w.isDestroyed()) {
        w.webContents.send('auto-attach-tick', { attempts: autoAttachAttempts, lastAttempt: autoAttachLastAttempt });
      }
    }
  } catch (e) {
    console.error('[Infernix AutoAttach] Tick error:', e.message);
  }
};

app.whenReady().then(() => {
  loadAutoAttachAddon();
  loadMainSettings();
  // Run auto-attach every 1.5 seconds
  setInterval(runAutoAttach, 1500);
  console.log('[Infernix AutoAttach] Polling started. autoAttach =', mainSettings.autoAttach);

  // Open PowerShell debug console if enabled in settings
  if (mainSettings.debugConsole) {
    openDebugConsole();
    console.log('[Infernix DebugConsole] PowerShell debug console opened');
  }

  // Apply always-on-top setting on startup
  {
    const wins = require('electron').BrowserWindow.getAllWindows();
    for (const w of wins) {
      if (!w.isDestroyed()) {
        if (mainSettings.topmost) w.setAlwaysOnTop(true, 'screen-saver');
        else w.setAlwaysOnTop(false);
      }
    }
    if (mainSettings.topmost) console.log('[Infernix] Always on top enabled');
  }
});

// IPC: renderer logs forwarded to main process (shows in debug console)
try { ipcMain.removeHandler('renderer-log'); } catch {}
ipcMain.on('renderer-log', (event, level, args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (level === 'error') console.error('[Renderer]', msg);
  else if (level === 'warn') console.warn('[Renderer]', msg);
  else console.log('[Renderer]', msg);
});

// IPC: set always on top
try { ipcMain.removeHandler('set-always-on-top'); } catch {}
ipcMain.handle('set-always-on-top', async (event, enabled) => {
  const wins = require('electron').BrowserWindow.getAllWindows();
  for (const w of wins) {
    if (!w.isDestroyed()) {
      if (enabled) w.setAlwaysOnTop(true, 'screen-saver');
      else w.setAlwaysOnTop(false);
    }
  }
  return { ok: true, enabled: !!enabled };
});

// IPC: renderer can query auto-attach status
ipcMain.handle('get-auto-attach-status', async () => {
  return {
    enabled: !!mainSettings.autoAttach,
    attempts: autoAttachAttempts,
    lastAttempt: autoAttachLastAttempt,
    active: !!mainSettings.autoAttach && !!autoAttachAddon,
  };
});

// IPC: toggle auto-attach directly from renderer
ipcMain.handle('toggle-auto-attach', async (event, enabled) => {
  mainSettings.autoAttach = !!enabled;
  try {
    const f = SETTINGS_FILE();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    let diskSettings = {};
    if (fs.existsSync(f)) diskSettings = JSON.parse(fs.readFileSync(f, 'utf-8'));
    diskSettings.autoAttach = mainSettings.autoAttach;
    fs.writeFileSync(f, JSON.stringify(diskSettings, null, 2), 'utf-8');
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: true, enabled: mainSettings.autoAttach };
});

// executor-execute — main.obf.cjs may register this asynchronously, so we register
// inside app.whenReady to ensure our handler wins. Uses Xeno HTTP (localhost:3110).
function registerExecutorExecute() {
  try { ipcMain.removeHandler('executor-execute'); } catch {}
  ipcMain.handle('executor-execute', async (event, { script, clients, scriptName }) => {
    console.log('[executor-execute] called, script length:', (script || '').length, 'clients:', clients);
    if (!script || typeof script !== 'string') {
      return { ok: false, error: 'Script must be a string' };
    }
    // Xeno expects string PIDs in the clients header (like autoexec does)
    const clientPids = Array.isArray(clients) ? clients.map(String) : [];
    const clientsHeader = JSON.stringify(clientPids);
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost', port: 3110, path: '/o', method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(script),
          'clients': clientsHeader
        },
        timeout: 8000,
      };
      const req = http.request(options, (res) => {
        res.resume();
        console.log('[executor-execute] HTTP status:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          recordHistoryEntry(scriptName, script);
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
      });
      req.on('error', (err) => {
        console.error('[executor-execute] HTTP error:', err.message);
        resolve({ ok: false, error: err.message });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
      req.write(script);
      req.end();
    });
  });
  console.log('[executor-execute] handler registered');
}
// Register immediately (in case main.obf.cjs already set up) and also after ready
registerExecutorExecute();
app.whenReady().then(() => {
  registerExecutorExecute();
});

// ai-rejoin-server — main.obf.cjs may register this asynchronously.
function registerAiRejoin() {
  try { ipcMain.removeHandler('ai-rejoin-server'); } catch {}
  ipcMain.handle('ai-rejoin-server', async () => {
  try {
    if (!autoAttachAddon || typeof autoAttachAddon.getClients !== 'function') {
      return { ok: false, error: 'No addon loaded' };
    }
    const clientsJson = autoAttachAddon.getClients();
    const allClients = JSON.parse(clientsJson || '[]');
    const attached = allClients.filter(c => (Array.isArray(c) ? c[3] : c.status) === 3);
    if (attached.length === 0) return { ok: false, error: 'No attached clients' };
    const teleportScript = `local TeleportService = game:GetService("TeleportService")\nlocal Players = game:GetService("Players")\nTeleportService:TeleportToPlaceInstance(game.PlaceId, game.JobId, Players.LocalPlayer)`;
    const pids = attached.map(c => Array.isArray(c) ? String(c[0]) : String(c.pid));
    const clientsHeader = JSON.stringify(pids);
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost', port: 3110, path: '/o', method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(teleportScript),
          'Clients': clientsHeader
        },
        timeout: 8000,
      };
      const req = http.request(options, (res) => {
        res.resume();
        resolve({ ok: true });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
      req.write(teleportScript);
      req.end();
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
}
registerAiRejoin();
app.whenReady().then(() => {
  registerAiRejoin();
});

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH CLIENTS — main.obf.cjs does not register this, so we add it here
// ═══════════════════════════════════════════════════════════════════════════

function registerRefreshClients() {
  try { ipcMain.removeHandler('refresh-clients'); } catch {}
  ipcMain.handle('refresh-clients', async () => {
    try {
      // 1. Re-attach
      if (autoAttachAddon && typeof autoAttachAddon.attach === 'function') {
        autoAttachAddon.attach();
      }
      // Small delay for attach to settle
      await new Promise(r => setTimeout(r, 300));
      // 2. Get current clients
      if (!autoAttachAddon || typeof autoAttachAddon.getClients !== 'function') {
        return { ok: false, error: 'No addon loaded' };
      }
      const clientsJson = autoAttachAddon.getClients();
      const clients = JSON.parse(clientsJson || '[]');
      const attachedPids = clients
        .filter(c => (Array.isArray(c) ? c[3] : c.status) === 3)
        .map(c => Array.isArray(c) ? String(c[0]) : String(c.pid));
      // 3. Broadcast to all windows
      const { BrowserWindow } = require('electron');
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (!w.isDestroyed()) {
          w.webContents.send('executor-clients', clients);
        }
      }
      return { ok: true, clients: clients.length, attached: attachedPids.length, message: attachedPids.length === 0 ? 'No attached clients — click Attach first' : undefined };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}
registerRefreshClients();
app.whenReady().then(() => {
  registerRefreshClients();
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTOEXEC ENABLED/DISABLED STATE FIX
// main.obf.cjs has no concept of per-script enabled state — it runs EVERY
// file in the autoexec folder. We fix this by maintaining two folders:
//   autoexec/          = enabled scripts (backend sees these)
//   autoexec-disabled/ = disabled scripts (backend ignores these)
// New scripts are added to autoexec-disabled/ by default (OFF).
// ═══════════════════════════════════════════════════════════════════════════

const AUTOEXEC_BASE = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Infernix');
};
const AUTOEXEC_ENABLED_DIR = () => path.join(AUTOEXEC_BASE(), 'autoexec');
const AUTOEXEC_DISABLED_DIR = () => path.join(AUTOEXEC_BASE(), 'autoexec-disabled');

const ensureAutoExecDirs = () => {
  fs.mkdirSync(AUTOEXEC_ENABLED_DIR(), { recursive: true });
  fs.mkdirSync(AUTOEXEC_DISABLED_DIR(), { recursive: true });
};

const listAutoExecScripts = () => {
  ensureAutoExecDirs();
  const enabledFiles = fs.readdirSync(AUTOEXEC_ENABLED_DIR()).filter(f => f.endsWith('.lua') || f.endsWith('.txt'));
  const disabledFiles = fs.readdirSync(AUTOEXEC_DISABLED_DIR()).filter(f => f.endsWith('.lua') || f.endsWith('.txt'));
  const scripts = [];
  for (const f of enabledFiles) {
    scripts.push({ name: f, path: path.join(AUTOEXEC_ENABLED_DIR(), f), enabled: true });
  }
  for (const f of disabledFiles) {
    scripts.push({ name: f, path: path.join(AUTOEXEC_DISABLED_DIR(), f), enabled: false });
  }
  // Sort alphabetically for consistent UI
  scripts.sort((a, b) => a.name.localeCompare(b.name));
  return scripts;
};

// Override get-autoexec-scripts to include enabled/disabled status
try { ipcMain.removeHandler('get-autoexec-scripts'); } catch {}
ipcMain.handle('get-autoexec-scripts', async () => {
  try {
    return listAutoExecScripts();
  } catch (e) {
    console.error('[Infernix AutoExec] list error:', e.message);
    return [];
  }
});

// Override add-to-autoexec: new scripts go to autoexec-disabled/ (OFF by default)
try { ipcMain.removeHandler('add-to-autoexec'); } catch {}
ipcMain.handle('add-to-autoexec', async (event, { name, content }) => {
  ensureAutoExecDirs();
  try {
    const safeName = (name || 'Script').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Script';
    const fileName = safeName.endsWith('.lua') ? safeName : `${safeName}.lua`;
    // Write to DISABLED folder by default so user must explicitly enable
    const filePath = path.join(AUTOEXEC_DISABLED_DIR(), fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('[Infernix AutoExec] Added (disabled by default):', fileName);
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Override remove-from-autoexec: delete from either folder
try { ipcMain.removeHandler('remove-from-autoexec'); } catch {}
ipcMain.handle('remove-from-autoexec', async (event, scriptName) => {
  ensureAutoExecDirs();
  try {
    const enabledPath = path.join(AUTOEXEC_ENABLED_DIR(), scriptName);
    const disabledPath = path.join(AUTOEXEC_DISABLED_DIR(), scriptName);
    if (fs.existsSync(enabledPath)) fs.unlinkSync(enabledPath);
    if (fs.existsSync(disabledPath)) fs.unlinkSync(disabledPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// New handler: toggle enabled state by moving between folders
try { ipcMain.removeHandler('set-autoexec-enabled'); } catch {}
ipcMain.handle('set-autoexec-enabled', async (event, { scriptName, enabled }) => {
  ensureAutoExecDirs();
  try {
    const src = enabled
      ? path.join(AUTOEXEC_DISABLED_DIR(), scriptName)
      : path.join(AUTOEXEC_ENABLED_DIR(), scriptName);
    const dst = enabled
      ? path.join(AUTOEXEC_ENABLED_DIR(), scriptName)
      : path.join(AUTOEXEC_DISABLED_DIR(), scriptName);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dst);
      console.log('[Infernix AutoExec]', enabled ? 'Enabled' : 'Disabled', scriptName);
    }
    return { ok: true, enabled };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── Workspace / file listing helpers for loading screen real stats ─────────
const WORKSPACE_DIR = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Infernix', 'workspace');
};

const listDirFiles = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  } catch { return []; }
};

try { ipcMain.removeHandler('list-workspace-files'); } catch {}
ipcMain.handle('list-workspace-files', async () => listDirFiles(WORKSPACE_DIR()));

try { ipcMain.removeHandler('list-autoexec-files'); } catch {}
ipcMain.handle('list-autoexec-files', async () => {
  const enabled = listDirFiles(AUTOEXEC_ENABLED_DIR()).filter(f => f.endsWith('.lua') || f.endsWith('.txt'));
  const disabled = listDirFiles(AUTOEXEC_DISABLED_DIR()).filter(f => f.endsWith('.lua') || f.endsWith('.txt'));
  return [...enabled, ...disabled];
});

try { ipcMain.removeHandler('open-workspace-dir'); } catch {}
ipcMain.handle('open-workspace-dir', async () => {
  const dir = WORKSPACE_DIR();
  fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return { ok: true };
});

// Also widen the window slightly so the executor toolbar is never clipped by the sidebar.
app.on('browser-window-created', (event, win) => {
  const iconPath = path.resolve(__dirname, '../build/icon.ico');
  if (fs.existsSync(iconPath)) {
    try { win.setIcon(iconPath); } catch {}
  }
  // Ensure the window is at least 1300px wide so toolbar + sidebar fit comfortably
  try {
    const [w, h] = win.getSize();
    if (w < 1300) win.setSize(1300, h);
    const [minW, minH] = win.getMinimumSize();
    if (minW < 1300) win.setMinimumSize(1300, minH || 600);
  } catch {}

  // Block DevTools shortcuts — users should not be able to open the inspector
  win.webContents.on('before-input-event', (evt, input) => {
    const ctrl = input.control || input.meta;
    if (
      (ctrl && input.shift && (input.key === 'I' || input.key === 'i')) || // Ctrl+Shift+I
      (ctrl && input.shift && (input.key === 'J' || input.key === 'j')) || // Ctrl+Shift+J
      (ctrl && input.shift && (input.key === 'C' || input.key === 'c') && input.type === 'keyDown') || // Ctrl+Shift+C (element inspector)
      input.key === 'F12'
    ) {
      evt.preventDefault();
      // Also close devtools if somehow already open
      if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
    }
  });
});
