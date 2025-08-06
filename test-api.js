import fetch from 'node-fetch';

const VERCEL_URL = 'https://ai-server-rust.vercel.app';

async function testAPI() {
  try {
    console.log('Testing Claude API endpoint...');
    
    const response = await fetch(`${VERCEL_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello! Can you help me test this API? Please respond with a simple greeting.'
          }
        ],
        sessionId: 'test-session-123',
        isFirstMessage: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error ${response.status}: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('Success! API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test cost calculation
    if (data.cost) {
      console.log(`\nCost Information:`);
      console.log(`Input Cost: $${data.cost.inputCost.toFixed(6)}`);
      console.log(`Output Cost: $${data.cost.outputCost.toFixed(6)}`);
      console.log(`Total Cost: $${data.cost.totalCost.toFixed(6)}`);
    }

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();