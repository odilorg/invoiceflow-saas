import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';

export interface BadgeProps {
  /** Badge text content */
  children: React.ReactNode;
  /** Visual variant of the badge */
  variant?: BadgeVariant;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Badge Component - Single source of truth for badge styling
 *
 * STRICT RULES:
 * - Uses ONLY semantic design tokens (success, warning, destructive, info)
 * - NO hardcoded colors (bg-green-100, text-red-700, etc.)
 * - Dark mode ready via CSS variables
 * - Variants enforced via TypeScript
 *
 * USAGE:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="danger">Overdue</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="info">Default</Badge>
 * <Badge variant="neutral">Unavailable</Badge>
 * <Badge variant="outline">Custom</Badge>
 */
export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const getVariantStyles = (): string => {
    switch (variant) {
      case 'success':
        // Uses design tokens: --success
        return 'bg-success/15 text-success border-success/20';
      case 'warning':
        // Uses design tokens: --warning
        return 'bg-warning/15 text-warning border-warning/20';
      case 'danger':
        // Uses design tokens: --destructive
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'info':
        // Uses design tokens: --info
        return 'bg-info/15 text-info border-info/20';
      case 'neutral':
        // Uses design tokens: --muted, --foreground, --border
        return 'bg-muted text-foreground border-border';
      case 'outline':
        // Transparent background with border
        return 'bg-transparent text-foreground border-border';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${getVariantStyles()} ${className}`}
    >
      {children}
    </span>
  );
}
