// Monthly credits endpoint - proxies requests to Cloudflare Workers
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
      const { figma_user_id, figma_username } = req.body;

      if (!figma_user_id) {
        return res.status(400).json({ error: 'figma_user_id is required' });
      }

      console.log(`Monthly credits check for user: ${figma_user_id}`);

      // Forward request to Cloudflare Workers
      const response = await fetch(`${CREDITS_DB_URL}/user/monthly-credits`, {
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
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorData.error || 'Monthly credits check failed',
          details: errorData.details || 'Unable to check monthly credits'
        });
      }

      const data = await response.json();
      console.log(`Monthly credits result:`, data);
      return res.status(200).json(data);

    } else {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Monthly credits error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong while checking monthly credits'
    });
  }
}