import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUsageStats } from '@/lib/billing/subscription-service';
import { BILLING_CONFIG } from '@/lib/billing/config';
import { withErrorHandler } from '@/lib/api-error-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();

    // Get user with subscription
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get usage stats
    const usage = await getUsageStats(user.id);

    // Prepare subscription info
    const subscription = userData.subscription;
    const isActive = subscription?.isActive || false;
    const planStatus = userData.planStatus;
    const plan = BILLING_CONFIG.plans[planStatus];

    // Build response
    const response = {
      plan: {
        name: planStatus,
        displayName: plan.displayName,
        features: plan.limits,
      },
      subscription: subscription ? {
        status: subscription.status,
        isActive: subscription.isActive,
        renewsAt: subscription.renewsAt,
        endsAt: subscription.endsAt,
        trialEndsAt: subscription.trialEndsAt,
        canceledAt: subscription.status === 'CANCELED' ? subscription.updatedAt : null,
      } : null,
      usage: {
        invoices: {
          used: usage.invoices.used,
          limit: usage.invoices.limit,
          percentage: usage.invoices.limit > 0
            ? Math.round((usage.invoices.used / usage.invoices.limit) * 100)
            : 0,
        },
        schedules: {
          used: usage.schedules.used,
          limit: usage.schedules.limit,
          percentage: usage.schedules.limit > 0
            ? Math.round((usage.schedules.used / usage.schedules.limit) * 100)
            : 0,
        },
        templates: {
          used: usage.templates.used,
          limit: usage.templates.limit,
          percentage: usage.templates.limit > 0
            ? Math.round((usage.templates.used / usage.templates.limit) * 100)
            : 0,
        },
      },
      customerId: userData.lsCustomerId,
    };

    return NextResponse.json(response);
});