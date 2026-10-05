module.exports = {
  port: Number(process.env.PORT || 8000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://app_user:app_password@localhost:5432/users_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false'
};
