const express = require('express');
const service = require('../services/order_service');
const { validateOrderPayload } = require('../schemas');

const router = express.Router();
router.get('/status', (req, res) => res.json({ status: 'Orders service is running' }));
router.get('/health', (req, res) => res.json({
  status: 'OK', service: 'Orders Service', timestamp: new Date().toISOString()
}));

router.get('/', async (req, res, next) => {
  try {
    const userId = req.query.userId === undefined ? undefined : Number(req.query.userId);
    if (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }
    res.json(await service.listOrders(userId));
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = validateOrderPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const order = await service.createOrder(parsed.value);
    if (order.notFound) return res.status(404).json({ error: order.error });
    res.status(201).json(order);
  } catch (error) { next(error); }
});

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await service.getOrder(Number(req.params.orderId));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) { next(error); }
});

router.put('/:orderId', async (req, res, next) => {
  try {
    const parsed = validateOrderPayload(req.body, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const order = await service.updateOrder(Number(req.params.orderId), parsed.value);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.notFound) return res.status(404).json({ error: order.error });
    res.json(order);
  } catch (error) { next(error); }
});

router.delete('/:orderId', async (req, res, next) => {
  try {
    const deletedOrder = await service.deleteOrder(Number(req.params.orderId));
    if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted', deletedOrder });
  } catch (error) { next(error); }
});
module.exports = router;
