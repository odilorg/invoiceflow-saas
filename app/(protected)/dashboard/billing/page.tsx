'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BILLING_CONFIG } from '@/lib/billing/config';
import { PricingCard, PricingFeature } from '@/components/PricingCard';

interface UserData {
  id: string;
  email: string;
  planStatus: 'FREE' | 'STARTER' | 'PRO';
  subscription?: {
    status: string;
    renewsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
  };
}

interface UsageStats {
  invoices: { used: number; limit: number };
  schedules: { used: number; limit: number };
  templates: { used: number; limit: number };
  plan: string;
}

const PLAN_FEATURES: Record<string, PricingFeature[]> = {
  FREE: [
    { text: '3 invoices per month', included: true },
    { text: '1 schedule', included: true },
    { text: '3 email templates', included: true },
  ],
  STARTER: [
    { text: '100 invoices per month', included: true },
    { text: '5 schedules', included: true },
    { text: '10 email templates', included: true },
  ],
  PRO: [
    { text: 'Unlimited invoices', included: true },
    { text: 'Unlimited schedules', included: true },
    { text: 'Unlimited templates', included: true },
    { text: 'Priority support', included: true },
    { text: 'API access (coming soon)', included: true },
  ],
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage('Thank you for subscribing! Your plan will be activated shortly.');
      setTimeout(() => { window.location.href = '/dashboard/billing'; }, 3000);
    } else if (searchParams.get('canceled') === 'true') {
      setError('Subscription was canceled. You can try again anytime.');
    }
  }, [searchParams]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [userRes, usageRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/billing/usage'),
      ]);
      if (userRes.ok) setUserData(await userRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: 'STARTER' | 'PRO', interval: 'monthly' | 'yearly') {
    const planKey = `${plan}-${interval}`;
    setProcessingPlan(planKey);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session');
        setProcessingPlan(null);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to start checkout.');
      setProcessingPlan(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const currentPlan = userData?.planStatus || 'FREE';
  const hasActiveSubscription = userData?.subscription?.isActive;

  const getPrice = (plan: string) => {
    if (plan === 'FREE') return '$0';
    if (plan === 'STARTER') return selectedInterval === 'monthly' ? '$9' : '$90';
    if (plan === 'PRO') return selectedInterval === 'monthly' ? '$29' : '$290';
    return '$0';
  };

  const getInterval = (plan: string) => {
    if (plan === 'FREE') return 'month';
    return selectedInterval === 'monthly' ? 'month' : 'year';
  };

  const getCtaText = (plan: string) => {
    if (currentPlan === plan) return 'Current Plan';
    if (plan === 'FREE') return 'Current Plan';
    if (plan === 'PRO') return 'Upgrade to Pro';
    return 'Upgrade';
  };

  const isProcessing = (plan: string) => processingPlan === `${plan}-${selectedInterval}`;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Billing and Subscription</h1>

        {message && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 text-success rounded-lg">{message}</div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">{error}</div>
        )}

        <div className="mb-8 bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Current Plan and Usage</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-muted-foreground">Current Plan:</span>
              <p className="text-xl font-bold text-foreground">{BILLING_CONFIG.plans[currentPlan].displayName}</p>
              {hasActiveSubscription && userData?.subscription?.renewsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Renews on {new Date(userData.subscription.renewsAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {hasActiveSubscription && (
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' });
                    const data = await res.json();
                    if (data.portalUrl) window.location.href = data.portalUrl;
                    else alert('Unable to access customer portal.');
                  } catch (error) {
                    alert('Failed to access customer portal.');
                  }
                }}>Manage Subscription →</a>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Invoices</span>
                <span className="text-sm font-medium text-foreground">
                  {usage?.invoices.used || 0}/{usage?.invoices.limit === -1 ? '∞' : usage?.invoices.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground h-2 rounded-full"
                  style={{ width: `${usage?.invoices.limit === -1 ? 0 : Math.min((usage?.invoices.used || 0) / (usage?.invoices.limit || 1) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Schedules</span>
                <span className="text-sm font-medium text-foreground">
                  {usage?.schedules.used || 0}/{usage?.schedules.limit === -1 ? '∞' : usage?.schedules.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground h-2 rounded-full"
                  style={{ width: `${usage?.schedules.limit === -1 ? 0 : Math.min((usage?.schedules.used || 0) / (usage?.schedules.limit || 1) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Templates</span>
                <span className="text-sm font-medium text-foreground">
                  {usage?.templates.used || 0}/{usage?.templates.limit === -1 ? '∞' : usage?.templates.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground h-2 rounded-full"
                  style={{ width: `${usage?.templates.limit === -1 ? 0 : Math.min((usage?.templates.used || 0) / (usage?.templates.limit || 1) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Choose Your Plan</h2>
          <div className="flex items-center justify-center mb-8">
            <span className={`${selectedInterval === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground'} mr-3 text-sm`}>Monthly</span>
            <button onClick={() => setSelectedInterval(selectedInterval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
              <span className={`${selectedInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform`} />
            </button>
            <span className={`${selectedInterval === 'yearly' ? 'text-foreground font-semibold' : 'text-muted-foreground'} ml-3 text-sm`}>
              Yearly<span className="ml-1 text-success font-medium">(Save 17%)</span>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard variant="dashboard" name="Free" price={getPrice('FREE')} priceInterval={getInterval('FREE')}
              features={PLAN_FEATURES.FREE} isCurrentPlan={currentPlan === 'FREE'} ctaText={getCtaText('FREE')} ctaDisabled={true} />
            <PricingCard variant="dashboard" name="Starter" price={getPrice('STARTER')} priceInterval={getInterval('STARTER')}
              features={PLAN_FEATURES.STARTER} isCurrentPlan={currentPlan === 'STARTER'} ctaText={getCtaText('STARTER')}
              ctaDisabled={currentPlan === 'STARTER'} ctaLoading={isProcessing('STARTER')}
              onCtaClick={() => handleUpgrade('STARTER', selectedInterval)} />
            <PricingCard variant="dashboard" name="Professional" price={getPrice('PRO')} priceInterval={getInterval('PRO')}
              features={PLAN_FEATURES.PRO} isCurrentPlan={currentPlan === 'PRO'} isPopular={true} ctaText={getCtaText('PRO')}
              ctaDisabled={currentPlan === 'PRO'} ctaLoading={isProcessing('PRO')}
              onCtaClick={() => handleUpgrade('PRO', selectedInterval)} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-1">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-muted-foreground">Yes, you can cancel at any time. Access continues until the end of billing period.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">What happens to my data if I downgrade?</h3>
              <p className="text-sm text-muted-foreground">Your data is never deleted. If you exceed limits, you cannot create new items until within limits.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">We offer a 14-day money-back guarantee for new subscriptions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}