const { User, serializeUser } = require('../models');
const cache = require('../cache');

const listCacheKey = 'users:list';
const userCacheKey = id => `users:${id}`;

async function listUsers() {
  const cached = await cache.getJson(listCacheKey);
  if (cached) return cached;

  const users = (await User.findAll({ order: [['id', 'ASC']] })).map(serializeUser);
  await cache.setJson(listCacheKey, users);
  return users;
}

async function getUser(id) {
  const cached = await cache.getJson(userCacheKey(id));
  if (cached) return cached;

  const user = await User.findByPk(id);
  if (!user) return null;
  const result = serializeUser(user);
  await cache.setJson(userCacheKey(id), result);
  return result;
}

async function createUser(attributes) {
  const user = serializeUser(await User.create(attributes));
  await cache.deleteKey(listCacheKey);
  return user;
}

async function updateUser(id, attributes) {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(attributes);
  const result = serializeUser(user);
  await cache.deleteKey(userCacheKey(id));
  await cache.deleteKey(listCacheKey);
  return result;
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) return null;
  const result = serializeUser(user);
  await user.destroy();
  await cache.deleteKey(userCacheKey(id));
  await cache.deleteKey(listCacheKey);
  return result;
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
