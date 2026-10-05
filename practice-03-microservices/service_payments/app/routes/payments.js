const express = require('express');
const service = require('../services/payment_service');
const { validatePaymentPayload } = require('../schemas');

const router = express.Router();
router.get('/status', (req, res) => res.json({ status: 'Payments service is running' }));
router.get('/health', (req, res) => res.json({
  status: 'OK', service: 'Payments Service', timestamp: new Date().toISOString()
}));
router.get('/', async (req, res, next) => {
  try { res.json(await service.listPayments()); } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const parsed = validatePaymentPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const payment = await service.createPayment(parsed.value);
    if (payment.notFound) return res.status(404).json({ error: payment.error });
    res.status(201).json(payment);
  } catch (error) { next(error); }
});
router.get('/:paymentId', async (req, res, next) => {
  try {
    const payment = await service.getPayment(Number(req.params.paymentId));
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (error) { next(error); }
});
router.put('/:paymentId', async (req, res, next) => {
  try {
    const parsed = validatePaymentPayload(req.body, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const payment = await service.updatePayment(Number(req.params.paymentId), parsed.value);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.notFound) return res.status(404).json({ error: payment.error });
    res.json(payment);
  } catch (error) { next(error); }
});
router.delete('/:paymentId', async (req, res, next) => {
  try {
    const deletedPayment = await service.deletePayment(Number(req.params.paymentId));
    if (!deletedPayment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted', deletedPayment });
  } catch (error) { next(error); }
});
module.exports = router;
