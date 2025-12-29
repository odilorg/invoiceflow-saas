import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { regenerateAllFollowUps } from '@/lib/followups';
import { withVersionCheck } from '@/lib/api-version-check';
import { z } from 'zod';
import { checkPlanLimitEnhanced } from '@/lib/billing/subscription-service';
import { timeQuery } from '@/lib/performance'; // TEMPORARY: For baseline measurement

const scheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  isActive: z.boolean().default(true),
  steps: z.array(
    z.object({
      templateId: z.string().min(1, 'Template is required for each step'),
      dayOffset: z.number(),
      order: z.number(),
    })
  ).min(1, 'At least one follow-up step is required'),
});

// GET all schedules for current user
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // TEMPORARY: Measure performance
    const schedules = await timeQuery(
      'GET /api/schedules',
      'findMany with steps+templates',
      () => prisma.schedule.findMany({
        where: { userId: user.id },
        include: {
          steps: {
            include: {
              template: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    return NextResponse.json(schedules);
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

// POST create new schedule (wrapped with version check)
const _POST = async (req: NextRequest) => {
  try {
    const user = await requireUser();

    // Check schedule limit with enhanced enforcement (transaction-safe)
    const quotaCheck = await checkPlanLimitEnhanced(user.id, 'schedules');
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
    console.log('[Schedule CREATE] Received payload:', JSON.stringify(body, null, 2));

    // Additional validation logging
    if (!body.name) console.log('[Schedule CREATE] Missing name');
    if (!body.steps) console.log('[Schedule CREATE] Missing steps');
    if (body.steps && body.steps.length === 0) console.log('[Schedule CREATE] Empty steps array');

    const data = scheduleSchema.parse(body);

    const schedule = await prisma.schedule.create({
      data: {
        name: data.name,
        isActive: data.isActive,
        userId: user.id,
        steps: {
          create: data.steps,
        },
      },
      include: {
        steps: {
          include: {
            template: true,
          },
        },
      },
    });

    // Regenerate follow-ups for all pending invoices with this schedule
    await regenerateAllFollowUps(user.id);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      console.error('[Schedule CREATE] Validation error:', JSON.stringify(error.errors, null, 2));
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

// Export POST with version check wrapper
export const POST = withVersionCheck(_POST);
