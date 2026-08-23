const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { verifyPassword } = require('../lib/auth');
const { logAudit } = require('../lib/audit');

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { title: 'Sign in', error: null, layout: false });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await db.query('SELECT * FROM users WHERE username = $1 AND active = true', [(username || '').trim()]);
  const u = rows[0];
  if (!u || !verifyPassword(password || '', u.password_hash)) {
    return res.status(401).render('login', { title: 'Sign in', error: 'Incorrect username or password.', layout: false });
  }
  if (u.role === 'INTERN' && u.intern_ends_at && new Date(u.intern_ends_at) < new Date()) {
    return res.status(401).render('login', { title: 'Sign in', error: 'This intern account has expired. Contact your Unit Head.', layout: false });
  }
  req.session.userId = u.id;
  await logAudit(u.id, 'LOGIN', 'users', u.id, null);
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
