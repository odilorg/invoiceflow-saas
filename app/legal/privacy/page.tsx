import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Billza',
  description: 'Privacy Policy for Billza invoice follow-up automation service.',
  robots: 'index, follow',
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: 2025-01-09</p>

      <p className="text-slate-600 leading-relaxed mb-8">
        Content will be provided soon.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Data We Collect</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will describe what personal information we collect, including account information, invoice data, and usage analytics.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Data</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will explain how we use collected data to provide and improve our service, send follow-up emails, and communicate with you.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Data Sharing</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will outline when and how we share data with third parties, including email service providers and payment processors.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Data Retention</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will describe how long we retain your data and under what circumstances it is deleted.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Your Rights</h2>
        <p className="text-slate-600 leading-relaxed">
          This section will explain your rights regarding your personal data, including access, correction, deletion, and data portability.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Contact</h2>
        <p className="text-slate-600 leading-relaxed">
          For privacy-related inquiries, please contact us at:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
        </p>
      </section>
    </article>
  );
}
