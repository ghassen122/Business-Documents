const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define('Order', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:          { type: DataTypes.STRING, defaultValue: null },
  templateId:      { type: DataTypes.STRING, allowNull: false },
  templateName:    { type: DataTypes.STRING, defaultValue: '' },
  values:          { type: DataTypes.JSONB, defaultValue: {} },
  civValues:       { type: DataTypes.JSONB, defaultValue: {} },
  amount:          { type: DataTypes.FLOAT, allowNull: false },
  status:          { type: DataTypes.STRING, defaultValue: 'pending' },
  payment:         { type: DataTypes.BOOLEAN, defaultValue: false },
  sessionId:       { type: DataTypes.STRING, defaultValue: null },
  paymentIntentId: { type: DataTypes.STRING, defaultValue: null },
  guestEmail:      { type: DataTypes.STRING, defaultValue: null },
  emailSent:       { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

module.exports = Order;