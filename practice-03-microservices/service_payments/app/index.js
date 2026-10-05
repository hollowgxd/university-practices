const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initializeDatabase } = require('./database');
const cache = require('./cache');
const paymentsRouter = require('./routes/payments');

async function start() {
  await initializeDatabase();
  await cache.connectCache();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/payments', paymentsRouter);
  app.get('/status', (req, res) => res.json({ status: 'Payments service is running' }));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });
  app.listen(config.port, '0.0.0.0', () => console.log(`Payments service running on port ${config.port}`));
}
start().catch(error => { console.error(error); process.exit(1); });
