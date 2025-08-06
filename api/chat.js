import fetch from "node-fetch";

// Claude API Configuration
const CLAUDE_BASE = 'https://sg.instcopilot-api.com';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const API_VERSION = '2024-06-01';
const MAX_TOKENS = 8192;

// Cost calculation for Claude Sonnet 4
function calculateCost(usage) {
  if (!usage || !usage.input_tokens || !usage.output_tokens) {
    return undefined;
  }
  
  // Claude Sonnet 4 pricing (per million tokens)
  const INPUT_PRICE_PER_MILLION = 3.00;
  const OUTPUT_PRICE_PER_MILLION = 15.00;
  
  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  const totalCost = inputCost + outputCost;
  
  return { inputCost, outputCost, totalCost };
}

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
    const { messages, sessionId, isFirstMessage, selectedCollectionIds } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content || !['user', 'assistant'].includes(message.role)) {
        res.status(400).json({ error: 'Invalid message format' });
        return;
      }
    }

    // Call Claude API
    const claudeRes = await fetch(`${CLAUDE_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: messages,
      })
    });

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      console.error(`Claude API error ${claudeRes.status}: ${errorText}`);
      res.status(claudeRes.status).json({ 
        error: 'Claude API error', 
        details: claudeRes.status >= 500 ? 'Internal server error' : 'Invalid request'
      });
      return;
    }

    const claudeData = await claudeRes.json();
    
    // Extract content from Claude response
    const content = Array.isArray(claudeData.content) && typeof claudeData.content[0]?.text === 'string'
      ? claudeData.content[0].text
      : (typeof claudeData.message === 'string' ? claudeData.message : '');
    
    if (!content) {
      res.status(500).json({ error: 'Unexpected response structure from Claude API' });
      return;
    }

    // Calculate cost if usage data is available
    const usage = claudeData.usage;
    const cost = calculateCost(usage);

    // Return response in expected format
    res.status(200).json({
      content,
      usage,
      cost,
      sessionId,
      isFirstMessage
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong processing your request'
    });
  }
}