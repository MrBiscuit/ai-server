# Claude AI Server for Figma Plugin

A serverless Claude API proxy built for Vercel to secure your Figma plugin's API calls.

## Features

- Claude Sonnet 4 integration with custom endpoint
- Secure API key management via environment variables
- CORS support for Figma plugin domains
- Input validation and error handling
- Cost calculation for token usage
- Session and conversation management

## API Endpoint

### POST `/api/chat`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "sessionId": "optional-session-id",
  "isFirstMessage": true,
  "selectedCollectionIds": ["optional-array"]
}
```

**Response:**
```json
{
  "content": "Claude's response",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 25
  },
  "cost": {
    "inputCost": 0.00003,
    "outputCost": 0.000375,
    "totalCost": 0.000405
  },
  "sessionId": "session-id",
  "isFirstMessage": true
}
```

## Environment Variables

- `CLAUDE_API_KEY`: Your Claude API key (already configured)

## Current Status

✅ **DEPLOYED & READY!**

- **GitHub Repository**: https://github.com/MrBiscuit/ai-server
- **Production URL**: https://ai-server-rust.vercel.app
- **API Endpoint**: https://ai-server-rust.vercel.app/api/chat

## Important Notes

1. The Vercel project has authentication protection enabled
2. You may need to disable protection in Vercel dashboard for public API access
3. Alternatively, configure domain allowlist for your Figma plugin domains

## Next Steps for Figma Plugin Integration

Replace your current `callClaude` function in `src/plugin/services/aiService.ts`:

```typescript
export async function callClaude(messages: ConversationMessage[]): Promise<ClaudeApiResponse> {
  try {
    const res = await fetch('https://ai-server-rust.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}
```

## Security Recommendations

1. Remove the hardcoded Claude API key from your plugin code
2. Configure Vercel project settings to allow your domains
3. Consider adding rate limiting for production use
4. Monitor usage through Vercel analytics

## Support

- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Issues**: https://github.com/MrBiscuit/ai-server/issues