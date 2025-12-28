'use client';

import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Checkout Canceled</h1>
          <p className="text-slate-600 mb-6">
            Your subscription upgrade was canceled. You can try again anytime or continue using your current plan.
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard/billing"
              className="block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              View Plans Again
            </Link>
            <Link
              href="/dashboard"
              className="block px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Back to Dashboard
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            Need help choosing a plan? <a href="mailto:support@invoice.jahongir-travel.uz" className="text-slate-700 underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}