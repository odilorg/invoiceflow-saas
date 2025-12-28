// Helper functions for computing invoice reminder lifecycle states

export type ReminderState =
  | 'NOT_STARTED'  // No reminders sent yet
  | 'IN_PROGRESS'  // Some reminders sent, more scheduled
  | 'COMPLETED'    // All reminders sent, invoice still unpaid
  | 'STOPPED';     // Invoice marked paid (stop all reminders)

interface Invoice {
  status: string;
  remindersCompleted?: boolean;
  lastReminderSentAt?: Date | string | null;
  totalScheduledReminders?: number | null;
  followUps?: Array<{
    status: string;
    sentAt?: Date | string | null;
  }>;
}

export function getReminderState(invoice: Invoice): ReminderState {
  // If invoice is paid, reminders are stopped
  if (invoice.status === 'PAID') {
    return 'STOPPED';
  }

  // Check if reminders are marked as completed
  if (invoice.remindersCompleted) {
    return 'COMPLETED';
  }

  // Count sent follow-ups
  const sentCount = invoice.followUps?.filter(f =>
    f.status === 'SENT' || f.sentAt !== null
  ).length || 0;

  // No reminders sent yet
  if (sentCount === 0 && !invoice.lastReminderSentAt) {
    return 'NOT_STARTED';
  }

  // Check if we have total scheduled reminders info
  if (invoice.totalScheduledReminders && sentCount >= invoice.totalScheduledReminders) {
    return 'COMPLETED';
  }

  // Some reminders sent, but not all (or we don't know the total)
  return 'IN_PROGRESS';
}

export function getReminderStateDisplay(state: ReminderState): {
  label: string;
  color: string;
  description?: string;
} {
  switch (state) {
    case 'NOT_STARTED':
      return {
        label: 'Reminders Pending',
        color: 'slate',
        description: 'No reminders sent yet'
      };
    case 'IN_PROGRESS':
      return {
        label: 'Reminders Active',
        color: 'blue',
        description: 'Sending scheduled reminders'
      };
    case 'COMPLETED':
      return {
        label: 'Reminders Completed',
        color: 'amber',
        description: 'All scheduled reminders sent - manual action needed'
      };
    case 'STOPPED':
      return {
        label: 'Paid',
        color: 'green',
        description: 'Invoice paid - reminders stopped'
      };
  }
}

export function isReminderExhausted(invoice: Invoice): boolean {
  return getReminderState(invoice) === 'COMPLETED';
}

// Helper to format the reminder status message
export function getReminderStatusMessage(invoice: Invoice): string | null {
  const state = getReminderState(invoice);

  switch (state) {
    case 'COMPLETED':
      return 'All scheduled reminder emails have been sent. InvoiceFlow will not send more emails unless you change the schedule or take manual action.';
    case 'NOT_STARTED':
      if (invoice.status === 'PENDING' || invoice.status === 'OVERDUE') {
        return 'Reminders will be sent based on your schedule when the invoice becomes overdue.';
      }
      return null;
    case 'IN_PROGRESS':
      const sent = invoice.followUps?.filter(f => f.status === 'SENT').length || 0;
      const total = invoice.totalScheduledReminders;
      if (total) {
        return `${sent} of ${total} scheduled reminders sent.`;
      }
      return 'Reminders are being sent according to schedule.';
    default:
      return null;
  }
}