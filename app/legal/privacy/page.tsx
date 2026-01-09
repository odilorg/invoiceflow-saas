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
      <p className="text-sm text-slate-500 mb-6">Last updated: January 9, 2025</p>

      <p className="text-slate-600 leading-relaxed mb-8">
        This Privacy Policy explains how Billza ("we", "us", "our") collects, uses, and protects your information when you use the Billza website and software application (the "Service").
      </p>
      <p className="text-slate-600 leading-relaxed mb-8">
        By using Billza, you agree to the collection and use of information in accordance with this Privacy Policy.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Information We Collect</h2>
        <p className="text-slate-600 leading-relaxed mb-4">We may collect the following types of information:</p>
        
        <h3 className="text-lg font-medium text-slate-800 mb-2">Account information</h3>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Name</li>
          <li>Email address</li>
          <li>Login credentials (hashed/auth-provider based)</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800 mb-2">Usage & technical data</h3>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>IP address</li>
          <li>Browser/device information</li>
          <li>Log data and timestamps</li>
          <li>Feature usage statistics</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800 mb-2">Invoice-related data (user-provided)</h3>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Invoice numbers</li>
          <li>Due dates</li>
          <li>Amounts</li>
          <li>Client email addresses</li>
        </ul>

        <p className="text-slate-600 leading-relaxed">
          We do <strong>NOT</strong> store full credit card or payment card information. All payments are handled by our payment processor.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Information</h2>
        <p className="text-slate-600 leading-relaxed mb-4">We use the collected data to:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Provide and operate the Service</li>
          <li>Send automated invoice reminder emails as configured by you</li>
          <li>Maintain and improve product functionality</li>
          <li>Communicate with you about your account, updates, or support requests</li>
          <li>Prevent abuse, fraud, or misuse of the Service</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          All invoice reminders are sent automatically by software based on your configuration. Billza does not manually review or send emails.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Data Sharing & Third Parties</h2>
        <p className="text-slate-600 leading-relaxed mb-4">We only share data with trusted third parties when necessary, including:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Email delivery providers (to send reminder emails)</li>
          <li>Payment processors (for billing and subscriptions)</li>
          <li>Hosting and infrastructure providers</li>
          <li>Legal authorities if required by law</li>
        </ul>
        <p className="text-slate-600 leading-relaxed font-medium">
          We do NOT sell, rent, or trade your personal data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Email & Communication Compliance</h2>
        <p className="text-slate-600 leading-relaxed mb-4">You are responsible for ensuring that:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>You have permission to contact invoice recipients</li>
          <li>Your use of the Service complies with applicable email, privacy, and anti-spam laws (e.g. GDPR, CAN-SPAM)</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          Billza is not responsible for misuse of the Service for unlawful or unsolicited communication.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
        <p className="text-slate-600 leading-relaxed mb-4">We retain personal data only as long as necessary to:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Provide the Service</li>
          <li>Meet legal, accounting, or regulatory obligations</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          You may request deletion of your data at any time, subject to legal requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Your Rights</h2>
        <p className="text-slate-600 leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          To exercise these rights, contact us at:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Data Security</h2>
        <p className="text-slate-600 leading-relaxed">
          We implement reasonable technical and organizational measures to protect your data. However, no system is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Children's Privacy</h2>
        <p className="text-slate-600 leading-relaxed">
          Billza is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Changes to This Policy</h2>
        <p className="text-slate-600 leading-relaxed">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Service constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact Us</h2>
        <p className="text-slate-600 leading-relaxed">
          If you have any questions about this Privacy Policy or our data practices, contact:
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
