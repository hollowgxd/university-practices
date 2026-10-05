const { createClient } = require('redis');
const config = require('./config');
let client;
async function connectCache() {
  if (!config.cacheEnabled) return;
  client = createClient({ url: config.redisUrl });
  client.on('error', error => console.error(`Redis error: ${error.message}`));
  try { await client.connect(); }
  catch (error) {
    console.error(`Redis is unavailable; continuing without cache: ${error.message}`);
    client = undefined;
  }
}
async function getJson(key) {
  if (!client?.isReady) return null;
  try { const value = await client.get(key); return value ? JSON.parse(value) : null; }
  catch (error) { console.error(`Redis read failed: ${error.message}`); return null; }
}
async function setJson(key, value) {
  if (!client?.isReady) return;
  try { await client.setEx(key, config.cacheTtlSeconds, JSON.stringify(value)); }
  catch (error) { console.error(`Redis write failed: ${error.message}`); }
}
async function deleteKey(key) {
  if (!client?.isReady) return;
  try { await client.del(key); }
  catch (error) { console.error(`Redis delete failed: ${error.message}`); }
}
module.exports = { connectCache, getJson, setJson, deleteKey };
