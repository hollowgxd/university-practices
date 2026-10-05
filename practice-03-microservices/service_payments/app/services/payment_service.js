const axios = require('axios');
const config = require('../config');
const { Payment, serializePayment } = require('../models');
const cache = require('../cache');
const { decidePaymentStatus } = require('../domain/payment_status');

const paymentCacheKey = id => `payments:${id}`;

async function findOrder(orderId) {
  try {
    const response = await axios.get(`${config.ordersServiceUrl}/orders/${orderId}`);
    return response.status === 200 ? response.data : null;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

async function listPayments() {
  return (await Payment.findAll({ order: [['id', 'ASC']] })).map(serializePayment);
}
async function getPayment(id) {
  const cached = await cache.getJson(paymentCacheKey(id));
  if (cached) return cached;
  const payment = await Payment.findByPk(id);
  if (!payment) return null;
  const result = serializePayment(payment);
  await cache.setJson(paymentCacheKey(id), result);
  return result;
}
async function createPayment(attributes) {
  const order = await findOrder(attributes.order_id);
  if (!order) return { error: 'Order not found', notFound: true };
  const payment = await Payment.create({
    ...attributes,
    amount: attributes.amount ?? Number(order.amount || 0),
    status: decidePaymentStatus(Math.random(), config.paymentFailureRate)
  });
  return serializePayment(payment);
}
async function updatePayment(id, attributes) {
  const payment = await Payment.findByPk(id);
  if (!payment) return null;
  if (attributes.order_id && !(await findOrder(attributes.order_id))) {
    return { error: 'Order not found', notFound: true };
  }
  await payment.update(attributes);
  const result = serializePayment(payment);
  await cache.deleteKey(paymentCacheKey(id));
  return result;
}
async function deletePayment(id) {
  const payment = await Payment.findByPk(id);
  if (!payment) return null;
  const result = serializePayment(payment);
  await payment.destroy();
  await cache.deleteKey(paymentCacheKey(id));
  return result;
}
module.exports = { listPayments, getPayment, createPayment, updatePayment, deletePayment };
