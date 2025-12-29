import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as brevo from '@getbrevo/brevo';
import { MAX_FOLLOWUPS_PER_DAY_PER_INVOICE } from '@/lib/constants';
import { timeQuery } from '@/lib/performance'; // TEMPORARY: For baseline measurement

// Initialize Brevo API client
const brevoApi = new brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY as string
);

export async function POST(req: NextRequest) {
  const cronStartTime = new Date();
  console.log(`[CRON] Started at ${cronStartTime.toISOString()}`);

  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log(`[CRON] Unauthorized request at ${new Date().toISOString()}`);
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
    // PHASE 3: Add batch processing limit + optimized select
    // TEMPORARY: Measure performance
    const followUps = await timeQuery(
      'POST /api/cron/run-followups',
      'findMany followUps with invoice+user+subscription (batched)',
      () => prisma.followUp.findMany({
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
              // CRITICAL: Only send for users with PAID active subscriptions
              // FREE users are NOT eligible for automated cron reminders
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
          },
        },
        select: {
          id: true,
          invoiceId: true,
          subject: true,
          body: true,
          invoice: {
            select: {
              id: true,
              clientName: true,
              clientEmail: true,
              user: {
                select: {
                  id: true,
                  subscription: {
                    select: {
                      status: true,
                      endsAt: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          scheduledDate: 'asc', // Process oldest first
        },
        take: 500, // PHASE 3: Batch limit - max 500 per run
      })
    );

    // Count unique invoices eligible (after subscription filter)
    const uniqueInvoiceIds = new Set(followUps.map(f => f.invoiceId));

    // PHASE 3: Pre-fetch rate limit data to prevent N+1 queries
    // Get count of emails sent today per invoice (in one query)
    const emailsSentToday = await prisma.emailLog.groupBy({
      by: ['followUpId'],
      where: {
        sentAt: {
          gte: today,
          lt: tomorrow,
        },
        success: true,
        followUp: {
          invoiceId: {
            in: Array.from(uniqueInvoiceIds),
          },
        },
      },
      _count: {
        id: true,
      },
    });

    // Create a map: invoiceId -> count of emails sent today
    const invoiceSentCountMap = new Map<string, number>();
    for (const result of emailsSentToday) {
      const followUp = followUps.find(f => f.id === result.followUpId);
      if (followUp) {
        const currentCount = invoiceSentCountMap.get(followUp.invoiceId) || 0;
        invoiceSentCountMap.set(followUp.invoiceId, currentCount + result._count.id);
      }
    }

    // PHASE 3: Pre-fetch invoice followUp counts to prevent N+1 queries
    const invoiceFollowUpCounts = await prisma.invoice.findMany({
      where: {
        id: {
          in: Array.from(uniqueInvoiceIds),
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            followUps: true,
          },
        },
        followUps: {
          where: {
            status: 'SENT',
          },
          select: {
            id: true,
          },
        },
      },
    });

    // Create maps for quick lookup
    const totalFollowUpsMap = new Map<string, number>();
    const sentFollowUpsMap = new Map<string, number>();
    for (const invoice of invoiceFollowUpCounts) {
      totalFollowUpsMap.set(invoice.id, invoice._count.followUps);
      sentFollowUpsMap.set(invoice.id, invoice.followUps.length);
    }

    const results = {
      scanned_invoices: totalInvoicesDue,
      eligible_invoices: uniqueInvoiceIds.size,
      total_followups: followUps.length,
      batch_limit: 500,
      sent: 0,
      skipped: 0,
      skipped_not_entitled: totalInvoicesDue - uniqueInvoiceIds.size,
      skipped_rate_limit: 0,
      failed: 0,
    };

    for (const followUp of followUps) {
      try {
        // PHASE 3: Idempotency check - skip if already processed
        // This prevents duplicates if cron runs twice
        const existingLog = await prisma.emailLog.findFirst({
          where: {
            followUpId: followUp.id,
            sentAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (existingLog) {
          // Already processed today, skip silently
          results.skipped++;
          continue;
        }

        // PHASE 3: Use pre-fetched rate limit data (no DB query in loop)
        const sentToday = invoiceSentCountMap.get(followUp.invoiceId) || 0;

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

          // PHASE 3: Check if this was the last scheduled reminder (use pre-fetched data)
          const totalFollowUps = totalFollowUpsMap.get(followUp.invoiceId) || 0;
          const sentFollowUps = (sentFollowUpsMap.get(followUp.invoiceId) || 0) + 1; // +1 for current

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

    const cronEndTime = new Date();
    const durationMs = cronEndTime.getTime() - cronStartTime.getTime();

    console.log(`[CRON] Finished at ${cronEndTime.toISOString()}`);
    console.log(`[CRON] Duration: ${durationMs}ms`);
    console.log(`[CRON] Items processed: ${results.total_followups} (sent: ${results.sent}, skipped: ${results.skipped}, failed: ${results.failed})`);
    console.log(`[CRON] Eligible invoices: ${results.eligible_invoices} / ${results.scanned_invoices} (${results.skipped_not_entitled} not entitled)`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      results,
    });
  } catch (error) {
    const cronErrorTime = new Date();
    console.error(`[CRON] Failed at ${cronErrorTime.toISOString()}:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
