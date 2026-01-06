'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PAGE_X, PAGE_Y, H1, SUBTLE, BTN_MIN_H } from '@/lib/ui/tokens';

export default function InvoicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Invoices error:', error.digest);
    } else {
      console.error('Invoices error:', error);
    }
  }, [error]);

  return (
    <div className={`min-h-[60vh] flex items-center justify-center ${PAGE_X} ${PAGE_Y}`}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className={`${H1} text-foreground mb-2`}>Failed to load invoices</h1>
        <p className={`${SUBTLE} mb-6`}>
          We couldn&apos;t load your invoices. This might be a temporary issue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className={`${BTN_MIN_H} px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors`}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className={`${BTN_MIN_H} px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors inline-flex items-center justify-center`}
          >
            Back to Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
