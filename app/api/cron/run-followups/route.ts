import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as brevo from '@getbrevo/brevo';
import { MAX_FOLLOWUPS_PER_DAY_PER_INVOICE } from '@/lib/constants';

// Initialize Brevo API client
const brevoApi = new brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY as string
);

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count total invoices with reminders due (before subscription filter)
    const totalInvoicesDue = await prisma.invoice.count({
      where: {
        status: 'PENDING',
        remindersEnabled: true,
        followUps: {
          some: {
            status: 'PENDING',
            scheduledDate: {
              gte: today,
              lt: tomorrow,
            },
          },
        },
      },
    });

    // Get pending follow-ups due today (filtered by subscription status)
    const followUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        invoice: {
          status: 'PENDING', // Only send for pending invoices
          remindersEnabled: true, // Only send if reminders are enabled
          user: {
            // CRITICAL: Only send for users with active subscriptions
            OR: [
              // Active subscription
              {
                subscription: {
                  status: {
                    in: ['ACTIVE', 'TRIALING'],
                  },
                  OR: [
                    { endsAt: null }, // No end date (lifetime)
                    { endsAt: { gt: new Date() } }, // Or not expired
                  ],
                },
              },
              // FREE plan users (no subscription required)
              {
                planStatus: 'FREE',
                subscription: null,
              },
            ],
          },
        },
      },
      include: {
        invoice: {
          include: {
            user: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    // Count unique invoices eligible (after subscription filter)
    const uniqueInvoiceIds = new Set(followUps.map(f => f.invoiceId));

    const results = {
      scanned_invoices: totalInvoicesDue,
      eligible_invoices: uniqueInvoiceIds.size,
      total_followups: followUps.length,
      sent: 0,
      skipped: 0,
      skipped_not_entitled: totalInvoicesDue - uniqueInvoiceIds.size,
      skipped_rate_limit: 0,
      failed: 0,
    };

    for (const followUp of followUps) {
      try {
        // Check if we've already sent a follow-up for this invoice today
        const sentToday = await prisma.emailLog.count({
          where: {
            followUp: {
              invoiceId: followUp.invoiceId,
            },
            sentAt: {
              gte: today,
              lt: tomorrow,
            },
            success: true,
          },
        });

        if (sentToday >= MAX_FOLLOWUPS_PER_DAY_PER_INVOICE) {
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              status: 'SKIPPED',
              errorMessage: 'Max follow-ups per day limit reached',
            },
          });
          results.skipped++;
          results.skipped_rate_limit++;
          continue;
        }

        // Send email using Brevo
        try {
          // Parse sender email and name from EMAIL_FROM
          const emailFrom = process.env.EMAIL_FROM || 'Invoice Reminders <no-reply@yourdomain.com>';
          const senderMatch = emailFrom.match(/^(.+?)\s*<(.+)>$/);
          const senderName = senderMatch ? senderMatch[1] : process.env.BREVO_SENDER_NAME || 'Invoice Reminders';
          const senderEmail = senderMatch ? senderMatch[2] : emailFrom;

          const sendSmtpEmail = new brevo.SendSmtpEmail();
          sendSmtpEmail.subject = followUp.subject;
          sendSmtpEmail.htmlContent = followUp.body.replace(/\n/g, '<br>');
          sendSmtpEmail.sender = { name: senderName, email: senderEmail };
          sendSmtpEmail.to = [{ email: followUp.invoice.clientEmail, name: followUp.invoice.clientName }];

          const result = await brevoApi.sendTransacEmail(sendSmtpEmail);

          // Log success
          await prisma.emailLog.create({
            data: {
              followUpId: followUp.id,
              recipientEmail: followUp.invoice.clientEmail,
              subject: followUp.subject,
              success: true,
            },
          });

          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          // Update invoice reminder tracking
          await prisma.invoice.update({
            where: { id: followUp.invoiceId },
            data: {
              lastReminderSentAt: new Date(),
            },
          });

          // Check if this was the last scheduled reminder
          const totalFollowUps = await prisma.followUp.count({
            where: { invoiceId: followUp.invoiceId }
          });

          const sentFollowUps = await prisma.followUp.count({
            where: {
              invoiceId: followUp.invoiceId,
              status: 'SENT'
            }
          });

          // If all follow-ups have been sent and invoice is still unpaid, mark as completed
          if (sentFollowUps >= totalFollowUps) {
            await prisma.invoice.update({
              where: { id: followUp.invoiceId },
              data: {
                remindersCompleted: true,
                totalScheduledReminders: totalFollowUps,
              },
            });
          }

          results.sent++;
        } catch (emailError: any) {
          // Log failure
          await prisma.emailLog.create({
            data: {
              followUpId: followUp.id,
              recipientEmail: followUp.invoice.clientEmail,
              subject: followUp.subject,
              success: false,
              errorMessage: emailError.message || 'Unknown error',
            },
          });

          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              errorMessage: emailError.message || 'Failed to send email',
            },
          });

          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to process follow-up ${followUp.id}:`, error);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
