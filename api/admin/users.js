import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export default async function handler(req, res) {
  // Set CORS headers
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
    const admin_key = req.query.admin_key;

    // Validate admin key
    if (!admin_key || admin_key !== ADMIN_API_KEY) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Invalid admin API key' 
      });
      return;
    }

    // Optional filters
    const access_type = req.query.access_type;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // Build query string
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (access_type) {
      params.append('access_type', access_type);
    }

    // Call the credits DB to get users list
    const dbResponse = await fetch(`${CREDITS_DB_URL}/admin/users?${params}`, {
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
        details: 'Unable to retrieve users list'
      });
      return;
    }

    const result = await dbResponse.json();
    
    // Return users list
    res.status(200).json({
      users: result.users,
      total: result.total,
      limit,
      offset,
      has_more: result.has_more
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong retrieving users list'
    });
  }
}