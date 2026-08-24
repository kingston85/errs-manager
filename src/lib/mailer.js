// Thin nodemailer wrapper for the reminder-digest scaffold (see
// src/routes/internal.js). Deliberately inert until SMTP_HOST/SMTP_USER/
// SMTP_PASS/SMTP_FROM are set in the environment — the audit's "email
// reminders" recommendation needs real mail credentials this codebase
// can't supply on its own, so this ships the wiring and fails soft (logs
// instead of throwing) rather than pretending to send mail it can't.
const nodemailer = require('nodemailer');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — would have sent "${subject}" to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendMail, isConfigured };
