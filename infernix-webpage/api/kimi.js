const KIMI_URL = 'https://api.moonshot.cn/v1/chat/completions';

async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = req.headers.authorization || '';

    // Vercel may give body as parsed object or raw string
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify({
        model: body.model || 'kimi-k2.6',
        messages: body.messages,
        max_tokens: body.max_tokens,
        stream: body.stream || false,
      }),
    });

    const data = await kimiRes.json();
    return res.status(kimiRes.status).json(data);
  } catch (err) {
    console.error('[kimi proxy]', err?.message ?? err);
    return res.status(502).json({ error: err?.message ?? 'Proxy failed' });
  }
}

module.exports = handler;
