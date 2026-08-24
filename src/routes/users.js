// Staff account management — Department Head only. Mounted at /app/users.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const { checkPasswordStrength } = require('../lib/password');
const { logAudit, diffForAudit } = require('../lib/audit');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.*, un.name AS unit_name FROM users u LEFT JOIN units un ON un.id = u.unit_id ORDER BY u.role, u.name`
  );
  res.render('users/list', { title: 'Staff Accounts', rows });
});

router.get('/new', async (req, res) => {
  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
  res.render('users/form', { title: 'Add Staff Account', record: {}, units, isNew: true, error: null });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
  const passwordError = checkPasswordStrength(b.password);
  if (passwordError) {
    return res.status(400).render('users/form', { title: 'Add Staff Account', record: b, units, isNew: true, error: passwordError });
  }
  try {
    const { rows } = await db.query(
      // A brand-new account is set to must_change_password so whoever it's
      // handed to picks their own password at first login, instead of the
      // Department Head's chosen initial password persisting indefinitely.
      `INSERT INTO users (name, username, email, password_hash, role, unit_id, intern_ends_at, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
      [
        b.name, b.username, b.email || null, hashPassword(b.password), b.role,
        b.role === 'DEPT_HEAD' ? null : Number(b.unit_id),
        b.role === 'INTERN' && b.intern_ends_at ? b.intern_ends_at : null,
      ]
    );
    await logAudit(req.user.id, 'CREATE', 'users', rows[0].id, `Created account for ${b.username}`);
    res.redirect('/app/users');
  } catch (e) {
    const msg = /unique/i.test(e.message) ? 'That username or email is already taken.' : 'Could not create that account.';
    res.status(400).render('users/form', { title: 'Add Staff Account', record: b, units, isNew: true, error: msg });
  }
});

router.get('/:id/edit', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const record = rows[0];
  if (!record) return res.status(404).render('error', { title: 'Not found', message: 'Account not found.' });
  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
  res.render('users/form', { title: `Edit — ${record.name}`, record, units, isNew: false, error: null });
});

router.post('/:id', async (req, res) => {
  const b = req.body;
  const { rows: beforeRows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const before = beforeRows[0];
  if (!before) return res.status(404).render('error', { title: 'Not found', message: 'Account not found.' });

  if (b.password) {
    const passwordError = checkPasswordStrength(b.password);
    if (passwordError) {
      const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
      return res.status(400).render('users/form', { title: `Edit — ${before.name}`, record: { ...before, ...b }, units, isNew: false, error: passwordError });
    }
  }

  const after = {
    name: b.name, email: b.email || null, role: b.role,
    unit_id: b.role === 'DEPT_HEAD' ? null : Number(b.unit_id),
    active: b.active === 'on',
    intern_ends_at: b.role === 'INTERN' && b.intern_ends_at ? b.intern_ends_at : null,
  };
  await db.query(
    `UPDATE users SET name=$1, email=$2, role=$3, unit_id=$4, active=$5, intern_ends_at=$6 WHERE id=$7`,
    [after.name, after.email, after.role, after.unit_id, after.active, after.intern_ends_at, req.params.id]
  );
  if (b.password) {
    // A Department-Head-initiated reset forces the recipient to set their
    // own password on next login, same as account creation — whoever
    // pressed "reset" chose this new password, not the account's owner.
    await db.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hashPassword(b.password), req.params.id]);
  }
  await logAudit(req.user.id, 'UPDATE', 'users', Number(req.params.id), diffForAudit(before, after));
  res.redirect('/app/users');
});

module.exports = router;
