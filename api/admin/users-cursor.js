import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const admin_key = req.query.admin_key;
    if (!admin_key || admin_key !== ADMIN_API_KEY) {
      res.status(401).json({ error: 'Unauthorized', details: 'Invalid admin API key' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const cursor_created_at = req.query.cursor_created_at || '';
    const cursor_id = req.query.cursor_id || '';

    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor_created_at && cursor_id) {
      params.set('cursor_created_at', cursor_created_at);
      params.set('cursor_id', cursor_id);
    }

    const dbResponse = await fetch(`${CREDITS_DB_URL}/admin/users-cursor?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      res.status(dbResponse.status).json({ error: 'Database error' });
      return;
    }
    const result = await dbResponse.json();
    res.status(200).json(result);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


