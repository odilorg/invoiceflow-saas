import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandler, handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';
import { generateFollowUps } from '@/lib/followups';
import { ensureDefaultSchedule } from '@/lib/default-schedule';
import { checkPlanLimitEnhanced } from '@/lib/billing/subscription-service';
import { timeQuery } from '@/lib/performance';

const invoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  invoiceNumber: z.string().min(1),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(),
});

// GET all invoices for current user (with optional pagination)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();

  // Parse pagination params (optional - backwards compatible)
  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '0', 10)));
  const status = searchParams.get('status'); // Optional status filter

  // Build where clause
  const where: Record<string, unknown> = { userId: user.id };
  if (status && ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
    where.status = status;
  }

  // If limit is 0, return all (backwards compatible behavior)
  if (limit === 0) {
    const invoices = await timeQuery(
      'GET /api/invoices',
      'findMany with followUps (all)',
      () => prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clientName: true,
          clientEmail: true,
          invoiceNumber: true,
          amount: true,
          currency: true,
          dueDate: true,
          status: true,
          notes: true,
          scheduleId: true,
          createdAt: true,
          lastReminderSentAt: true,
          totalScheduledReminders: true,
          remindersCompleted: true,
          followUps: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
            },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      })
    );

    return NextResponse.json(invoices);
  }

  // Paginated query
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    timeQuery(
      'GET /api/invoices',
      `findMany with followUps (page ${page}, limit ${limit})`,
      () => prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          clientName: true,
          clientEmail: true,
          invoiceNumber: true,
          amount: true,
          currency: true,
          dueDate: true,
          status: true,
          notes: true,
          scheduleId: true,
          createdAt: true,
          lastReminderSentAt: true,
          totalScheduledReminders: true,
          remindersCompleted: true,
          followUps: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
            },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      })
    ),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

// POST create new invoice
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Check invoice limit with enhanced enforcement (transaction-safe, UTC-aware)
    const quotaCheck = await checkPlanLimitEnhanced(user.id, 'invoicesPerMonth');
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.error,
          upgradeRequired: true,
          limitKey: quotaCheck.limitKey,
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          plan: quotaCheck.plan,
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const data = invoiceSchema.parse(body);

    // Get or create default schedule if no schedule specified
    let scheduleId = data.scheduleId;
    if (!scheduleId) {
      const defaultSchedule = await ensureDefaultSchedule(user.id);
      scheduleId = defaultSchedule.id;
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        amount: data.amount,
        currency: data.currency,
        invoiceNumber: data.invoiceNumber,
        dueDate: new Date(data.dueDate),
        notes: data.notes,
        userId: user.id,
        scheduleId: scheduleId,
      },
    });

    // Generate follow-ups using the assigned schedule
    await generateFollowUps(invoice.id, scheduleId);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
