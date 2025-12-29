import React from 'react';
import { LABEL, SUBTLE } from '@/lib/ui/tokens';

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  /** Checkbox ID (should match FormField id if wrapped) */
  id: string;
  /** Checkbox label text */
  label: string;
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Optional hint text shown below checkbox */
  hint?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Optional className for wrapper */
  className?: string;
}

/**
 * FormCheckbox - Standardized checkbox component
 *
 * Features:
 * - Consistent size (16x16px - mobile-friendly)
 * - Design token colors (no hardcoded values)
 * - Label positioned to the right
 * - Optional hint text
 * - Disabled state styling
 * - Focus ring
 * - Accessibility attributes
 *
 * Usage:
 * ```tsx
 * <FormCheckbox
 *   id="isActive"
 *   label="Active"
 *   checked={formData.isActive}
 *   onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
 *   hint="Schedule will be used for new invoices"
 * />
 * ```
 */
export default function FormCheckbox({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  className = '',
  ...props
}: FormCheckboxProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-4 h-4 mt-0.5
          rounded
          transition-colors
          border border-border
          text-foreground
          focus:ring-2 focus:ring-ring focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${disabled ? 'bg-muted' : 'bg-background'}
        `.trim()}
        {...props}
      />
      <div className="flex-1">
        <label htmlFor={id} className={`${LABEL} block cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </label>
        {hint && <p className={`${SUBTLE} mt-0.5`}>{hint}</p>}
      </div>
    </div>
  );
}
