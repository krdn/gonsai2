/**
 * Redis Session Store
 *
 * Next.js compatible session management with Redis backend.
 * Supports authentication tokens, user sessions, and temporary data.
 */

import RedisClient from './redis-client';
import { createHash, randomBytes } from 'crypto';

interface SessionData {
  userId?: string;
  email?: string;
  role?: string;
  preferences?: Record<string, any>;
  [key: string]: any;
}

interface Session {
  id: string;
  data: SessionData;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
}

class SessionStore {
  private static readonly PREFIX = 'session:';
  private static readonly USER_PREFIX = 'user:sessions:';
  private static readonly STATS_KEY = 'session:stats';

  // Session TTL: 7 days
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60;

  // Sliding session window: update expiry on access
  private static readonly SLIDING_WINDOW = true;

  /**
   * Create new session
   */
  static async create(data: SessionData, ttl?: number): Promise<string> {
    const client = await RedisClient.getClient();
    const sessionId = this.generateSessionId();
    const key = `${this.PREFIX}${sessionId}`;
    const sessionTtl = ttl || this.SESSION_TTL;

    const session: Session = {
      id: sessionId,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionTtl * 1000,
      lastAccessedAt: Date.now(),
    };

    try {
      await client.setex(key, sessionTtl, JSON.stringify(session));

      // Track user sessions
      if (data.userId) {
        await this.addUserSession(data.userId, sessionId, sessionTtl);
      }

      await this.incrementStat('created');
      return sessionId;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async get(sessionId: string): Promise<Session | null> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${sessionId}`;

    try {
      const data = await client.get(key);

      if (!data) {
        await this.incrementStat('misses');
        return null;
      }

      const session: Session = JSON.parse(data);

      // Check if expired
      if (session.expiresAt < Date.now()) {
        await this.destroy(sessionId);
        await this.incrementStat('expired');
        return null;
      }

      // Update last accessed time (sliding window)
      if (this.SLIDING_WINDOW) {
        session.lastAccessedAt = Date.now();
        await client.setex(key, this.SESSION_TTL, JSON.stringify(session));
      }

      await this.incrementStat('hits');
      return session;
    } catch (error) {
      console.error(`❌ Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session data
   */
  static async update(sessionId: string, data: Partial<SessionData>): Promise<boolean> {
    const session = await this.get(sessionId);

    if (!session) {
      return false;
    }

    // Merge new data
    session.data = { ...session.data, ...data };
    session.lastAccessedAt = Date.now();

    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${sessionId}`;
    const ttl = Math.floor((session.expiresAt - Date.now()) / 1000);

    try {
      await client.setex(key, ttl, JSON.stringify(session));

      // Update user sessions if userId changed
      if (data.userId && data.userId !== session.data.userId) {
        if (session.data.userId) {
          await this.removeUserSession(session.data.userId, sessionId);
        }
        await this.addUserSession(data.userId, sessionId, ttl);
      }

      await this.incrementStat('updated');
      return true;
    } catch (error) {
      console.error(`❌ Failed to update session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Destroy session
   */
  static async destroy(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${sessionId}`;

    try {
      await client.del(key);

      // Remove from user sessions
      if (session?.data.userId) {
        await this.removeUserSession(session.data.userId, sessionId);
      }

      await this.incrementStat('destroyed');
    } catch (error) {
      console.error(`❌ Failed to destroy session ${sessionId}:`, error);
    }
  }

  /**
   * Destroy all sessions for a user
   */
  static async destroyUserSessions(userId: string): Promise<number> {
    const client = await RedisClient.getClient();
    const userKey = `${this.USER_PREFIX}${userId}`;

    try {
      const sessionIds = await client.smembers(userKey);

      if (sessionIds.length > 0) {
        const keys = sessionIds.map(id => `${this.PREFIX}${id}`);
        await client.del(...keys);
        await client.del(userKey);

        await this.incrementStat('destroyed', sessionIds.length);
        console.log(`✅ Destroyed ${sessionIds.length} sessions for user ${userId}`);
        return sessionIds.length;
      }

      return 0;
    } catch (error) {
      console.error(`❌ Failed to destroy user sessions for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<Session[]> {
    const client = await RedisClient.getClient();
    const userKey = `${this.USER_PREFIX}${userId}`;

    try {
      const sessionIds = await client.smembers(userKey);
      const sessions: Session[] = [];

      if (sessionIds.length > 0) {
        const keys = sessionIds.map(id => `${this.PREFIX}${id}`);
        const values = await client.mget(...keys);

        values.forEach((value, index) => {
          if (value) {
            const session: Session = JSON.parse(value);

            // Check expiry
            if (session.expiresAt >= Date.now()) {
              sessions.push(session);
            } else {
              // Clean up expired session
              this.destroy(sessionIds[index]);
            }
          }
        });
      }

      return sessions;
    } catch (error) {
      console.error(`❌ Failed to get user sessions for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Touch session (update last accessed time)
   */
  static async touch(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);

    if (!session) {
      return false;
    }

    session.lastAccessedAt = Date.now();

    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${sessionId}`;
    const ttl = Math.floor((session.expiresAt - Date.now()) / 1000);

    try {
      await client.setex(key, ttl, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error(`❌ Failed to touch session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanup(): Promise<number> {
    const client = await RedisClient.getClient();
    let cleaned = 0;

    try {
      const keys = await client.keys(`${this.PREFIX}*`);

      for (const key of keys) {
        const data = await client.get(key);

        if (data) {
          const session: Session = JSON.parse(data);

          if (session.expiresAt < Date.now()) {
            await client.del(key);

            // Remove from user sessions
            if (session.data.userId) {
              await this.removeUserSession(session.data.userId, session.id);
            }

            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`✅ Cleaned up ${cleaned} expired sessions`);
      }

      return cleaned;
    } catch (error) {
      console.error('❌ Failed to cleanup sessions:', error);
      return 0;
    }
  }

  /**
   * Clear all sessions
   */
  static async clear(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      const sessionKeys = await client.keys(`${this.PREFIX}*`);
      const userKeys = await client.keys(`${this.USER_PREFIX}*`);
      const allKeys = [...sessionKeys, ...userKeys, this.STATS_KEY];

      if (allKeys.length > 0) {
        await client.del(...allKeys);
      }

      console.log(`✅ Cleared ${allKeys.length} session entries`);
    } catch (error) {
      console.error('❌ Failed to clear sessions:', error);
    }
  }

  /**
   * Get session statistics
   */
  static async getStats() {
    const client = await RedisClient.getClient();

    try {
      const stats = await client.hgetall(this.STATS_KEY);

      return {
        created: parseInt(stats.created || '0'),
        hits: parseInt(stats.hits || '0'),
        misses: parseInt(stats.misses || '0'),
        updated: parseInt(stats.updated || '0'),
        destroyed: parseInt(stats.destroyed || '0'),
        expired: parseInt(stats.expired || '0'),
      };
    } catch (error) {
      console.error('❌ Failed to get session stats:', error);
      return {
        created: 0,
        hits: 0,
        misses: 0,
        updated: 0,
        destroyed: 0,
        expired: 0,
      };
    }
  }

  /**
   * Get active session count
   */
  static async getActiveCount(): Promise<number> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}*`);
      return keys.length;
    } catch (error) {
      console.error('❌ Failed to get active session count:', error);
      return 0;
    }
  }

  /**
   * Generate secure session ID
   */
  private static generateSessionId(): string {
    const random = randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const hash = createHash('sha256').update(random + timestamp).digest('hex');

    return hash;
  }

  /**
   * Add session to user's session set
   */
  private static async addUserSession(userId: string, sessionId: string, ttl: number): Promise<void> {
    const client = await RedisClient.getClient();
    const userKey = `${this.USER_PREFIX}${userId}`;

    try {
      await client.sadd(userKey, sessionId);
      await client.expire(userKey, ttl);
    } catch (error) {
      console.error('❌ Failed to add user session:', error);
    }
  }

  /**
   * Remove session from user's session set
   */
  private static async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const client = await RedisClient.getClient();
    const userKey = `${this.USER_PREFIX}${userId}`;

    try {
      await client.srem(userKey, sessionId);
    } catch (error) {
      console.error('❌ Failed to remove user session:', error);
    }
  }

  /**
   * Increment cache statistic
   */
  private static async incrementStat(stat: string, amount = 1): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      await client.hincrby(this.STATS_KEY, stat, amount);
    } catch (error) {
      // Silent fail for stats
    }
  }
}

export default SessionStore;
