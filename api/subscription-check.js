import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const CRON_SECRET = process.env.CRON_SECRET; // Optional secret for securing cron endpoint

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET and POST methods
  if (!['GET', 'POST'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Optional: Check cron secret for security
    if (CRON_SECRET) {
      const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
      if (providedSecret !== CRON_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    console.log('Starting subscription expiration check...');

    // Call the subscription check endpoint
    const dbResponse = await fetch(`${CREDITS_DB_URL}/subscription/check-expiration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const result = await dbResponse.json();

    if (!dbResponse.ok) {
      console.error(`Subscription check error ${dbResponse.status}:`, result);
      res.status(dbResponse.status).json({ 
        error: result.error || 'Subscription check failed', 
        details: result.details || 'Unable to check subscription expiration' 
      });
      return;
    }

    console.log(`Subscription check completed: ${result.users_checked} users checked, ${result.expired_count} expired`);

    // Return summary
    res.status(200).json({ 
      success: true,
      timestamp: new Date().toISOString(),
      users_checked: result.users_checked,
      expired_count: result.expired_count,
      message: `Checked ${result.users_checked} users, found ${result.expired_count} expired subscriptions`
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: 'Something went wrong while checking subscription expiration' 
    });
  }
}
