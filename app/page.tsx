export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg" role="img" aria-label="InvoiceFlow logo"></div>
              <span className="text-lg font-semibold text-slate-900">InvoiceFlow</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="px-4 py-2.5 text-slate-700 hover:text-slate-900 transition-colors font-medium text-sm"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium text-sm"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-6 md:pt-20 md:pb-14">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-5 tracking-tight leading-tight">
            Stop chasing invoices.
            <span className="block text-indigo-600">
              Get paid automatically.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-7 leading-relaxed max-w-2xl mx-auto">
            Automatic, polite follow-up emails for unpaid invoices — so you get paid on time without awkward messages.
          </p>

          <div className="flex flex-col items-center gap-2.5">
            <a
              href="/register"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-semibold text-base"
            >
              Start free — no credit card required
            </a>
            <p className="text-sm text-slate-500">
              Set up in 2 minutes. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-slate-200"></div>
      </div>

      {/* Why Section */}
      <section className="py-12 px-6 md:py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-5">
            Why InvoiceFlow
          </h2>
          <div className="text-base md:text-lg text-slate-600 leading-relaxed space-y-3">
            <p>Late payments are normal. Chasing them shouldn't be your job.</p>
            <p>InvoiceFlow provides invoice follow-up automation that sends professional email reminders on your schedule until an invoice is paid — calmly, consistently, and without awkwardness.</p>
            <p className="font-medium text-slate-700 pt-1">
              No accounting.<br />
              No payment processing.<br />
              Just follow-ups that work.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-slate-200"></div>
      </div>

      {/* How It Works Section */}
      <section className="py-12 px-6 bg-slate-50 md:py-14">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4" role="img" aria-label="Step 1">
                <span className="text-xl font-bold text-indigo-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Add your invoice</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Enter the client's email, invoice number, amount, and due date.
                Optionally add a link to the invoice PDF or payment page.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4" role="img" aria-label="Step 2">
                <span className="text-xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Choose tone & schedule</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Use ready-made templates (Friendly, Neutral, or Firm).
                Default reminders are sent on the due date, then after 3, 7, and 14 days.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4" role="img" aria-label="Step 3">
                <span className="text-xl font-bold text-indigo-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Get paid</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Automatic invoice reminders send until you mark the invoice as paid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Follow-up Emails Section */}
      <section className="py-12 px-6 md:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Example follow-up emails
            </h2>
          </div>

          <div className="space-y-4">
            {/* Friendly */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Friendly reminder</h3>
              <div className="text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-4 rounded-lg border border-slate-200" role="img" aria-label="Friendly invoice reminder email example">
                Hi {'{{clientName}}'},<br />
                Just a quick reminder that invoice {'{{invoiceNumber}}'} for {'{{amount}}'} {'{{currency}}'} was due on {'{{dueDate}}'}.<br />
                Let me know if you need anything from me.<br />
                Thanks!
              </div>
            </div>

            {/* Neutral */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Neutral follow-up</h3>
              <div className="text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-4 rounded-lg border border-slate-200" role="img" aria-label="Neutral invoice reminder email example">
                Hello {'{{clientName}}'},<br />
                This is a reminder that invoice {'{{invoiceNumber}}'} remains unpaid as of {'{{dueDate}}'}.<br />
                I'd appreciate your help in settling it at your earliest convenience.
              </div>
            </div>

            {/* Firm */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Firm reminder</h3>
              <div className="text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-4 rounded-lg border border-slate-200" role="img" aria-label="Firm overdue invoice reminder email example">
                Hi {'{{clientName}}'},<br />
                Invoice {'{{invoiceNumber}}'} is now overdue.<br />
                Please let me know when payment will be completed.
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 mt-5 text-sm italic">All templates are fully editable.</p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-slate-200"></div>
      </div>

      {/* Features Section */}
      <section className="py-12 px-6 bg-slate-50 md:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              What you get
            </h2>
          </div>

          <div className="space-y-3">
            {[
              'Automatic follow-up emails so you don\'t chase clients manually',
              'Custom reminder schedules for overdue invoices',
              'Editable email templates you can personalize',
              'Activity log showing what was sent and when',
              'One-click "Mark as paid" to stop reminders instantly',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-4">
                <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Checkmark">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-700 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-600 mt-7 font-medium text-sm">
            No AI gimmicks. No accounting bloat.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 px-6 md:py-14">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-1">Free</h3>
              <div className="mb-5 space-y-1">
                <p className="text-slate-600 text-sm">Up to 5 invoices</p>
                <p className="text-slate-600 text-sm">All reminder features included</p>
              </div>
              <a
                href="/register"
                className="block w-full px-5 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors text-center font-semibold text-sm"
              >
                Start free
              </a>
            </div>

            {/* Pro Plan */}
            <div className="bg-indigo-600 border-2 border-indigo-700 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-1">Pro — $12/month</h3>
              <div className="mb-5 space-y-1">
                <p className="text-indigo-100 text-sm">Unlimited invoices</p>
                <p className="text-indigo-100 text-sm">Unlimited reminders</p>
                <p className="text-indigo-100 text-sm">Priority support</p>
              </div>
              <a
                href="/register"
                className="block w-full px-5 py-2.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-colors text-center font-semibold text-sm"
              >
                Upgrade to Pro
              </a>
            </div>
          </div>

          <p className="text-center text-slate-500 mt-5 text-sm">
            Upgrade anytime. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-slate-200"></div>
      </div>

      {/* FAQ Section */}
      <section className="py-12 px-6 md:py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Does InvoiceFlow create invoices?</h3>
              <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                No. InvoiceFlow only handles follow-up emails for existing invoices.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Does InvoiceFlow process payments?</h3>
              <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                No. You can include a link to your existing payment method if needed.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Who sends the automatic invoice reminders?</h3>
              <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                Emails are sent automatically from InvoiceFlow using a verified sending domain.
                (Gmail sending support planned.)
              </p>
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">How do automatic invoice reminders stop?</h3>
              <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                Mark the invoice as paid and all future reminders stop immediately.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Is this safe for client relationships?</h3>
              <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                Yes. Templates are professional, polite, and designed to avoid awkwardness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-14 px-6 bg-indigo-600 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Stop chasing payments.<br />
            Let follow-ups send themselves.
          </h2>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-colors font-semibold text-base"
          >
            Start free — no credit card required
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-lg" role="img" aria-label="InvoiceFlow logo"></div>
              <span className="text-base font-semibold text-slate-900">InvoiceFlow</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <a href="/privacy" className="hover:text-slate-900 focus:outline-none focus:underline transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-slate-900 focus:outline-none focus:underline transition-colors">Terms of Service</a>
              <a href="/contact" className="hover:text-slate-900 focus:outline-none focus:underline transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} InvoiceFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
