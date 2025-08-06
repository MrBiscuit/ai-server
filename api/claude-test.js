import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Test the Claude API directly
    const claudeRes = await fetch('https://sg.instcopilot-api.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2024-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello! Just say hi back.' }],
      })
    });

    console.log('Claude API status:', claudeRes.status);
    console.log('Claude API headers:', Object.fromEntries(claudeRes.headers.entries()));

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      console.log('Claude API error:', errorText);
      res.status(500).json({ 
        error: 'Claude API error',
        status: claudeRes.status,
        details: errorText
      });
      return;
    }

    const data = await claudeRes.json();
    console.log('Claude API response:', data);

    res.status(200).json({
      success: true,
      claudeResponse: data,
      apiKeyPresent: !!process.env.CLAUDE_API_KEY
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message,
      stack: error.stack
    });
  }
}