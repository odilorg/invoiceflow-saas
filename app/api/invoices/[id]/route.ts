import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { regenerateFollowUpsForInvoice } from '@/lib/followups';

const updateInvoiceSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  invoiceNumber: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(),  // Schedule ID (will be rejected in handler after creation)
  restartReminders: z.boolean().optional(),  // Whether to restart reminders after due date change
});

// GET single invoice
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update invoice
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // SAFETY CHECK: Paid invoices cannot be edited
    if (existingInvoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Paid invoices cannot be edited to maintain financial audit trail' },
        { status: 403 }
      );
    }

    // Compute how many reminders have been sent
    const followUpsSentCount = existingInvoice.followUps.length;

    // FIELD-LEVEL RESTRICTIONS based on reminder state
    const requestedFields = Object.keys(data).filter(f => f !== 'restartReminders');

    if (followUpsSentCount > 0) {
      // LIMITED EDIT MODE: Only notes and status allowed after reminders sent
      const allowedFields = ['notes', 'status'];
      const disallowedFields = requestedFields.filter(f => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        // Special error for scheduleId changes
        if (disallowedFields.includes('scheduleId')) {
          return NextResponse.json(
            {
              error: 'Cannot change schedule after reminders have been sent',
              details: `${followUpsSentCount} reminder(s) already sent. Schedule is locked to preserve audit trail.`,
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            error: `Cannot edit ${disallowedFields.join(', ')} after reminders have been sent`,
            details: `${followUpsSentCount} reminder(s) already sent. Only 'notes' and 'status' can be edited to preserve audit trail.`,
          },
          { status: 400 }
        );
      }
    }
    // If followUpsSentCount === 0, FULL EDIT MODE: all fields allowed including scheduleId

    const updateData: any = { ...data };
    delete updateData.restartReminders;  // Remove from data object as it's not a database field

    if (data.dueDate) {
      const newDueDate = new Date(data.dueDate);
      updateData.dueDate = newDueDate;

      // Check if due date changed and handle reminder restart
      if (existingInvoice.dueDate.getTime() !== newDueDate.getTime()) {
        const isOverdue = existingInvoice.status === 'PENDING' && existingInvoice.dueDate < new Date();
        const remindersCompleted = existingInvoice.remindersCompleted;

        if (data.restartReminders === true) {
          // User chose to restart reminders
          updateData.remindersEnabled = true;
          updateData.remindersBaseDueDate = newDueDate;
          updateData.remindersResetAt = new Date();
          updateData.remindersCompleted = false;
          updateData.remindersPausedReason = null;
        } else if (data.restartReminders === false && (isOverdue || remindersCompleted)) {
          // User chose NOT to restart for overdue/completed invoice
          updateData.remindersEnabled = false;
          updateData.remindersPausedReason = 'user_updated_date_no_restart';
        }
        // If restartReminders is undefined, keep existing behavior
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        followUps: {
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    // Regenerate follow-ups if reminders were restarted or status changed
    if (data.restartReminders === true || data.status) {
      await regenerateFollowUpsForInvoice(invoice.id);
    }

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
