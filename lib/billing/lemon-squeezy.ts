// Lemon Squeezy API client

import crypto from 'crypto';

const API_URL = 'https://api.lemonsqueezy.com/v1';

interface LemonSqueezyCheckout {
  data: {
    id: string;
    attributes: {
      url: string;
    };
  };
}

interface LemonSqueezyPortalSession {
  data: {
    id: string;
    attributes: {
      url: string;
    };
  };
}

// Create headers for Lemon Squeezy API requests
function getHeaders() {
  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    throw new Error('LEMON_SQUEEZY_API_KEY is not set');
  }

  return {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
  };
}

// Create a checkout session
export async function createCheckout(options: {
  variantId: string;
  email: string;
  name?: string;
  customData?: Record<string, any>;
}): Promise<{ url: string; checkoutId: string }> {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error('LEMON_SQUEEZY_STORE_ID is not set');
  }

  const response = await fetch(`${API_URL}/checkouts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: options.email,
            name: options.name,
            custom: options.customData,
          },
          product_options: {
            enabled_variants: [options.variantId],
          },
          checkout_options: {
            success_url: `${process.env.APP_URL}/billing/success`,
            cancel_url: `${process.env.APP_URL}/billing/cancel`,
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
              id: options.variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error(`Failed to create checkout: ${response.status}`);
  }

  const data = await response.json() as LemonSqueezyCheckout;

  return {
    url: data.data.attributes.url,
    checkoutId: data.data.id,
  };
}

// Create a customer portal session
export async function createCustomerPortal(customerId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_URL}/customers/${customerId}/portal`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lemon Squeezy portal error:', error);
    throw new Error(`Failed to create customer portal: ${response.status}`);
  }

  const data = await response.json() as LemonSqueezyPortalSession;

  return {
    url: data.data.attributes.url,
  };
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

// Parse webhook event
export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, any>;
  };
  data: {
    id: string;
    attributes: {
      store_id: string;
      customer_id?: string;
      order_id?: string;
      subscription_id?: string;
      variant_id?: string;
      status?: string;
      renews_at?: string;
      ends_at?: string;
      trial_ends_at?: string;
      user_email?: string;
      user_name?: string;
      [key: string]: any;
    };
  };
}

export function parseWebhookEvent(payload: string): LemonSqueezyWebhookEvent {
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error('Invalid webhook payload');
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string): Promise<any> {
  const response = await fetch(`${API_URL}/subscriptions/${subscriptionId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get subscription: ${response.status}`);
  }

  return await response.json();
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel subscription: ${response.status}`);
  }
}

// Resume subscription
export async function resumeSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes: {
          cancelled: false,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to resume subscription: ${response.status}`);
  }
}