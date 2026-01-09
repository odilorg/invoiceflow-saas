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
      <p className="text-sm text-slate-500 mb-6">Last updated: January 9, 2025</p>

      <p className="text-slate-600 leading-relaxed mb-4">
        These Terms of Service ("Terms") govern your access to and use of the Billza website and software application (the "Service").
      </p>
      <p className="text-slate-600 leading-relaxed mb-8">
        By accessing or using Billza, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Overview of the Service</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          Billza is a software-as-a-service (SaaS) platform that provides automated tools for sending invoice reminder emails based on user configuration.
        </p>
        <p className="text-slate-600 leading-relaxed mb-2 font-medium">IMPORTANT:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Billza provides software only</li>
          <li>Billza does NOT provide debt collection services</li>
          <li>Billza does NOT provide legal or financial advice</li>
          <li>Billza does NOT perform manual or human follow-ups</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          All actions performed by the Service are automated.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Eligibility</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          You must be at least 18 years old and capable of entering into a legally binding agreement to use the Service.
        </p>
        <p className="text-slate-600 leading-relaxed">
          By using Billza, you represent that you are legally permitted to operate a business and contact your invoice recipients.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Account Registration</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          To use Billza, you must create an account.
        </p>
        <p className="text-slate-600 leading-relaxed mb-2">You are responsible for:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Maintaining the confidentiality of your login credentials</li>
          <li>All activity that occurs under your account</li>
          <li>Providing accurate and up-to-date information</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          We may suspend or terminate accounts that violate these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. User Responsibilities</h2>
        <p className="text-slate-600 leading-relaxed mb-2">You agree that you will:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Use Billza only for lawful purposes</li>
          <li>Ensure you have the right to contact invoice recipients</li>
          <li>Comply with all applicable email, privacy, and anti-spam laws</li>
          <li>Not use the Service for spam, harassment, fraud, or abuse</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          You are solely responsible for the content of reminder emails you configure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Nature of the Service (No Debt Collection)</h2>
        <p className="text-slate-600 leading-relaxed mb-4 font-medium">
          Billza is NOT a debt collection agency.
        </p>
        <p className="text-slate-600 leading-relaxed mb-2">Billza does not:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Contact recipients manually</li>
          <li>Negotiate payments</li>
          <li>Enforce invoice payment</li>
          <li>Guarantee collection or payment success</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          The Service only automates reminder emails based on your settings.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Payments & Subscriptions</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          Some features require a paid subscription.
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Billing is handled by a third-party payment provider</li>
          <li>Subscription fees are billed in advance</li>
          <li>You may cancel at any time to stop future billing</li>
          <li>Access continues until the end of the current billing period</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          Unless required by law, payments are non-refundable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Availability & Modifications</h2>
        <p className="text-slate-600 leading-relaxed mb-2">We may:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Modify features</li>
          <li>Suspend parts of the Service</li>
          <li>Update or discontinue the Service</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          We do not guarantee uninterrupted availability.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Intellectual Property</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          All rights, title, and interest in the Service, including software, design, branding, and content, remain the exclusive property of Billza.
        </p>
        <p className="text-slate-600 leading-relaxed">
          You are granted a limited, non-transferable, revocable license to use the Service in accordance with these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Limitation of Liability</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          To the maximum extent permitted by law:
        </p>
        <p className="text-slate-600 leading-relaxed mb-2">Billza shall not be liable for:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Unpaid invoices</li>
          <li>Lost revenue or profits</li>
          <li>Email delivery failures</li>
          <li>Indirect, incidental, or consequential damages</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          The Service is provided "as is" and "as available".
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Indemnification</h2>
        <p className="text-slate-600 leading-relaxed mb-2">
          You agree to indemnify and hold Billza harmless from any claims, damages, or losses arising from:
        </p>
        <ul className="list-disc pl-6 text-slate-600">
          <li>Your use of the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your breach of applicable laws</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Termination</h2>
        <p className="text-slate-600 leading-relaxed mb-2">We may suspend or terminate your account if:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>You violate these Terms</li>
          <li>You misuse the Service</li>
          <li>Required by law or payment processors</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          Upon termination, your access to the Service will end.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Changes to These Terms</h2>
        <p className="text-slate-600 leading-relaxed">
          We may update these Terms from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Service constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Governing Law</h2>
        <p className="text-slate-600 leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Billza operates, without regard to conflict of law principles.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Contact Information</h2>
        <p className="text-slate-600 leading-relaxed">
          For questions regarding these Terms, contact:
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
