# License Management System

Complete Lemon Squeezy license activation and subscription management system for Variable Visualizer.

## Overview

This system provides:
- 🔐 **License Key Activation** - One-time binding of license keys to Figma users
- 👤 **User Binding** - Prevents license sharing (1 key = 1 user)
- ⏰ **Subscription Tracking** - Automatic expiration and downgrade
- 📊 **Audit Trail** - Complete history of subscription events
- 🤖 **Auto-expiration** - Background jobs to check and downgrade expired users

## Architecture

```
Figma Plugin → API Gateway → D1 Database ← Cron Jobs
     ↓              ↓            ↓            ↓
  AccountDialog  user-redeem  license_keys  subscription-check
                              users         (every 6 hours)
                              events
```

## Database Schema

### license_keys
```sql
- license_key: Unique Lemon Squeezy license key
- figma_user_id: Bound user (prevents sharing)
- subscription_type: 'monthly', 'yearly', 'lifetime'
- status: 'inactive', 'active', 'expired', 'cancelled'
- expires_at: Calculated expiration date
- activation_limit/usage: Prevent multiple activations
```

### users (enhanced)
```sql
- subscription_type: Current subscription level
- subscription_expires_at: When subscription ends
- subscription_status: 'active', 'expired', 'none'
- license_key_id: Reference to active license
```

### subscription_events
```sql
- Complete audit trail of all subscription changes
- Event types: 'activated', 'expired', 'cancelled', 'renewed'
```

## API Endpoints

### License Activation
```http
POST /license/activate
{
  "figma_user_id": "123456789",
  "license_key": "90CABA63-6738-4718-9D73-386AB4DEFFF1"
}
```

**Response:**
```json
{
  "success": true,
  "figma_user_id": "123456789",
  "subscription_type": "monthly",
  "expires_at": "2025-02-15T18:57:00.000Z",
  "status": "active"
}
```

**Error Cases:**
- `400` - Invalid license key
- `409` - License already bound to different user
- `409` - Activation limit reached
- `404` - User not found

### Subscription Status
```http
GET /subscription/status?figma_user_id=123456789
```

### Expiration Check (Cron)
```http
POST /subscription/check-expiration
```

## License Validation Flow

1. **Frontend Input** - User enters license key in AccountDialog
2. **Lemon Squeezy Validation** - Verify key with LS API
3. **Database Check** - Check if key exists and binding status
4. **User Binding** - Bind key to specific figma_user_id
5. **Subscription Setup** - Calculate expiry, update user access
6. **Audit Logging** - Record activation event

## Subscription Types

### Monthly Subscription
- **Duration**: 30 days from activation
- **Auto-renewal**: Not implemented (requires webhook)
- **Expiration**: Automatic downgrade to 'none' access

### Yearly Subscription  
- **Duration**: 365 days from activation
- **Auto-renewal**: Not implemented (requires webhook)
- **Expiration**: Automatic downgrade to 'none' access

### Lifetime
- **Duration**: Never expires
- **Access**: Permanent 'paid' access

## Security Features

### License Binding
- Each license can only be activated once per user
- Prevents license key sharing
- Tracks activation usage vs limits

### User Validation
- Must be existing Figma user to activate
- User ID verification through plugin context

### API Security
- CORS protection
- Input validation
- Error handling without data leakage

## Background Jobs

### Subscription Expiration Check
- **Schedule**: Every 6 hours via Vercel Cron
- **Endpoint**: `/api/subscription-check`
- **Function**: 
  - Find users with expired subscriptions
  - Downgrade access_type to 'none'
  - Update license status to 'expired'
  - Log subscription events

### Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/subscription-check",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Migration Guide

### 1. Run Database Migration
```bash
cd ai-server/vv-credits-db
wrangler d1 migrations apply vv-credits-db --local  # Test locally
wrangler d1 migrations apply vv-credits-db          # Apply to production
```

### 2. Deploy Updated Worker
```bash
cd ai-server/vv-credits-db
npm run deploy
```

### 3. Deploy API Changes
```bash
cd ai-server
vercel --prod
```

### 4. Update Plugin
The Figma plugin already calls the correct endpoints - no changes needed.

## Monitoring & Debugging

### Audit Trail
```sql
SELECT * FROM subscription_events 
WHERE figma_user_id = 'USER_ID' 
ORDER BY created_at DESC;
```

### Active Subscriptions
```sql
SELECT u.figma_username, u.subscription_type, u.subscription_expires_at, l.license_key
FROM users u 
JOIN license_keys l ON u.license_key_id = l.id
WHERE u.subscription_status = 'active';
```

### Expired Subscriptions
```sql
SELECT * FROM users 
WHERE subscription_expires_at < datetime('now') 
AND subscription_status = 'active';
```

## Error Handling

### License Activation Errors
- **Invalid Key**: Lemon Squeezy validation failed
- **Already Bound**: Key is bound to different user
- **Activation Limit**: Key has been used too many times
- **User Not Found**: Figma user doesn't exist in database

### Recovery Procedures
- **Unbind License**: Admin can manually update `figma_user_id = NULL`
- **Reset Activation**: Admin can reset `activation_usage = 0`
- **Manual Renewal**: Admin can extend `subscription_expires_at`

## Environment Variables

```bash
# Required
CREDITS_DB_URL=https://vv-credits-db.sunshuaiqi.workers.dev
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret

# Optional
CRON_SECRET=your_cron_secret_for_security
```

## Testing

### Test License Activation
```bash
curl -X POST https://your-api.vercel.app/api/user-redeem \
  -H "Content-Type: application/json" \
  -d '{
    "figma_user_id": "test_user_123",
    "license_key": "YOUR_LEMON_SQUEEZY_LICENSE"
  }'
```

### Test Expiration Check
```bash
curl -X POST https://your-api.vercel.app/api/subscription-check
```

## Future Enhancements

1. **Webhook Integration** - Real-time subscription updates from Lemon Squeezy
2. **Grace Period** - 7-day grace period before downgrade
3. **Renewal Notifications** - Email alerts before expiration
4. **Usage Analytics** - Track feature usage per subscription tier
5. **Admin Dashboard** - Web interface for license management

## Support

For issues with license activation:
1. Check Lemon Squeezy dashboard for license status
2. Verify license key format and validity
3. Check database logs for activation attempts
4. Use admin endpoints to manually resolve conflicts
