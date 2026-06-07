import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  DB_PROFILE: Joi.string().valid('mongodb', 'postgresql').default('mongodb'),
  MONGODB_URI: Joi.string().when('DB_PROFILE', {
    is: 'postgresql',
    then: Joi.string().optional().default(''),
    otherwise: Joi.string().required(),
  }),
  POSTGRESQL_URI: Joi.string().optional().default('postgresql://postgres:postgres@localhost:5432/todos'),
  REDIS_ENABLED: Joi.string().valid('true', 'false').default('false'),
  REDIS_URL: Joi.string().allow('', null).optional(),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  CACHE_TTL_SECONDS: Joi.number().default(30),
}).unknown(true);

function loadAndValidate() {
  const { error, value } = envSchema.validate(process.env);
  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }
  return value as Record<string, string | number | boolean>;
}

const env = loadAndValidate();

export const config = {
  env: String(env['NODE_ENV']),
  port: Number(env['PORT']),
  db: {
    profile: String(env['DB_PROFILE']),
  },
  mongodb: {
    uri: String(env['MONGODB_URI'] || ''),
  },
  postgresql: {
    uri: String(env['POSTGRESQL_URI'] || ''),
  },
  redis: {
    enabled: String(env['REDIS_ENABLED']).toLowerCase() === 'true',
    url: env['REDIS_URL'] ? String(env['REDIS_URL']) : '',
    host: String(env['REDIS_HOST']),
    port: Number(env['REDIS_PORT']),
  },
  cache: {
    ttlSeconds: Number(env['CACHE_TTL_SECONDS']),
  },
} as const;

export type Config = typeof config;
