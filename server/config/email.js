'use strict';

const nodemailer = require('nodemailer');

// ── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, text: string }} opts
 */
async function sendEmail({ to, subject, html, text }) {
    const mailOptions = {
        from: `"CaltransBizConnect" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`CaltransBizConnect Email: Sent to ${to} — ${info.messageId}`);
    return info;
}

// ── Shared email wrapper ─────────────────────────────────────────────────────
function emailWrapper(bodyContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Calibri,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#003D5B;padding:28px 32px;">
            <h1 style="margin:0;color:#FDB714;font-size:22px;font-weight:700;letter-spacing:-0.5px;">CaltransBizConnect</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Small Business Supportive Services</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f6f8;padding:20px 32px;border-top:1px solid #e0e0e0;text-align:center;">
            <p style="margin:0;color:#666;font-size:12px;">© 2026 California Department of Transportation. All rights reserved.</p>
            <p style="margin:6px 0 0;color:#888;font-size:11px;">
              <a href="https://caltransbizconnect.org" style="color:#046B99;text-decoration:none;">caltransbizconnect.org</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href, label) {
    return `<a href="${href}" style="display:inline-block;background:#FDB714;color:#003D5B;font-weight:700;font-size:15px;padding:12px 28px;border-radius:6px;text-decoration:none;margin:20px 0;">${label}</a>`;
}

// ── Email Templates ──────────────────────────────────────────────────────────

/**
 * Password reset email.
 * @param {string} resetLink
 * @param {string} userName
 */
function getPasswordResetEmail(resetLink, userName) {
    const html = emailWrapper(`
        <h2 style="margin:0 0 8px;color:#003D5B;font-size:20px;">Reset Your Password</h2>
        <p style="color:#444;line-height:1.6;">Hi ${userName},</p>
        <p style="color:#444;line-height:1.6;">We received a request to reset the password for your CaltransBizConnect account. Click the button below to choose a new password.</p>
        ${btn(resetLink, 'Reset My Password')}
        <p style="color:#666;font-size:13px;line-height:1.6;margin-top:8px;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
        <p style="color:#888;font-size:12px;margin-top:16px;">If the button above doesn't work, copy and paste this URL into your browser:<br>
        <a href="${resetLink}" style="color:#046B99;word-break:break-all;">${resetLink}</a></p>
    `);

    const text = `Reset Your Password\n\nHi ${userName},\n\nWe received a request to reset your CaltransBizConnect password.\n\nReset link (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\n© 2026 California Department of Transportation`;

    return { html, text };
}

/**
 * Welcome email sent after registration.
 * @param {string} userName
 * @param {'small_business'|'prime_contractor'} userType
 */
function getWelcomeEmail(userName, userType) {
    const typeLabel = userType === 'prime_contractor' ? 'Prime Contractor' : 'Small Business';
    const dashboardHref = `${process.env.APP_URL || 'https://caltransbizconnect.org'}/login.html`;

    const html = emailWrapper(`
        <h2 style="margin:0 0 8px;color:#003D5B;font-size:20px;">Welcome to CaltransBizConnect!</h2>
        <p style="color:#444;line-height:1.6;">Hi ${userName},</p>
        <p style="color:#444;line-height:1.6;">Your <strong>${typeLabel}</strong> account has been created. You can now access the platform to ${userType === 'prime_contractor' ? 'post opportunities and find qualified small businesses' : 'browse contracting opportunities, upload your capability statement, and connect with prime contractors'}.</p>
        ${btn(dashboardHref, 'Go to Dashboard')}
        <p style="color:#666;font-size:13px;line-height:1.6;">If you have questions, contact us at <a href="mailto:smallbusinesses@dot.ca.gov" style="color:#046B99;">smallbusinesses@dot.ca.gov</a> or call (916) 324-1700.</p>
    `);

    const text = `Welcome to CaltransBizConnect!\n\nHi ${userName},\n\nYour ${typeLabel} account has been created successfully.\n\nLog in at: ${dashboardHref}\n\nQuestions? Email smallbusinesses@dot.ca.gov or call (916) 324-1700.\n\n© 2026 California Department of Transportation`;

    return { html, text };
}

/**
 * Contact form confirmation email sent to the user.
 * @param {string} userName
 * @param {string} message
 */
function getContactConfirmationEmail(userName, message) {
    const html = emailWrapper(`
        <h2 style="margin:0 0 8px;color:#003D5B;font-size:20px;">We Received Your Message</h2>
        <p style="color:#444;line-height:1.6;">Hi ${userName},</p>
        <p style="color:#444;line-height:1.6;">Thank you for contacting CaltransBizConnect. Our team will respond within <strong>1–2 business days</strong>.</p>
        <div style="background:#f8f9fa;border-left:4px solid #FDB714;padding:16px;border-radius:0 6px 6px 0;margin:20px 0;">
          <p style="margin:0;color:#555;font-size:13px;font-style:italic;">"${message}"</p>
        </div>
        <p style="color:#666;font-size:13px;">For urgent matters, call <strong>(916) 324-1700</strong> Monday–Friday, 8:00 AM–5:00 PM PST.</p>
    `);

    const text = `We Received Your Message\n\nHi ${userName},\n\nThank you for contacting CaltransBizConnect. We'll respond within 1–2 business days.\n\nYour message:\n"${message}"\n\nFor urgent matters: (916) 324-1700, Mon–Fri 8AM–5PM PST.\n\n© 2026 California Department of Transportation`;

    return { html, text };
}

module.exports = { sendEmail, getPasswordResetEmail, getWelcomeEmail, getContactConfirmationEmail };
