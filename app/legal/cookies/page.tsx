import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — Billza',
  description: 'Cookie Policy for Billza invoice follow-up automation service.',
  robots: 'index, follow',
};

export default function CookiePolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-slate-500 mb-6">Last updated: January 9, 2025</p>

      <p className="text-slate-600 leading-relaxed mb-8">
        This Cookie Policy explains how Billza uses cookies and similar technologies when you visit our website and use our service.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. What Are Cookies</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Billza uses cookies to keep you logged in, remember your preferences, and ensure the service works correctly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How Billza Uses Cookies</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          We use cookies for the following purposes:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li>To authenticate you and keep you logged in</li>
          <li>To remember your preferences (such as theme settings)</li>
          <li>To ensure the security of your account</li>
          <li>To process payments securely through our payment provider</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Essential Cookies</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          These cookies are necessary for the website to function and cannot be disabled:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li><strong>Authentication cookies</strong> — Keep you logged into your account</li>
          <li><strong>Security cookies</strong> — Help protect your account from unauthorized access</li>
          <li><strong>Payment cookies</strong> — Required by our payment processor (Lemon Squeezy) for secure transactions</li>
          <li><strong>Preference cookies</strong> — Remember your settings (theme, language)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Optional Cookies</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          With your consent, we may use additional cookies to improve the service:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li><strong>Analytics cookies</strong> — Help us understand how you use the service so we can improve it</li>
          <li><strong>Performance cookies</strong> — Help us identify and fix technical issues</li>
          <li><strong>Error tracking cookies</strong> — Help us detect and resolve bugs</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          These cookies are only enabled if you choose "Accept all" in our cookie consent banner.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Managing Cookie Preferences</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          You can manage your cookie preferences in several ways:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4">
          <li><strong>Cookie consent banner</strong> — Choose "Accept all" or "Reject non-essential" when you first visit</li>
          <li><strong>Browser settings</strong> — Most browsers allow you to block or delete cookies</li>
          <li><strong>Clear cookies</strong> — You can clear all cookies at any time through your browser</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          Note: Blocking essential cookies may prevent the website from functioning correctly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Contact Information</h2>
        <p className="text-slate-600 leading-relaxed">
          If you have questions about our use of cookies, contact us at:{' '}
          <a href="mailto:support@billza.app" className="text-indigo-600 hover:text-indigo-700">
            support@billza.app
          </a>
        </p>
      </section>
    </article>
  );
}
