// POST /api/generate-key
// Creates a new 3-day key in Supabase and returns it.
// Uses service role key (server-side only — never exposed to client).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limit: 1 key per IP per 24 hours (in-memory, resets on cold start)
// Stores { count, firstAt } per IP.
const ipRecords = new Map();
const WINDOW_MS  = 24 * 60 * 60 * 1000; // 24 hours
const MAX_KEYS   = 1;

function checkRateLimit(ip) {
  const now  = Date.now();
  const rec  = ipRecords.get(ip);
  if (!rec || now - rec.firstAt >= WINDOW_MS) {
    ipRecords.set(ip, { count: 1, firstAt: now });
    return null; // allowed
  }
  if (rec.count >= MAX_KEYS) {
    const retryAfterMs = WINDOW_MS - (now - rec.firstAt);
    const h = Math.ceil(retryAfterMs / 3600000);
    return `You can only generate 1 key per 24 hours. Try again in ${h}h.`;
  }
  rec.count++;
  return null;
}

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `INFERNIX-${seg(8)}-${seg(4)}-${seg(4)}-${seg(12)}`;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimitError = checkRateLimit(ip);
  if (rateLimitError) return res.status(429).json({ error: rateLimitError });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Key system not configured yet.' });
  }

  const key = generateKey();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/keys`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ key, expires_at: expiresAt.toISOString() }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase insert error:', err);
      return res.status(500).json({ error: 'Failed to register key. Try again.' });
    }

    return res.status(200).json({ key, expires_at: expiresAt.toISOString() });
  } catch (err) {
    console.error('generate-key error:', err);
    return res.status(500).json({ error: 'Server error. Try again.' });
  }
}

module.exports = handler;
