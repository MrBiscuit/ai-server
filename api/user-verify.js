// User verification endpoint - proxies requests to Cloudflare Workers
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

  try {
    if (req.method === 'POST') {
      // User verification
      const { figma_user_id, figma_username } = req.body;

      if (!figma_user_id || !figma_username) {
        return res.status(400).json({ error: 'Missing figma_user_id or figma_username' });
      }

      // Forward request to Cloudflare Workers
      const response = await fetch(`${CREDITS_DB_URL}/user/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figma_user_id,
          figma_username
        })
      });

      if (!response.ok) {
        console.error('Cloudflare Workers error:', response.status);
        return res.status(response.status).json({ error: 'Failed to verify user' });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else if (req.method === 'GET') {
      // Get user credits
      const { figma_user_id } = req.query;

      if (!figma_user_id) {
        return res.status(400).json({ error: 'Missing figma_user_id' });
      }

      // Forward request to Cloudflare Workers
      const response = await fetch(`${CREDITS_DB_URL}/user/credits?figma_user_id=${figma_user_id}`);

      if (!response.ok) {
        console.error('Cloudflare Workers error:', response.status);
        return res.status(response.status).json({ error: 'Failed to get user credits' });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}