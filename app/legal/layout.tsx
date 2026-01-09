import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  robots: 'index, follow',
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg"></div>
              <span className="text-lg font-semibold text-slate-900">Billza</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2.5 text-slate-700 hover:text-slate-900 transition-colors font-medium text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium text-sm"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-12 px-6 md:py-16">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-lg"></div>
              <span className="text-base font-semibold text-slate-900">Billza</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/legal/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
              <Link href="/legal/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
              <Link href="/legal/refunds" className="hover:text-slate-900 transition-colors">Refund Policy</Link>
            </div>
          </div>
          <div className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Billza. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
