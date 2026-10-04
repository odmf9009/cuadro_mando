const nodemailer = require('nodemailer');

let transporter = null;
let attempted = false;

function isConfigured() {
  return Boolean(
    process.env.RESET_EMAIL_SMTP_HOST &&
      process.env.RESET_EMAIL_SMTP_USER &&
      process.env.RESET_EMAIL_SMTP_PASS
  );
}

function getTransporter() {
  if (attempted) return transporter;
  attempted = true;
  if (!isConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.RESET_EMAIL_SMTP_HOST,
    port: Number(process.env.RESET_EMAIL_SMTP_PORT) || 587,
    secure: String(process.env.RESET_EMAIL_SMTP_SECURE) === 'true',
    auth: {
      user: process.env.RESET_EMAIL_SMTP_USER,
      pass: process.env.RESET_EMAIL_SMTP_PASS,
    },
  });
  return transporter;
}

// Devuelve { sent: true } si lo mando de verdad, o { sent: false } si no hay
// SMTP configurado (el llamador debe entonces mostrar el link a mano).
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) return { sent: false };

  await t.sendMail({
    from: process.env.RESET_EMAIL_FROM || process.env.RESET_EMAIL_SMTP_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
}

module.exports = { sendMail, isConfigured };
