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

// Emails every unit head (and the department head) a digest of reminders
// due in the next 7 days that haven't been sent yet, then marks them SENT.
// Safe to call more than once a day — already-SENT reminders are excluded.
router.get('/send-due-reminders', requireTaskToken, async (req, res) => {
  const { rows: due } = await db.query(
    `SELECT r.*, c.name AS company_name, u.name AS unit_name, u.key AS unit_key
     FROM reminders r LEFT JOIN companies c ON c.id = r.company_id LEFT JOIN units u ON u.id = r.unit_id
     WHERE r.status = 'SCHEDULED' AND r.due_date <= (CURRENT_DATE + INTERVAL '7 days')
     ORDER BY r.due_date ASC`
  );

  if (!due.length) return res.json({ sent: 0, configured: isConfigured(), message: 'No reminders due.' });

  const { rows: recipients } = await db.query(
    `SELECT u.email, u.name, u.role, un.key AS unit_key FROM users u LEFT JOIN units un ON un.id = u.unit_id
     WHERE u.active = true AND u.email IS NOT NULL AND u.role IN ('DEPT_HEAD','UNIT_HEAD')`
  );

  const results = [];
  for (const person of recipients) {
    const mine = due.filter((r) => person.role === 'DEPT_HEAD' || r.unit_key === person.unit_key);
    if (!mine.length) continue;
    const lines = mine.map((r) => `- ${r.subject}${r.company_name ? ` (${r.company_name})` : ''} — due ${new Date(r.due_date).toLocaleDateString()}`);
    const result = await sendMail({
      to: person.email,
      subject: `ERRS Manager: ${mine.length} reminder${mine.length === 1 ? '' : 's'} due within 7 days`,
      text: `Hi ${person.name},\n\nThe following reminders are due soon:\n\n${lines.join('\n')}\n\n— ERRS Manager`,
    });
    results.push({ to: person.email, ...result });
  }

  if (isConfigured()) {
    await db.query(`UPDATE reminders SET status = 'SENT', sent_at = now() WHERE id = ANY($1::int[])`, [due.map((r) => r.id)]);
  }

  res.json({ sent: due.length, configured: isConfigured(), recipients: results });
});

module.exports = router;
