'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface FormErrorBannerProps {
  /** Error message to display */
  message?: string;
  /** Optional upgrade message (for billing errors) */
  upgradeMessage?: string;
  /** Optional className for wrapper */
  className?: string;
}

/**
 * FormErrorBanner - Display server errors at the top of forms
 *
 * Features:
 * - Semantic danger styling (bg-destructive/10, border-destructive)
 * - Optional upgrade message for billing errors
 * - Dismissible (optional)
 * - Accessible with role="alert"
 *
 * Usage:
 * ```tsx
 * <FormErrorBanner
 *   message={errors.serverError}
 * />
 * ```
 */
export default function FormErrorBanner({
  message,
  upgradeMessage,
  className = '',
}: FormErrorBannerProps) {
  const router = useRouter();

  if (!message) return null;

  return (
    <div
      role="alert"
      className={`
        p-4 rounded-lg
        bg-destructive/10
        border border-destructive/30
        ${className}
      `.trim()}
    >
      {/* Error Icon + Message */}
      <div className="flex gap-3">
        {/* Error Icon */}
        <svg
          className="flex-shrink-0 w-5 h-5 text-destructive mt-0.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>

        {/* Message Content */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-destructive">
            {message}
          </h3>

          {/* Optional Upgrade Message */}
          {upgradeMessage && (
            <p className="mt-2 text-sm text-destructive/80">
              {upgradeMessage}
            </p>
          )}
        </div>

        {/* Upgrade Button (inline) */}
        {upgradeMessage && (
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard/billing')}
              className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
            >
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
