/**
 * Email utility for sending transactional emails
 *
 * In development: Logs email content to console
 * In production: Sends via email provider (Resend/SendGrid/Nodemailer)
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email (with dev fallback to console logging)
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev || !process.env.EMAIL_PROVIDER_CONFIGURED) {
    // Development mode: Log to console instead of sending
    console.log('\n========== EMAIL (DEV MODE) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || 'N/A'}`);
    console.log(`HTML: ${html}`);
    console.log('======================================\n');
    return true;
  }

  // Production mode: Integrate with email provider
  // TODO: Implement actual email sending via Resend, SendGrid, or Nodemailer
  // Example with Resend:
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM,
  //   to,
  //   subject,
  //   html,
  // });

  console.warn('[EMAIL] Production email sending not configured. Email NOT sent:', { to, subject });
  return false;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  baseUrl: string
): Promise<boolean> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0066cc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your InvoiceFlow account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this URL into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated email from InvoiceFlow. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

You requested to reset your password for your InvoiceFlow account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - InvoiceFlow',
    html,
    text,
  });
}
