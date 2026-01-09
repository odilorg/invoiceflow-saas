import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — Billza',
  description: 'Refund and Cancellation Policy for Billza invoice follow-up automation service.',
  robots: 'index, follow',
};

export default function RefundPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Refund & Cancellation Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: 2025-01-09</p>

      <p className="text-slate-600 leading-relaxed mb-8">
        Content will be provided soon.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Cancellation</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will explain how to cancel your subscription, when cancellation takes effect, and what happens to your data after cancellation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Refunds</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will describe our refund policy, including eligibility criteria, refund timeframes, and how to request a refund.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Billing Support</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will provide information about billing inquiries, payment disputes, and how to resolve billing-related issues.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Contact</h2>
        <p className="text-slate-600 leading-relaxed">
          For billing and refund inquiries, please contact us at:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
        </p>
      </section>
    </article>
  );
}
