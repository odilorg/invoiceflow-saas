import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { upsertSubscription } from '@/lib/billing/subscription-service';
import { SubscriptionStatus } from '@prisma/client';
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === digest;
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

    // Check idempotency - have we processed this event before?
    const eventId = meta?.event_id || `${meta?.event_name}_${Date.now()}`;
    const existingEvent = await prisma.billingEvent.findUnique({
      where: { providerEventId: eventId },
    });

    if (existingEvent) {
      console.log(`Event ${eventId} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log('Lemon Squeezy webhook event:', meta?.event_name);

    // Store the event
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

            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status,
                isActive: false,
                endsAt: data?.attributes?.ends_at ? new Date(data.attributes.ends_at) : new Date(),
              },
            });

            // Update user plan status
            await prisma.user.update({
              where: { id: subscription.userId },
              data: { planStatus: 'FREE' },
            });
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

            // Update user plan status
            const planInfo = await prisma.subscription.findUnique({
              where: { id: subscription.id },
            });

            if (planInfo?.providerPlan) {
              const planStatus = planInfo.providerPlan.includes('pro') ? 'PRO' : 'STARTER';
              await prisma.user.update({
                where: { id: subscription.userId },
                data: { planStatus },
              });
            }
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