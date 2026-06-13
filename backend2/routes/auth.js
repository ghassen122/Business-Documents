const express = require('express');
const router  = express.Router();
const {
  register, login, logout, me,
  adminLogin, adminMe, adminLogout,
} = require('../controllers/authController');

router.post('/register',      register);
router.post('/login',          login);
router.post('/logout',         logout);
router.get('/me',              me);
router.post('/admin-login',    adminLogin);
router.get('/admin-me',        adminMe);
router.post('/admin-logout',   adminLogout);

module.exports = router;
