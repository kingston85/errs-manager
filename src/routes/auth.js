const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const db = require('../lib/db');
const { verifyPassword } = require('../lib/auth');
const { logAudit } = require('../lib/audit');

// Login had no brute-force protection at all, on a system where every
// seeded demo account shares one password published in the README. Five
// attempts per 15 minutes per IP+username is generous for a real typo,
// hostile for a password-guessing script.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Keyed by IP + the username being attempted, not IP alone — so one
  // slow typist on a shared office connection can't lock out a coworker
  // guessing a different username from the same address. ipKeyGenerator
  // normalizes IPv6 addresses to a /64 prefix so a single client can't
  // dodge the limit by cycling through addresses in its own subnet.
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body && req.body.username) || ''}`.toLowerCase(),
  handler: (req, res) => {
    res.status(429).render('login', {
      title: 'Sign in',
      error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
      layout: false,
    });
  },
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { title: 'Sign in', error: null, layout: false });
});

router.post('/login', loginLimiter, async (req, res) => {
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
