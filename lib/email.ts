/**
 * Email utility for sending transactional emails via Brevo API
 *
 * Provider: Brevo (Sendinblue) Transactional API
 * Sender: Billza <reminders@billza.app> (enforced)
 *
 * In development: Logs email content to console (EMAIL_ENABLED=false)
 * In production: Sends via Brevo API (EMAIL_ENABLED=true)
 */

import * as brevo from '@getbrevo/brevo';

// ============================================================
// SENDER CONFIGURATION - ENFORCED
// ============================================================
const ENFORCED_SENDER_EMAIL = 'reminders@billza.app';
const ENFORCED_SENDER_NAME = 'Billza';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Validate sender to prevent accidental use of wrong domain
 * Fails closed - throws error if invalid
 */
function getValidatedSender(): { email: string; name: string } {
  const senderEmail = ENFORCED_SENDER_EMAIL;
  const senderName = ENFORCED_SENDER_NAME;

  // Safety check: Block any sender containing "jahongir" (case insensitive)
  if (senderEmail.toLowerCase().includes('jahongir')) {
    throw new Error(`[EMAIL] BLOCKED: Sender email contains forbidden domain: ${senderEmail}`);
  }

  // Safety check: Require sender to be @billza.app
  if (!senderEmail.endsWith('@billza.app')) {
    throw new Error(`[EMAIL] BLOCKED: Sender must be @billza.app, got: ${senderEmail}`);
  }

  return { email: senderEmail, name: senderName };
}

/**
 * Mask email for logging (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Initialize Brevo API client
 */
function getBrevoClient(): brevo.TransactionalEmailsApi {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('[EMAIL] BREVO_API_KEY not configured');
  }

  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return apiInstance;
}

/**
 * Send email via Brevo Transactional API
 *
 * @returns true if sent successfully, false otherwise
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const emailEnabled = process.env.EMAIL_ENABLED === 'true';

  // Get validated sender (throws if invalid)
  const sender = getValidatedSender();

  // Log attempt (no secrets)
  console.log(`[EMAIL] Attempt | provider=BREVO | sender=${sender.email} | to=${maskEmail(to)} | subject="${subject.slice(0, 50)}..."`);

  if (!emailEnabled) {
    // Development/staging mode: Log to console instead of sending
    console.log('\n========== EMAIL (DISABLED - EMAIL_ENABLED=false) ==========');
    console.log(`Provider: BREVO API`);
    console.log(`From: ${sender.name} <${sender.email}>`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || 'N/A'}`);
    console.log(`HTML length: ${html.length} chars`);
    console.log('=============================================================\n');
    return true;
  }

  // Production mode: Send via Brevo API
  try {
    const apiInstance = getBrevoClient();

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: sender.name, email: sender.email };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    if (text) {
      sendSmtpEmail.textContent = text;
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = response.body?.messageId || 'unknown';

    console.log(`[EMAIL] SUCCESS | provider=BREVO | messageId=${messageId} | sender=${sender.email} | to=${maskEmail(to)}`);
    return true;
  } catch (error: any) {
    // Log error without exposing sensitive data
    const errorMessage = error?.response?.body?.message || error?.message || 'Unknown error';
    console.error(`[EMAIL] FAILED | provider=BREVO | sender=${sender.email} | to=${maskEmail(to)} | error=${errorMessage}`);
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
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your Billza account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this URL into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated email from Billza. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

You requested to reset your password for your Billza account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Billza',
    html,
    text,
  });
}
