import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

export default async function handler(req, res) {
  // Set CORS headers for Figma plugin
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
    const { figma_user_id, cost_usd, description, usage } = req.body;

    // Validate required fields
    if (!figma_user_id || cost_usd === undefined) {
      res.status(400).json({ 
        error: 'figma_user_id and cost_usd are required' 
      });
      return;
    }

    if (typeof cost_usd !== 'number' || cost_usd < 0) {
      res.status(400).json({ 
        error: 'cost_usd must be a non-negative number' 
      });
      return;
    }

    // Call the credits DB to deduct credits
    const dbResponse = await fetch(`${CREDITS_DB_URL}/user/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        figma_user_id,
        cost_usd,
        description: description || 'Claude API usage',
        metadata: usage ? JSON.stringify(usage) : null
      })
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      
      // Handle insufficient credits specifically
      if (dbResponse.status === 402) {
        const errorData = JSON.parse(errorText);
        res.status(402).json({
          error: 'Insufficient credits',
          insufficient_credits: true,
          current_credits: errorData.current_credits || 0,
          required_credits: errorData.required_credits || cost_usd
        });
        return;
      }
      
      res.status(dbResponse.status).json({ 
        error: 'Database error', 
        details: 'Unable to deduct credits'
      });
      return;
    }

    const result = await dbResponse.json();
    
    // Return deduction result
    res.status(200).json({
      success: true,
      figma_user_id: result.figma_user_id,
      remaining_credits: result.remaining_credits,
      cost_usd: result.cost_usd,
      transaction_id: result.transaction_id
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong deducting credits'
    });
  }
}