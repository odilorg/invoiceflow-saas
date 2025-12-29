import React, { ReactNode } from 'react';
import Badge, { BadgeVariant } from './Badge';
import { CARD_PAD, H2, SUBTLE, LABEL, VALUE, BTN_MIN_H } from '@/lib/ui/tokens';

export interface EntityListCardProps {
  /** Primary title of the entity */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Status badge configuration */
  badge?: {
    label: string;
    variant: BadgeVariant;
  };
  /** Field data displayed in 2-column grid */
  fields?: Array<{
    label: string;
    value: ReactNode;
  }>;
  /** Primary action button (full-width, prominent) */
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
  };
  /** Secondary action buttons (stacked below primary) */
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    hidden?: boolean;
  }>;
  /** Destructive action (visually separated, icon button) */
  destructiveAction?: {
    icon: ReactNode;
    onClick: () => void;
    ariaLabel: string;
  };
  /** Optional custom className for the card wrapper */
  className?: string;
}

/**
 * EntityListCard - Single source of truth for entity list displays
 *
 * STRICT RULES:
 * - Mobile-first vertical layout
 * - All tap targets >= 44px
 * - Consistent spacing (p-4, space-y-3)
 * - Typography locked (see component)
 *
 * USAGE:
 * Use this component for ALL entity lists:
 * - Invoices, Schedules, Templates, Activity logs
 * - Dashboard previews, Billing history
 *
 * DO NOT create custom card layouts after this.
 */
export default function EntityListCard({
  title,
  subtitle,
  badge,
  fields,
  primaryAction,
  secondaryActions,
  destructiveAction,
  className = '',
}: EntityListCardProps) {
  const getButtonStyles = (variant: string = 'primary') => {
    switch (variant) {
      case 'primary':
        return 'bg-foreground text-background hover:bg-foreground/90';
      case 'secondary':
        return 'bg-card border border-border text-foreground hover:bg-muted';
      case 'ghost':
        return 'bg-muted text-foreground hover:bg-muted/80';
      default:
        return 'bg-foreground text-background hover:bg-foreground/90';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-xl ${CARD_PAD} ${className}`}>
      {/* Header: Title + Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`${H2} text-foreground truncate`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`${SUBTLE} mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <Badge variant={badge.variant} className="shrink-0">
            {badge.label}
          </Badge>
        )}
      </div>

      {/* Fields: 2-column grid */}
      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {fields.map((field, index) => (
            <div key={index} className="min-w-0">
              <p className={`${LABEL} mb-1`}>
                {field.label}
              </p>
              <div className={`${VALUE} text-foreground`}>
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions Section */}
      {(primaryAction || secondaryActions || destructiveAction) && (
        <div className="space-y-2 pt-3 border-t border-border">
          {/* Primary Action (full-width) */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={`w-full ${BTN_MIN_H} px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyles(
                primaryAction.variant
              )}`}
            >
              {primaryAction.label}
            </button>
          )}

          {/* Secondary Actions */}
          {secondaryActions && secondaryActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {secondaryActions
                .filter((action) => !action.hidden)
                .map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`${BTN_MIN_H} px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors`}
                  >
                    {action.label}
                  </button>
                ))}
            </div>
          )}

          {/* Destructive Action (visually separated) */}
          {destructiveAction && (
            <div className="pt-2 border-t border-border">
              <button
                onClick={destructiveAction.onClick}
                aria-label={destructiveAction.ariaLabel}
                className={`${BTN_MIN_H} w-full px-4 py-2.5 text-sm font-medium text-destructive-foreground bg-destructive/15 hover:bg-destructive/25 rounded-lg transition-colors inline-flex items-center justify-center gap-2`}
              >
                {destructiveAction.icon}
                <span>{destructiveAction.ariaLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
