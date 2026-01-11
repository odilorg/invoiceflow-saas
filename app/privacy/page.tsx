import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Billza",
  description: "Privacy Policy for Billza invoice follow-up automation platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            <strong>Last updated:</strong> January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li><strong>Account Information:</strong> Email address, name, and password when you register</li>
              <li><strong>Invoice Data:</strong> Client names, email addresses, invoice amounts, and due dates</li>
              <li><strong>Usage Data:</strong> How you interact with our Service, including pages visited and features used</li>
              <li><strong>Payment Information:</strong> Processed securely by our payment provider (Lemon Squeezy)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Send automated invoice reminders on your behalf</li>
              <li>Process transactions and send billing notifications</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Send technical notices, updates, and security alerts</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Information Sharing</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li><strong>With your consent:</strong> When you explicitly authorize us to share</li>
              <li><strong>Service providers:</strong> With third parties who perform services on our behalf (email delivery, payment processing)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Security</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We implement appropriate security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Retention</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We retain your information for as long as your account is active or as needed to provide 
              you services. You can request deletion of your account and associated data at any time 
              by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Cookies</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We use essential cookies for authentication and session management. These cookies are 
              necessary for the Service to function and cannot be disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Third-Party Services</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Our Service uses the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li><strong>Brevo:</strong> Email delivery service</li>
              <li><strong>Lemon Squeezy:</strong> Payment processing</li>
              <li><strong>Upstash:</strong> Rate limiting infrastructure</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Each of these services has their own privacy policies governing the use of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Changes to Privacy Policy</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by posting a notice on the Service or sending you an email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
              <a href="mailto:support@billza.app" className="text-blue-600 hover:text-blue-700">
                support@billza.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
