const axios = require('axios');
const config = require('../config');
const { Order, serializeOrder } = require('../models');
const cache = require('../cache');

const orderCacheKey = id => `orders:${id}`;

async function userExists(userId) {
  try {
    const response = await axios.get(`${config.usersServiceUrl}/users/${userId}`);
    return response.status === 200;
  } catch (error) {
    if (error.response?.status === 404) return false;
    throw error;
  }
}

async function listOrders(userId) {
  const where = userId ? { user_id: userId } : undefined;
  return (await Order.findAll({ where, order: [['id', 'ASC']] })).map(serializeOrder);
}

async function getOrder(id) {
  const cached = await cache.getJson(orderCacheKey(id));
  if (cached) return cached;
  const order = await Order.findByPk(id);
  if (!order) return null;
  const result = serializeOrder(order);
  await cache.setJson(orderCacheKey(id), result);
  return result;
}

async function createOrder(attributes) {
  if (!(await userExists(attributes.user_id))) return { error: 'User not found', notFound: true };
  return serializeOrder(await Order.create(attributes));
}

async function updateOrder(id, attributes) {
  const order = await Order.findByPk(id);
  if (!order) return null;
  if (attributes.user_id && !(await userExists(attributes.user_id))) return { error: 'User not found', notFound: true };
  await order.update(attributes);
  const result = serializeOrder(order);
  await cache.deleteKey(orderCacheKey(id));
  return result;
}

async function deleteOrder(id) {
  const order = await Order.findByPk(id);
  if (!order) return null;
  const result = serializeOrder(order);
  await order.destroy();
  await cache.deleteKey(orderCacheKey(id));
  return result;
}

module.exports = { listOrders, getOrder, createOrder, updateOrder, deleteOrder };
