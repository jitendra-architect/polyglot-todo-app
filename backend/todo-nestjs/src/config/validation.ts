import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DB_PROFILE: Joi.string().valid('mongodb', 'postgresql').default('mongodb'),
  MONGODB_URI: Joi.string().when('DB_PROFILE', {
    is: 'postgresql',
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRESQL_URI: Joi.string().optional(),
  REDIS_ENABLED: Joi.string().valid('true', 'false').default('false'),
  REDIS_URL: Joi.string().allow('', null),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  CACHE_TTL_SECONDS: Joi.number().default(30)
});


