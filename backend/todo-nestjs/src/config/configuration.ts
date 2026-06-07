export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    profile: process.env.DB_PROFILE || 'mongodb',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/todos'
  },
  postgresql: {
    uri: process.env.POSTGRESQL_URI || 'postgresql://postgres:postgres@localhost:5432/todos',
  },
  redis: {
    enabled: String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true',
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '30', 10)
  }
});


