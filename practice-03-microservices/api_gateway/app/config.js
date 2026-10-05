module.exports = {
  port: Number(process.env.PORT || 8000),
  usersServiceUrl: process.env.USERS_SERVICE_URL || 'http://localhost:8001',
  ordersServiceUrl: process.env.ORDERS_SERVICE_URL || 'http://localhost:8002',
  paymentsServiceUrl: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:8003',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  circuit: { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 3000 }
};
