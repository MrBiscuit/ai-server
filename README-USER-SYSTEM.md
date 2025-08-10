# User Management + Credit System

Complete user management and credit system for Figma plugins with Claude API integration.

## 🌟 Features

- **Permanent User ID Tracking**: Handles Figma username changes seamlessly
- **Dual Access Management**: Beta testers (manual) + paid users (automatic)
- **Credit System**: Pay-per-use with USD cost tracking
- **Webhook Integration**: Automatic credit purchases via Lemon Squeezy
- **Admin Dashboard**: Manage beta users and credits
- **Audit Trail**: Complete transaction logging
- **Legacy Compatibility**: Maintains existing API endpoints

## 🏗️ Architecture

```
Figma Plugin → Vercel API → Cloudflare D1 Database
                ↓
           Claude API + Credit Deduction
                ↓
        Lemon Squeezy Webhook → Credit Top-up
```

## 📚 API Endpoints

### User Endpoints (For Figma Plugin)

#### User Verification
```javascript
POST /api/user-verify
{
  "figma_user_id": "12345678",    // Permanent Figma ID
  "figma_username": "currentname"  // Current username
}

Response:
{
  "has_access": true,
  "access_type": "beta",  // "beta", "paid", "none"
  "credits": 150,
  "username_updated": false
}
```

#### Get Credits
```javascript
GET /api/user-credits?figma_user_id=12345678

Response:
{
  "figma_user_id": "12345678",
  "credits": 150,
  "access_type": "beta",
  "total_credits_purchased": 200,
  "total_credits_used": 50
}
```

#### Deduct Credits (Auto-called by Claude API)
```javascript
POST /api/user-deduct
{
  "figma_user_id": "12345678",
  "cost_usd": 0.05,
  "description": "Claude API usage"
}

Response:
{
  "success": true,
  "remaining_credits": 149.95,
  "transaction_id": 123
}
```

### Admin Endpoints

#### Add Beta User
```javascript
POST /api/admin/add-beta-user
{
  "figma_username": "beta_tester_name",
  "credits": 100,  // optional, defaults to 100
  "admin_key": "your_admin_secret"
}
```

#### List Users
```javascript
GET /api/admin/users?admin_key=your_admin_secret&access_type=beta&limit=50

Response:
{
  "users": [...],
  "total": 25,
  "has_more": false
}
```

#### Manually Adjust Credits
```javascript
PUT /api/admin/update-credits
{
  "figma_user_id": "12345678",  // or figma_username
  "credits_delta": 50,          // positive or negative
  "description": "Bonus credits",
  "admin_key": "your_admin_secret"
}
```

### Webhook Endpoint

#### Lemon Squeezy Webhook
```javascript
POST /api/lemonsqueezy-webhook
// Automatically processes credit purchases
// Maps email/custom_data to Figma username
// Adds credits and grants "paid" access
```

## 🚀 Deployment

### Prerequisites

1. **Environment Variables**:
```bash
export CLAUDE_API_KEY_CLEAN="your_claude_api_key"
export ADMIN_API_KEY="your_admin_secret"
export LEMONSQUEEZY_WEBHOOK_SECRET="your_webhook_secret"
```

2. **Tools Required**:
   - Node.js & npm
   - Vercel CLI
   - Wrangler CLI (Cloudflare)

### Quick Deploy

```bash
# Clone and setup
cd ai-server
npm install

# Deploy everything
./deploy.sh
```

### Manual Deploy Steps

1. **Database Migration**:
```bash
cd vv-credits-db
npx wrangler d1 execute vv_credits --file=migrations/0003_create_users_table.sql
npx wrangler d1 execute vv_credits --file=migrations/0004_migrate_existing_credits.sql
```

2. **Deploy Cloudflare Workers**:
```bash
cd vv-credits-db
npx wrangler deploy
```

3. **Deploy Vercel API**:
```bash
npx vercel --prod
```

## 🧪 Testing

Run comprehensive tests:
```bash
npm test
```

Individual test categories:
- Database migration compatibility
- User verification flow
- Beta user management
- Credit deduction logic
- Claude API integration
- Admin dashboard
- Webhook processing

## 📋 Database Schema

### Users Table
```sql
CREATE TABLE users (
    figma_user_id TEXT PRIMARY KEY,     -- Permanent Figma ID
    figma_username TEXT,                -- Current username
    credits INTEGER DEFAULT 0,          -- Available credits
    access_type TEXT DEFAULT 'none',    -- 'beta', 'paid', 'none'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_username_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    email TEXT,                         -- For webhook linking
    total_credits_purchased INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0
);
```

### Credit Transactions Table
```sql
CREATE TABLE credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    figma_user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,     -- 'purchase', 'usage', 'admin_adjustment', 'beta_grant'
    amount REAL NOT NULL,               -- Positive for added, negative for used
    usd_cost REAL,                      -- For usage transactions
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT                       -- JSON for additional data
);
```

## 🔧 Configuration

### Credit Packages (Lemon Squeezy)
Configure in `/api/lemonsqueezy-webhook.js`:
```javascript
const CREDIT_PACKAGES = {
  'starter_100': { credits: 100, usd_value: 5.00 },
  'pro_500': { credits: 500, usd_value: 20.00 },
  'premium_1000': { credits: 1000, usd_value: 35.00 },
  'enterprise_5000': { credits: 5000, usd_value: 150.00 }
};
```

### Claude API Pricing
Configure in `/api/chat.js`:
```javascript
const INPUT_PRICE_PER_MILLION = 3.00;   // $3 per million input tokens
const OUTPUT_PRICE_PER_MILLION = 15.00;  // $15 per million output tokens
```

## 🛠️ Figma Plugin Integration

Update your Figma plugin to use the new system:

```javascript
// 1. Verify user access on plugin start
const userAccess = await fetch('/api/user-verify', {
  method: 'POST',
  body: JSON.stringify({
    figma_user_id: figma.currentUser.id,
    figma_username: figma.currentUser.name
  })
});

// 2. Include user ID in Claude API calls
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages,
    figma_user_id: figma.currentUser.id,  // Add this!
    sessionId,
    isFirstMessage
  })
});

// 3. Handle insufficient credits
if (response.status === 402) {
  const error = await response.json();
  showCreditPurchaseDialog(error.current_credits, error.required_credits);
}
```

## 🔐 Security

- **Admin API Key**: Secure your admin endpoints
- **Webhook Signature**: Verify Lemon Squeezy webhooks
- **CORS Configuration**: Restrict origins in production
- **Rate Limiting**: Consider adding rate limits for abuse prevention

## 📊 Monitoring

### Useful Commands
```bash
# View real-time logs
npm run logs:workers
npm run logs:vercel

# Monitor database
npx wrangler d1 execute vv_credits --command="SELECT COUNT(*) FROM users"

# Check recent transactions
npx wrangler d1 execute vv_credits --command="SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 10"
```

### Key Metrics to Track
- Daily active users
- Credit consumption patterns
- API error rates
- Webhook processing success
- Revenue vs. usage costs

## 🚨 Troubleshooting

### Common Issues

1. **User not found**: Ensure user called `/api/user-verify` first
2. **Access denied**: Check user's `access_type` (must be 'beta' or 'paid')
3. **Webhook failures**: Verify signature and payload format
4. **Credit deduction errors**: Check user balance and access permissions

### Debug Tools
```bash
# Test user verification
curl -X POST https://your-vercel-url/api/user-verify \
  -H "Content-Type: application/json" \
  -d '{"figma_user_id":"test","figma_username":"test"}'

# Check credits
curl "https://your-vercel-url/api/user-credits?figma_user_id=test"

# Admin user list
curl "https://your-vercel-url/api/admin/users?admin_key=your_key&limit=5"
```

## 📈 Migration from Legacy System

The system maintains backward compatibility:
- Old `/get-credits` and `/update-credits` endpoints still work
- Existing credit data is migrated automatically
- Users are seamlessly upgraded when they first connect

## 🤝 Support

For issues or questions:
1. Check the test suite output: `npm test`
2. Review deployment logs: `npm run logs:workers` or `npm run logs:vercel`
3. Verify environment variables and database connectivity
4. Test individual endpoints with curl/Postman

---

## 📄 License

This user management system is part of your Figma plugin project. Use and modify as needed for your specific requirements.