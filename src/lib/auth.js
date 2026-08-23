const bcrypt = require('bcryptjs');

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// Attaches req.user from the session on every request (or null). Mounted
// once, globally, before any route — every other middleware/route below
// can just read req.user.
function attachUser(db) {
  return async (req, res, next) => {
    if (req.session && req.session.userId) {
      const { rows } = await db.query(
        `SELECT u.*, un.key AS unit_key, un.name AS unit_name
         FROM users u LEFT JOIN units un ON un.id = u.unit_id
         WHERE u.id = $1 AND u.active = true`,
        [req.session.userId]
      );
      req.user = rows[0] || null;
      // An intern's access has a real end date (see users.intern_ends_at) —
      // enforce it here so an expired intern is bounced back to login on
      // their very next request, not just hidden from some UI list.
      if (req.user && req.user.role === 'INTERN' && req.user.intern_ends_at && new Date(req.user.intern_ends_at) < new Date()) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    res.locals.user = req.user; // so every EJS view can read `user` directly
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// roles: array of allowed roles, e.g. ['DEPT_HEAD', 'UNIT_HEAD']
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login');
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', { title: 'Not allowed', message: "You don't have permission to view this page." });
    }
    next();
  };
}

module.exports = { hashPassword, verifyPassword, attachUser, requireAuth, requireRole };
