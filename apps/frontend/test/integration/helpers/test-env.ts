/**
 * Integration Test Environment Helper
 *
 * Manages Docker containers for integration testing with real n8n instance.
 */

import { execSync } from 'child_process';
import { join } from 'path';

const DOCKER_COMPOSE_FILE = join(__dirname, '../docker-compose.test.yml');
const N8N_TEST_URL = 'http://localhost:5679';
const MAX_STARTUP_TIME = 60000; // 60 seconds
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds

export class TestEnvironment {
  private static isStarted = false;

  /**
   * Start test environment (n8n + PostgreSQL containers)
   */
  static async start(): Promise<void> {
    if (this.isStarted) {
      console.log('Test environment already running');
      return;
    }

    console.log('Starting test environment...');

    try {
      // Pull latest images
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} pull`, {
        stdio: 'inherit',
      });

      // Start containers
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d`, {
        stdio: 'inherit',
      });

      // Wait for n8n to be ready
      await this.waitForHealthy();

      this.isStarted = true;
      console.log('Test environment ready!');
    } catch (error: any) {
      console.error('Failed to start test environment:', error.message);
      throw error;
    }
  }

  /**
   * Stop test environment and cleanup
   */
  static async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log('Stopping test environment...');

    try {
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down -v`, {
        stdio: 'inherit',
      });

      this.isStarted = false;
      console.log('Test environment stopped');
    } catch (error: any) {
      console.error('Failed to stop test environment:', error.message);
      throw error;
    }
  }

  /**
   * Reset test environment (clear all data)
   */
  static async reset(): Promise<void> {
    console.log('Resetting test environment...');

    try {
      // Restart containers to clear data
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} restart`, {
        stdio: 'inherit',
      });

      // Wait for n8n to be ready again
      await this.waitForHealthy();

      console.log('Test environment reset complete');
    } catch (error: any) {
      console.error('Failed to reset test environment:', error.message);
      throw error;
    }
  }

  /**
   * Wait for n8n to be healthy
   */
  private static async waitForHealthy(): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_STARTUP_TIME) {
      try {
        const response = await fetch(`${N8N_TEST_URL}/healthz`);

        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await this.sleep(HEALTH_CHECK_INTERVAL);
    }

    throw new Error(`n8n failed to start within ${MAX_STARTUP_TIME}ms`);
  }

  /**
   * Check if test environment is running
   */
  static isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Get n8n test URL
   */
  static getUrl(): string {
    return N8N_TEST_URL;
  }

  /**
   * Get database connection info
   */
  static getDatabaseConfig() {
    return {
      host: 'localhost',
      port: 5433,
      database: 'n8n_test',
      user: 'n8n_test',
      password: 'test_password',
    };
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get container logs
   */
  static getLogs(service: 'n8n-test' | 'postgres-test' = 'n8n-test'): string {
    try {
      return execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} logs ${service}`, {
        encoding: 'utf-8',
      });
    } catch (error: any) {
      return error.message;
    }
  }

  /**
   * Execute command in container
   */
  static execInContainer(service: 'n8n-test' | 'postgres-test', command: string): string {
    try {
      return execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T ${service} ${command}`, {
        encoding: 'utf-8',
      });
    } catch (error: any) {
      return error.message;
    }
  }
}

export default TestEnvironment;
