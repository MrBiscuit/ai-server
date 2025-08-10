import fetch from "node-fetch";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

function parseLicenseToCredits(license) {
  if (/^DEV-\d+$/.test(license)) {
    const credits = parseInt(license.split('-')[1], 10);
    if (credits > 0) return { credits, source: 'dev' };
  }
  if (license.includes('STARTER')) return { credits: 100, source: 'package' };
  if (license.includes('PRO')) return { credits: 500, source: 'package' };
  if (license.includes('PREMIUM')) return { credits: 1000, source: 'package' };
  return null;
}

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

    const parsed = parseLicenseToCredits(license_key.trim());
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or unsupported license key' });
      return;
    }

    const dbResponse = await fetch(`${CREDITS_DB_URL}/user/add-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figma_user_id,
        credits: parsed.credits,
        description: `License redemption (${parsed.source})`,
        transaction_type: 'redeem',
        metadata: { license_key: license_key.replace(/.(?=.{4}$)/g, '*') }
      })
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
      res.status(dbResponse.status).json({ error: 'Database error', details: 'Unable to add credits' });
      return;
    }

    const result = await dbResponse.json();
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', details: 'Something went wrong redeeming license' });
  }
}

