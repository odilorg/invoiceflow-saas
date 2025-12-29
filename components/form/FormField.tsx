import React from 'react';
import { LABEL, SUBTLE, ERROR } from '@/lib/ui/tokens';

export interface FormFieldProps {
  /** Unique ID for the field (connects label to input) */
  id: string;
  /** Field label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Optional hint text shown below input */
  hint?: string;
  /** Error message (if present, shows error state) */
  error?: string;
  /** If present, shows lock icon and disables input with this reason */
  lockedReason?: string;
  /** The input component (FormInput, FormTextarea, FormSelect, etc.) */
  children: React.ReactNode;
  /** Optional className for wrapper */
  className?: string;
}

/**
 * FormField - Unified field wrapper for all form inputs
 *
 * Provides consistent structure:
 * - Label with required marker
 * - Input component (passed as children)
 * - Hint text (helper text)
 * - Error message (validation feedback)
 * - Locked state (read-only with reason)
 *
 * Usage:
 * ```tsx
 * <FormField
 *   id="email"
 *   label="Email Address"
 *   required
 *   hint="We'll never share your email"
 *   error={errors.email}
 * >
 *   <FormInput
 *     id="email"
 *     type="email"
 *     value={formData.email}
 *     onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 *     error={!!errors.email}
 *   />
 * </FormField>
 * ```
 */
export default function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  lockedReason,
  children,
  className = '',
}: FormFieldProps) {
  // Generate IDs for aria-describedby
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const lockedId = lockedReason ? `${id}-locked` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label htmlFor={id} className={`${LABEL} block`}>
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </label>

      {/* Input (passed as children) */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            'aria-describedby': [hintId, errorId, lockedId].filter(Boolean).join(' ') || undefined,
            'aria-invalid': error ? 'true' : undefined,
            disabled: lockedReason ? true : (child.props.disabled || undefined),
          });
        }
        return child;
      })}

      {/* Locked Reason */}
      {lockedReason && (
        <div id={lockedId} className={`${SUBTLE} flex items-center gap-2`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{lockedReason}</span>
        </div>
      )}

      {/* Hint Text */}
      {hint && !error && (
        <p id={hintId} className={SUBTLE}>
          {hint}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p id={errorId} className={ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
