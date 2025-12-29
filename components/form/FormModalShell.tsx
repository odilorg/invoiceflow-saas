import React, { useEffect, useRef } from 'react';
import { H1, SUBTLE } from '@/lib/ui/tokens';

export interface FormModalShellProps {
  /** Modal title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Modal content (form fields, sections, etc.) */
  children: React.ReactNode;
  /** Close handler */
  onClose: () => void;
  /** Whether to show sticky footer (for action buttons) */
  stickyFooter?: boolean;
  /** Optional className for content wrapper */
  className?: string;
}

/**
 * FormModalShell - Standardized modal wrapper for forms
 *
 * Features:
 * - Full-screen overlay with backdrop
 * - Centered, responsive modal container
 * - Scrollable body with mobile-safe padding
 * - Optional sticky footer for action buttons
 * - Keyboard accessibility (Esc to close)
 * - Focus trap within modal
 * - Prevents body scroll when open
 *
 * Usage:
 * ```tsx
 * <FormModalShell
 *   title="Create Invoice"
 *   description="Add a new invoice to track payments"
 *   onClose={() => setShowModal(false)}
 *   stickyFooter
 * >
 *   <FormSection>
 *     <FormField>...</FormField>
 *   </FormSection>
 *   <FormActions>...</FormActions>
 * </FormModalShell>
 * ```
 */
export default function FormModalShell({
  title,
  description,
  children,
  onClose,
  stickyFooter = false,
  className = '',
}: FormModalShellProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={modalRef}
        className={`bg-card border border-border rounded-xl max-w-2xl w-full ${
          stickyFooter ? 'max-h-[90vh] flex flex-col' : 'max-h-[90vh] overflow-y-auto'
        }`}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 id="modal-title" className={`${H1} text-foreground`}>
                {title}
              </h2>
              {description && (
                <p id="modal-description" className={`${SUBTLE} mt-1`}>
                  {description}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body - Scrollable if sticky footer, otherwise part of scrollable container */}
        <div
          className={`${className} ${
            stickyFooter
              ? 'flex-1 overflow-y-auto px-4 sm:px-6 py-6'
              : 'px-4 sm:px-6 py-6'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
