import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { MAX_FOLLOWUPS_PER_DAY_PER_INVOICE } from '@/lib/constants';
import { timeQuery } from '@/lib/performance';
import { verifyCronAuth } from '@/lib/request-utils';

export async function POST(req: NextRequest) {
  const cronStartTime = new Date();
  console.log(`[CRON] Started at ${cronStartTime.toISOString()}`);

  try {
    // Verify cron secret with timing-safe comparison
    if (!verifyCronAuth(req)) {
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
            status: 'PENDING',
            remindersEnabled: true,
            user: {
              subscription: {
                status: {
                  in: ['ACTIVE', 'TRIALING'],
                },
                OR: [
                  { endsAt: null },
                  { endsAt: { gt: new Date() } },
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
          scheduledDate: 'asc',
        },
        take: 500,
      })
    );

    // Count unique invoices eligible (after subscription filter)
    const uniqueInvoiceIds = new Set(followUps.map(f => f.invoiceId));
    const followUpIds = followUps.map(f => f.id);

    // BATCHED: Pre-fetch existing logs for idempotency check (prevents N+1)
    const existingLogs = await prisma.emailLog.findMany({
      where: {
        followUpId: { in: followUpIds },
        sentAt: { gte: today, lt: tomorrow },
      },
      select: { followUpId: true },
    });
    const existingLogIds = new Set(existingLogs.map(l => l.followUpId));

    // BATCHED: Pre-fetch rate limit data
    const emailsSentToday = await prisma.emailLog.groupBy({
      by: ['followUpId'],
      where: {
        sentAt: { gte: today, lt: tomorrow },
        success: true,
        followUp: {
          invoiceId: { in: Array.from(uniqueInvoiceIds) },
        },
      },
      _count: { id: true },
    });

    const invoiceSentCountMap = new Map<string, number>();
    for (const result of emailsSentToday) {
      const followUp = followUps.find(f => f.id === result.followUpId);
      if (followUp) {
        const currentCount = invoiceSentCountMap.get(followUp.invoiceId) || 0;
        invoiceSentCountMap.set(followUp.invoiceId, currentCount + result._count.id);
      }
    }

    // BATCHED: Pre-fetch invoice followUp counts
    const invoiceFollowUpCounts = await prisma.invoice.findMany({
      where: { id: { in: Array.from(uniqueInvoiceIds) } },
      select: {
        id: true,
        _count: { select: { followUps: true } },
        followUps: {
          where: { status: 'SENT' },
          select: { id: true },
        },
      },
    });

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

    // Collect batch operations
    const emailLogsToCreate: Array<{
      followUpId: string;
      recipientEmail: string;
      subject: string;
      success: boolean;
      errorMessage?: string;
    }> = [];
    const followUpsToMarkSent: string[] = [];
    const followUpsToSkip: Array<{ id: string; reason: string }> = [];
    const invoicesToUpdate: string[] = [];
    const invoicesToComplete: Array<{ id: string; totalReminders: number }> = [];

    for (const followUp of followUps) {
      try {
        // BATCHED: Idempotency check using pre-fetched data
        if (existingLogIds.has(followUp.id)) {
          results.skipped++;
          continue;
        }

        // BATCHED: Rate limit check using pre-fetched data
        const sentToday = invoiceSentCountMap.get(followUp.invoiceId) || 0;
        if (sentToday >= MAX_FOLLOWUPS_PER_DAY_PER_INVOICE) {
          followUpsToSkip.push({ id: followUp.id, reason: 'Max follow-ups per day limit reached' });
          results.skipped++;
          results.skipped_rate_limit++;
          continue;
        }

        // Send email using shared sendEmail function
        try {
          const htmlBody = followUp.body.replace(/\n/g, '<br>');
          
          const success = await sendEmail({
            to: followUp.invoice.clientEmail,
            subject: followUp.subject,
            html: htmlBody,
            text: followUp.body,
          });

          if (!success) {
            throw new Error('Failed to send email');
          }

          // Collect for batch insert
          emailLogsToCreate.push({
            followUpId: followUp.id,
            recipientEmail: followUp.invoice.clientEmail,
            subject: followUp.subject,
            success: true,
          });
          
          followUpsToMarkSent.push(followUp.id);
          invoicesToUpdate.push(followUp.invoiceId);

          // Check if this was the last scheduled reminder
          const totalFollowUps = totalFollowUpsMap.get(followUp.invoiceId) || 0;
          const sentFollowUps = (sentFollowUpsMap.get(followUp.invoiceId) || 0) + 1;

          if (sentFollowUps >= totalFollowUps) {
            invoicesToComplete.push({ id: followUp.invoiceId, totalReminders: totalFollowUps });
          }

          results.sent++;
        } catch (emailError: unknown) {
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
          
          emailLogsToCreate.push({
            followUpId: followUp.id,
            recipientEmail: followUp.invoice.clientEmail,
            subject: followUp.subject,
            success: false,
            errorMessage,
          });

          followUpsToSkip.push({ id: followUp.id, reason: errorMessage });
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to process follow-up ${followUp.id}:`, error);
        results.failed++;
      }
    }

    // BATCHED: Execute all database updates in bulk
    const now = new Date();

    // Batch create email logs
    if (emailLogsToCreate.length > 0) {
      await prisma.emailLog.createMany({
        data: emailLogsToCreate,
      });
    }

    // Batch update sent follow-ups
    if (followUpsToMarkSent.length > 0) {
      await prisma.followUp.updateMany({
        where: { id: { in: followUpsToMarkSent } },
        data: { status: 'SENT', sentAt: now },
      });
    }

    // Batch update skipped follow-ups
    for (const skip of followUpsToSkip) {
      await prisma.followUp.update({
        where: { id: skip.id },
        data: { status: 'SKIPPED', errorMessage: skip.reason },
      });
    }

    // Batch update invoice reminder timestamps
    if (invoicesToUpdate.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: [...new Set(invoicesToUpdate)] } },
        data: { lastReminderSentAt: now },
      });
    }

    // Update completed invoices
    for (const complete of invoicesToComplete) {
      await prisma.invoice.update({
        where: { id: complete.id },
        data: {
          remindersCompleted: true,
          totalScheduledReminders: complete.totalReminders,
        },
      });
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
