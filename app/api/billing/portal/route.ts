import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Get user's subscription info
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userData.lsCustomerId || !userData.subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get Lemon Squeezy store ID
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    if (!storeId) {
      return NextResponse.json(
        { error: 'Billing not configured' },
        { status: 500 }
      );
    }

    // Generate customer portal URL
    // Note: Lemon Squeezy doesn't have a direct customer portal API yet
    // We'll use the subscription management URL pattern
    const portalUrl = `https://app.lemonsqueezy.com/my-orders`;

    // If we have the API key, we could potentially create a portal session
    // For now, we'll direct to the general customer portal
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    if (apiKey && userData.subscription?.providerSubscriptionId) {
      // Create a subscription update URL
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${userData.subscription.providerSubscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Check if there's a customer portal URL in the response
        const updateUrl = data.data?.attributes?.urls?.customer_portal ||
                         data.data?.attributes?.urls?.update_payment_method;

        if (updateUrl) {
          return NextResponse.json({ portalUrl: updateUrl });
        }
      }
    }

    // Fallback to general portal
    return NextResponse.json({
      portalUrl,
      message: 'Please use your email to access your subscription details',
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to access customer portal' },
      { status: 500 }
    );
  }
}