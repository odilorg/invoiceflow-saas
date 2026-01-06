import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';
import { regenerateAllFollowUps } from '@/lib/followups';
import { withVersionCheck } from '@/lib/api-version-check';
import { z } from 'zod';
import { checkPlanLimitEnhanced } from '@/lib/billing/subscription-service';
import { timeQuery } from '@/lib/performance';

const isDev = process.env.NODE_ENV !== 'production';

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
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const schedules = await timeQuery(
    'GET /api/schedules',
    'findMany with steps+templates (optimized)',
    () => prisma.schedule.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        steps: {
          select: {
            id: true,
            templateId: true,
            dayOffset: true,
            order: true,
            template: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  return NextResponse.json(schedules);
});

// POST create new schedule (wrapped with version check)
const _POST = withErrorHandler(async (req: NextRequest) => {
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
      { status: 402 }
    );
  }

  const body = await req.json();
  
  // Only log payloads in development
  if (isDev) {
    console.log('[Schedule CREATE] Received payload:', JSON.stringify(body, null, 2));
    if (!body.name) console.log('[Schedule CREATE] Missing name');
    if (!body.steps) console.log('[Schedule CREATE] Missing steps');
    if (body.steps && body.steps.length === 0) console.log('[Schedule CREATE] Empty steps array');
  }

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
});

// Export POST with version check wrapper
export const POST = withVersionCheck(_POST);
