module.exports = {
  port: Number(process.env.PORT || 8000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://app_user:app_password@localhost:5432/payments_db',
  ordersServiceUrl: process.env.ORDERS_SERVICE_URL || 'http://localhost:8002',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  paymentFailureRate: Number(process.env.PAYMENT_FAILURE_RATE || 0.2)
};
