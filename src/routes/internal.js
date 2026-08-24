// A tiny, shared-secret-authenticated surface for things an external
// scheduler needs to trigger — Render's free tier has no built-in cron and
// a free web service spins down after 15 minutes idle, so "run this once a
// day" has to come from *outside* the app (e.g. a free GitHub Actions
// schedule, or a service like cron-job.org hitting this URL). Mounted at
// /internal, before requireAuth, since it authenticates itself with
// INTERNAL_TASK_TOKEN rather than a session.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { sendMail, isConfigured } = require('../lib/mailer');

function requireTaskToken(req, res, next) {
  const token = process.env.INTERNAL_TASK_TOKEN;
  if (!token) return res.status(503).send('INTERNAL_TASK_TOKEN is not configured.');
  if (req.query.token !== token) return res.status(403).send('Forbidden');
  next();
}

// Emails every unit head (and the department head) a digest of (a)
// reminders due in the next 7 days that haven't been sent yet, and (b)
// issued licenses/certificates expiring within 60 days that haven't been
// flagged yet — then marks both SENT/notified so nobody gets the same
// notice every day. Safe to call more than once a day either way.
router.get('/send-due-reminders', requireTaskToken, async (req, res) => {
  const { rows: due } = await db.query(
    `SELECT r.*, c.name AS company_name, u.name AS unit_name, u.key AS unit_key
     FROM reminders r LEFT JOIN companies c ON c.id = r.company_id LEFT JOIN units u ON u.id = r.unit_id
     WHERE r.status = 'SCHEDULED' AND r.due_date <= (CURRENT_DATE + INTERVAL '7 days')
     ORDER BY r.due_date ASC`
  );

  // Same 60-day/not-yet-renewed definition of "renewable" as the dashboard
  // widget and the Renew button (src/routes/documents.js) — only ones not
  // already notified about, so this list shrinks to just what's new each day.
  const { rows: expiring } = await db.query(
    `SELECT cd.id, cd.document_number, cd.expiry_date, c.name AS company_name, dt.label AS type_label, un.name AS unit_name, un.key AS unit_key
     FROM case_documents cd
     JOIN companies c ON c.id = cd.company_id
     JOIN document_types dt ON dt.id = cd.document_type_id
     JOIN units un ON un.id = cd.unit_id
     WHERE cd.status = 'ISSUED' AND cd.expiry_date IS NOT NULL AND cd.expiry_notified_at IS NULL
       AND cd.expiry_date <= (CURRENT_DATE + INTERVAL '60 days')
       AND NOT EXISTS (SELECT 1 FROM case_documents r2 WHERE r2.renewed_from_id = cd.id)
     ORDER BY cd.expiry_date ASC`
  );

  if (!due.length && !expiring.length) {
    return res.json({ sent: 0, configured: isConfigured(), message: 'Nothing due — no reminders or expiring licenses.' });
  }

  const { rows: recipients } = await db.query(
    `SELECT u.email, u.name, u.role, un.key AS unit_key FROM users u LEFT JOIN units un ON un.id = u.unit_id
     WHERE u.active = true AND u.email IS NOT NULL AND u.role IN ('DEPT_HEAD','UNIT_HEAD')`
  );

  const results = [];
  for (const person of recipients) {
    const mineReminders = due.filter((r) => person.role === 'DEPT_HEAD' || r.unit_key === person.unit_key);
    const mineExpiring = expiring.filter((r) => person.role === 'DEPT_HEAD' || r.unit_key === person.unit_key);
    if (!mineReminders.length && !mineExpiring.length) continue;

    const sections = [];
    if (mineReminders.length) {
      sections.push(
        `Reminders due soon:\n` +
        mineReminders.map((r) => `- ${r.subject}${r.company_name ? ` (${r.company_name})` : ''} — due ${new Date(r.due_date).toLocaleDateString()}`).join('\n')
      );
    }
    if (mineExpiring.length) {
      sections.push(
        `Licenses/certificates expiring soon:\n` +
        mineExpiring.map((r) => `- ${r.document_number} — ${r.type_label} (${r.company_name}) — expires ${new Date(r.expiry_date).toLocaleDateString()}`).join('\n')
      );
    }
    const totalCount = mineReminders.length + mineExpiring.length;
    const result = await sendMail({
      to: person.email,
      subject: `ERRS Manager: ${totalCount} item${totalCount === 1 ? '' : 's'} need${totalCount === 1 ? 's' : ''} attention`,
      text: `Hi ${person.name},\n\n${sections.join('\n\n')}\n\n— ERRS Manager`,
    });
    results.push({ to: person.email, ...result });
  }

  if (isConfigured()) {
    if (due.length) await db.query(`UPDATE reminders SET status = 'SENT', sent_at = now() WHERE id = ANY($1::int[])`, [due.map((r) => r.id)]);
    if (expiring.length) await db.query(`UPDATE case_documents SET expiry_notified_at = now() WHERE id = ANY($1::int[])`, [expiring.map((r) => r.id)]);
  }

  res.json({ reminders: due.length, expiring: expiring.length, configured: isConfigured(), recipients: results });
});

module.exports = router;
