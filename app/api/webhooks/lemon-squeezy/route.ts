import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { upsertSubscription } from '@/lib/billing/subscription-service';
import { SubscriptionStatus, PlanStatus } from '@prisma/client';
import crypto from 'crypto';
import { getPlanFromVariantId } from '@/lib/billing/config';

/**
 * Verify webhook signature with timing-safe comparison
 * Lemon Squeezy sends signature as hex-encoded HMAC-SHA256
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // Normalize signature - strip any prefix like "sha256=" if present
  const normalizedSignature = signature.replace(/^sha256=/i, '').toLowerCase();

  // Generate expected signature
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(payload).digest('hex').toLowerCase();

  // Length check before timing-safe compare (prevents DoS)
  if (normalizedSignature.length !== expectedSignature.length) {
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(normalizedSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  try {
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    // Lengths mismatch or invalid hex - comparison failed
    return false;
  }
}

/**
 * Generate stable event ID from payload for idempotency
 * Uses SHA256 hash of raw payload as fallback if event_id missing
 */
function getStableEventId(meta: any, payload: string): string {
  if (meta?.event_id) {
    return meta.event_id;
  }

  // Generate stable hash from payload (NOT timestamp!)
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  return `fallback_${hash}`;
}

/**
 * Sync user plan status based on subscription state
 * Single source of truth for plan status computation
 */
async function syncUserPlanStatus(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  let effectivePlan: PlanStatus = 'FREE';

  if (subscription) {
    const now = new Date();
    const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIALING';
    const notExpired = !subscription.endsAt || subscription.endsAt > now;

    if (isActive && notExpired) {
      // Map variant to plan
      if (subscription.providerVariantId) {
        const planInfo = getPlanFromVariantId(subscription.providerVariantId);
        if (planInfo) {
          effectivePlan = planInfo.plan as PlanStatus;
        }
      }

      // Fallback to providerPlan if variant mapping fails
      if (effectivePlan === 'FREE' && subscription.providerPlan) {
        effectivePlan = subscription.providerPlan.includes('pro') ? 'PRO' : 'STARTER';
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: effectivePlan },
  });
}

// Map Lemon Squeezy status to our SubscriptionStatus enum
function mapSubscriptionStatus(lsStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    'active': 'ACTIVE',
    'on_trial': 'TRIALING',
    'past_due': 'PAST_DUE',
    'cancelled': 'CANCELED',
    'expired': 'EXPIRED',
    'unpaid': 'UNPAID',
    'paused': 'PAUSED',
  };

  return statusMap[lsStatus] || 'CANCELED';
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payload = await req.text();
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('LEMON_SQUEEZY_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify signature
    if (!verifySignature(payload, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const { meta, data } = event;

    // Check idempotency - use stable event ID (hash of payload if no event_id)
    const eventId = getStableEventId(meta, payload);
    const existingEvent = await prisma.billingEvent.findUnique({
      where: { providerEventId: eventId },
    });

    if (existingEvent) {
      console.log(`Event ${eventId} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log('Lemon Squeezy webhook event:', meta?.event_name);

    // Store the event for idempotency
    await prisma.billingEvent.create({
      data: {
        providerEventId: eventId,
        providerEventType: meta?.event_name || 'unknown',
        providerPayload: event,
        processedAt: new Date(),
      },
    });

    // Handle different event types
    switch (meta?.event_name) {
      case 'subscription_created':
      case 'subscription_updated': {
        const attributes = data?.attributes;

        // Get user from custom data or email
        const customData = meta?.custom_data || {};
        let userId = customData.user_id;

        if (!userId) {
          // Try to find user by email
          const customerEmail = attributes?.user_email || attributes?.customer_email;
          if (customerEmail) {
            const user = await prisma.user.findUnique({
              where: { email: customerEmail },
            });
            userId = user?.id;
          }
        }

        if (!userId) {
          console.error('Could not identify user from webhook data');
          break;
        }

        // Parse dates
        const renewsAt = attributes?.renews_at ? new Date(attributes.renews_at) : null;
        const endsAt = attributes?.ends_at ? new Date(attributes.ends_at) : null;
        const trialEndsAt = attributes?.trial_ends_at ? new Date(attributes.trial_ends_at) : null;

        // Upsert subscription
        await upsertSubscription({
          userId,
          providerSubscriptionId: data?.id?.toString(),
          providerCustomerId: attributes?.customer_id?.toString(),
          providerVariantId: attributes?.variant_id?.toString(),
          providerOrderId: attributes?.order_id?.toString(),
          status: mapSubscriptionStatus(attributes?.status),
          renewsAt,
          endsAt,
          trialEndsAt,
        });

        // Update user's customer ID if needed
        if (attributes?.customer_id) {
          await prisma.user.update({
            where: { id: userId },
            data: { lsCustomerId: attributes.customer_id.toString() },
          });
        }

        // Sync user plan status based on subscription + variant
        await syncUserPlanStatus(userId);

        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        const subscriptionId = data?.id?.toString();

        if (subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (subscription) {
            const status = meta?.event_name === 'subscription_cancelled' ? 'CANCELED' : 'EXPIRED';
            const endsAt = data?.attributes?.ends_at ? new Date(data.attributes.ends_at) : new Date();

            // Update subscription status
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status,
                isActive: status === 'EXPIRED' ? false : true, // CANCELED stays active until endsAt
                endsAt,
              },
            });

            // Sync user plan status - will downgrade to FREE only if endsAt has passed
            // If cancelled but endsAt is in future, user keeps paid status until then
            await syncUserPlanStatus(subscription.userId);
          }
        }
        break;
      }

      case 'subscription_payment_success': {
        const subscriptionId = data?.id?.toString();

        if (subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (subscription) {
            // Ensure subscription is active after successful payment
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'ACTIVE',
                isActive: true,
              },
            });

            // Sync user plan status
            await syncUserPlanStatus(subscription.userId);
          }
        }
        break;
      }

      case 'subscription_payment_failed': {
        const subscriptionId = data?.id?.toString();

        if (subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (subscription) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'PAST_DUE',
                isActive: false,
              },
            });

            // Sync user plan status (will downgrade to FREE)
            await syncUserPlanStatus(subscription.userId);
          }
        }
        break;
      }

      case 'subscription_resumed': {
        const subscriptionId = data?.id?.toString();

        if (subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (subscription) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'ACTIVE',
                isActive: true,
              },
            });

            // Sync user plan status
            await syncUserPlanStatus(subscription.userId);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${meta?.event_name}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}