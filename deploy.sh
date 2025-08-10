#!/bin/bash

# Comprehensive deployment script for User Management + Credit System
# Run this script to deploy all components

set -e  # Exit on any error

echo "🚀 Deploying User Management + Credit System"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check required environment variables
check_env_vars() {
    print_step "Checking environment variables..."
    
    required_vars=("CLAUDE_API_KEY_CLEAN" "ADMIN_API_KEY" "LEMONSQUEEZY_WEBHOOK_SECRET")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these environment variables and run the script again."
        echo "Example:"
        echo "  export CLAUDE_API_KEY_CLEAN='your_claude_api_key'"
        echo "  export ADMIN_API_KEY='your_admin_secret'"
        echo "  export LEMONSQUEEZY_WEBHOOK_SECRET='your_webhook_secret'"
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Deploy Cloudflare D1 database migrations
deploy_database() {
    print_step "Deploying database migrations..."
    
    cd vv-credits-db
    
    # Apply migrations
    print_step "Applying migration 0003 (create users table)..."
    npx wrangler d1 execute vv_credits --file=migrations/0003_create_users_table.sql
    
    print_step "Applying migration 0004 (migrate existing credits)..."
    npx wrangler d1 execute vv_credits --file=migrations/0004_migrate_existing_credits.sql
    
    print_success "Database migrations completed"
    
    cd ..
}

# Deploy Cloudflare Workers
deploy_workers() {
    print_step "Deploying Cloudflare Workers..."
    
    cd vv-credits-db
    
    # Deploy the workers
    npx wrangler deploy
    
    print_success "Cloudflare Workers deployed"
    
    cd ..
}

# Deploy Vercel API
deploy_vercel() {
    print_step "Deploying Vercel API endpoints..."
    
    # Set environment variables for Vercel
    print_step "Setting Vercel environment variables..."
    
    npx vercel env add CLAUDE_API_KEY_CLEAN production <<< "$CLAUDE_API_KEY_CLEAN" || true
    npx vercel env add ADMIN_API_KEY production <<< "$ADMIN_API_KEY" || true
    npx vercel env add LEMONSQUEEZY_WEBHOOK_SECRET production <<< "$LEMONSQUEEZY_WEBHOOK_SECRET" || true
    npx vercel env add CREDITS_DB_URL production <<< "https://vv-credits-db.sunshuaiqi.workers.dev" || true
    
    # Deploy to production
    npx vercel --prod
    
    print_success "Vercel API deployed"
}

# Test the deployment
test_deployment() {
    print_step "Testing deployment..."
    
    # Wait a moment for deployment to propagate
    sleep 5
    
    # Run basic health checks
    echo "Running basic health checks..."
    
    # Test Cloudflare Workers
    if curl -f -s "https://vv-credits-db.sunshuaiqi.workers.dev/get-credits?user_id=test" > /dev/null; then
        print_success "Cloudflare Workers health check passed"
    else
        print_warning "Cloudflare Workers health check failed"
    fi
    
    # Test Vercel API
    VERCEL_URL=$(npx vercel --scope=your-team inspect --timeout 10s | grep "https://" | head -1 | awk '{print $2}')
    if [[ -n "$VERCEL_URL" ]]; then
        if curl -f -s -X OPTIONS "$VERCEL_URL/api/user-verify" > /dev/null; then
            print_success "Vercel API health check passed"
        else
            print_warning "Vercel API health check failed"
        fi
    else
        print_warning "Could not determine Vercel URL for testing"
    fi
}

# Update package.json scripts
update_package_scripts() {
    print_step "Updating package.json scripts..."
    
    # Add useful npm scripts
    cat > package.json << 'EOF'
{
  "name": "ai-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "test": "node test-user-system.js",
    "dev": "vercel dev",
    "deploy": "bash deploy.sh",
    "deploy:vercel": "vercel --prod",
    "deploy:workers": "cd vv-credits-db && npx wrangler deploy",
    "migrate:db": "cd vv-credits-db && npx wrangler d1 execute vv_credits --file=migrations/0003_create_users_table.sql && npx wrangler d1 execute vv_credits --file=migrations/0004_migrate_existing_credits.sql",
    "logs:workers": "cd vv-credits-db && npx wrangler tail",
    "logs:vercel": "npx vercel logs"
  },
  "keywords": ["claude", "ai", "proxy", "figma", "vercel", "user-management", "credits"],
  "author": "",
  "license": "ISC",
  "description": "A serverless Claude API proxy with user management and credit system for Figma plugins",
  "dependencies": {
    "node-fetch": "^3.3.2"
  }
}
EOF
    
    print_success "Package.json updated with deployment scripts"
}

# Main deployment flow
main() {
    echo ""
    print_step "Starting deployment process..."
    echo ""
    
    # Check prerequisites
    if ! command -v npx &> /dev/null; then
        print_error "npx is required but not installed. Please install Node.js."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed."
        exit 1
    fi
    
    # Run deployment steps
    check_env_vars
    update_package_scripts
    deploy_database
    deploy_workers
    deploy_vercel
    test_deployment
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "=================================="
    echo ""
    echo "📍 Your endpoints:"
    echo "   • Cloudflare Workers: https://vv-credits-db.sunshuaiqi.workers.dev"
    echo "   • Vercel API: $(npx vercel --scope=your-team inspect --timeout 5s 2>/dev/null | grep "https://" | head -1 | awk '{print $2}' || echo 'Check Vercel dashboard')"
    echo ""
    echo "🔧 Useful commands:"
    echo "   • Run tests: npm test"
    echo "   • View logs: npm run logs:workers  or  npm run logs:vercel"
    echo "   • Redeploy: npm run deploy"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Test the system with: npm test"
    echo "   2. Update your Figma plugin to use the new endpoints"
    echo "   3. Configure Lemon Squeezy webhook URL"
    echo "   4. Add your first beta users via admin API"
    echo ""
}

# Run main function
main "$@"