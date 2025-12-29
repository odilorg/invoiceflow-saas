import React from 'react';
import { INPUT_H } from '@/lib/ui/tokens';

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /** Input ID (should match FormField id) */
  id: string;
  /** Input type (text, email, password, number, etc.) */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Input value */
  value: string | number;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether the field has an error (changes border color) */
  error?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is readonly */
  readOnly?: boolean;
  /** Autocomplete hint */
  autoComplete?: string;
  /** Optional className override (use sparingly) */
  className?: string;
}

/**
 * FormInput - Standardized text input component
 *
 * Features:
 * - Consistent height (h-11 / 44px - mobile-friendly)
 * - Design token colors (no hardcoded values)
 * - Error state styling
 * - Disabled state styling
 * - Focus ring
 * - Accessibility attributes
 *
 * Usage:
 * ```tsx
 * <FormInput
 *   id="email"
 *   type="email"
 *   value={formData.email}
 *   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 *   placeholder="you@example.com"
 *   error={!!errors.email}
 * />
 * ```
 */
export default function FormInput({
  id,
  type = 'text',
  value,
  onChange,
  error = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete,
  className = '',
  ...props
}: FormInputProps) {
  const baseClasses = `
    ${INPUT_H}
    w-full
    px-3
    text-base
    rounded-lg
    transition-colors
    bg-background
    text-foreground
    placeholder:text-muted-foreground
  `;

  const borderClasses = error
    ? 'border border-destructive focus:ring-2 focus:ring-destructive/20'
    : 'border border-border focus:ring-2 focus:ring-ring/30';

  const stateClasses = disabled || readOnly
    ? 'bg-muted opacity-70 cursor-not-allowed'
    : 'hover:border-ring/50 focus:border-ring';

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={autoComplete}
      className={`${baseClasses} ${borderClasses} ${stateClasses} ${className}`.trim()}
      {...props}
    />
  );
}
