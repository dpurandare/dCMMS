import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { redisConnectionOptions } from "../config/redis";

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export async function registerRedis(server: FastifyInstance) {
  // Initialize Redis client
  const redis = new Redis({
    ...redisConnectionOptions(),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  // Handle connection events
  redis.on('connect', () => {
    server.log.info('Redis connected');
  });

  redis.on('error', (err) => {
    server.log.error({ err }, 'Redis connection error');
  });

  redis.on('close', () => {
    server.log.warn('Redis connection closed');
  });

  // Decorate server with Redis instance
  server.decorate('redis', redis);

  // Close Redis connection when server closes
  server.addHook('onClose', async () => {
    server.log.info('Closing Redis connection');
    await redis.quit();
  });
}
