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
      <p className="text-sm text-slate-500 mb-6">Last updated: January 9, 2025</p>

      <p className="text-slate-600 leading-relaxed mb-4">
        This Refund & Cancellation Policy explains how cancellations and refunds are handled for subscriptions and purchases made for the Billza service.
      </p>
      <p className="text-slate-600 leading-relaxed mb-8">
        By purchasing or subscribing to Billza, you agree to this policy.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Subscription Cancellation</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          You may cancel your Billza subscription at any time through your account dashboard or subscription management page.
        </p>
        <ul className="list-disc pl-6 text-slate-600">
          <li>Cancellation stops future billing</li>
          <li>Your access to paid features remains active until the end of the current billing period</li>
          <li>No additional charges will be made after cancellation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Refunds</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          Unless otherwise required by applicable law:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>All payments are non-refundable</li>
          <li>We do not offer refunds for partial billing periods</li>
          <li>We do not provide refunds for unused time, features, or credits</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          Because Billza provides immediate access to software features upon purchase, refunds are generally not issued.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Trials (If Applicable)</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          If a free trial is offered:
        </p>
        <ul className="list-disc pl-6 text-slate-600">
          <li>No charges are applied during the trial period</li>
          <li>You must cancel before the trial ends to avoid being charged</li>
          <li>Failure to cancel before the trial end will result in automatic billing</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Billing Errors</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          If you believe you were charged incorrectly, please contact us promptly.
        </p>
        <p className="text-slate-600 leading-relaxed">
          We will review billing issues on a case-by-case basis and correct verified errors where appropriate.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Payment Processing</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          All payments are processed by our third-party Merchant of Record and payment processors.
        </p>
        <p className="text-slate-600 leading-relaxed mb-2">
          Any chargebacks or payment disputes may result in:
        </p>
        <ul className="list-disc pl-6 text-slate-600">
          <li>Immediate suspension of your account</li>
          <li>Termination of access to the Service</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Policy Changes</h2>
        <p className="text-slate-600 leading-relaxed">
          We may update this Refund & Cancellation Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. Continued use of the Service constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Contact Information</h2>
        <p className="text-slate-600 leading-relaxed">
          For billing or cancellation questions, contact:
        </p>
        <p className="text-slate-600 leading-relaxed mt-2">
          Email:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
          <br />
          Product: Billza
        </p>
      </section>
    </article>
  );
}
