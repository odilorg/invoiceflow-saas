import React from 'react';
import { INPUT_H } from '@/lib/ui/tokens';
import { normalizeDate, formatDate } from '@/lib/ui/input-normalize';

export interface FormDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'min' | 'max'> {
  /** Date input ID (should match FormField id) */
  id: string;
  /** Date value (YYYY-MM-DD format) */
  value: string;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether the field has an error (changes border color) */
  error?: boolean;
  /** Minimum date (YYYY-MM-DD format or Date object) */
  min?: string | Date;
  /** Maximum date (YYYY-MM-DD format or Date object) */
  max?: string | Date;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is readonly */
  readOnly?: boolean;
  /** Show readable format hint below input (optional) */
  showReadableHint?: boolean;
  /** Optional className override (use sparingly) */
  className?: string;
}

/**
 * FormDateInput - Standardized date input component
 *
 * Features:
 * - Consistent height (h-11 / 44px - mobile-friendly)
 * - Design token colors (no hardcoded values)
 * - Error state styling
 * - Disabled state styling
 * - Focus ring
 * - Native date picker (mobile-friendly)
 * - Min/max date constraints
 * - Accessibility attributes
 *
 * Usage:
 * ```tsx
 * <FormDateInput
 *   id="dueDate"
 *   value={formData.dueDate}
 *   onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
 *   min={new Date().toISOString().split('T')[0]}
 *   error={!!errors.dueDate}
 * />
 * ```
 *
 * Note: Value must be in YYYY-MM-DD format
 */
export default function FormDateInput({
  id,
  value,
  onChange,
  error = false,
  min,
  max,
  disabled = false,
  readOnly = false,
  showReadableHint = false,
  className = '',
  ...props
}: FormDateInputProps) {
  // Normalize min/max to YYYY-MM-DD format
  const getMinDate = (): string | undefined => {
    if (!min) return undefined;
    if (typeof min === 'string') return min;
    return normalizeDate(min) || undefined;
  };

  const getMaxDate = (): string | undefined => {
    if (!max) return undefined;
    if (typeof max === 'string') return max;
    return normalizeDate(max) || undefined;
  };

  // Get readable format for display
  const getReadableDate = (): string => {
    if (!value) return '';
    try {
      return formatDate(value, 'medium');
    } catch {
      return value;
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
  `;

  const borderClasses = error
    ? 'border border-destructive focus:ring-2 focus:ring-destructive/20'
    : 'border border-border focus:ring-2 focus:ring-ring/30';

  const stateClasses = disabled || readOnly
    ? 'bg-muted opacity-70 cursor-not-allowed'
    : 'hover:border-ring/50 focus:border-ring cursor-pointer';

  return (
    <div className="w-full">
      <input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        min={getMinDate()}
        max={getMaxDate()}
        disabled={disabled}
        readOnly={readOnly}
        className={`${baseClasses} ${borderClasses} ${stateClasses} ${className}`.trim()}
        {...props}
      />
      {showReadableHint && value && (
        <p className="mt-1 text-xs text-muted-foreground">
          {getReadableDate()}
        </p>
      )}
    </div>
  );
}
