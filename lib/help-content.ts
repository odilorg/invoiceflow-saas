// Centralized help content for all pages
// Edit these to update help text across the application

export const HELP_CONTENT = {
  dashboard: {
    title: 'How it works',
    items: [
      'Create invoices with due dates',
      'Set a follow-up schedule',
      'InvoiceFlow sends reminders automatically',
      'Mark invoices as Paid to stop reminders',
      'After the final reminder, InvoiceFlow stops and waits for manual action'
    ],
    storageKey: 'help.dashboard'
  },

  templates: {
    title: 'About Templates',
    items: [
      'Templates define the email content used in reminders',
      'Use variables like {clientName} and {invoiceNumber} to personalize emails'
    ],
    variant: 'inline' as const
  },

  schedules: {
    title: 'About Schedules',
    items: [
      'Schedules control when reminder emails are sent (Day 0, Day 3, Day 7, etc.)',
      'Set one schedule as Default to apply it automatically'
    ],
    variant: 'inline' as const
  },

  invoices: {
    title: 'Managing Invoices',
    items: [
      'Only unpaid (Pending) invoices receive reminders',
      'Mark an invoice as Paid to stop follow-ups',
      'InvoiceFlow sends scheduled reminders. After the final reminder, it stops and waits for manual action'
    ],
    variant: 'inline' as const
  },

  emailActivity: {
    title: 'How it works',
    items: [
      'Activity logs appear after emails are sent automatically',
      'Emails trigger on due date and overdue schedule steps',
      'Check Failed for delivery errors',
      'After all scheduled reminders are sent, InvoiceFlow stops and waits for manual action'
    ],
    storageKey: 'help.emailActivity'
  }
};

export const EMPTY_STATE_CONTENT = {
  emailActivity: {
    title: 'No email activity yet',
    description: 'Activity logs will appear here after automatic emails are sent to your clients.',
    actions: [
      { label: 'Create Invoice', href: '/dashboard/invoices' },
      { label: 'View Schedules', href: '/dashboard/schedules' }
    ],
    warning: 'No active schedule found. Create or activate a schedule to send reminders.'
  },

  invoices: {
    title: 'No invoices yet',
    description: 'Create your first invoice to start tracking payments and sending reminders.',
    actions: [
      { label: 'Create Invoice', primary: true }
    ]
  },

  templates: {
    title: 'No email templates yet',
    description: 'Create email templates to use in your follow-up schedules.',
    actions: [
      { label: 'Create Template', primary: true }
    ]
  },

  schedules: {
    title: 'No schedules yet',
    description: 'Create a follow-up schedule to automate reminder emails.',
    actions: [
      { label: 'Create Schedule', primary: true }
    ]
  }
};