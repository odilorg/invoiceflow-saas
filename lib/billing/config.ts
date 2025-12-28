// Billing configuration - centralized for easy provider switching
export const BILLING_CONFIG = {
  provider: 'lemonsqueezy' as const,

  plans: {
    FREE: {
      name: 'Free',
      displayName: 'Free Plan',
      limits: {
        invoicesPerMonth: 3,
        schedules: 1,
        templates: 3,
        emailReminders: true,
        prioritySupport: false,
        exportCSV: false,
        apiAccess: false,
      },
    },
    STARTER: {
      name: 'Starter',
      displayName: 'Starter Plan',
      prices: {
        monthly: { amount: 9, display: '$9/month' },
        yearly: { amount: 90, display: '$90/year' },
      },
      limits: {
        invoicesPerMonth: 50,
        schedules: 5,
        templates: 10,
        emailReminders: true,
        prioritySupport: false,
        exportCSV: true,
        apiAccess: false,
      },
    },
    PRO: {
      name: 'Pro',
      displayName: 'Professional',
      prices: {
        monthly: { amount: 29, display: '$29/month' },
        yearly: { amount: 290, display: '$290/year' },
      },
      limits: {
        invoicesPerMonth: -1, // unlimited
        schedules: -1, // unlimited
        templates: -1, // unlimited
        emailReminders: true,
        prioritySupport: true,
        exportCSV: true,
        apiAccess: true,
      },
    },
  },

  // Map Lemon Squeezy variant IDs to plans
  variants: {
    starterMonthly: process.env.LEMON_SQUEEZY_STARTER_MONTHLY_VARIANT_ID || '',
    starterYearly: process.env.LEMON_SQUEEZY_STARTER_YEARLY_VARIANT_ID || '',
    proMonthly: process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID || '',
    proYearly: process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID || '',
  },

  lemonSqueezy: {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
    storeId: process.env.LEMON_SQUEEZY_STORE_ID || '',
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '',
  },

  urls: {
    app: process.env.APP_URL || 'https://invoice.jahongir-travel.uz',
    success: '/dashboard/billing?success=true',
    cancel: '/dashboard/billing?canceled=true',
  },
};

// Helper to get plan from variant ID
export function getPlanFromVariantId(variantId: string): { plan: 'STARTER' | 'PRO', interval: 'monthly' | 'yearly' } | null {
  const { variants } = BILLING_CONFIG;

  if (variantId === variants.starterMonthly) {
    return { plan: 'STARTER', interval: 'monthly' };
  } else if (variantId === variants.starterYearly) {
    return { plan: 'STARTER', interval: 'yearly' };
  } else if (variantId === variants.proMonthly) {
    return { plan: 'PRO', interval: 'monthly' };
  } else if (variantId === variants.proYearly) {
    return { plan: 'PRO', interval: 'yearly' };
  }

  return null;
}

// Helper to get variant ID from plan
export function getVariantId(plan: 'STARTER' | 'PRO', interval: 'monthly' | 'yearly'): string {
  const { variants } = BILLING_CONFIG;

  if (plan === 'STARTER') {
    return interval === 'monthly' ? variants.starterMonthly : variants.starterYearly;
  } else {
    return interval === 'monthly' ? variants.proMonthly : variants.proYearly;
  }
}