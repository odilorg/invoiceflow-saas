import { prisma } from './db';
import { Invoice } from '@prisma/client';
import { ensureDefaultSchedule } from './default-schedule';

/**
 * Add days to a date using UTC to avoid timezone/DST drift
 */
function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  // Normalize to midnight UTC to ensure consistent date math
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Format amount with currency using Intl.NumberFormat for consistency
 */
function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format date consistently (avoid locale drift)
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null || value === '') {
      // Only remove line if it contains ONLY the placeholder (ignoring whitespace)
      const placeholderOnly = new RegExp(`^\\s*\\{${key}\\}\\s*$`, 'gm');
      result = result.replace(placeholderOnly, '');

      // Otherwise, just replace placeholder with empty string
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

  // SAFETY FIX: Use invoice.scheduleId if no scheduleId provided
  const effectiveScheduleId = scheduleId ?? invoice.scheduleId ?? undefined;

  if (effectiveScheduleId) {
    // Use specified or invoice's assigned schedule
    schedule = await prisma.schedule.findFirst({
      where: {
        id: effectiveScheduleId,
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
    // Only fall back to default if no schedule found
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
    // TIMEZONE-SAFE: Use UTC date math to avoid DST drift
    const scheduledDate = addDaysUTC(invoice.dueDate, step.dayOffset);

    // NORMALIZED FORMATTING: Use Intl formatters for consistency
    const variables = {
      clientName: invoice.clientName,
      amount: formatAmount(invoice.amount, invoice.currency),
      currency: invoice.currency,
      dueDate: formatDate(invoice.dueDate),
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
