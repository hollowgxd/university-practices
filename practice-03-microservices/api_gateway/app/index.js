const express = require('express');
const cors = require('cors');
const config = require('./config');
const cache = require('./cache');
const routes = require('./routes');

async function start() {
  await cache.connectCache();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(routes);
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });
  app.listen(config.port, '0.0.0.0', () => console.log(`API Gateway running on port ${config.port}`));
}
start().catch(error => { console.error(error); process.exit(1); });
