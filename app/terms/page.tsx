import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Billza",
  description: "Terms of Service for Billza invoice follow-up automation platform",
};

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            <strong>Last updated:</strong> January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              By accessing or using Billza ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Billza is an automated invoice follow-up platform that helps businesses send scheduled 
              email reminders to clients about pending invoices. The Service includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li>Invoice management and tracking</li>
              <li>Automated email reminder scheduling</li>
              <li>Customizable email templates</li>
              <li>Activity logging and reporting</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account. You must notify us immediately of any 
              unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
              <li>Send spam or unsolicited emails</li>
              <li>Harass or threaten recipients</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Payment Terms</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Paid subscriptions are billed in advance on a monthly or annual basis. All fees are 
              non-refundable except as required by law. We reserve the right to change our pricing 
              with 30 days notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The Service is provided "as is" without warranties of any kind. We shall not be liable 
              for any indirect, incidental, special, or consequential damages arising from your use 
              of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Termination</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may terminate or suspend your account at any time for violations of these Terms. 
              You may cancel your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Changes to Terms</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of 
              significant changes via email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Contact</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              For questions about these Terms, please contact us at{" "}
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
