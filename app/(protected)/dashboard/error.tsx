'use client';

import { useEffect } from 'react';
import { PAGE_X, PAGE_Y, H1, SUBTLE, BTN_MIN_H } from '@/lib/ui/tokens';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Could send to Sentry, LogRocket, etc.
      console.error('Dashboard error:', error.digest);
    } else {
      console.error('Dashboard error:', error);
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className={`${H1} text-foreground mb-2`}>Something went wrong</h1>
        <p className={`${SUBTLE} mb-6`}>
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className={`${BTN_MIN_H} px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors`}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className={`${BTN_MIN_H} px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors`}
          >
            Go to Dashboard
          </button>
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
