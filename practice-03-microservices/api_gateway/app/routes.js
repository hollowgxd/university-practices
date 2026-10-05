const express = require('express');
const config = require('./config');
const cache = require('./cache');
const { createServiceCircuit } = require('./clients/circuit_breaker');

const usersCircuit = createServiceCircuit('Users', config.usersServiceUrl);
const ordersCircuit = createServiceCircuit('Orders', config.ordersServiceUrl);
const paymentsCircuit = createServiceCircuit('Payments', config.paymentsServiceUrl);
const router = express.Router();

function sendResult(res, result, fallbackStatus = 200) {
  res.status(result?.status || fallbackStatus).json(result?.data ?? { error: 'Empty service response' });
}
function registerCrud(resource, circuit, singular, options = {}) {
  router.get(`/${resource}`, async (req, res, next) => {
    try {
      const query = new URLSearchParams(req.query).toString();
      sendResult(res, await circuit.fire(`/${resource}${query ? `?${query}` : ''}`));
    } catch (error) { next(error); }
  });
  router.post(`/${resource}`, async (req, res, next) => {
    try { sendResult(res, await circuit.fire(`/${resource}`, { method: 'POST', data: req.body }), 201); }
    catch (error) { next(error); }
  });
  router.get(`/${resource}/:id`, async (req, res, next) => {
    try { sendResult(res, await circuit.fire(`/${resource}/${req.params.id}`)); }
    catch (error) { next(error); }
  });
  router.put(`/${resource}/:id`, async (req, res, next) => {
    try { sendResult(res, await circuit.fire(`/${resource}/${req.params.id}`, { method: 'PUT', data: req.body })); }
    catch (error) { next(error); }
  });
  router.delete(`/${resource}/:id`, async (req, res, next) => {
    try { sendResult(res, await circuit.fire(`/${resource}/${req.params.id}`, { method: 'DELETE' })); }
    catch (error) { next(error); }
  });
  if (options.status) {
    router.get(`/${resource}/status`, async (req, res, next) => {
      try { sendResult(res, await circuit.fire(`/${resource}/status`)); } catch (error) { next(error); }
    });
    router.get(`/${resource}/health`, async (req, res, next) => {
      try { sendResult(res, await circuit.fire(`/${resource}/health`)); } catch (error) { next(error); }
    });
  }
}

registerCrud('users', usersCircuit, 'user', { status: true });
registerCrud('orders', ordersCircuit, 'order', { status: true });
registerCrud('payments', paymentsCircuit, 'payment', { status: true });

router.get('/users/:userId/details', async (req, res, next) => {
  const cacheKey = `gateway:user-details:${req.params.userId}`;
  try {
    const cached = await cache.getJson(cacheKey);
    if (cached) return res.json(cached);

    const [userResult, ordersResult] = await Promise.all([
      usersCircuit.fire(`/users/${req.params.userId}`),
      ordersCircuit.fire(`/orders?userId=${encodeURIComponent(req.params.userId)}`)
    ]);
    if (userResult.status === 404) return sendResult(res, userResult);
    if (userResult.status >= 500 || ordersResult.status >= 500) {
      return res.status(503).json({ error: 'Unable to aggregate user details' });
    }
    const result = { user: userResult.data, orders: ordersResult.data };
    await cache.setJson(cacheKey, result);
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/health', (req, res) => res.json({
  status: 'API Gateway is running',
  circuits: {
    users: { state: usersCircuit.opened ? 'OPEN' : 'CLOSED', stats: usersCircuit.stats },
    orders: { state: ordersCircuit.opened ? 'OPEN' : 'CLOSED', stats: ordersCircuit.stats },
    payments: { state: paymentsCircuit.opened ? 'OPEN' : 'CLOSED', stats: paymentsCircuit.stats }
  }
}));
router.get('/status', (req, res) => res.json({ status: 'API Gateway is running' }));

module.exports = router;
