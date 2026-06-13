const bcrypt = require('bcryptjs');
const User   = require('../models/User');
const { signToken } = require('../lib/auth');

// Crée un utilisateur, retourne { token, user } ou lève une erreur métier
async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    const err = new Error('Un compte existe déjà avec cet email.');
    err.status = 400;
    throw err;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user   = await User.create({
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    password: hashed,
  });
  const token = signToken({ id: user.id, name: user.name, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

// Vérifie les credentials, retourne { token, user } ou lève une erreur métier
async function loginUser({ email, password }) {
  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }
  const token = signToken({ id: user.id, name: user.name, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = { registerUser, loginUser };

