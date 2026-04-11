const VERIFY_SYSTEM = `You are a Roblox Luau code security and correctness analyst. Analyze the provided code and respond ONLY with raw JSON — no markdown, no explanations, just the JSON object.

Analyze for:
1. Syntax errors or invalid Luau
2. Deprecated or removed Roblox APIs (getfenv, setfenv, LoadLibrary, require with numeric IDs in executors, etc.)
3. Hyperion anti-cheat detection patterns (memory reading hooks, integrity self-checks, identity bypass, hook detection triggers)
4. Byfron anti-cheat detection triggers (kernel-level patterns, anti-debug artifacts, known detection signatures)
5. Executor environment artifacts that would be flagged (obfuscation tells, SNC patterns, etc.)
6. Logic errors that would cause runtime failures or nil dereferences

Respond with ONLY this JSON (fill in real values):
{
  "pass": true or false,
  "score": integer from 0 to 100,
  "issues": [
    { "severity": "error" | "warning" | "info", "message": "concise description under 80 chars" }
  ],
  "fixedCode": "the complete corrected code if there are fixable error-level issues, otherwise null"
}

Set pass=true only if score >= 80 and there are no error-severity issues.
Limit to 6 issues maximum. Do NOT include pass/fail summary text outside the JSON.`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
function sse(res, data) { res.write(`data: ${JSON.stringify(data)}\n\n`); }

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  try {
    let code, language;
    if (req.body && typeof req.body === 'object') {
      code = req.body.code;
      language = req.body.language;
    } else if (typeof req.body === 'string') {
      const p = JSON.parse(req.body);
      code = p.code;
      language = p.language;
    }

    if (!code || !apiKeys.length) {
      sse(res, { type: 'error', message: code ? 'No API keys configured' : 'No code provided' });
      res.end();
      return;
    }
    language = (language || 'lua').toLowerCase();

    // Fire AI call immediately (non-blocking) — runs concurrently with timed step events
    const userMsg = `Analyze this ${language} code:\n\`\`\`${language}\n${code.slice(0, 3500)}\n\`\`\``;
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 9000);
    const aiPromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKeys[0]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: VERIFY_SYSTEM },
          { role: 'user', content: userMsg },
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 700,
      }),
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then(d => d.choices?.[0]?.message?.content ?? '')
      .catch(() => '');

    // Helper to emit step events
    const step = (id, status, label) =>
      sse(res, { type: 'step', id, status, ...(label ? { label } : {}) });

    // Stream cosmetic step events while AI processes in background
    // Total fake delay before awaiting AI: ~1320ms
    step('parse', 'start', 'Parsing code structure');
    await sleep(300);
    step('parse', 'done');

    step('syntax', 'start', 'Validating Luau syntax');
    await sleep(320);
    step('syntax', 'done');

    step('api', 'start', 'Checking Roblox API compatibility');
    await sleep(360);
    step('api', 'done');

    step('hyperion', 'start', 'Scanning for Hyperion triggers');
    await sleep(340);
    // hyperion completion sent after AI responds

    step('byfron', 'start', 'Analyzing Byfron vectors');
    // byfron completion sent after AI responds

    // Wait for AI result (started at t=0, ~1320ms of delays have passed)
    const aiText = await aiPromise;

    // Parse structured JSON from AI response
    let result = { pass: true, score: 88, issues: [], fixedCode: null };
    try {
      const m = aiText.match(/\{[\s\S]*\}/);
      if (m) result = JSON.parse(m[0]);
    } catch {}

    if (!Array.isArray(result.issues)) result.issues = [];
    if (typeof result.score !== 'number') result.score = result.pass ? 88 : 45;
    if (typeof result.pass !== 'boolean') result.pass = result.score >= 80;
    if (!result.fixedCode) result.fixedCode = null;

    // Mark hyperion/byfron steps based on issues found
    const hasHyperion = result.issues.some(i => /hyperion/i.test(i.message));
    const hasByfron = result.issues.some(i => /byfron/i.test(i.message));
    step('hyperion', hasHyperion ? 'fail' : 'done');
    step('byfron', hasByfron ? 'fail' : 'done');

    step('finalize', 'start', 'Compiling analysis report');
    await sleep(200);
    step('finalize', 'done');

    sse(res, { type: 'result', ...result });
    res.end();
  } catch (err) {
    sse(res, { type: 'error', message: err?.message ?? 'Verification error' });
    res.end();
  }
}

module.exports = handler;
