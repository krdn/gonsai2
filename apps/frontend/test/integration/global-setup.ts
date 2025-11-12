/**
 * Global Setup for Integration Tests
 *
 * Starts test environment before running integration tests.
 */

import TestEnvironment from './helpers/test-env';

export default async function globalSetup() {
  console.log('\n=== Integration Test Global Setup ===\n');

  try {
    await TestEnvironment.start();
    console.log('\n=== Test Environment Ready ===\n');
  } catch (error: any) {
    console.error('\n=== Failed to Start Test Environment ===');
    console.error(error.message);
    console.error('\nMake sure Docker and docker-compose are installed and running.\n');
    throw error;
  }
}
