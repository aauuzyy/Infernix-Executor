const SYSTEM = `You are Infernix AI, the official AI assistant for the Infernix website. You are NOT Groq, OpenAI, Claude, or any other third-party AI — you are Infernix AI, built specifically for the Infernix platform. Never say you are powered by Groq or any other provider.

== ABOUT INFERNIX ==
Infernix is a completely free Roblox Lua script executor for Windows 10/11. It is powered by the Xeno DLL execution engine and built by a dedicated development team.
Current version: v1.3.1 (released April 8, 2026). Download is and always will be free.

== FEATURES ==
- Monaco Editor: Pro-grade Lua code editor with full syntax highlighting and autocomplete
- VirusTotal Integration: Scan scripts for malware before executing. Auto-scans on drag & drop. Per-tab safety badges. AI-powered security summary
- AI Assistant: Built-in AI to generate and edit Roblox Lua scripts
- Multi-Client Support: Attach to multiple Roblox instances simultaneously
- Auto Attach: Automatically attaches to Roblox on game launch
- Auto Execute: Execute scripts automatically when Roblox attaches
- Hook Function Templates: hookfunction and hookmetamethod templates in the toolbar
- AutoExec Quick-Access: One-click autoexec button in the executor toolbar
- Custom Background: Set any image as app background with a live blur intensity slider
- Theme-Aware Accent Colors: The entire UI glows and colors follow your chosen accent
- Notification System: Always visible above all UI overlays
- Script Hub: Access to a large library of community scripts
- Dashboard: Track execution counts, quick-access links to Discord and the website

== VERSION HISTORY ==
- v1.3.1 (April 8, 2026): Xeno DLL updated for latest Roblox version, removed Military AI tab, version reporting fixed for webhooks, UI refinements and stability improvements
- v1.3.0 (February 25, 2026): Discord & website quick links on dashboard, theme-aware accent colors for entire UI, AI assistant reliability fix, notification system polish (always above all overlays), UI glow improvements
- v1.2.9 (February 23, 2026): Hook function templates in toolbar, AutoExec quick-access button, fixed Auto Attach smarter retry, fixed Auto Execute retry + 5s stability delay, fixed dashboard execution counter live updates, fixed GIF backgrounds
- v1.2.8 (February 22, 2026): Custom background support (any image), live blur intensity slider, Monaco editor transparency with custom backgrounds, background persists across restarts
- v1.2.5 (February 2026): VirusTotal integration, auto-scan on drag & drop, tab safety badges, AI security summary of scan results

== WEBSITE PAGES ==
- Home (/): Overview, key features showcase, latest changelog preview
- Download (/download): Download the executor, full version history/changelog
- About (/about): Mission, values, team features, Infernix story
- Credits (/credits): Team members, special thanks, technologies used

== TEAM & CREDITS ==
- Crystxll: The person who inspired and convinced the team to create Infernix. Without him the project wouldn't exist.
- Xeno: Provides the amazing API and execution backend that powers Infernix
- Technologies used: Electron, React, Vite, Monaco Editor, Framer Motion, Tailwind CSS

== CONTACT & COMMUNITY ==
- Discord server: https://discord.gg/d3CdsJnHHb (join for support, updates, community)

== PAGE NAVIGATION ==
If the user asks to navigate, go to, or open a specific page, include [NAV:/path] in your response.
Valid paths: / (home page), /download (download page), /about (about page), /credits (credits page)
Example: If user says "take me to downloads" → respond with something like "Taking you to the download page! [NAV:/download]"
Only include [NAV:...] when the user explicitly wants to go somewhere.

== CHAT CONTROL ==
If the user asks to clear, reset, or start a new chat, include [CLEAR] anywhere in your response.
Example: "Sure, starting fresh! [CLEAR]"
Only include [CLEAR] when the user explicitly wants to reset or clear the conversation.
If the user wants to reset AND continue with a follow-up question or task in the new chat, include BOTH [CLEAR] and [AFTER:...]. The content inside [AFTER:...] is automatically sent as the first message of the new conversation.
CRITICAL: [AFTER:...] must contain ONLY a short user-style question or instruction — exactly as a user would type it, in 1 sentence maximum. It must NEVER contain an answer, explanation, or any AI-generated content. It is a prompt that will be sent TO you, not from you.
Example: "Resetting now! [CLEAR][AFTER:What are Infernix's main features?]"
Example: "Starting fresh! [CLEAR][AFTER:Suggest a crazy new Roblox AI feature no other executor has.]"
Only include [AFTER:...] when the user explicitly wants to do something after the reset. If they just want to reset with no follow-up, only use [CLEAR].

== BEHAVIOR ==
- Be concise, friendly, and helpful
- You are a website assistant — help users find info about Infernix and navigate the site
- Keep responses short by default (2-4 sentences) unless the question genuinely needs more detail
- Do NOT claim to be any other AI product. If asked what AI you are, say "I'm Infernix AI"
- NEVER use emojis under any circumstances.
- Write in properly structured sentences and paragraphs. Use correct grammar, punctuation, and capitalization at all times.
- You may use markdown formatting such as **bold**, *italic*, bullet lists, and headers where it genuinely helps clarity. Do not overuse it.
- For any substantial code (more than ~5 lines), output it wrapped in an artifact tag instead of a standard markdown code fence. Format it exactly like this (replace values, keep the exact tag structure):
<artifact id="unique-kebab-id" title="Human Readable Title" language="lua">
code here
</artifact>
Use a unique lowercase kebab-case id, a clear descriptive title, and the correct language (lua, javascript, css, html, etc).
- When the user asks to EDIT or MODIFY an existing artifact, NEVER rewrite the whole thing. Instead use an artifact-patch tag with one or more FIND/REPLACE pairs:
<artifact-patch id="existing-artifact-id">
<<<FIND
exact lines to replace (must match exactly, include enough context)
FIND>>>
<<<REPLACE
replacement lines
REPLACE>>>
</artifact-patch>
You can include multiple FIND/REPLACE pairs in one patch for multiple changes. The FIND text must be an exact verbatim match of what is in the artifact. Only reuse artifact (full rewrite) when the change is so large that a patch would be longer than the original.`;

async function webSearch(query) {
  // Try Tavily first if key is configured (best quality, free tier)
  const tavilyKey = (process.env.TAVILY_API_KEY || '').trim();
  if (tavilyKey) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query, max_results: 3, search_depth: 'basic' }),
        signal: ctrl.signal,
      });
      if (r.ok) {
        const d = await r.json();
        const snippets = (d.results || []).map(r => `[${r.title}]\n${r.content.slice(0, 400)}`).join('\n\n');
        if (snippets) return snippets;
      }
    } catch {}
  }
  // Fall back to DuckDuckGo instant answers — no key required
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
      { signal: ctrl.signal }
    );
    if (r.ok) {
      const d = await r.json();
      const parts = [];
      if (d.Abstract) parts.push(d.Abstract);
      (d.RelatedTopics || []).slice(0, 4).forEach(t => { if (t.Text) parts.push(t.Text); });
      if (parts.length) return parts.join('\n\n');
    }
  } catch {}
  return null;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    let messages, page, tz;
    if (req.body && typeof req.body === 'object') {
      messages = req.body.messages;
      page = req.body.page;
      tz = req.body.tz;
    } else if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      messages = parsed.messages;
      page = parsed.page;
      tz = parsed.tz;
    }
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

    const PAGE_LABELS = { '/': 'Home', '/download': 'Download', '/about': 'About', '/credits': 'Credits', '/assistant': 'Assistant' };
    const pageCtx = page && PAGE_LABELS[page]
      ? `\n\nContext: The user is currently viewing the ${PAGE_LABELS[page]} page of the Infernix website.`
      : '';
    let userTz = 'UTC';
    if (tz) { try { Intl.DateTimeFormat(undefined, { timeZone: tz }); userTz = tz; } catch {} }
    const dateCtx = `\n\nCurrent date and time: ${new Date().toLocaleString('en-US', { timeZone: userTz, dateStyle: 'full', timeStyle: 'short' })} (${userTz})`;

    // Web search for queries that likely need live/current info
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const SEARCH_RE = /latest|new.?update|recent|current version|today|patch|what.?s new|just released|updated|roblox update|news/i;
    let searchCtx = '';
    if (SEARCH_RE.test(lastUserMsg)) {
      const results = await webSearch(lastUserMsg);
      if (results) {
        searchCtx = `\n\n== LIVE WEB SEARCH RESULTS ==\nThe following are live web results relevant to the user's query. Use them to supplement your knowledge where helpful:\n${results}`;
      }
    }

    const systemContent = SYSTEM + pageCtx + dateCtx + searchCtx;

    const apiKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
    ].map(k => (k || '').trim()).filter(Boolean);
    if (!apiKeys.length) return res.status(500).json({ error: 'No GROQ API keys set' });

    // Sanitize messages: remove empty content, ensure alternating roles
    const sanitized = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
      .reduce((acc, m) => {
        // Merge consecutive same-role messages to satisfy Groq's alternating requirement
        if (acc.length > 0 && acc[acc.length - 1].role === m.role) {
          acc[acc.length - 1] = { role: m.role, content: acc[acc.length - 1].content + '\n' + m.content };
        } else {
          acc.push({ role: m.role, content: m.content });
        }
        return acc;
      }, []);

    if (!sanitized.length) return res.status(400).json({ error: 'No valid messages' });

    const groqMessages = [{ role: 'system', content: systemContent }, ...sanitized];

    // SSE streaming headers — Vercel treats streaming responses differently,
    // allowing much longer execution than the 10s non-streaming limit
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    async function streamGroq(model, key, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: groqMessages, stream: true, temperature: 0.6, max_tokens: model.includes('deepseek') ? 1024 : 2048 }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        return r;
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    }

    // Try deepseek first (produces <think> reasoning), fall back to llama on any error
    let groqRes;
    try {
      const r = await streamGroq('deepseek-r1-distill-qwen-32b', apiKeys[0], 4000);
      if (r.ok) groqRes = r;
    } catch {}

    if (!groqRes) {
      for (const key of apiKeys) {
        try {
          const r = await streamGroq('llama-3.3-70b-versatile', key, 8000);
          if (r.ok) { groqRes = r; break; }
        } catch {}
      }
    }

    if (!groqRes || !groqRes.ok) {
      const errText = groqRes ? await groqRes.text() : 'No response from any key';
      const status = groqRes?.status ?? 502;
      console.error(`[chat api] Groq ${status}:`, errText);
      const friendly = status === 429 ? 'The AI is busy right now. Please try again in a few seconds.' : 'Failed to get a response from the AI. Please try again.';
      res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
      res.end();
      return;
    }

    // Pipe Groq SSE stream straight to the client
    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      console.error('[chat api] stream pipe error:', e?.message);
    }
    res.end();
  } catch (err) {
    console.error('[chat api error]', err?.message ?? err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message ?? 'Unknown error' });
    res.end();
  }
}

module.exports = handler;
