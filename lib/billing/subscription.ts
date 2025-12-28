// Subscription management and access control

import { prisma } from '@/lib/db';
import { Subscription, User, PlanStatus } from '@prisma/client';
import { PLANS, PlanType } from './constants';

export interface SubscriptionWithUser extends Subscription {
  user: User;
}

// Get the current subscription for a user
export async function getSubscriptionForUser(userId: string): Promise<SubscriptionWithUser | null> {
  return await prisma.subscription.findUnique({
    where: { userId },
    include: { user: true },
  });
}

// Check if a subscription is active
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;

  // Check if subscription is in an active state
  const activeStates = ['ACTIVE', 'TRIALING'];
  if (!activeStates.includes(subscription.status)) {
    return false;
  }

  // Check if subscription hasn't ended
  if (subscription.endsAt && new Date(subscription.endsAt) < new Date()) {
    return false;
  }

  // Check if trial hasn't ended
  if (
    subscription.status === 'TRIALING' &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt) < new Date()
  ) {
    return false;
  }

  return true;
}

// Get the effective plan for a user (considering subscription status)
export async function getEffectivePlan(userId: string): Promise<PlanType> {
  const subscription = await getSubscriptionForUser(userId);

  if (!subscription || !isSubscriptionActive(subscription)) {
    return 'FREE';
  }

  // Map subscription plan to our plan types
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planStatus: true },
  });

  if (!user) return 'FREE';

  return user.planStatus as PlanType;
}

// Check if a user can perform an action based on their plan limits
export async function checkPlanLimit(
  userId: string,
  limitType: keyof typeof PLANS.FREE.limits
): Promise<{ allowed: boolean; limit: number; current?: number }> {
  const plan = await getEffectivePlan(userId);
  const limits = PLANS[plan].limits;
  const limit = limits[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }

  // Count current usage based on limit type
  let current = 0;

  switch (limitType) {
    case 'invoicesPerMonth': {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      current = await prisma.invoice.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      });
      break;
    }
    case 'schedules':
      current = await prisma.schedule.count({
        where: { userId },
      });
      break;
    case 'templates':
      current = await prisma.template.count({
        where: { userId },
      });
      break;
    case 'emailsPerDay': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      current = await prisma.emailLog.count({
        where: {
          followUp: {
            invoice: {
              userId,
            },
          },
          sentAt: { gte: startOfDay },
        },
      });
      break;
    }
  }

  return {
    allowed: current < limit,
    limit,
    current,
  };
}

// Update user's plan status based on subscription
export async function updateUserPlanStatus(
  userId: string,
  subscription: Subscription
): Promise<void> {
  let planStatus: PlanStatus = 'FREE';

  if (isSubscriptionActive(subscription)) {
    // Determine plan from provider variant or plan field
    if (subscription.providerPlan?.includes('starter')) {
      planStatus = 'STARTER';
    } else if (subscription.providerPlan?.includes('pro')) {
      planStatus = 'PRO';
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      planStatus,
      lsCustomerId: subscription.providerCustomerId,
    },
  });
}

// Create or update a subscription from webhook data
export async function upsertSubscription(data: {
  userId: string;
  providerSubscriptionId: string;
  providerCustomerId?: string;
  providerOrderId?: string;
  providerVariantId?: string;
  providerPlan?: string;
  status: string;
  renewsAt?: Date | null;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
}): Promise<Subscription> {
  // Map Lemon Squeezy status to our enum
  const statusMap: Record<string, any> = {
    'on_trial': 'TRIALING',
    'active': 'ACTIVE',
    'paused': 'PAUSED',
    'past_due': 'PAST_DUE',
    'unpaid': 'UNPAID',
    'cancelled': 'CANCELED',
    'expired': 'EXPIRED',
  };

  const mappedStatus = statusMap[data.status] || 'EXPIRED';
  const isActive = ['ACTIVE', 'TRIALING'].includes(mappedStatus);

  const subscription = await prisma.subscription.upsert({
    where: {
      providerSubscriptionId: data.providerSubscriptionId
    },
    update: {
      status: mappedStatus,
      providerCustomerId: data.providerCustomerId,
      providerOrderId: data.providerOrderId,
      providerVariantId: data.providerVariantId,
      providerPlan: data.providerPlan,
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
      providerOrderId: data.providerOrderId,
      providerVariantId: data.providerVariantId,
      providerPlan: data.providerPlan,
      status: mappedStatus,
      renewsAt: data.renewsAt,
      endsAt: data.endsAt,
      trialEndsAt: data.trialEndsAt,
      isActive,
    },
  });

  // Update user's plan status
  await updateUserPlanStatus(data.userId, subscription);

  return subscription;
}