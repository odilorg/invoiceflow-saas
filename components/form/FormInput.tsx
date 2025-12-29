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
  /** Autocomplete hint (auto-detected from type if not provided) */
  autoComplete?: string;
  /** Input mode for mobile keyboards (auto-detected from type if not provided) */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /** Auto-trim whitespace on blur */
  autoTrim?: boolean;
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
const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(({
  id,
  type = 'text',
  value,
  onChange,
  error = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete,
  inputMode,
  autoTrim = false,
  className = '',
  ...props
}, ref) => {
  // Auto-detect inputMode based on type if not provided
  const getInputMode = (): 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url' | undefined => {
    if (inputMode) return inputMode;

    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'number':
        return 'decimal';
      default:
        return undefined;
    }
  };

  // Auto-detect autoComplete based on type if not provided
  const getAutoComplete = (): string | undefined => {
    if (autoComplete) return autoComplete;

    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      default:
        return undefined;
    }
  };

  // Handle blur for auto-trim
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoTrim && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== value) {
        // Create synthetic event with trimmed value
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: trimmed },
          currentTarget: { ...e.currentTarget, value: trimmed },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }

    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

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
      ref={ref}
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={getAutoComplete()}
      inputMode={getInputMode()}
      className={`${baseClasses} ${borderClasses} ${stateClasses} ${className}`.trim()}
      {...props}
    />
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
