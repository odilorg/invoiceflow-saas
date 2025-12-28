// Billing constants and plan definitions

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      invoicesPerMonth: 3,
      schedules: 1,
      templates: 3,
      emailsPerDay: 10,
    },
    features: [
      '3 invoices per month',
      '1 payment schedule',
      '3 email templates',
      'Basic email reminders',
    ],
  },
  STARTER: {
    name: 'Starter',
    priceMonthly: 9,
    priceYearly: 90,
    limits: {
      invoicesPerMonth: 50,
      schedules: 5,
      templates: 10,
      emailsPerDay: 100,
    },
    features: [
      '50 invoices per month',
      '5 payment schedules',
      '10 email templates',
      'Priority email sending',
      'Export to CSV',
      'Email support',
    ],
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 29,
    priceYearly: 290,
    limits: {
      invoicesPerMonth: -1, // unlimited
      schedules: -1,
      templates: -1,
      emailsPerDay: 500,
    },
    features: [
      'Unlimited invoices',
      'Unlimited schedules',
      'Unlimited templates',
      'Priority support',
      'API access (coming soon)',
      'Team members (coming soon)',
      'Custom branding',
    ],
  },
} as const;

export const VARIANT_KEYS = {
  STARTER_MONTHLY: 'starter_monthly',
  STARTER_YEARLY: 'starter_yearly',
  PRO_MONTHLY: 'pro_monthly',
  PRO_YEARLY: 'pro_yearly',
} as const;

export type PlanType = keyof typeof PLANS;
export type VariantKey = typeof VARIANT_KEYS[keyof typeof VARIANT_KEYS];

// Map variant keys to plan types and billing periods
export function getVariantInfo(variantKey: VariantKey): {
  plan: PlanType;
  period: 'monthly' | 'yearly';
} | null {
  switch (variantKey) {
    case VARIANT_KEYS.STARTER_MONTHLY:
      return { plan: 'STARTER', period: 'monthly' };
    case VARIANT_KEYS.STARTER_YEARLY:
      return { plan: 'STARTER', period: 'yearly' };
    case VARIANT_KEYS.PRO_MONTHLY:
      return { plan: 'PRO', period: 'monthly' };
    case VARIANT_KEYS.PRO_YEARLY:
      return { plan: 'PRO', period: 'yearly' };
    default:
      return null;
  }
}

// Get the variant ID from environment variables
export function getVariantId(variantKey: VariantKey): string | null {
  const variantIdMap: Record<VariantKey, string | undefined> = {
    [VARIANT_KEYS.STARTER_MONTHLY]: process.env.LEMON_SQUEEZY_STARTER_MONTHLY_VARIANT_ID,
    [VARIANT_KEYS.STARTER_YEARLY]: process.env.LEMON_SQUEEZY_STARTER_YEARLY_VARIANT_ID,
    [VARIANT_KEYS.PRO_MONTHLY]: process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID,
    [VARIANT_KEYS.PRO_YEARLY]: process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID,
  };

  return variantIdMap[variantKey] || null;
}