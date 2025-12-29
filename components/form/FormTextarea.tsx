import React from 'react';

export interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  /** Textarea ID (should match FormField id) */
  id: string;
  /** Textarea value */
  value: string;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Whether the field has an error (changes border color) */
  error?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the textarea is disabled */
  disabled?: boolean;
  /** Whether the textarea is readonly */
  readOnly?: boolean;
  /** Number of visible text rows */
  rows?: number;
  /** Optional className override (use sparingly) */
  className?: string;
}

/**
 * FormTextarea - Standardized textarea component
 *
 * Features:
 * - Consistent styling with FormInput
 * - Design token colors (no hardcoded values)
 * - Error state styling
 * - Disabled state styling
 * - Focus ring
 * - Resize control
 * - Accessibility attributes
 *
 * Usage:
 * ```tsx
 * <FormTextarea
 *   id="notes"
 *   value={formData.notes}
 *   onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 *   placeholder="Add any additional notes..."
 *   rows={4}
 *   error={!!errors.notes}
 * />
 * ```
 */
const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  id,
  value,
  onChange,
  error = false,
  placeholder,
  disabled = false,
  readOnly = false,
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const baseClasses = `
    w-full
    px-3
    py-2
    text-base
    rounded-lg
    transition-colors
    resize-y
    min-h-[100px]
    bg-background
    text-foreground
    placeholder:text-muted-foreground
  `;

  const borderClasses = error
    ? 'border border-destructive focus:ring-2 focus:ring-destructive/20'
    : 'border border-border focus:ring-2 focus:ring-ring/30';

  const stateClasses = disabled || readOnly
    ? 'bg-muted opacity-70 cursor-not-allowed resize-none'
    : 'hover:border-ring/50 focus:border-ring';

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      rows={rows}
      className={`${baseClasses} ${borderClasses} ${stateClasses} ${className}`.trim()}
      {...props}
    />
  );
});

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
