import React from 'react';
import { BTN_MIN_H } from '@/lib/ui/tokens';

export interface FormActionsProps {
  /** Cancel button handler */
  onCancel: () => void;
  /** Primary action button handler */
  onSubmit: () => void;
  /** Primary button label (default: "Save") */
  submitLabel?: string;
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Disable both buttons (for loading states) */
  disabled?: boolean;
  /** Show loading indicator on submit button */
  loading?: boolean;
  /** Primary button variant (default: primary) */
  variant?: 'primary' | 'secondary' | 'destructive';
  /** Optional className for wrapper */
  className?: string;
}

/**
 * FormActions - Standardized action buttons for forms
 *
 * Features:
 * - Cancel (ghost) + Primary (configurable variant) buttons
 * - Mobile: full-width stacked buttons
 * - Desktop: inline buttons with gap
 * - Loading state with spinner
 * - Double-submit prevention
 * - min-height 44px for mobile touch targets
 *
 * Usage:
 * ```tsx
 * <FormActions
 *   onCancel={() => setShowModal(false)}
 *   onSubmit={handleSubmit}
 *   submitLabel="Create Invoice"
 *   loading={isSubmitting}
 * />
 * ```
 */
export default function FormActions({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  disabled = false,
  loading = false,
  variant = 'primary',
  className = '',
}: FormActionsProps) {
  const getSubmitButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-foreground text-background hover:bg-foreground/90';
      case 'secondary':
        return 'bg-muted text-foreground hover:bg-muted/80';
      case 'destructive':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      default:
        return 'bg-foreground text-background hover:bg-foreground/90';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <div className={`flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 ${className}`}>
      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className={`
          ${BTN_MIN_H}
          flex-1 sm:flex-initial sm:min-w-[120px]
          px-4 py-2.5
          text-sm font-medium
          rounded-lg
          transition-colors
          inline-flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getSubmitButtonStyles()}
        `.trim()}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span>{loading ? 'Saving...' : submitLabel}</span>
      </button>

      {/* Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className={`
          ${BTN_MIN_H}
          flex-1 sm:flex-initial sm:min-w-[120px]
          px-4 py-2.5
          text-sm font-medium
          text-foreground
          bg-muted
          hover:bg-muted/80
          rounded-lg
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        `.trim()}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
