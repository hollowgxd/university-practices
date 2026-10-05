const fs = require('node:fs/promises');
const path = require('node:path');
const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  define: { underscored: true, timestamps: true }
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort();
  for (const file of files) {
    await sequelize.query(await fs.readFile(path.join(migrationsDir, file), 'utf8'));
  }
}

async function initializeDatabase() {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await sequelize.authenticate();
      await runMigrations();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Database is not ready (attempt ${attempt}/30): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

module.exports = { sequelize, initializeDatabase };
