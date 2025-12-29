import React from 'react';
import { H2, SUBTLE } from '@/lib/ui/tokens';

export interface FormSectionProps {
  /** Optional section title */
  title?: string;
  /** Optional section description */
  description?: string;
  /** Form fields to display */
  children: React.ReactNode;
  /** Force all children to span full width (disable 2-column grid) */
  fullWidth?: boolean;
  /** Optional className for section wrapper */
  className?: string;
}

/**
 * FormSection - Responsive grid container for form fields
 *
 * Features:
 * - Mobile: 1 column layout
 * - Desktop (md+): 2 column grid with gap-4
 * - Optional section header (title + description)
 * - fullWidth prop to disable grid (all fields span full width)
 *
 * Usage:
 * ```tsx
 * <FormSection title="Basic Info" description="Enter client details">
 *   <FormField label="Name">...</FormField>
 *   <FormField label="Email">...</FormField>
 * </FormSection>
 *
 * <FormSection fullWidth>
 *   <FormField label="Notes">...</FormField>
 * </FormSection>
 * ```
 *
 * Individual field fullWidth:
 * Wrap in a div with `md:col-span-2` to span both columns
 */
export default function FormSection({
  title,
  description,
  children,
  fullWidth = false,
  className = '',
}: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className={`${H2} text-foreground`}>{title}</h3>}
          {description && <p className={SUBTLE}>{description}</p>}
        </div>
      )}

      {/* Grid Container */}
      <div
        className={
          fullWidth
            ? 'space-y-4'
            : 'grid grid-cols-1 md:grid-cols-2 gap-4'
        }
      >
        {children}
      </div>
    </div>
  );
}
