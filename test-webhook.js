#!/usr/bin/env node
/**
 * Webhook Test Script for PainChain
 *
 * This script tests the GitHub and GitLab webhook endpoints by:
 * 1. Setting up a webhook secret for a connection
 * 2. Sending a properly signed test webhook payload
 * 3. Verifying the response
 */

const crypto = require('crypto');

const BASE_URL = 'http://localhost:8000';
const TEST_SECRET = 'test-webhook-secret-12345';

// Sample GitHub push event payload
const GITHUB_PUSH_PAYLOAD = {
  ref: 'refs/heads/main',
  before: '0000000000000000000000000000000000000000',
  after: 'abc123def456',
  repository: {
    id: 123456,
    name: 'test-repo',
    full_name: 'test-user/test-repo',
    html_url: 'https://github.com/test-user/test-repo',
  },
  pusher: {
    name: 'test-user',
    email: 'test@example.com',
  },
  commits: [
    {
      id: 'abc123def456',
      message: 'Test commit for webhook testing',
      timestamp: new Date().toISOString(),
      url: 'https://github.com/test-user/test-repo/commit/abc123def456',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        username: 'test-user',
      },
    },
  ],
  head_commit: {
    id: 'abc123def456',
    message: 'Test commit for webhook testing',
    timestamp: new Date().toISOString(),
    url: 'https://github.com/test-user/test-repo/commit/abc123def456',
    author: {
      name: 'Test User',
      email: 'test@example.com',
      username: 'test-user',
    },
  },
};

// Sample GitLab push event payload
const GITLAB_PUSH_PAYLOAD = {
  object_kind: 'push',
  before: '0000000000000000000000000000000000000000',
  after: 'abc123def456',
  ref: 'refs/heads/main',
  user_name: 'Test User',
  user_email: 'test@example.com',
  project: {
    id: 123456,
    name: 'test-repo',
    web_url: 'https://gitlab.com/test-user/test-repo',
  },
  commits: [
    {
      id: 'abc123def456',
      message: 'Test commit for webhook testing',
      timestamp: new Date().toISOString(),
      url: 'https://gitlab.com/test-user/test-repo/-/commit/abc123def456',
      author: {
        name: 'Test User',
        email: 'test@example.com',
      },
    },
  ],
};

/**
 * Generate GitHub webhook signature
 */
function generateGitHubSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return 'sha256=' + hmac.digest('hex');
}

/**
 * Update connection with webhook secret
 */
async function setupWebhookSecret(connectionId, secret) {
  console.log(`\n📝 Setting webhook secret for connection ${connectionId}...`);

  const response = await fetch(`${BASE_URL}/api/connections/${connectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookSecret: secret }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update connection: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ Webhook secret configured for connection ${connectionId}`);
  return data;
}

/**
 * Send GitHub webhook
 */
async function sendGitHubWebhook(connectionId, payload, secret) {
  console.log(`\n🔔 Sending GitHub webhook to connection ${connectionId}...`);

  const body = JSON.stringify(payload);
  const signature = generateGitHubSignature(body, secret);

  const response = await fetch(`${BASE_URL}/api/webhooks/github/${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': 'push',
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
    console.error(data);
    return null;
  }

  console.log(`✅ GitHub webhook received successfully!`);
  console.log(`   Event ID: ${data.eventId}`);
  console.log(`   Duplicate: ${data.duplicate}`);
  return data;
}

/**
 * Send GitLab webhook
 */
async function sendGitLabWebhook(connectionId, payload, secret) {
  console.log(`\n🔔 Sending GitLab webhook to connection ${connectionId}...`);

  const response = await fetch(`${BASE_URL}/api/webhooks/gitlab/${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gitlab-Token': secret,
      'X-Gitlab-Event': 'Push Hook',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
    console.error(data);
    return null;
  }

  console.log(`✅ GitLab webhook received successfully!`);
  console.log(`   Event ID: ${data.eventId}`);
  console.log(`   Duplicate: ${data.duplicate}`);
  return data;
}

/**
 * Get recent events for a connection
 */
async function getRecentEvents(connectionId) {
  const response = await fetch(`${BASE_URL}/api/changes?connectionId=${connectionId}&limit=5`);
  const data = await response.json();

  console.log(`\n📊 Recent events for connection ${connectionId}:`);
  if (data.events && data.events.length > 0) {
    data.events.forEach((event, i) => {
      console.log(`   ${i + 1}. [${event.source}] ${event.title} (${new Date(event.timestamp).toLocaleString()})`);
    });
  } else {
    console.log('   No events found');
  }
}

/**
 * Main test function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🧪 PainChain Webhook Test Script

Usage:
  node test-webhook.js github <connectionId>   # Test GitHub webhook
  node test-webhook.js gitlab <connectionId>   # Test GitLab webhook

Examples:
  node test-webhook.js github 3    # Test GitHub webhook for connection 3
  node test-webhook.js gitlab 5    # Test GitLab webhook for connection 5
    `);
    process.exit(0);
  }

  const [type, connectionId] = args;

  if (!['github', 'gitlab'].includes(type)) {
    console.error('❌ Invalid type. Use "github" or "gitlab"');
    process.exit(1);
  }

  if (!connectionId || isNaN(connectionId)) {
    console.error('❌ Invalid connection ID');
    process.exit(1);
  }

  const connId = parseInt(connectionId);

  try {
    console.log(`\n🚀 Testing ${type.toUpperCase()} webhook for connection ${connId}`);
    console.log(`   Backend: ${BASE_URL}`);
    console.log(`   Secret: ${TEST_SECRET}`);

    // Step 1: Configure webhook secret
    await setupWebhookSecret(connId, TEST_SECRET);

    // Step 2: Send webhook
    let result;
    if (type === 'github') {
      result = await sendGitHubWebhook(connId, GITHUB_PUSH_PAYLOAD, TEST_SECRET);
    } else {
      result = await sendGitLabWebhook(connId, GITLAB_PUSH_PAYLOAD, TEST_SECRET);
    }

    if (!result) {
      console.error('\n❌ Webhook test failed');
      process.exit(1);
    }

    // Step 3: Verify event was created
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for processing
    await getRecentEvents(connId);

    console.log('\n✅ Webhook test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
