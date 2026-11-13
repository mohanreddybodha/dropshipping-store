import { Redis } from "@upstash/redis";

const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "";

const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

export const isRedisConfigured = Boolean(url && token);

/**
 * Shared Upstash Redis client.
 * Automatically resolves both Vercel KV and standard Upstash environment variables.
 * Returns null gracefully if credentials are not configured (enabling safe fallback).
 */
export const redis = isRedisConfigured
  ? new Redis({
      url,
      token,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
    })
  : null;
