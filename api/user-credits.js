import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

export default async function handler(req, res) {
  // Set CORS headers for Figma plugin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const figma_user_id = req.query.figma_user_id;

    // Validate required fields
    if (!figma_user_id) {
      res.status(400).json({ 
        error: 'figma_user_id parameter is required' 
      });
      return;
    }

    // Call the credits DB to get user credits
    const dbResponse = await fetch(`${CREDITS_DB_URL}/user/credits?figma_user_id=${encodeURIComponent(figma_user_id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      res.status(dbResponse.status).json({ 
        error: 'Database error', 
        details: 'Unable to retrieve user credits'
      });
      return;
    }

    const userData = await dbResponse.json();
    
    // Return user credit information
    res.status(200).json({
      figma_user_id: userData.figma_user_id,
      credits: userData.credits,
      access_type: userData.access_type,
      total_credits_purchased: userData.total_credits_purchased || 0,
      total_credits_used: userData.total_credits_used || 0
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong retrieving user credits'
    });
  }
}