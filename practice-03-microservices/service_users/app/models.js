const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
  full_name: { type: DataTypes.STRING(255), allowNull: false }
}, { tableName: 'users' });

function serializeUser(user) {
  const result = user.toJSON ? user.toJSON() : user;
  return { ...result, name: result.full_name };
}

module.exports = { User, serializeUser };
