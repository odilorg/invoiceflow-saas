import React, { ReactNode } from 'react';

export interface EntityListCardProps {
  /** Primary title of the entity */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Status badge configuration */
  badge?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
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
  const getBadgeStyles = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'danger':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'neutral':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getButtonStyles = (variant: string = 'primary') => {
    switch (variant) {
      case 'primary':
        return 'bg-slate-900 text-white hover:bg-slate-800';
      case 'secondary':
        return 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50';
      case 'ghost':
        return 'bg-slate-50 text-slate-700 hover:bg-slate-100';
      default:
        return 'bg-slate-900 text-white hover:bg-slate-800';
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 ${className}`}>
      {/* Header: Title + Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0 ${getBadgeStyles(
              badge.variant
            )}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Fields: 2-column grid */}
      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {fields.map((field, index) => (
            <div key={index} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                {field.label}
              </p>
              <div className="text-sm font-medium text-slate-900">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions Section */}
      {(primaryAction || secondaryActions || destructiveAction) && (
        <div className="space-y-2 pt-3 border-t border-slate-200">
          {/* Primary Action (full-width) */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={`w-full min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyles(
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
                    className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
            </div>
          )}

          {/* Destructive Action (visually separated) */}
          {destructiveAction && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={destructiveAction.onClick}
                aria-label={destructiveAction.ariaLabel}
                className="min-h-[44px] w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
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
