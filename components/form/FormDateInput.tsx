"use client";

import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { format, parse, isValid } from 'date-fns';
import { INPUT_H } from '@/lib/ui/tokens';
import 'react-datepicker/dist/react-datepicker.css';

export interface FormDateInputProps {
  /** Date input ID (should match FormField id) */
  id: string;
  /** Date value (YYYY-MM-DD format) */
  value: string;
  /** Change handler - receives synthetic event with target.value in YYYY-MM-DD format */
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
  /** Placeholder text */
  placeholder?: string;
  /** Optional className override (use sparingly) */
  className?: string;
}

// Custom input component for DatePicker to maintain styling
interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  id?: string;
  placeholder?: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, disabled, readOnly, error, id, placeholder }, ref) => {
    const baseClasses = `
      ${INPUT_H}
      w-full
      px-3
      text-base
      rounded-lg
      transition-colors
      bg-background
      text-foreground
      cursor-pointer
    `;

    const borderClasses = error
      ? 'border border-destructive focus:ring-2 focus:ring-destructive/20'
      : 'border border-border focus:ring-2 focus:ring-ring/30';

    const stateClasses = disabled || readOnly
      ? 'bg-muted opacity-70 cursor-not-allowed'
      : 'hover:border-ring/50 focus:border-ring';

    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type="text"
          value={value || ''}
          onClick={onClick}
          readOnly
          disabled={disabled}
          placeholder={placeholder || 'Select date'}
          className={`${baseClasses} ${borderClasses} ${stateClasses} pr-10`.trim()}
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }
);

CustomInput.displayName = 'CustomDateInput';

/**
 * FormDateInput - Date input with calendar picker
 *
 * Features:
 * - Calendar picker popup on desktop and mobile
 * - Consistent height (h-11 / 44px - mobile-friendly)
 * - Design token colors (no hardcoded values)
 * - Error state styling
 * - Disabled state styling
 * - Focus ring
 * - Min/max date constraints
 * - Calendar icon
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
  placeholder,
  className = '',
}: FormDateInputProps) {
  // Parse string value to Date object
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // Get min date as Date object
  const getMinDate = (): Date | undefined => {
    if (!min) return undefined;
    if (min instanceof Date) return min;
    const parsed = parseDate(min);
    return parsed || undefined;
  };

  // Get max date as Date object
  const getMaxDate = (): Date | undefined => {
    if (!max) return undefined;
    if (max instanceof Date) return max;
    const parsed = parseDate(max);
    return parsed || undefined;
  };

  // Handle date selection from picker
  const handleDateChange = (date: Date | null) => {
    // Create a synthetic event-like object to maintain API compatibility
    const syntheticEvent = {
      target: {
        id,
        name: id,
        value: date ? format(date, 'yyyy-MM-dd') : '',
      },
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  const selectedDate = parseDate(value);

  return (
    <div className={`w-full datepicker-wrapper ${className}`.trim()}>
      <DatePicker
        id={id}
        selected={selectedDate}
        onChange={handleDateChange}
        minDate={getMinDate()}
        maxDate={getMaxDate()}
        disabled={disabled}
        readOnly={readOnly}
        dateFormat="MMM d, yyyy"
        placeholderText={placeholder || 'Select date'}
        customInput={
          <CustomInput
            error={error}
            disabled={disabled}
            readOnly={readOnly}
            id={id}
            placeholder={placeholder}
          />
        }
        popperClassName="datepicker-popper"
        calendarClassName="datepicker-calendar"
        showPopperArrow={false}
        popperPlacement="bottom-start"
      />
    </div>
  );
}
