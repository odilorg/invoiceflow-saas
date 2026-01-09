import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Billza',
  description: 'Terms of Service for Billza invoice follow-up automation service.',
  robots: 'index, follow',
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: 2025-01-09</p>

      <p className="text-slate-600 leading-relaxed mb-8">
        Content will be provided soon.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Overview</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will describe the overall terms and conditions for using Billza services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Nature of Service</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will explain what Billza is and is not, including clarification that we provide invoice follow-up automation, not invoicing or payment processing.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Responsibilities</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will outline the responsibilities of users, including account security, accurate information, and acceptable use.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Payments and Subscriptions</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will cover billing cycles, payment methods, plan changes, and subscription terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Limitation of Liability</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will describe the limitations of liability and disclaimers applicable to the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Contact</h2>
        <p className="text-slate-600 leading-relaxed">
          For questions about these Terms of Service, please contact us at:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
        </p>
      </section>
    </article>
  );
}
