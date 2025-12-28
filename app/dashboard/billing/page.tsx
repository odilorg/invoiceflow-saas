'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BILLING_CONFIG } from '@/lib/billing/config';

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

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'PRO'>('STARTER');
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Check for success/cancel params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage('Thank you for subscribing! Your plan will be activated shortly.');
      setTimeout(() => {
        window.location.href = '/dashboard/billing';
      }, 3000);
    } else if (searchParams.get('canceled') === 'true') {
      setError('Subscription was canceled. You can try again anytime.');
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [userRes, usageRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/billing/usage'),
      ]);

      if (userRes.ok) {
        const user = await userRes.json();
        setUserData(user);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }
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
        // Show detailed error message from backend
        if (res.status === 503 && data.details) {
          setError(`Billing system not ready: ${data.details}`);
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
        setProcessingPlan(null);
        return;
      }

      // Redirect to checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to start checkout. Please try again or contact support.');
      setProcessingPlan(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const currentPlan = userData?.planStatus || 'FREE';
  const hasActiveSubscription = userData?.subscription?.isActive;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Billing & Subscription</h1>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Current Plan & Usage */}
        <div className="mb-8 bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Plan & Usage</h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-slate-600">Current Plan:</span>
              <p className="text-xl font-bold text-slate-900">
                {BILLING_CONFIG.plans[currentPlan].displayName}
              </p>
              {hasActiveSubscription && userData?.subscription?.renewsAt && (
                <p className="text-sm text-slate-600 mt-1">
                  Renews on {new Date(userData.subscription.renewsAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {hasActiveSubscription && (
              <a
                href="#"
                className="text-sm text-slate-600 hover:text-slate-900"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' });
                    const data = await res.json();
                    if (data.portalUrl) {
                      window.location.href = data.portalUrl;
                    } else {
                      alert('Unable to access customer portal. Please contact support.');
                    }
                  } catch (error) {
                    console.error('Portal error:', error);
                    alert('Failed to access customer portal. Please try again.');
                  }
                }}
              >
                Manage Subscription →
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Invoices</span>
                <span className="text-sm font-medium text-slate-900">
                  {usage?.invoices.used || 0}/{usage?.invoices.limit === -1 ? '∞' : usage?.invoices.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-900 h-2 rounded-full"
                  style={{
                    width: `${
                      usage?.invoices.limit === -1
                        ? 0
                        : Math.min((usage?.invoices.used || 0) / (usage?.invoices.limit || 1) * 100, 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Schedules</span>
                <span className="text-sm font-medium text-slate-900">
                  {usage?.schedules.used || 0}/{usage?.schedules.limit === -1 ? '∞' : usage?.schedules.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-900 h-2 rounded-full"
                  style={{
                    width: `${
                      usage?.schedules.limit === -1
                        ? 0
                        : Math.min((usage?.schedules.used || 0) / (usage?.schedules.limit || 1) * 100, 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Templates</span>
                <span className="text-sm font-medium text-slate-900">
                  {usage?.templates.used || 0}/{usage?.templates.limit === -1 ? '∞' : usage?.templates.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-900 h-2 rounded-full"
                  style={{
                    width: `${
                      usage?.templates.limit === -1
                        ? 0
                        : Math.min((usage?.templates.used || 0) / (usage?.templates.limit || 1) * 100, 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Choose Your Plan</h2>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 text-sm ${selectedInterval === 'monthly' ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
              Monthly
            </span>
            <button
              onClick={() => setSelectedInterval(selectedInterval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-slate-900 transition-transform ${
                  selectedInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 text-sm ${selectedInterval === 'yearly' ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
              Yearly
              <span className="ml-1 text-green-600 font-medium">(Save 17%)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className={`bg-white border-2 ${currentPlan === 'FREE' ? 'border-slate-900' : 'border-slate-200'} rounded-lg p-6`}>
              {currentPlan === 'FREE' && (
                <div className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded inline-block mb-4">
                  CURRENT PLAN
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2">Free</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                $0<span className="text-sm text-slate-600 font-normal">/month</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  3 invoices per month
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  1 schedule
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  3 email templates
                </li>
              </ul>
              <button
                disabled
                className="w-full py-2 px-4 bg-slate-100 text-slate-400 rounded-lg font-medium cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* Starter Plan */}
            <div className={`bg-white border-2 ${currentPlan === 'STARTER' ? 'border-slate-900' : 'border-slate-200'} rounded-lg p-6`}>
              {currentPlan === 'STARTER' && (
                <div className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded inline-block mb-4">
                  CURRENT PLAN
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2">Starter</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                ${selectedInterval === 'monthly' ? '9' : '90'}
                <span className="text-sm text-slate-600 font-normal">/{selectedInterval === 'monthly' ? 'month' : 'year'}</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  50 invoices per month
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  5 schedules
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  10 email templates
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Export to CSV
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('STARTER', selectedInterval)}
                disabled={currentPlan === 'STARTER' || processingPlan !== null}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  currentPlan === 'STARTER'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {currentPlan === 'STARTER' ? 'Current Plan' : processingPlan === `STARTER-${selectedInterval}` ? 'Processing...' : 'Upgrade'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`bg-white border-2 ${currentPlan === 'PRO' ? 'border-slate-900' : 'border-slate-200'} rounded-lg p-6 relative`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              {currentPlan === 'PRO' && (
                <div className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded inline-block mb-4 mt-4">
                  CURRENT PLAN
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-4">Professional</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                ${selectedInterval === 'monthly' ? '29' : '290'}
                <span className="text-sm text-slate-600 font-normal">/{selectedInterval === 'monthly' ? 'month' : 'year'}</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unlimited invoices
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unlimited schedules
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unlimited templates
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  API access (coming soon)
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('PRO', selectedInterval)}
                disabled={currentPlan === 'PRO' || processingPlan !== null}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  currentPlan === 'PRO'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {currentPlan === 'PRO' ? 'Current Plan' : processingPlan === `PRO-${selectedInterval}` ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-slate-900 mb-1">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-slate-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">What happens to my data if I downgrade?</h3>
              <p className="text-sm text-slate-600">
                Your data is never deleted. If you exceed the limits of your new plan, you won't be able to create new items until you're within the limits.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">Do you offer refunds?</h3>
              <p className="text-sm text-slate-600">
                We offer a 14-day money-back guarantee for new subscriptions. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}