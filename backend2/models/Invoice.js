const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:      { type: DataTypes.STRING, allowNull: false },
  mail:         { type: DataTypes.STRING, allowNull: false },
  templateName: { type: DataTypes.STRING, defaultValue: '' },
  invoiceUrl:   { type: DataTypes.STRING, allowNull: false },
  invoiceId:    { type: DataTypes.STRING, allowNull: false },
  amount:       { type: DataTypes.FLOAT, allowNull: false },
  status:       { type: DataTypes.STRING, defaultValue: 'pending' },
  sentAt:       { type: DataTypes.DATE, defaultValue: null },
}, { timestamps: true });

module.exports = Invoice;