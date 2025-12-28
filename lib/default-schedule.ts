import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Default template definitions
 */
const DEFAULT_TEMPLATES = [
  {
    name: 'Friendly Reminder',
    subject: 'Reminder: Invoice {invoiceNumber} is due',
    body: `Hi {clientName},

This is a friendly reminder that invoice {invoiceNumber} for {currency}{amount} is due today ({dueDate}).

Please let us know if you have any questions or if payment has already been sent.

Thank you for your business!

Best regards`,
    isDefault: true,
  },
  {
    name: 'Neutral Follow-up',
    subject: 'Follow-up: Invoice {invoiceNumber} is overdue',
    body: `Hi {clientName},

We wanted to follow up regarding invoice {invoiceNumber} for {currency}{amount}, which is now {daysOverdue} days overdue.

The invoice was due on {dueDate}. We would appreciate prompt payment to avoid any service interruptions.

If you have already sent payment, please disregard this message. Otherwise, please let us know when we can expect payment.

Thank you for your attention to this matter.`,
    isDefault: false,
  },
  {
    name: 'Firm Reminder',
    subject: 'Final reminder: Invoice {invoiceNumber} is past due',
    body: `Dear {clientName},

This is a final reminder that invoice {invoiceNumber} for {currency}{amount} is now {daysOverdue} days past due.

The original due date was {dueDate}. Immediate payment is required to avoid late fees and potential service suspension.

Please remit payment immediately or contact us to discuss this matter.

This is an automated reminder. If payment has been sent, please provide confirmation.

Regards`,
    isDefault: false,
  },
];

/**
 * Ensures default templates exist for a user
 * Creates missing templates only, doesn't overwrite existing ones
 */
export async function ensureDefaultTemplates(userId: string) {
  try {
    // Check which templates already exist
    const existingTemplates = await prisma.template.findMany({
      where: { userId },
      select: { name: true, isDefault: true },
    });

    const existingNames = new Set(existingTemplates.map(t => t.name));
    const hasDefault = existingTemplates.some(t => t.isDefault);

    // Create missing templates
    const templatesToCreate = DEFAULT_TEMPLATES.filter(
      template => !existingNames.has(template.name)
    );

    if (templatesToCreate.length > 0) {
      // If no default template exists, make the first one default
      const templates = templatesToCreate.map((template, index) => ({
        ...template,
        userId,
        // Only set first as default if no default exists
        isDefault: !hasDefault && index === 0 ? true : template.isDefault,
      }));

      await prisma.template.createMany({
        data: templates,
      });
    }

    // Return all template IDs for the user
    const allTemplates = await prisma.template.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    return allTemplates;
  } catch (error) {
    console.error('Error ensuring default templates:', error);
    throw error;
  }
}

/**
 * Ensures a default schedule exists for a user
 * Creates one if missing, fixes multiple defaults if they exist
 */
export async function ensureDefaultSchedule(userId: string) {
  try {
    // Start a transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // Check for existing schedules
      const schedules = await tx.schedule.findMany({
        where: { userId },
        include: { steps: true },
        orderBy: { updatedAt: 'desc' },
      });

      const defaultSchedules = schedules.filter(s => s.isDefault);

      // Case 1: No schedules at all
      if (schedules.length === 0) {
        return await createDefaultSchedule(tx, userId);
      }

      // Case 2: No default schedule
      if (defaultSchedules.length === 0) {
        // Make the most recently updated active schedule the default
        const activeSchedule = schedules.find(s => s.isActive);
        if (activeSchedule) {
          await tx.schedule.update({
            where: { id: activeSchedule.id },
            data: { isDefault: true },
          });
          return activeSchedule;
        }
        // No active schedules, create a new default
        return await createDefaultSchedule(tx, userId);
      }

      // Case 3: Multiple defaults (bad state, fix it)
      if (defaultSchedules.length > 1) {
        // Keep the most recently updated as default
        const [keepDefault, ...removeDefaults] = defaultSchedules;

        await tx.schedule.updateMany({
          where: {
            id: { in: removeDefaults.map(s => s.id) },
          },
          data: { isDefault: false },
        });

        return keepDefault;
      }

      // Case 4: Exactly one default exists (good state)
      return defaultSchedules[0];
    });
  } catch (error) {
    console.error('Error ensuring default schedule:', error);
    throw error;
  }
}

/**
 * Creates the standard payment reminder schedule
 */
async function createDefaultSchedule(
  tx: Prisma.TransactionClient,
  userId: string
) {
  // Ensure templates exist first
  const templates = await ensureDefaultTemplates(userId);

  // Map template names to IDs
  const templateMap = new Map(templates.map(t => [t.name, t.id]));

  const friendlyId = templateMap.get('Friendly Reminder');
  const neutralId = templateMap.get('Neutral Follow-up');
  const firmId = templateMap.get('Firm Reminder');

  if (!friendlyId || !neutralId || !firmId) {
    throw new Error('Failed to create default templates');
  }

  // Create the schedule with steps
  const schedule = await tx.schedule.create({
    data: {
      userId,
      name: 'Standard Payment Reminder',
      isActive: true,
      isDefault: true,
      steps: {
        create: [
          {
            templateId: friendlyId,
            dayOffset: 0, // On due date
            order: 1,
          },
          {
            templateId: neutralId,
            dayOffset: 3, // 3 days after due date
            order: 2,
          },
          {
            templateId: firmId,
            dayOffset: 7, // 7 days after due date
            order: 3,
          },
        ],
      },
    },
    include: {
      steps: true,
    },
  });

  return schedule;
}

/**
 * Sets a schedule as default and unsets others
 */
export async function setScheduleAsDefault(scheduleId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Verify the schedule belongs to the user and is active
    const schedule = await tx.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.isActive) {
      throw new Error('Cannot set inactive schedule as default');
    }

    // Unset all other defaults for this user
    await tx.schedule.updateMany({
      where: {
        userId,
        isDefault: true,
        id: { not: scheduleId },
      },
      data: { isDefault: false },
    });

    // Set this schedule as default
    const updated = await tx.schedule.update({
      where: { id: scheduleId },
      data: { isDefault: true },
    });

    return updated;
  });
}

/**
 * Validates that a user always has at least one default schedule
 */
export async function validateDefaultSchedule(userId: string): Promise<boolean> {
  const defaultSchedule = await prisma.schedule.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });

  return defaultSchedule !== null;
}

/**
 * Gets the default schedule for a user
 */
export async function getDefaultSchedule(userId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    include: {
      steps: {
        include: {
          template: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  // If no default exists, create one
  if (!schedule) {
    return await ensureDefaultSchedule(userId);
  }

  return schedule;
}

/**
 * Check if a schedule can be deleted
 */
export async function canDeleteSchedule(userId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!schedule) {
    return { canDelete: false, reason: 'Schedule not found' };
  }

  if (schedule.isDefault) {
    // Check if there are other schedules available
    const otherSchedules = await prisma.schedule.count({
      where: {
        userId,
        id: { not: scheduleId },
      },
    });

    if (otherSchedules === 0) {
      return {
        canDelete: false,
        reason: 'Cannot delete the only schedule. This is your default schedule.',
      };
    }

    return {
      canDelete: false,
      reason: 'Cannot delete the default schedule. Set another schedule as default first.',
    };
  }

  return { canDelete: true };
}

/**
 * Check if a schedule can be deactivated
 */
export async function canDeactivateSchedule(userId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!schedule) {
    return { canDeactivate: false, reason: 'Schedule not found' };
  }

  if (schedule.isDefault) {
    return {
      canDeactivate: false,
      reason: 'You must have at least one active default schedule. Set another schedule as default first.',
    };
  }

  return { canDeactivate: true };
}