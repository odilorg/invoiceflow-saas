import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withVersionCheck } from '@/lib/api-version-check';
import { z } from 'zod';
import { checkPlanLimitEnhanced } from '@/lib/billing/subscription-service';
import { timeQuery } from '@/lib/performance'; // TEMPORARY: For baseline measurement

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  isDefault: z.boolean().default(false),
});

// GET all templates for current user
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // TEMPORARY: Measure performance
    const templates = await timeQuery(
      'GET /api/templates',
      'findMany',
      () => prisma.template.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })
    );

    return NextResponse.json(templates);
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

// POST create new template
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Check template limit with enhanced enforcement (transaction-safe)
    const quotaCheck = await checkPlanLimitEnhanced(user.id, 'templates');
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
    const data = templateSchema.parse(body);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.template.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.template.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
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
