import React, { ReactNode, useState, useRef, useEffect } from 'react';
import Badge, { BadgeVariant } from './Badge';
import { CARD_PAD, H2, SUBTLE, LABEL, VALUE, BTN_MIN_H, ICON_BTN } from '@/lib/ui/tokens';

export interface EntityListCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant: BadgeVariant;
  };
  fields?: Array<{
    label: string;
    value: ReactNode;
  }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    hidden?: boolean;
  }>;
  destructiveAction?: {
    icon: ReactNode;
    onClick: () => void;
    ariaLabel: string;
  };
  className?: string;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [menuOpen]);

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

  const visibleSecondaryActions = secondaryActions?.filter((action) => !action.hidden) || [];
  const hasMenuItems = visibleSecondaryActions.length > 0 || destructiveAction;

  const handleMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className={"bg-card border border-border rounded-xl p-5 " + className}>
      {/* Header: Title + Badge (same row for scanability) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h3 className={H2 + " text-foreground font-mono truncate"}>
            {title}
          </h3>
          {badge && (
            <Badge variant={badge.variant} className="shrink-0">
              {badge.label}
            </Badge>
          )}
        </div>

        {/* More menu button (mobile only) */}
        {hasMenuItems && (
          <div className="relative md:hidden">
            <button
              ref={buttonRef}
              onClick={() => setMenuOpen(!menuOpen)}
              className={ICON_BTN + " flex items-center justify-center rounded-lg hover:bg-muted transition-colors"}
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in"
              >
                {visibleSecondaryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuAction(action.onClick)}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
                {destructiveAction && (
                  <>
                    {visibleSecondaryActions.length > 0 && (
                      <div className="border-t border-border my-1" />
                    )}
                    <button
                      onClick={() => handleMenuAction(destructiveAction.onClick)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      {destructiveAction.icon}
                      <span>{destructiveAction.ariaLabel}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtitle (client info - secondary emphasis) */}
      {subtitle && (
        <p className={SUBTLE + " mb-4 truncate"}>
          {subtitle}
        </p>
      )}

      {/* Fields: 2-column grid */}
      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-5">
          {fields.map((field, index) => (
            <div key={index} className="min-w-0">
              <p className={LABEL + " mb-1"}>
                {field.label}
              </p>
              <div className={VALUE + " text-foreground"}>
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions Section */}
      {(primaryAction || hasMenuItems) && (
        <div className="pt-4 border-t border-border">
          {/* Mobile: Primary action only visible, others in menu */}
          <div className="md:hidden">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={"w-full " + BTN_MIN_H + " px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed " + getButtonStyles(primaryAction.variant)}
              >
                {primaryAction.label}
              </button>
            )}
          </div>

          {/* Desktop: All actions visible inline */}
          <div className="hidden md:flex md:flex-wrap md:gap-2">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={BTN_MIN_H + " px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed " + getButtonStyles(primaryAction.variant)}
              >
                {primaryAction.label}
              </button>
            )}
            {visibleSecondaryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={BTN_MIN_H + " px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"}
              >
                {action.label}
              </button>
            ))}
            {destructiveAction && (
              <button
                onClick={destructiveAction.onClick}
                aria-label={destructiveAction.ariaLabel}
                className={BTN_MIN_H + " px-3 py-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors inline-flex items-center gap-1.5"}
              >
                {destructiveAction.icon}
                <span className="text-sm font-medium">{destructiveAction.ariaLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
