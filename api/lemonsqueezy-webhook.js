import fetch from "node-fetch";
import crypto from "crypto";

const CREDITS_DB_URL = process.env.CREDITS_DB_URL || 'https://vv-credits-db.sunshuaiqi.workers.dev';
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

// Credit packages mapping - adjust based on your Lemon Squeezy products
const CREDIT_PACKAGES = {
  'starter_100': { credits: 100, usd_value: 5.00 },
  'pro_500': { credits: 500, usd_value: 20.00 },
  'premium_1000': { credits: 1000, usd_value: 35.00 },
  'enterprise_5000': { credits: 5000, usd_value: 150.00 }
};

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Lemon Squeezy sends signature as "sha256=<hash>"
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature');

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
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-signature'];

    // Verify webhook signature if secret is configured
    if (LEMONSQUEEZY_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(rawBody, signature, LEMONSQUEEZY_WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const webhookData = req.body;
    const eventName = webhookData.meta?.event_name;

    // Log webhook for debugging
    await fetch(`${CREDITS_DB_URL}/webhook/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_type: 'lemonsqueezy',
        event_name: eventName,
        payload: rawBody
      })
    });

    // Handle different webhook events
    if (eventName === 'order_created' || eventName === 'subscription_payment_success') {
      const orderData = webhookData.data;
      const customData = orderData.attributes?.first_order_item?.custom_data || {};
      
      // Extract user information from custom data or order
      const figmaUsername = customData.figma_username || orderData.attributes?.user_email;
      const email = orderData.attributes?.user_email;
      const productName = orderData.attributes?.first_order_item?.product_name;
      const variantName = orderData.attributes?.first_order_item?.variant_name;
      const totalUsd = parseFloat(orderData.attributes?.total) / 100; // Convert cents to dollars

      if (!figmaUsername) {
        console.error('No Figma username provided in webhook');
        res.status(400).json({ 
          error: 'Figma username required',
          details: 'Please provide figma_username in custom_data'
        });
        return;
      }

      // Determine credit package based on product/variant
      let creditPackage = null;
      const packageKey = Object.keys(CREDIT_PACKAGES).find(key => 
        productName?.toLowerCase().includes(key.split('_')[0]) ||
        variantName?.toLowerCase().includes(key.split('_')[0])
      );

      if (packageKey) {
        creditPackage = CREDIT_PACKAGES[packageKey];
      } else {
        // Fallback: calculate credits based on USD value (e.g., $1 = 20 credits)
        const creditsPerDollar = 20;
        creditPackage = {
          credits: Math.floor(totalUsd * creditsPerDollar),
          usd_value: totalUsd
        };
      }

      // Process credit purchase in database
      const dbResponse = await fetch(`${CREDITS_DB_URL}/webhook/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figma_username,
          email,
          credits: creditPackage.credits,
          usd_amount: totalUsd,
          product_name: productName,
          variant_name: variantName,
          order_id: orderData.id,
          webhook_id: webhookData.meta?.webhook_id
        })
      });

      if (!dbResponse.ok) {
        const errorText = await dbResponse.text();
        console.error(`Credits DB error ${dbResponse.status}: ${errorText}`);
        res.status(500).json({ 
          error: 'Database error processing purchase',
          details: 'Credits may not have been added'
        });
        return;
      }

      const result = await dbResponse.json();
      
      console.log(`Successfully processed purchase for ${figmaUsername}: +${creditPackage.credits} credits`);
      
      res.status(200).json({
        received: true,
        processed: true,
        credits_added: creditPackage.credits,
        figma_username: figmaUsername,
        user_id: result.figma_user_id
      });

    } else if (eventName === 'subscription_cancelled') {
      // Handle subscription cancellation if needed
      console.log('Subscription cancelled:', webhookData.data.id);
      
      res.status(200).json({
        received: true,
        processed: true,
        message: 'Subscription cancellation noted'
      });

    } else {
      // Unknown event type, just acknowledge receipt
      console.log(`Unhandled webhook event: ${eventName}`);
      
      res.status(200).json({
        received: true,
        processed: false,
        message: `Event ${eventName} acknowledged but not processed`
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 to prevent webhook retries for malformed data
    res.status(200).json({ 
      received: true,
      processed: false,
      error: 'Processing error',
      details: error.message
    });
  }
}