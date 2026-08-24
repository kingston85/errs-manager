// Thin wrapper around Resend's HTTP API for the reminder-digest scaffold
// (see src/routes/internal.js). Deliberately inert until RESEND_API_KEY is
// set in the environment — fails soft (logs instead of throwing) rather
// than pretending to send mail it can't.
//
// This used to talk raw SMTP via nodemailer, but Render's free web-service
// tier blocks all outbound traffic to SMTP ports (25/465/587) — see
// https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
// — so every send just hung until it timed out, regardless of credentials
// or port. Resend's API is plain HTTPS (port 443), which isn't blocked.
//
// Until a custom domain is verified on the Resend account, MAIL_FROM must
// stay on their shared onboarding@resend.dev sender, and — per Resend's
// sandbox rules — mail can only actually be delivered to the email address
// the Resend account itself was signed up with. Verifying a domain (free,
// just proves DNS ownership) lifts both restrictions for real rollout.
const RESEND_API_URL = 'https://api.resend.com/emails';

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.log(`[mailer] RESEND_API_KEY not configured — would have sent "${subject}" to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'ERRS Manager <onboarding@resend.dev>',
      to,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 300)}`);
  }

  return { sent: true };
}

module.exports = { sendMail, isConfigured };
