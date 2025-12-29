import React from 'react';
import { INPUT_H } from '@/lib/ui/tokens';

export interface FormAmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'inputMode'> {
  /** Input ID (should match FormField id) */
  id: string;
  /** Input value (as string for decimal precision) */
  value: string;
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
  /** Currency symbol to display (default: none) */
  currency?: string;
  /** Allow negative amounts (default: false) */
  allowNegative?: boolean;
  /** Maximum decimal places (default: 2) */
  decimals?: number;
  /** Optional className override (use sparingly) */
  className?: string;
}

/**
 * FormAmountInput - Smart currency/amount input
 *
 * Features:
 * - Mobile decimal keyboard (inputMode="decimal")
 * - Auto-format on blur (normalize decimal separators)
 * - Reject negative numbers (unless allowNegative=true)
 * - Optional currency symbol prefix
 * - Trim whitespace automatically
 * - Limit decimal places
 *
 * Usage:
 * ```tsx
 * <FormAmountInput
 *   id="amount"
 *   value={amount}
 *   onChange={(e) => setAmount(e.target.value)}
 *   currency="$"
 *   placeholder="0.00"
 * />
 * ```
 */
export default function FormAmountInput({
  id,
  value,
  onChange,
  error = false,
  placeholder = '0.00',
  disabled = false,
  readOnly = false,
  currency,
  allowNegative = false,
  decimals = 2,
  className = '',
  ...props
}: FormAmountInputProps) {
  // Normalize and validate amount input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Remove any currency symbols/codes that might have been typed or pasted
    // Strip common currency symbols and codes
    newValue = newValue
      .replace(/[$€£¥₹₽₩₪₺₴₸₹]/g, '') // Remove currency symbols
      .replace(/USD|EUR|GBP|UZS|CNY|JPY|INR|RUB/gi, '') // Remove currency codes
      .trim();

    // Allow empty value
    if (newValue === '') {
      onChange({ ...e, target: { ...e.target, value: '' } });
      return;
    }

    // Allow minus sign at start if negative allowed
    if (allowNegative && newValue === '-') {
      onChange({ ...e, target: { ...e.target, value: '-' } });
      return;
    }

    // Reject negative if not allowed
    if (!allowNegative && newValue.startsWith('-')) {
      return; // Don't update
    }

    // Strip any remaining non-numeric characters except decimal point and minus
    newValue = newValue.replace(/[^\d.-]/g, '');

    // Allow only numbers, decimal point, and minus sign (final validation)
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!regex.test(newValue)) {
      return; // Don't update
    }

    // Update value
    onChange({ ...e, target: { ...e.target, value: newValue } });
  };

  // Format and normalize on blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let normalized = value.trim();

    // Handle empty or just minus
    if (normalized === '' || normalized === '-') {
      if (props.onBlur) props.onBlur(e);
      return;
    }

    // Parse as number
    const parsed = parseFloat(normalized);

    // Check if valid number
    if (isNaN(parsed)) {
      // Invalid - clear value
      onChange({ ...e, target: { ...e.target, value: '' } } as any);
      if (props.onBlur) props.onBlur(e);
      return;
    }

    // Reject negative if not allowed
    if (!allowNegative && parsed < 0) {
      onChange({ ...e, target: { ...e.target, value: '' } } as any);
      if (props.onBlur) props.onBlur(e);
      return;
    }

    // Format to fixed decimal places
    const formatted = parsed.toFixed(decimals);

    // Update value with normalized format
    if (formatted !== value) {
      onChange({ ...e, target: { ...e.target, value: formatted } } as any);
    }

    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const baseClasses = `
    ${INPUT_H}
    w-full
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

  // Adjust padding for currency symbol
  const paddingClasses = currency ? 'pl-8 pr-3' : 'px-3';

  return (
    <div className="relative">
      {/* Currency Symbol */}
      {currency && (
        <div className="absolute left-3 top-0 h-full flex items-center pointer-events-none">
          <span className="text-base text-muted-foreground">{currency}</span>
        </div>
      )}

      {/* Input */}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`${baseClasses} ${borderClasses} ${stateClasses} ${paddingClasses} ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
