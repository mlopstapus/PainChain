import dotenv from 'dotenv';
import { GitHubPoller } from './github-poller';
import { registerMetadata } from './register-metadata';

// Load environment variables
dotenv.config();

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000/api';
const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL || '60', 10);

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   PainChain GitHub Connector v1.0.0   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();
  console.log(`Backend API: ${BACKEND_API_URL}`);
  console.log(`Polling interval: ${POLLING_INTERVAL}s`);
  console.log();

  // Register connector metadata with backend
  console.log('Registering connector metadata...');
  await registerMetadata(BACKEND_API_URL);
  console.log();

  // Start poller
  const poller = new GitHubPoller(BACKEND_API_URL, POLLING_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
  });

  // Start polling
  await poller.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
