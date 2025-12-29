import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { generateFollowUps } from '@/lib/followups';
import { ensureDefaultSchedule } from '@/lib/default-schedule';
import { checkPlanLimitEnhanced } from '@/lib/billing/subscription-service';
import { timeQuery } from '@/lib/performance'; // TEMPORARY: For baseline measurement

const invoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  invoiceNumber: z.string().min(1),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(), // Optional schedule override
});

// GET all invoices for current user
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // TEMPORARY: Measure performance
    const invoices = await timeQuery(
      'GET /api/invoices',
      'findMany with followUps',
      () => prisma.invoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          followUps: {
            orderBy: { scheduledDate: 'asc' },
          },
        },
      })
    );

    return NextResponse.json(invoices);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
        { status: 402 } // HTTP 402 Payment Required
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
