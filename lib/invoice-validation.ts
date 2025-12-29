import { prisma } from './db';
import { Invoice, FollowUp } from '@prisma/client';

/**
 * Validate invoice ownership - returns invoice or throws 404
 */
export async function validateInvoiceOwnership(
  invoiceId: string,
  userId: string
): Promise<Invoice> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId: userId,
    },
  });

  if (!invoice) {
    throw new Error('INVOICE_NOT_FOUND');
  }

  return invoice;
}

/**
 * Check if invoice can be edited
 */
export function canEditInvoice(invoice: Invoice): boolean {
  return invoice.status !== 'PAID';
}

/**
 * Get allowed update fields based on invoice state
 */
export function getAllowedUpdateFields(
  invoice: Invoice & { followUps?: FollowUp[] },
  followUpsSentCount: number
): { allowed: string[]; isRestricted: boolean } {
  // PAID invoices cannot be edited at all
  if (invoice.status === 'PAID') {
    return { allowed: [], isRestricted: true };
  }

  // If reminders sent, only notes and status allowed
  if (followUpsSentCount > 0) {
    return { allowed: ['notes', 'status'], isRestricted: true };
  }

  // Full edit mode
  return {
    allowed: [
      'clientName',
      'clientEmail',
      'amount',
      'currency',
      'invoiceNumber',
      'dueDate',
      'status',
      'notes',
      'scheduleId',
    ],
    isRestricted: false,
  };
}

/**
 * Validate domain-level business rules
 */
export async function validateInvoiceUpdateRules(
  userId: string,
  data: {
    amount?: number;
    scheduleId?: string;
    dueDate?: string;
  }
): Promise<{ valid: boolean; error?: string }> {
  // Amount must be positive
  if (data.amount !== undefined && data.amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Validate scheduleId ownership if provided
  if (data.scheduleId) {
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: data.scheduleId,
        userId: userId,
        isActive: true,
      },
    });

    if (!schedule) {
      return {
        valid: false,
        error: 'Schedule not found or does not belong to user',
      };
    }
  }

  // Optional: Validate dueDate not in past (uncomment if needed)
  // if (data.dueDate) {
  //   const dueDate = new Date(data.dueDate);
  //   if (dueDate < new Date()) {
  //     return { valid: false, error: 'Due date cannot be in the past' };
  //   }
  // }

  return { valid: true };
}

/**
 * Compute reminder restart behavior based on explicit flag
 */
export function computeReminderRestart(
  restartReminders: boolean | undefined,
  dueDateChanged: boolean,
  isOverdue: boolean,
  remindersCompleted: boolean
): {
  shouldRegenerate: boolean;
  updateFields: Partial<Invoice>;
  error?: string;
} {
  // If dueDate didn't change, no restart logic needed
  if (!dueDateChanged) {
    return { shouldRegenerate: false, updateFields: {} };
  }

  // CRITICAL: restartReminders MUST be explicit when dueDate changes
  if (restartReminders === undefined) {
    return {
      shouldRegenerate: false,
      updateFields: {},
      error:
        'Due date cannot be changed at this time. Please try editing the invoice again, or contact support if the issue persists.',
    };
  }

  if (restartReminders === true) {
    // Restart reminders
    return {
      shouldRegenerate: true,
      updateFields: {
        remindersEnabled: true,
        remindersBaseDueDate: undefined, // Will be set by caller
        remindersResetAt: new Date(),
        remindersCompleted: false,
        remindersPausedReason: null,
      },
    };
  }

  // restartReminders === false
  if (isOverdue || remindersCompleted) {
    // Pause reminders for overdue/completed invoices
    return {
      shouldRegenerate: false,
      updateFields: {
        remindersEnabled: false,
        remindersPausedReason: 'user_updated_date_no_restart',
      },
    };
  }

  // Keep existing state
  return { shouldRegenerate: false, updateFields: {} };
}
