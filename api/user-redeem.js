import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { figma_user_id, license_key } = req.body || {};

    if (!figma_user_id || !license_key) {
      res.status(400).json({ error: 'figma_user_id and license_key are required' });
      return;
    }

    // Call the new license activation endpoint
    const dbResponse = await fetch(`${CREDITS_DB_URL}/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figma_user_id,
        license_key: license_key.trim()
      })
    });

    const result = await dbResponse.json();

    if (!dbResponse.ok) {
      console.error(`License activation error ${dbResponse.status}:`, result);
      
      // Map specific error responses
      if (dbResponse.status === 400 && result.error === 'Invalid license key') {
        res.status(400).json({ 
          error: 'Invalid license key', 
          details: 'This license key is not valid or has expired. Please check your license key and try again.' 
        });
        return;
      }
      
      if (dbResponse.status === 409) {
        res.status(409).json({ 
          error: result.error || 'License conflict', 
          details: result.details || 'This license key cannot be activated.' 
        });
        return;
      }
      
      if (dbResponse.status === 404) {
        res.status(404).json({ 
          error: 'User not found', 
          details: 'Please ensure you are logged into Figma and try again.' 
        });
        return;
      }
      
      res.status(dbResponse.status).json({ 
        error: result.error || 'License activation failed', 
        details: result.details || 'Unable to activate license key' 
      });
      return;
    }

    // Success response with subscription information
    res.status(200).json({ 
      success: true, 
      figma_user_id: result.figma_user_id,
      subscription_type: result.subscription_type,
      expires_at: result.expires_at,
      status: result.status,
      message: `Successfully activated ${result.subscription_type} subscription${result.expires_at ? ` (expires: ${new Date(result.expires_at).toLocaleDateString()})` : ''}`
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: 'Something went wrong while activating the license. Please try again.' 
    });
  }
}

