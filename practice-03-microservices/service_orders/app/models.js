const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  product: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'created' }
}, { tableName: 'orders' });

function serializeOrder(order) { return order.toJSON ? order.toJSON() : order; }
module.exports = { Order, serializeOrder };
