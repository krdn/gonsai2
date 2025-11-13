/**
 * Global Teardown for Integration Tests
 *
 * Stops test environment after all integration tests complete.
 */

import TestEnvironment from './helpers/test-env';

export default async function globalTeardown() {
  console.log('\n=== Integration Test Global Teardown ===\n');

  try {
    await TestEnvironment.stop();
    console.log('\n=== Test Environment Stopped ===\n');
  } catch (error: any) {
    console.error('\n=== Failed to Stop Test Environment ===');
    console.error(error.message);
    // Don't throw - allow cleanup to continue
  }
}
