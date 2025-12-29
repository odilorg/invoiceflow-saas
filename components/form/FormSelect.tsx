import React from 'react';
import { INPUT_H } from '@/lib/ui/tokens';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  /** Select ID (should match FormField id) */
  id: string;
  /** Select value */
  value: string;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Array of options */
  options: FormSelectOption[];
  /** Whether the field has an error (changes border color) */
  error?: boolean;
  /** Placeholder option (shown when no value selected) */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Optional className override (use sparingly) */
  className?: string;
}

/**
 * FormSelect - Standardized select/dropdown component
 *
 * Features:
 * - Consistent height (h-11 / 44px - mobile-friendly)
 * - Design token colors (no hardcoded values)
 * - Error state styling
 * - Disabled state styling
 * - Focus ring
 * - Custom dropdown arrow
 * - Accessibility attributes
 *
 * Usage:
 * ```tsx
 * <FormSelect
 *   id="currency"
 *   value={formData.currency}
 *   onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
 *   options={[
 *     { value: 'USD', label: 'US Dollar' },
 *     { value: 'EUR', label: 'Euro' },
 *   ]}
 *   placeholder="Select currency"
 *   error={!!errors.currency}
 * />
 * ```
 */
export default function FormSelect({
  id,
  value,
  onChange,
  options,
  error = false,
  placeholder,
  disabled = false,
  className = '',
  ...props
}: FormSelectProps) {
  const baseClasses = `
    ${INPUT_H}
    w-full
    px-3
    text-base
    rounded-lg
    transition-colors
    bg-background
    text-foreground
    appearance-none
    bg-no-repeat
    bg-right
    pr-10
  `;

  // Custom dropdown arrow using background image
  const arrowSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E`;
  const arrowStyle = {
    backgroundImage: `url("${arrowSvg}")`,
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25rem 1.25rem',
  };

  const borderClasses = error
    ? 'border border-destructive focus:ring-2 focus:ring-destructive/20'
    : 'border border-border focus:ring-2 focus:ring-ring/30';

  const stateClasses = disabled
    ? 'bg-muted opacity-70 cursor-not-allowed'
    : 'hover:border-ring/50 focus:border-ring cursor-pointer';

  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseClasses} ${borderClasses} ${stateClasses} ${className}`.trim()}
      style={arrowStyle}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
