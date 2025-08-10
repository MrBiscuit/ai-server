# Deployment Commands Reference

Quick reference for deploying the User Management + Credit System.

## 📋 Prerequisites

1. **Install Dependencies**:
```bash
# Node.js and npm (required)
npm install

# Vercel CLI
npm install -g vercel

# Wrangler CLI (Cloudflare)
npm install -g wrangler
```

2. **Set Environment Variables**:
```bash
export CLAUDE_API_KEY_CLEAN="your_claude_api_key"
export ADMIN_API_KEY="your_admin_secret"
export LEMONSQUEEZY_WEBHOOK_SECRET="your_webhook_secret"
```

## 🚀 One-Command Deployment

```bash
# Deploy everything automatically
./deploy.sh
```

## 🔧 Manual Deployment Steps

### 1. Database Schema Migration

```bash
cd vv-credits-db

# Apply new user management schema
npx wrangler d1 execute vv_credits --file=migrations/0003_create_users_table.sql

# Migrate existing credit data
npx wrangler d1 execute vv_credits --file=migrations/0004_migrate_existing_credits.sql

cd ..
```

### 2. Deploy Cloudflare Workers

```bash
cd vv-credits-db

# Deploy the database service
npx wrangler deploy

cd ..
```

### 3. Deploy Vercel API

```bash
# Set environment variables
npx vercel env add CLAUDE_API_KEY_CLEAN production
npx vercel env add ADMIN_API_KEY production  
npx vercel env add LEMONSQUEEZY_WEBHOOK_SECRET production
npx vercel env add CREDITS_DB_URL production

# Deploy to production
npx vercel --prod
```

## 🧪 Testing Commands

```bash
# Run comprehensive test suite
npm test

# Individual component tests
node test-user-system.js

# Manual API testing examples
curl -X POST https://your-vercel-url/api/user-verify \
  -H "Content-Type: application/json" \
  -d '{"figma_user_id":"test123","figma_username":"testuser"}'
```

## 🔍 Verification Commands

### Check Database

```bash
cd vv-credits-db

# Verify tables exist
npx wrangler d1 execute vv_credits --command="SELECT name FROM sqlite_master WHERE type='table'"

# Check user count
npx wrangler d1 execute vv_credits --command="SELECT COUNT(*) as user_count FROM users"

# View recent transactions
npx wrangler d1 execute vv_credits --command="SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 5"
```

### Test Endpoints

```bash
# Get your Vercel URL
VERCEL_URL=$(npx vercel --scope=your-team inspect | grep "https://" | head -1)

# Test user verification
curl -X POST $VERCEL_URL/api/user-verify \
  -H "Content-Type: application/json" \
  -d '{"figma_user_id":"test123","figma_username":"testuser"}'

# Test admin endpoint (replace with your admin key)
curl "$VERCEL_URL/api/admin/users?admin_key=your_admin_secret&limit=5"
```

## 📊 Monitoring Commands

### Real-time Logs

```bash
# Cloudflare Workers logs
cd vv-credits-db && npx wrangler tail

# Vercel API logs  
npx vercel logs
```

### Database Queries

```bash
cd vv-credits-db

# Active users today
npx wrangler d1 execute vv_credits --command="
SELECT access_type, COUNT(*) as count 
FROM users 
WHERE last_username_update > datetime('now', '-1 day') 
GROUP BY access_type"

# Credit usage in last 24 hours
npx wrangler d1 execute vv_credits --command="
SELECT 
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  SUM(usd_cost) as total_usd_cost
FROM credit_transactions 
WHERE created_at > datetime('now', '-1 day') 
GROUP BY transaction_type"

# Top users by credit usage
npx wrangler d1 execute vv_credits --command="
SELECT 
  u.figma_username,
  u.total_credits_used,
  u.credits as remaining_credits,
  u.access_type
FROM users u 
WHERE u.total_credits_used > 0 
ORDER BY u.total_credits_used DESC 
LIMIT 10"
```

## 🛠️ Admin Operations

### Add Beta User

```bash
curl -X POST https://your-vercel-url/api/admin/add-beta-user \
  -H "Content-Type: application/json" \
  -d '{
    "figma_username": "new_beta_tester",
    "credits": 100,
    "admin_key": "your_admin_secret"
  }'
```

### Manually Adjust Credits

```bash
curl -X PUT https://your-vercel-url/api/admin/update-credits \
  -H "Content-Type: application/json" \
  -d '{
    "figma_username": "username_here",
    "credits_delta": 50,
    "description": "Bonus credits for feedback",
    "admin_key": "your_admin_secret"
  }'
```

### List All Users

```bash
curl "https://your-vercel-url/api/admin/users?admin_key=your_admin_secret&limit=20"
```

## 🔄 Update/Redeploy Commands

### Update Workers Only

```bash
cd vv-credits-db
npx wrangler deploy
cd ..
```

### Update Vercel Only

```bash
npx vercel --prod
```

### Database Schema Updates (if needed)

```bash
cd vv-credits-db

# Create new migration file
echo "-- Migration: $(date '+%Y%m%d_%H%M%S')
-- Your SQL here" > migrations/$(date '+%Y%m%d_%H%M%S')_description.sql

# Apply migration
npx wrangler d1 execute vv_credits --file=migrations/your_new_migration.sql

cd ..
```

## 🚨 Troubleshooting Commands

### Check Service Health

```bash
# Test Cloudflare Workers
curl -f "https://vv-credits-db.sunshuaiqi.workers.dev/get-credits?user_id=test" || echo "Workers down"

# Test Vercel API
curl -f -X OPTIONS "https://your-vercel-url/api/user-verify" || echo "Vercel down"
```

### Reset Test Data

```bash
cd vv-credits-db

# Clear test users (be careful!)
npx wrangler d1 execute vv_credits --command="DELETE FROM users WHERE figma_user_id LIKE 'test_%'"
npx wrangler d1 execute vv_credits --command="DELETE FROM credit_transactions WHERE figma_user_id LIKE 'test_%'"

cd ..
```

### View Full Error Logs

```bash
# Last 100 Vercel logs
npx vercel logs --limit=100

# Real-time Workers logs with filters
cd vv-credits-db
npx wrangler tail --format=pretty
```

## 🔐 Security Verification

### Check Environment Variables

```bash
# Verify Vercel env vars are set
npx vercel env ls

# Check Workers secrets
cd vv-credits-db
npx wrangler secret list
```

### Test Authentication

```bash
# Test admin endpoint without key (should fail)
curl "https://your-vercel-url/api/admin/users" 
# Expected: 401 Unauthorized

# Test admin endpoint with wrong key (should fail)  
curl "https://your-vercel-url/api/admin/users?admin_key=wrong_key"
# Expected: 401 Unauthorized

# Test admin endpoint with correct key (should work)
curl "https://your-vercel-url/api/admin/users?admin_key=your_admin_secret"
# Expected: 200 OK with user list
```

## 📋 Environment Setup

Create environment file:
```bash
cp env.example .env
# Edit .env with your actual values
```

Load environment:
```bash
# For bash/zsh
source .env
export $(cat .env | grep -v '^#' | xargs)

# Or set manually
export CLAUDE_API_KEY_CLEAN="your_key"
export ADMIN_API_KEY="your_admin_secret"  
export LEMONSQUEEZY_WEBHOOK_SECRET="your_webhook_secret"
```

---

**📌 Remember**: Always test in a staging environment before deploying to production, and keep your API keys secure!