const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserDocument = sequelize.define('UserDocument', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email:        { type: DataTypes.STRING, allowNull: false },
  userId:       { type: DataTypes.STRING, defaultValue: null },
  templateId:   { type: DataTypes.STRING, allowNull: false },
  templateName: { type: DataTypes.STRING },
  fileName:     { type: DataTypes.STRING },
  savedAt:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  price:        { type: DataTypes.FLOAT, defaultValue: 0 },
  values:       { type: DataTypes.JSONB, defaultValue: {} },
  labels:       { type: DataTypes.JSONB, defaultValue: {} },
}, {
  timestamps: false,
  indexes: [{ unique: true, fields: ['email', 'templateId'] }],
});

module.exports = UserDocument;
