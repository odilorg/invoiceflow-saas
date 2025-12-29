/**
 * GLOBAL STATUS → BADGE MAPPING
 * Single source of truth for all status-to-badge transformations
 *
 * RULE: No component/page should decide badge colors directly.
 * All badge label + variant mapping lives here.
 */

import type { BadgeVariant } from '@/components/Badge';

// ============================================================================
// INVOICE STATUS MAPPING
// ============================================================================

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceBadgeInput {
  status: InvoiceStatus;
  dueDate: Date | string;
}

export interface BadgeConfig {
  label: string;
  variant: BadgeVariant;
}

/**
 * Maps invoice status to badge configuration
 * Handles OVERDUE calculation for PENDING invoices past due date
 */
export function getInvoiceStatusBadge(input: InvoiceBadgeInput): BadgeConfig {
  const dueDate = typeof input.dueDate === 'string' ? new Date(input.dueDate) : input.dueDate;
  const now = new Date();

  // PENDING invoices past due date become OVERDUE
  if (input.status === 'PENDING' && dueDate < now) {
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: `OVERDUE (${daysOverdue}d)`,
      variant: 'danger',
    };
  }

  switch (input.status) {
    case 'PAID':
      return { label: 'PAID', variant: 'success' };
    case 'PENDING':
      return { label: 'PENDING', variant: 'warning' };
    case 'CANCELLED':
      return { label: 'CANCELLED', variant: 'neutral' };
    case 'OVERDUE':
      // This case shouldn't happen in practice (we calculate it above)
      return { label: 'OVERDUE', variant: 'danger' };
    default:
      return { label: 'UNKNOWN', variant: 'neutral' };
  }
}

// ============================================================================
// EMAIL ACTIVITY STATUS MAPPING
// ============================================================================

export type EmailActivityStatus = 'SUCCESS' | 'FAILED';

/**
 * Maps email activity status to badge configuration
 */
export function getEmailActivityBadge(status: EmailActivityStatus): BadgeConfig {
  switch (status) {
    case 'SUCCESS':
      return { label: 'Success', variant: 'success' };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger' };
    default:
      return { label: 'Unknown', variant: 'neutral' };
  }
}

// ============================================================================
// FOLLOW-UP STATUS MAPPING
// ============================================================================

export type FollowUpStatus = 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';

/**
 * Maps follow-up status to badge configuration
 */
export function getFollowUpStatusBadge(status: FollowUpStatus): BadgeConfig {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', variant: 'info' };
    case 'SENT':
      return { label: 'Sent', variant: 'success' };
    case 'SKIPPED':
      return { label: 'Skipped', variant: 'neutral' };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger' };
    default:
      return { label: 'Unknown', variant: 'neutral' };
  }
}

// ============================================================================
// SCHEDULE STATUS MAPPING
// ============================================================================

export interface ScheduleBadgeInput {
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Maps schedule status to badge configuration
 * Priority: Default > Available > Unavailable
 */
export function getScheduleBadge(input: ScheduleBadgeInput): BadgeConfig {
  if (input.isDefault) {
    return { label: 'Default', variant: 'info' };
  }

  if (input.isActive) {
    return { label: 'Available', variant: 'success' };
  }

  return { label: 'Unavailable', variant: 'neutral' };
}

// ============================================================================
// TEMPLATE STATUS MAPPING (if needed in future)
// ============================================================================

export interface TemplateBadgeInput {
  isDefault: boolean;
}

/**
 * Maps template status to badge configuration
 */
export function getTemplateBadge(input: TemplateBadgeInput): BadgeConfig {
  if (input.isDefault) {
    return { label: 'Default', variant: 'info' };
  }

  return { label: 'Custom', variant: 'neutral' };
}

// ============================================================================
// SUBSCRIPTION STATUS MAPPING
// ============================================================================

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'UNPAID'
  | 'PAUSED';

/**
 * Maps subscription status to badge configuration
 */
export function getSubscriptionStatusBadge(status: SubscriptionStatus): BadgeConfig {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' };
    case 'TRIALING':
      return { label: 'Trial', variant: 'info' };
    case 'PAST_DUE':
      return { label: 'Past Due', variant: 'warning' };
    case 'CANCELED':
      return { label: 'Canceled', variant: 'neutral' };
    case 'EXPIRED':
      return { label: 'Expired', variant: 'danger' };
    case 'UNPAID':
      return { label: 'Unpaid', variant: 'danger' };
    case 'PAUSED':
      return { label: 'Paused', variant: 'neutral' };
    default:
      return { label: 'Unknown', variant: 'neutral' };
  }
}

// ============================================================================
// PLAN STATUS MAPPING
// ============================================================================

export type PlanStatus = 'FREE' | 'STARTER' | 'PRO';

/**
 * Maps plan status to badge configuration
 */
export function getPlanStatusBadge(status: PlanStatus): BadgeConfig {
  switch (status) {
    case 'FREE':
      return { label: 'Free', variant: 'neutral' };
    case 'STARTER':
      return { label: 'Starter', variant: 'info' };
    case 'PRO':
      return { label: 'Pro', variant: 'success' };
    default:
      return { label: 'Unknown', variant: 'neutral' };
  }
}
