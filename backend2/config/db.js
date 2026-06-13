const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
module.exports.sequelize = sequelize;
