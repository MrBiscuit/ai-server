import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow PUT requests
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { figma_user_id, figma_username, credits_delta, description, admin_key } = req.body;

    // Validate admin key
    if (!admin_key || admin_key !== ADMIN_API_KEY) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Invalid admin API key' 
      });
      return;
    }

    // Validate required fields
    if ((!figma_user_id && !figma_username) || credits_delta === undefined) {
      res.status(400).json({ 
        error: 'Either figma_user_id or figma_username is required, along with credits_delta' 
      });
      return;
    }

    if (typeof credits_delta !== 'number') {
      res.status(400).json({ 
        error: 'credits_delta must be a number' 
      });
      return;
    }

    // Call the credits DB to update credits
    const dbResponse = await fetch(`${CREDITS_DB_URL}/admin/update-credits`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        figma_user_id,
        figma_username,
        credits_delta,
        description: description || `Admin adjustment: ${credits_delta > 0 ? '+' : ''}${credits_delta} credits`
      })
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      res.status(dbResponse.status).json({ 
        error: 'Database error', 
        details: 'Unable to update user credits'
      });
      return;
    }

    const result = await dbResponse.json();
    
    // Return success response
    res.status(200).json({
      success: true,
      message: `Credits updated successfully`,
      figma_user_id: result.figma_user_id,
      figma_username: result.figma_username,
      previous_credits: result.previous_credits,
      new_credits: result.new_credits,
      credits_delta: result.credits_delta,
      transaction_id: result.transaction_id
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong updating user credits'
    });
  }
}