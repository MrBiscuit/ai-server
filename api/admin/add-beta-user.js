import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { figma_username, credits, admin_key } = req.body;

    // Validate admin key
    if (!admin_key || admin_key !== ADMIN_API_KEY) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Invalid admin API key' 
      });
      return;
    }

    // Validate required fields
    if (!figma_username) {
      res.status(400).json({ 
        error: 'figma_username is required' 
      });
      return;
    }

    const creditsToGrant = credits || 100; // Default 100 credits for beta users

    // Call the credits DB to add beta user
    const dbResponse = await fetch(`${CREDITS_DB_URL}/admin/add-beta-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        figma_username,
        credits: creditsToGrant
      })
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      res.status(dbResponse.status).json({ 
        error: 'Database error', 
        details: 'Unable to add beta user'
      });
      return;
    }

    const result = await dbResponse.json();
    
    // Return success response
    res.status(200).json({
      success: true,
      message: `Beta user '${figma_username}' added successfully`,
      figma_username: result.figma_username,
      credits: result.credits,
      access_type: result.access_type
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong adding beta user'
    });
  }
}