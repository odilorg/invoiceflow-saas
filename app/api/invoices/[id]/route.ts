import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { regenerateFollowUpsForInvoice } from '@/lib/followups';
import {
  validateInvoiceOwnership,
  canEditInvoice,
  getAllowedUpdateFields,
  validateInvoiceUpdateRules,
  computeReminderRestart,
} from '@/lib/invoice-validation';

const updateInvoiceSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  invoiceNumber: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(),
  restartReminders: z.boolean().optional(), // REQUIRED when dueDate changes
});

// GET single invoice
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { id } = params;

    // PHASE 4: Fetch with includes in one query instead of validate + fetch
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        followUps: {
          orderBy: { scheduledDate: 'asc' },
          include: {
            logs: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === 'INVOICE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update invoice
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { id } = params;
    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

    // 1. Validate ownership
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        followUps: {
          where: { status: 'SENT' },
        },
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // 2. Check if invoice can be edited
    if (!canEditInvoice(existingInvoice)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Paid invoices cannot be edited to maintain financial audit trail',
        },
        { status: 400 }
      );
    }

    // 3. Validate domain rules (scheduleId ownership, amount > 0)
    const domainValidation = await validateInvoiceUpdateRules(user.id, data);
    if (!domainValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: domainValidation.error,
        },
        { status: 400 }
      );
    }

    // 4. Check field-level restrictions based on sent reminders
    const followUpsSentCount = existingInvoice.followUps.length;
    const { allowed, isRestricted } = getAllowedUpdateFields(
      existingInvoice,
      followUpsSentCount
    );

    const requestedFields = Object.keys(data).filter(
      (f) => f !== 'restartReminders'
    );
    const disallowedFields = requestedFields.filter((f) => !allowed.includes(f));

    if (isRestricted && disallowedFields.length > 0) {
      if (disallowedFields.includes('scheduleId')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot change schedule after reminders have been sent',
            details: `${followUpsSentCount} reminder(s) already sent. Schedule is locked to preserve audit trail.`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Cannot edit ${disallowedFields.join(', ')} after reminders have been sent`,
          details: `${followUpsSentCount} reminder(s) already sent. Only 'notes' and 'status' can be edited to preserve audit trail.`,
        },
        { status: 400 }
      );
    }

    // 5. Build update data
    const updateData: any = { ...data };
    delete updateData.restartReminders;

    let shouldRegenerateFollowUps = false;

    if (data.dueDate) {
      const newDueDate = new Date(data.dueDate);
      updateData.dueDate = newDueDate;

      const dueDateChanged =
        existingInvoice.dueDate.getTime() !== newDueDate.getTime();

      if (dueDateChanged) {
        const isOverdue =
          existingInvoice.status === 'PENDING' &&
          existingInvoice.dueDate < new Date();
        const remindersCompleted = existingInvoice.remindersCompleted;

        const restartResult = computeReminderRestart(
          data.restartReminders,
          dueDateChanged,
          isOverdue,
          remindersCompleted
        );

        if (restartResult.error) {
          return NextResponse.json(
            {
              success: false,
              error: restartResult.error,
            },
            { status: 400 }
          );
        }

        shouldRegenerateFollowUps = restartResult.shouldRegenerate;
        Object.assign(updateData, restartResult.updateFields);

        if (restartResult.updateFields.remindersBaseDueDate === undefined) {
          updateData.remindersBaseDueDate = newDueDate;
        }
      }
    }

    // 6. Update invoice
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        followUps: {
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    // 7. Regenerate follow-ups if needed
    if (shouldRegenerateFollowUps || data.status) {
      await regenerateFollowUpsForInvoice(invoice.id);
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { id } = params;

    // Validate ownership
    await validateInvoiceOwnership(id, user.id);

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === 'INVOICE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
