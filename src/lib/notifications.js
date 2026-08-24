// The in-app notification bell (see views/partials/sidebar.ejs's topbar
// bell, wired via views/layout.ejs). Deliberately reuses the same
// "reminders due soon" concept as the email digest (src/routes/internal.js)
// rather than introducing a separate notifications table — one source of
// truth for "what needs attention soon", surfaced two ways (email digest,
// and this in-app bell) rather than two things that can drift apart.
//
// Runs once per authenticated request (mounted in src/server.js after
// requirePasswordSet) — cheap: reminders.due_date has a partial index for
// exactly this WHERE clause (see db/schema.sql), and the item list is capped.
const db = require('./db');

const LOOKAHEAD_DAYS = 7;
const LIMIT = 8;

function attachNotifications() {
  return async (req, res, next) => {
    if (!req.user) return next();
    const unitFilter = req.user.role === 'DEPT_HEAD' ? null : req.user.unit_id;
    const unitClause = unitFilter ? 'AND r.unit_id = $1' : '';
    const params = unitFilter ? [unitFilter] : [];

    const [{ rows: countRows }, { rows: itemRows }] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS n FROM reminders r
         WHERE r.status = 'SCHEDULED' AND r.due_date <= (CURRENT_DATE + INTERVAL '${LOOKAHEAD_DAYS} days') ${unitClause}`,
        params
      ),
      db.query(
        `SELECT r.id, r.subject, r.due_date, c.name AS company_name
         FROM reminders r LEFT JOIN companies c ON c.id = r.company_id
         WHERE r.status = 'SCHEDULED' AND r.due_date <= (CURRENT_DATE + INTERVAL '${LOOKAHEAD_DAYS} days') ${unitClause}
         ORDER BY r.due_date ASC LIMIT ${LIMIT}`,
        params
      ),
    ]);

    const today = new Date(new Date().toDateString());
    const items = itemRows.map((r) => ({ ...r, overdue: new Date(r.due_date) < today }));
    const count = Number(countRows[0].n);

    res.locals.notifications = { items, count, overflow: count > items.length };
    next();
  };
}

module.exports = { attachNotifications };
