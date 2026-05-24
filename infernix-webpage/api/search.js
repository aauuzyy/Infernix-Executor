const DDG_URL = 'https://html.duckduckgo.com/html/';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const query = body?.query || '';
  if (!query) return res.status(400).json({ error: 'No query' });

  try {
    const r = await fetch(DDG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: 'q=' + encodeURIComponent(query) + '&b=',
      redirect: 'follow',
    });

    const html = await r.text();
    const results = [];

    // Parse result blocks
    const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links = [...html.matchAll(linkRe)];
    const snippets = [...html.matchAll(snippetRe)];

    const count = Math.min(links.length, snippets.length, 5);
    for (let i = 0; i < count; i++) {
      const title = links[i][2]
        .replace(/<[^>]+>/g, '')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      const snippet = snippets[i][1]
        .replace(/<[^>]+>/g, '')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      results.push({
        title: title || '(no title)',
        url: links[i][1],
        snippet: snippet || '(no snippet)',
      });
    }

    res.json({ query, results });
  } catch (err) {
    console.error('[search proxy]', err?.message ?? err);
    res.status(502).json({ error: err?.message ?? 'Search failed' });
  }
}

module.exports = handler;
