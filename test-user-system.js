// Comprehensive test script for the user management and credit system
const VERCEL_API_BASE = 'https://ai-server-chhwez2wn-mrbiscuits-projects.vercel.app'; // Update with your actual Vercel URL
const CREDITS_DB_URL = 'https://vv-credits-db.sunshuaiqi.workers.dev';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'your_admin_secret';

// For testing, use Workers directly since Vercel requires auth
const TEST_API_BASE = CREDITS_DB_URL;

// Test configuration
const TEST_USER = {
  figma_user_id: 'test_12345678',
  figma_username: 'test_user_beta',
  figma_username_changed: 'test_user_beta_new'
};

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDatabaseMigration() {
  log('\n=== Testing Database Migration ===', 'blue');
  
  // Test legacy endpoint still works
  const legacyTest = await apiCall(`${CREDITS_DB_URL}/get-credits?user_id=test_legacy`);
  log(`Legacy endpoint test: ${legacyTest.success ? 'PASS' : 'FAIL'}`, legacyTest.success ? 'green' : 'red');
  
  if (legacyTest.success) {
    log(`Legacy credits: ${legacyTest.data.credits}`, 'yellow');
  }
}

async function testUserVerification() {
  log('\n=== Testing User Verification ===', 'blue');
  
  // Test 1: New user verification
  log('Test 1: New user verification');
  const verifyNew = await apiCall(`${TEST_API_BASE}/user/verify`, {
    method: 'POST',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      figma_username: TEST_USER.figma_username
    })
  });
  
  log(`New user verification: ${verifyNew.success ? 'PASS' : 'FAIL'}`, verifyNew.success ? 'green' : 'red');
  if (verifyNew.success) {
    log(`Access type: ${verifyNew.data.access_type}, Credits: ${verifyNew.data.credits}`, 'yellow');
  } else {
    log(`Error: ${JSON.stringify(verifyNew.data)}`, 'red');
  }
  
  // Test 2: Username change detection
  log('Test 2: Username change detection');
  const verifyChanged = await apiCall(`${TEST_API_BASE}/user/verify`, {
    method: 'POST',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      figma_username: TEST_USER.figma_username_changed
    })
  });
  
  log(`Username change detection: ${verifyChanged.success ? 'PASS' : 'FAIL'}`, verifyChanged.success ? 'green' : 'red');
  if (verifyChanged.success) {
    log(`Username updated: ${verifyChanged.data.username_updated}`, 'yellow');
  }
}

async function testBetaUserManagement() {
  log('\n=== Testing Beta User Management ===', 'blue');
  
  // Test 1: Add beta user
  log('Test 1: Add beta user');
  const addBeta = await apiCall(`${TEST_API_BASE}/admin/add-beta-user`, {
    method: 'POST',
    body: JSON.stringify({
      figma_username: TEST_USER.figma_username_changed,
      credits: 150,
      admin_key: ADMIN_API_KEY
    })
  });
  
  log(`Add beta user: ${addBeta.success ? 'PASS' : 'FAIL'}`, addBeta.success ? 'green' : 'red');
  if (addBeta.success) {
    log(`Beta credits granted: ${addBeta.data.credits}`, 'yellow');
  } else {
    log(`Error: ${JSON.stringify(addBeta.data)}`, 'red');
  }
  
  // Test 2: Verify beta access
  log('Test 2: Verify beta access');
  const verifyBeta = await apiCall(`${TEST_API_BASE}/user/verify`, {
    method: 'POST',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      figma_username: TEST_USER.figma_username_changed
    })
  });
  
  log(`Beta access verification: ${verifyBeta.success ? 'PASS' : 'FAIL'}`, verifyBeta.success ? 'green' : 'red');
  if (verifyBeta.success) {
    log(`Access type: ${verifyBeta.data.access_type}, Credits: ${verifyBeta.data.credits}`, 'yellow');
  }
}

async function testCreditDeduction() {
  log('\n=== Testing Credit Deduction ===', 'blue');
  
  // Test 1: Valid credit deduction
  log('Test 1: Valid credit deduction');
  const deductValid = await apiCall(`${TEST_API_BASE}/user/deduct`, {
    method: 'POST',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      cost_usd: 0.05,
      description: 'Test API call'
    })
  });
  
  log(`Valid deduction: ${deductValid.success ? 'PASS' : 'FAIL'}`, deductValid.success ? 'green' : 'red');
  if (deductValid.success) {
    log(`Remaining credits: ${deductValid.data.remaining_credits}`, 'yellow');
  } else {
    log(`Error: ${JSON.stringify(deductValid.data)}`, 'red');
  }
  
  // Test 2: Insufficient credits (if user has low balance)
  log('Test 2: Test insufficient credits scenario');
  const deductInsufficient = await apiCall(`${TEST_API_BASE}/user/deduct`, {
    method: 'POST',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      cost_usd: 999,
      description: 'Expensive test call'
    })
  });
  
  log(`Insufficient credits test: ${deductInsufficient.status === 402 ? 'PASS' : 'FAIL'}`, 
      deductInsufficient.status === 402 ? 'green' : 'red');
  if (deductInsufficient.status === 402) {
    log(`Current credits: ${deductInsufficient.data.current_credits}`, 'yellow');
  }
}

async function testClaudeIntegration() {
  log('\n=== Testing Claude API Integration ===', 'blue');
  
  // Test with actual Claude API call
  log('Test: Claude API with credit deduction');
  const claudeTest = await apiCall(`${VERCEL_API_BASE}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Say hello in exactly 3 words.' }
      ],
      figma_user_id: TEST_USER.figma_user_id,
      sessionId: 'test_session',
      isFirstMessage: true
    })
  });
  
  log(`Claude integration: ${claudeTest.success ? 'PASS' : 'FAIL'}`, claudeTest.success ? 'green' : 'red');
  if (claudeTest.success) {
    log(`Response: ${claudeTest.data.content?.substring(0, 50)}...`, 'yellow');
    log(`Credits deducted: ${claudeTest.data.credits_deducted}`, 'yellow');
    log(`Remaining credits: ${claudeTest.data.remaining_credits}`, 'yellow');
  } else {
    log(`Error: ${JSON.stringify(claudeTest.data)}`, 'red');
  }
}

async function testAdminDashboard() {
  log('\n=== Testing Admin Dashboard ===', 'blue');
  
  // Test 1: List users
  log('Test 1: List all users');
  const listUsers = await apiCall(`${TEST_API_BASE}/admin/users?limit=10`);
  
  log(`List users: ${listUsers.success ? 'PASS' : 'FAIL'}`, listUsers.success ? 'green' : 'red');
  if (listUsers.success) {
    log(`Total users: ${listUsers.data.total}`, 'yellow');
    log(`Beta users: ${listUsers.data.users?.filter(u => u.access_type === 'beta').length || 0}`, 'yellow');
  }
  
  // Test 2: Update credits manually
  log('Test 2: Manual credit adjustment');
  const updateCredits = await apiCall(`${TEST_API_BASE}/admin/update-credits`, {
    method: 'PUT',
    body: JSON.stringify({
      figma_user_id: TEST_USER.figma_user_id,
      credits_delta: 50,
      description: 'Test credit adjustment',
      admin_key: ADMIN_API_KEY
    })
  });
  
  log(`Credit adjustment: ${updateCredits.success ? 'PASS' : 'FAIL'}`, updateCredits.success ? 'green' : 'red');
  if (updateCredits.success) {
    log(`New credits: ${updateCredits.data.new_credits}`, 'yellow');
  }
}

async function testWebhookSimulation() {
  log('\n=== Testing Webhook Simulation ===', 'blue');
  
  // Simulate webhook purchase directly
  const webhookPayload = {
    figma_username: 'webhook_test_user',
    email: 'test@example.com',
    credits: 500,
    usd_amount: 20.00,
    product_name: 'Pro Credit Package',
    order_id: 'test_order_456'
  };
  
  log('Test: Webhook purchase simulation');
  const webhookTest = await apiCall(`${TEST_API_BASE}/webhook/purchase`, {
    method: 'POST',
    body: JSON.stringify(webhookPayload)
  });
  
  log(`Webhook processing: ${webhookTest.success ? 'PASS' : 'FAIL'}`, webhookTest.success ? 'green' : 'red');
  if (webhookTest.success) {
    log(`Credits added: ${webhookTest.data.credits_added}`, 'yellow');
  } else {
    log(`Error: ${JSON.stringify(webhookTest.data)}`, 'red');
  }
}

async function runAllTests() {
  log('🚀 Starting User Management System Tests', 'blue');
  log('==========================================', 'blue');
  
  try {
    await testDatabaseMigration();
    await testUserVerification();
    await testBetaUserManagement();
    await testCreditDeduction();
    
    // Only test Claude integration if API key is available
    if (process.env.CLAUDE_API_KEY_CLEAN) {
      await testClaudeIntegration();
    } else {
      log('\nSkipping Claude integration test (no API key)', 'yellow');
    }
    
    await testAdminDashboard();
    await testWebhookSimulation();
    
    log('\n✅ All tests completed!', 'green');
    log('Check the results above for any failures.', 'blue');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };