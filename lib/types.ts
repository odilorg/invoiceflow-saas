/**
 * Shared TypeScript types for the application
 * Based on Prisma schema with additional frontend-specific types
 */

// ============================================================================
// ENUMS (matching Prisma)
// ============================================================================

export const PLAN_STATUS = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
} as const;

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

export const INVOICE_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const FOLLOW_UP_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  SKIPPED: 'SKIPPED',
} as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUS)[keyof typeof FOLLOW_UP_STATUS];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  UNPAID: 'UNPAID',
  PAUSED: 'PAUSED',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

// ============================================================================
// BASE ENTITY TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  planStatus: PlanStatus;
  lsCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string | null;
  scheduleId: string | null;
  lastReminderSentAt: string | null;
  totalScheduledReminders: number | null;
  remindersCompleted: boolean;
  remindersEnabled: boolean;
  remindersBaseDueDate: string | null;
  remindersResetAt: string | null;
  remindersPausedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceWithFollowUps extends Invoice {
  followUps: FollowUp[];
  schedule?: Schedule | null;
}

export interface FollowUp {
  id: string;
  invoiceId: string;
  templateId: string | null;
  scheduledDate: string;
  status: FollowUpStatus;
  sentAt: string | null;
  subject: string;
  body: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  steps?: ScheduleStep[];
}

export interface ScheduleStep {
  id: string;
  scheduleId: string;
  templateId: string;
  dayOffset: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  template?: Template;
}

export interface EmailLog {
  id: string;
  followUpId: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  success: boolean;
  errorMessage: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  provider: string;
  providerStoreId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerOrderId: string | null;
  providerVariantId: string | null;
  providerPlan: string | null;
  status: SubscriptionStatus;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalFollowUpsSent: number;
  upcomingFollowUps: number;
  planStatus: PlanStatus;
}

export interface OverdueInvoice extends Invoice {
  daysPastDue: number;
}

export interface SetupStatus {
  hasTemplates: boolean;
  hasActiveSchedule: boolean;
  hasInvoices: boolean;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  amount: string;
  currency: string;
  invoiceNumber: string;
  dueDate: string;
  notes: string;
  scheduleId: string;
}

export interface TemplateFormData {
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

export interface ScheduleFormData {
  name: string;
  isActive: boolean;
  isDefault: boolean;
  steps: ScheduleStepFormData[];
}

export interface ScheduleStepFormData {
  templateId: string;
  dayOffset: number;
  order: number;
}
