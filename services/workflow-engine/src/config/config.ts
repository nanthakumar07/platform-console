import "dotenv/config";
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3004'),
  
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_USER: z.string().default('platform'),
  DB_PASSWORD: z.string().default('platform123'),
  DB_NAME: z.string().default('platform'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // NATS
  NATS_URL: z.string().default('nats://localhost:4222'),
  NATS_USER: z.string().optional(),
  NATS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const runtimeEnv = { ...process.env };
if (!runtimeEnv.JWT_SECRET && runtimeEnv.NODE_ENV !== 'production') {
  runtimeEnv.JWT_SECRET = 'dev-secret';
}

export const env = envSchema.parse(runtimeEnv);

export const config = {
  server: {
    port: env.PORT,
    host: '0.0.0.0',
  },
  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  nats: {
    url: env.NATS_URL,
    user: env.NATS_USER,
    password: env.NATS_PASSWORD,
  },
  jwt: {
    secret: env.JWT_SECRET,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;
