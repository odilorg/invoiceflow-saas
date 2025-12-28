import { prisma } from './db';

const DEFAULT_TEMPLATES = [
  {
    name: 'Friendly Reminder',
    subject: 'Reminder: Invoice {invoiceNumber} payment due',
    body: `Hi {clientName},

I hope this message finds you well!

This is a friendly reminder that invoice {invoiceNumber} for {currency} {amount} is due on {dueDate}.

You can view and pay the invoice here:
{invoiceLink}

If you have any questions or concerns, please don't hesitate to reach out.

Thank you for your business!

Best regards`,
    isDefault: true,
  },
  {
    name: 'Neutral Follow-up',
    subject: 'Follow-up: Invoice {invoiceNumber} - {currency} {amount}',
    body: `Hello {clientName},

This is a follow-up regarding invoice {invoiceNumber} for {currency} {amount}, which was due on {dueDate}.

Invoice details:
- Invoice Number: {invoiceNumber}
- Amount: {currency} {amount}
- Due Date: {dueDate}
- Payment Link: {invoiceLink}

Please let me know if you have any questions or if there are any issues with the invoice.

Best regards`,
    isDefault: false,
  },
  {
    name: 'Firm Reminder',
    subject: 'Important: Invoice {invoiceNumber} is now {daysOverdue} days overdue',
    body: `Dear {clientName},

This is an important notice regarding invoice {invoiceNumber} for {currency} {amount}.

The invoice was due on {dueDate} and is now {daysOverdue} days overdue.

Please arrange payment as soon as possible to avoid any service interruptions. You can pay via the link below:
{invoiceLink}

If you have already made the payment, please disregard this message and accept our apologies for the inconvenience.

If there are any issues preventing payment, please contact us immediately so we can work together to resolve them.

Thank you for your prompt attention to this matter.

Best regards`,
    isDefault: false,
  },
];

const DEFAULT_SCHEDULE = {
  name: 'Standard Follow-up',
  isActive: true,
  steps: [
    { dayOffset: 0, order: 0 }, // On due date
    { dayOffset: 3, order: 1 }, // 3 days after
    { dayOffset: 7, order: 2 }, // 1 week after
  ],
};

export async function seedDefaultTemplatesAndSchedule(userId: string) {
  try {
    // Create templates
    const templates = await Promise.all(
      DEFAULT_TEMPLATES.map((template) =>
        prisma.template.create({
          data: {
            ...template,
            userId,
          },
        })
      )
    );

    // Create schedule with steps
    const schedule = await prisma.schedule.create({
      data: {
        ...DEFAULT_SCHEDULE,
        userId,
        steps: {
          create: DEFAULT_SCHEDULE.steps.map((step, index) => ({
            dayOffset: step.dayOffset,
            order: step.order,
            templateId: templates[index % templates.length].id, // Rotate through templates
          })),
        },
      },
    });

    return {
      templates,
      schedule,
    };
  } catch (error) {
    console.error('Error seeding defaults:', error);
    throw error;
  }
}
