const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
  provider_reference: { type: DataTypes.STRING(64), allowNull: true }
}, { tableName: 'payments' });

function serializePayment(payment) { return payment.toJSON ? payment.toJSON() : payment; }
module.exports = { Payment, serializePayment };
