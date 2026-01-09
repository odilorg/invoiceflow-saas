'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'billza_cookie_consent';

export type ConsentStatus = 'all' | 'essential' | null;

/**
 * Get current cookie consent status
 * Use this to gate non-essential scripts/cookies
 */
export function getCookieConsent(): ConsentStatus {
  if (typeof window === 'undefined') return null;
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'all' || consent === 'essential') return consent;
  return null;
}

/**
 * Check if non-essential cookies are allowed
 */
export function hasFullConsent(): boolean {
  return getCookieConsent() === 'all';
}

/**
 * Cookie Consent Banner
 * Shows on first visit, stores preference in localStorage
 */
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent already given
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid layout shift on page load
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(CONSENT_KEY, 'all');
    setShowBanner(false);
    // Future: Initialize analytics here
    // if (typeof window !== 'undefined' && window.gtag) { ... }
  };

  const handleRejectNonEssential = () => {
    localStorage.setItem(CONSENT_KEY, 'essential');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-600 text-center sm:text-left">
          We use essential cookies to run the site. Optional cookies help us improve the product.{' '}
          <Link 
            href="/legal/cookies" 
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            Cookie Policy
          </Link>
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRejectNonEssential}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Reject non-essential
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
