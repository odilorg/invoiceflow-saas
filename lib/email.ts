/**
 * Email utility for sending transactional emails
 *
 * In development: Logs email content to console
 * In production: Sends via Brevo (formerly Sendinblue)
 */

import * as brevo from '@getbrevo/brevo';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Initialize Brevo API client
const brevoApi = new brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY as string
);

/**
 * Send email via Brevo (with dev fallback to console logging)
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // Development mode: Log to console instead of sending
    console.log('\n========== EMAIL (DEV MODE) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || 'N/A'}`);
    console.log(`HTML: ${html}`);
    console.log('======================================\n');
    return true;
  }

  // Production mode: Send via Brevo
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || 'InvoiceFlow',
      email: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || 'info@jahongir-travel.uz',
    };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    if (text) {
      sendSmtpEmail.textContent = text;
    }

    await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] Sent via Brevo to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send via Brevo:', error);
    return false;
  }
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
