'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillingSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'active' | 'pending' | 'error'>('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Poll for subscription activation
    const checkSubscription = async () => {
      try {
        const res = await fetch('/api/billing/status');

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to check status');
        }

        const data = await res.json();

        if (data.subscription?.isActive) {
          setStatus('active');
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard?upgraded=true');
          }, 3000);
        } else if (attempts < 20) {
          // Keep polling for up to 60 seconds (20 attempts x 3 seconds)
          setAttempts(prev => prev + 1);
          setTimeout(checkSubscription, 3000);
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (attempts >= 3) {
          setStatus('error');
        } else {
          setAttempts(prev => prev + 1);
          setTimeout(checkSubscription, 3000);
        }
      }
    };

    checkSubscription();
  }, [attempts, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          {status === 'checking' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Processing Your Subscription</h1>
              <p className="text-slate-600 mb-4">
                Please wait while we activate your new plan...
              </p>
              <div className="text-sm text-slate-500">
                This usually takes just a few seconds
              </div>
            </>
          )}

          {status === 'active' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Subscription Activated!</h1>
              <p className="text-slate-600 mb-4">
                Your plan has been successfully upgraded.
              </p>
              <div className="text-sm text-slate-500">
                Redirecting to your dashboard...
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Received</h1>
              <p className="text-slate-600 mb-6">
                Your payment has been processed. Your subscription will be activated within a few minutes.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Something Went Wrong</h1>
              <p className="text-slate-600 mb-6">
                We couldn't verify your subscription status. Please contact support if the issue persists.
              </p>
              <div className="space-y-3">
                <Link
                  href="/dashboard/billing"
                  className="block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  Check Billing Status
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}