/**
 * n8n Authentication Manager
 *
 * @module n8n-integration/auth-manager
 * @description Handles multiple authentication methods for n8n API
 *
 * @aiContext
 * Supports API Key, Basic Auth, and session-based authentication.
 * Automatically detects and applies the correct method.
 */

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** API Key authentication */
  apiKey?: string;

  /** Basic Auth credentials */
  basicAuth?: {
    username: string;
    password: string;
  };

  /** Session cookie */
  sessionToken?: string;
}

/**
 * Authentication method
 */
export type AuthMethod = 'apiKey' | 'basicAuth' | 'session' | 'none';

/**
 * Authentication manager for n8n API
 *
 * @aiContext
 * Determines the best authentication method based on available credentials.
 * Automatically applies authentication headers to requests.
 */
export class AuthManager {
  private readonly config: AuthConfig;
  private readonly method: AuthMethod;

  constructor(config: AuthConfig) {
    this.config = config;
    this.method = this.detectAuthMethod();
  }

  /**
   * Get authentication method being used
   */
  getAuthMethod(): AuthMethod {
    return this.method;
  }

  /**
   * Apply authentication to request headers
   *
   * @aiContext
   * Call this before making HTTP requests to add auth headers.
   */
  applyAuth(headers: Record<string, string>): Record<string, string> {
    const authHeaders = { ...headers };

    switch (this.method) {
      case 'apiKey':
        if (this.config.apiKey) {
          authHeaders['X-N8N-API-KEY'] = this.config.apiKey;
        }
        break;

      case 'basicAuth':
        if (this.config.basicAuth) {
          const { username, password } = this.config.basicAuth;
          const encoded = Buffer.from(`${username}:${password}`).toString(
            'base64'
          );
          authHeaders['Authorization'] = `Basic ${encoded}`;
        }
        break;

      case 'session':
        if (this.config.sessionToken) {
          authHeaders['Cookie'] = `n8n-auth=${this.config.sessionToken}`;
        }
        break;

      case 'none':
        // No authentication
        break;
    }

    return authHeaders;
  }

  /**
   * Validate authentication configuration
   */
  validate(): { valid: boolean; error?: string } {
    if (this.method === 'none') {
      return {
        valid: false,
        error: 'No authentication method configured',
      };
    }

    switch (this.method) {
      case 'apiKey':
        if (!this.config.apiKey) {
          return { valid: false, error: 'API key is empty' };
        }
        break;

      case 'basicAuth':
        if (
          !this.config.basicAuth?.username ||
          !this.config.basicAuth?.password
        ) {
          return { valid: false, error: 'Basic auth credentials incomplete' };
        }
        break;

      case 'session':
        if (!this.config.sessionToken) {
          return { valid: false, error: 'Session token is empty' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Create auth manager from environment variables
   */
  static fromEnv(): AuthManager {
    const config: AuthConfig = {};

    // Try API key first (preferred)
    if (process.env.N8N_API_KEY) {
      config.apiKey = process.env.N8N_API_KEY;
    }

    // Try basic auth
    else if (process.env.N8N_BASIC_AUTH_USER) {
      config.basicAuth = {
        username: process.env.N8N_BASIC_AUTH_USER,
        password: process.env.N8N_BASIC_AUTH_PASSWORD ?? '',
      };
    }

    // Try session token
    else if (process.env.N8N_SESSION_TOKEN) {
      config.sessionToken = process.env.N8N_SESSION_TOKEN;
    }

    return new AuthManager(config);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Detect authentication method from config
   */
  private detectAuthMethod(): AuthMethod {
    if (this.config.apiKey) {
      return 'apiKey';
    }

    if (this.config.basicAuth) {
      return 'basicAuth';
    }

    if (this.config.sessionToken) {
      return 'session';
    }

    return 'none';
  }
}

/**
 * Helper function to create authenticated headers
 *
 * @aiContext
 * Quick way to get headers with authentication applied.
 */
export function createAuthHeaders(
  config?: AuthConfig
): Record<string, string> {
  const manager = config ? new AuthManager(config) : AuthManager.fromEnv();
  return manager.applyAuth({
    'Content-Type': 'application/json',
  });
}
