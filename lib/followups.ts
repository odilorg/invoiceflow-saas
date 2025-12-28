import { prisma } from './db';
import { Invoice } from '@prisma/client';
import { ensureDefaultSchedule } from './default-schedule';

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // Skip undefined/null values - leave placeholder or remove line
    if (value === undefined || value === null || value === '') {
      // Remove entire line if it contains only the placeholder
      const linePattern = new RegExp(`^.*\\{${key}\\}.*$`, 'gm');
      result = result.replace(linePattern, '');
      // Or replace with empty string
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), '');
    } else {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }
  // Clean up multiple consecutive blank lines
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result.trim();
}

export async function generateFollowUps(invoiceId: string, scheduleId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: true,
    },
  });

  if (!invoice || invoice.status !== 'PENDING') {
    return;
  }

  let schedule;

  if (scheduleId) {
    // Use specified schedule if provided
    schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: invoice.userId,
        isActive: true,
      },
      include: {
        steps: {
          include: {
            template: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  if (!schedule) {
    // Ensure a default schedule exists and use it
    schedule = await ensureDefaultSchedule(invoice.userId);

    // Fetch with steps included
    schedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
      include: {
        steps: {
          include: {
            template: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  if (!schedule || !schedule.steps || schedule.steps.length === 0) {
    console.error('No schedule or steps available for invoice:', invoiceId);
    return;
  }

  // Delete existing pending follow-ups
  await prisma.followUp.deleteMany({
    where: {
      invoiceId: invoice.id,
      status: 'PENDING',
    },
  });

  // Create new follow-ups based on schedule
  const followUps = schedule.steps.map((step) => {
    const scheduledDate = new Date(invoice.dueDate);
    scheduledDate.setDate(scheduledDate.getDate() + step.dayOffset);

    const variables = {
      clientName: invoice.clientName,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate.toLocaleDateString(),
      invoiceNumber: invoice.invoiceNumber,
      daysOverdue: step.dayOffset > 0 ? step.dayOffset.toString() : '0',
      invoiceLink: invoice.notes || '', // Use notes field as invoice link or add dedicated field
    };

    return {
      invoiceId: invoice.id,
      templateId: step.templateId,
      scheduledDate,
      subject: renderTemplate(step.template.subject, variables),
      body: renderTemplate(step.template.body, variables),
      status: 'PENDING' as const,
    };
  });

  await prisma.followUp.createMany({
    data: followUps,
  });
}

export async function regenerateFollowUpsForInvoice(invoiceId: string) {
  // Get the invoice's current scheduleId
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { scheduleId: true },
  });

  // Use the invoice's assigned schedule (or default if null)
  await generateFollowUps(invoiceId, invoice?.scheduleId || undefined);
}

export async function regenerateAllFollowUps(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PENDING',
    },
    select: {
      id: true,
      scheduleId: true,
    },
  });

  for (const invoice of invoices) {
    // Use each invoice's assigned schedule
    await generateFollowUps(invoice.id, invoice.scheduleId || undefined);
  }
}
