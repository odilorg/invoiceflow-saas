import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { BILLING_CONFIG, getVariantId } from '@/lib/billing/config';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO']),
  interval: z.enum(['monthly', 'yearly']),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { plan, interval } = checkoutSchema.parse(body);

    // Check if Lemon Squeezy is configured
    const storeId = BILLING_CONFIG.lemonSqueezy.storeId;
    if (!storeId) {
      return NextResponse.json(
        {
          error: 'Billing system not configured',
          details: 'LEMON_SQUEEZY_STORE_ID is not set. Please complete Phase 1 setup in Lemon Squeezy dashboard.'
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Get the variant ID for the selected plan
    const variantId = getVariantId(plan, interval);
    if (!variantId) {
      return NextResponse.json(
        {
          error: 'Product variant not configured',
          details: `Missing variant ID for ${plan} ${interval}. Please configure LEMON_SQUEEZY_${plan}_${interval.toUpperCase()}_VARIANT_ID in .env`
        },
        { status: 503 }
      );
    }

    // Use Lemon Squeezy API to create checkout session
    const apiKey = BILLING_CONFIG.lemonSqueezy.apiKey;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Billing system not configured',
          details: 'LEMON_SQUEEZY_API_KEY is not set.'
        },
        { status: 503 }
      );
    }

    // Prepare success and cancel URLs
    const successUrl = `${BILLING_CONFIG.urls.app}${BILLING_CONFIG.urls.success}`;
    const cancelUrl = `${BILLING_CONFIG.urls.app}${BILLING_CONFIG.urls.cancel}`;

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Lemon Squeezy API error:', response.status, error);
      return NextResponse.json(
        {
          error: 'Failed to create checkout session',
          details: `Lemon Squeezy API returned ${response.status}. Please check your configuration.`
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ checkoutUrl: data.data.attributes.url });

  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}