const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Template = sequelize.define('Template', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:             { type: DataTypes.STRING, allowNull: false },
  fileName:         { type: DataTypes.STRING, defaultValue: '' },
  layout:           { type: DataTypes.JSONB, defaultValue: null },
  blocks:           { type: DataTypes.JSONB, allowNull: false },
  hyperlinks:       { type: DataTypes.JSONB, defaultValue: {} },
  blanks:           { type: DataTypes.JSONB, defaultValue: [] },
  civs:             { type: DataTypes.JSONB, defaultValue: [] },
  intervenantNames: { type: DataTypes.JSONB, defaultValue: [] },
  originalDocx:     { type: DataTypes.TEXT, defaultValue: null },
  price:            { type: DataTypes.FLOAT, defaultValue: 0 },
  details:          { type: DataTypes.JSONB, defaultValue: null },
}, { timestamps: true });

module.exports = Template;
