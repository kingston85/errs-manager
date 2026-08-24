// Self-service "you must set a new password" flow — reached automatically
// whenever users.must_change_password is true (see the gate in
// server.js), which is set on every newly created account and every
// Department-Head-initiated password reset, and (via a one-time migration)
// on all seven originally-seeded demo accounts sharing the published
// README password. Mounted at /account, inside requireAuth.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const { checkPasswordStrength } = require('../lib/password');
const { logAudit } = require('../lib/audit');

router.get('/password', (req, res) => {
  res.render('account/password', { title: 'Set a new password', error: null, layout: false });
});

router.post('/password', async (req, res) => {
  const { password, confirm } = req.body;
  if (password !== confirm) {
    return res.status(400).render('account/password', { title: 'Set a new password', error: 'Those two passwords don’t match.', layout: false });
  }
  const passwordError = checkPasswordStrength(password);
  if (passwordError) {
    return res.status(400).render('account/password', { title: 'Set a new password', error: passwordError, layout: false });
  }
  await db.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [hashPassword(password), req.user.id]);
  await logAudit(req.user.id, 'UPDATE', 'users', req.user.id, 'Set own password');
  res.redirect('/');
});

module.exports = router;
