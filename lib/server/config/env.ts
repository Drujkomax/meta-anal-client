import { z } from 'zod';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_PATH: z.string().default('/api'),
  FRONTEND_URL: z.string().url().default(DEFAULT_FRONTEND_URL),

  DATABASE_URL: z.string().min(1),
  DIRECT_DB_URL: z.string().min(1).optional(),

  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_REDIRECT_URI: z.string().url(),
  META_GRAPH_VERSION: z.string().default('v19.0'),
  META_LOGIN_CONFIG_ID: z.string().optional(),
  META_PERMISSIONS: z.string().default('ads_read,ads_management,business_management'),

  JWT_SECRET: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default('meta_dash_session'),
  SESSION_TTL_DAYS: z.coerce.number().default(14),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
};
