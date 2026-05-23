const KIMI_URL = 'https://api.kimi.com/coding/v1/chat/completions';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = req.headers.authorization || '';
    const body = req.body;

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify(body),
    });

    const data = await kimiRes.json();
    return res.status(kimiRes.status).json(data);
  } catch (err) {
    console.error('[kimi proxy]', err?.message ?? err);
    return res.status(502).json({ error: err?.message ?? 'Proxy failed' });
  }
}

module.exports = handler;
