import { prisma } from '@/lib/db';
import { User, PlanStatus, SubscriptionStatus, Prisma } from '@prisma/client';
import { BILLING_CONFIG } from './config';

// Enhanced error type for quota enforcement
export type QuotaCheckResult = {
  allowed: boolean;
  error?: string;
  limitKey?: string;
  currentUsage?: number;
  limit?: number | null;
  plan?: PlanStatus;
};

/**
 * Get effective plan for user based on subscription lifecycle
 * Handles: active, trialing, canceled-but-not-ended, expired, etc.
 */
export async function getEffectivePlan(userId: string): Promise<PlanStatus> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return 'FREE';
  }

  const now = new Date();

  // Check subscription status and dates
  switch (subscription.status) {
    case 'ACTIVE':
    case 'TRIALING':
      // Active subscription - use paid plan
      return determinePlanFromProvider(subscription.providerPlan);

    case 'CANCELED':
      // Canceled but still valid until endsAt
      if (subscription.endsAt && subscription.endsAt > now) {
        return determinePlanFromProvider(subscription.providerPlan);
      }
      return 'FREE';

    case 'PAST_DUE':
      // Grace period - check if endsAt is still in future
      if (subscription.endsAt && subscription.endsAt > now) {
        return determinePlanFromProvider(subscription.providerPlan);
      }
      return 'FREE';

    case 'EXPIRED':
    case 'UNPAID':
    case 'PAUSED':
    default:
      return 'FREE';
  }
}

/**
 * Determine plan tier from provider plan string
 */
function determinePlanFromProvider(providerPlan: string | null): PlanStatus {
  if (!providerPlan) return 'FREE';

  if (providerPlan.includes('pro')) return 'PRO';
  if (providerPlan.includes('starter')) return 'STARTER';

  return 'FREE';
}

/**
 * Get UTC month boundaries for timezone-safe counting
 */
function getUTCMonthBoundaries() {
  const now = new Date();

  // Start of current month in UTC
  const startOfMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));

  // End of current month in UTC
  const endOfMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
    23, 59, 59, 999
  ));

  return { startOfMonth, endOfMonth };
}

/**
 * Check if user can perform action - with concurrency safety via transaction
 * Returns QuotaCheckResult with detailed information
 */
export async function checkPlanLimitEnhanced(
  userId: string,
  feature: keyof typeof BILLING_CONFIG.plans.FREE.limits
): Promise<QuotaCheckResult> {
  // Use a transaction to ensure consistency
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get effective plan based on subscription lifecycle
    const effectivePlan = await getEffectivePlanInTransaction(userId, tx);
    const plan = BILLING_CONFIG.plans[effectivePlan];
    const limit = plan.limits[feature];

    // Boolean features (e.g., emailReminders, exportCSV)
    if (typeof limit === 'boolean') {
      if (!limit) {
        return {
          allowed: false,
          error: `This feature is not available on your ${plan.displayName}`,
          limitKey: feature,
          plan: effectivePlan,
        };
      }
      return { allowed: true };
    }

    // Numeric limits (null or -1 means unlimited)
    if (limit === null || limit === -1) {
      return { allowed: true };
    }

    // Check actual usage for numeric limits
    let currentUsage = 0;

    switch (feature) {
      case 'invoicesPerMonth': {
        const { startOfMonth } = getUTCMonthBoundaries();

        currentUsage = await tx.invoice.count({
          where: {
            userId,
            createdAt: { gte: startOfMonth },
          },
        });

        if (currentUsage >= limit) {
          return {
            allowed: false,
            error: 'Invoice limit reached for your plan. Please upgrade to create more invoices.',
            limitKey: 'invoicesPerMonth',
            currentUsage,
            limit,
            plan: effectivePlan,
          };
        }
        break;
      }

      case 'schedules': {
        currentUsage = await tx.schedule.count({
          where: { userId },
        });

        if (currentUsage >= limit) {
          return {
            allowed: false,
            error: 'Schedule limit reached for your plan. Please upgrade to create more schedules.',
            limitKey: 'schedules',
            currentUsage,
            limit,
            plan: effectivePlan,
          };
        }
        break;
      }

      case 'templates': {
        currentUsage = await tx.template.count({
          where: { userId },
        });

        if (currentUsage >= limit) {
          return {
            allowed: false,
            error: 'Template limit reached for your plan. Please upgrade to create more templates.',
            limitKey: 'templates',
            currentUsage,
            limit,
            plan: effectivePlan,
          };
        }
        break;
      }

      default:
        return {
          allowed: false,
          error: 'Unknown feature',
          limitKey: feature,
        };
    }

    return { allowed: true, currentUsage, limit, plan: effectivePlan };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: 5000, // 5 second timeout
  });
}

/**
 * Helper to get effective plan within a transaction
 */
async function getEffectivePlanInTransaction(
  userId: string,
  tx: Prisma.TransactionClient
): Promise<PlanStatus> {
  const subscription = await tx.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return 'FREE';
  }

  const now = new Date();

  switch (subscription.status) {
    case 'ACTIVE':
    case 'TRIALING':
      return determinePlanFromProvider(subscription.providerPlan);

    case 'CANCELED':
      if (subscription.endsAt && subscription.endsAt > now) {
        return determinePlanFromProvider(subscription.providerPlan);
      }
      return 'FREE';

    case 'PAST_DUE':
      if (subscription.endsAt && subscription.endsAt > now) {
        return determinePlanFromProvider(subscription.providerPlan);
      }
      return 'FREE';

    case 'EXPIRED':
    case 'UNPAID':
    case 'PAUSED':
    default:
      return 'FREE';
  }
}

/**
 * Legacy compatibility wrapper
 */
export async function checkPlanLimit(
  userId: string,
  feature: keyof typeof BILLING_CONFIG.plans.FREE.limits
): Promise<boolean> {
  const result = await checkPlanLimitEnhanced(userId, feature);
  return result.allowed;
}

/**
 * Get current usage stats with UTC-safe month counting
 */
export async function getUsageStats(userId: string) {
  const { startOfMonth } = getUTCMonthBoundaries();

  const [invoicesCount, schedulesCount, templatesCount, effectivePlan] = await Promise.all([
    prisma.invoice.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.schedule.count({ where: { userId } }),
    prisma.template.count({ where: { userId } }),
    getEffectivePlan(userId),
  ]);

  const plan = BILLING_CONFIG.plans[effectivePlan];

  return {
    invoices: {
      used: invoicesCount,
      limit: plan.limits.invoicesPerMonth,
    },
    schedules: {
      used: schedulesCount,
      limit: plan.limits.schedules,
    },
    templates: {
      used: templatesCount,
      limit: plan.limits.templates,
    },
    plan: effectivePlan,
  };
}

/**
 * Update user's plan based on effective subscription status
 */
export async function syncUserPlanStatus(userId: string) {
  const effectivePlan = await getEffectivePlan(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: effectivePlan },
  });

  return effectivePlan;
}

/**
 * Create or update subscription from webhook data
 */
export async function upsertSubscription(data: {
  userId: string;
  providerSubscriptionId: string;
  providerCustomerId: string;
  providerVariantId: string;
  providerOrderId?: string;
  status: SubscriptionStatus;
  renewsAt?: Date | null;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
}) {
  const isActive = ['ACTIVE', 'TRIALING'].includes(data.status);

  // Determine plan from variant
  const planInfo = getPlanFromVariantId(data.providerVariantId);
  const providerPlan = planInfo ? `${planInfo.plan.toLowerCase()}_${planInfo.interval}` : null;

  const subscription = await prisma.subscription.upsert({
    where: { userId: data.userId },
    update: {
      providerSubscriptionId: data.providerSubscriptionId,
      providerCustomerId: data.providerCustomerId,
      providerVariantId: data.providerVariantId,
      providerOrderId: data.providerOrderId,
      providerPlan,
      status: data.status,
      renewsAt: data.renewsAt,
      endsAt: data.endsAt,
      trialEndsAt: data.trialEndsAt,
      isActive,
      updatedAt: new Date(),
    },
    create: {
      userId: data.userId,
      providerSubscriptionId: data.providerSubscriptionId,
      providerCustomerId: data.providerCustomerId,
      providerVariantId: data.providerVariantId,
      providerOrderId: data.providerOrderId,
      providerPlan,
      status: data.status,
      renewsAt: data.renewsAt,
      endsAt: data.endsAt,
      trialEndsAt: data.trialEndsAt,
      isActive,
    },
  });

  // Update user's plan status based on effective plan
  await syncUserPlanStatus(data.userId);

  return subscription;
}

// Helper to import from config
import { getPlanFromVariantId } from './config';
