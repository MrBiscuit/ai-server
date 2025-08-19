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

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';

async function deductUserCredits(figmaUserId, costUsd, usage) {
  try {
    const response = await fetch(`${CREDITS_DB_URL}/user/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        figma_user_id: figmaUserId,
        cost_usd: costUsd,
        description: 'Claude API usage',
        metadata: usage ? JSON.stringify(usage) : null
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error,
        insufficient_credits: response.status === 402,
        current_credits: errorData.current_credits || 0
      };
    }

    const result = await response.json();
    return { 
      success: true, 
      remaining_credits: result.remaining_credits,
      transaction_id: result.transaction_id
    };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: 'Failed to process credits' };
  }
}

export default async function handler(req, res) {
  // Set CORS headers for ALL responses (including errors)
  const setCORSHeaders = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };

  // Set CORS headers immediately
  setCORSHeaders();

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
    const { messages, sessionId, isFirstMessage, selectedCollectionIds, figma_user_id } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    if (!figma_user_id) {
      res.status(400).json({ error: 'figma_user_id is required for credit tracking' });
      return;
    }

    // Validate message format
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.role || !message.content) {
        console.error(`Message at index ${i} missing role or content:`, message);
        res.status(400).json({ 
          error: 'Invalid message format',
          details: `Message at index ${i} is missing required fields (role/content)`
        });
        return;
      }
      if (!['user', 'assistant'].includes(message.role)) {
        console.error(`Message at index ${i} has invalid role '${message.role}':`, message);
        res.status(400).json({ 
          error: 'Invalid message format',
          details: `Message at index ${i} has invalid role '${message.role}'. Must be 'user' or 'assistant'`
        });
        return;
      }
    }

    // Call Claude API
    const claudeRes = await fetch(`${CLAUDE_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY_CLEAN,
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

    // Deduct credits for the API usage
    let creditResult = { success: true }; // Default for when cost calculation fails
    
    if (cost && cost.totalCost > 0) {
      creditResult = await deductUserCredits(figma_user_id, cost.totalCost, usage);
      
      if (!creditResult.success) {
        if (creditResult.insufficient_credits) {
          res.status(402).json({
            error: 'Insufficient credits',
            insufficient_credits: true,
            current_credits: creditResult.current_credits,
            required_credits: cost.totalCost,
            usage,
            cost
          });
          return;
        } else {
          console.error('Credit deduction failed:', creditResult.error);
          // Continue with the response but log the error
        }
      }
    }

    // Return response in expected format
    res.status(200).json({
      content,
      usage,
      cost,
      sessionId,
      isFirstMessage,
      remaining_credits: creditResult.remaining_credits,
      transaction_id: creditResult.transaction_id,
      credits_deducted: cost?.totalCost || 0
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Something went wrong processing your request'
    });
  }
}