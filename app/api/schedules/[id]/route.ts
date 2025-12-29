import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';
import { regenerateAllFollowUps } from '@/lib/followups';
import { canDeleteSchedule, canDeactivateSchedule, setScheduleAsDefault } from '@/lib/default-schedule';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  steps: z
    .array(
      z.object({
        templateId: z.string(),
        dayOffset: z.number(),
        order: z.number(),
      })
    )
    .optional(),
});

// GET single schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        userId: user.id,
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

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
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

// PATCH update schedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const data = updateScheduleSchema.parse(body);

    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Handle setting as default
    if (data.isDefault === true && !existingSchedule.isDefault) {
      await setScheduleAsDefault(id, user.id);
    }

    // Check if trying to deactivate default schedule
    if (data.isActive === false && existingSchedule.isDefault) {
      const canDeactivate = await canDeactivateSchedule(user.id, id);
      if (!canDeactivate.canDeactivate) {
        return NextResponse.json(
          { error: canDeactivate.reason },
          { status: 400 }
        );
      }
    }

    // If steps are provided, delete old ones and create new ones
    if (data.steps) {
      await prisma.scheduleStep.deleteMany({
        where: { scheduleId: id },
      });
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.isActive,
        isDefault: data.isDefault,
        ...(data.steps && {
          steps: {
            create: data.steps,
          },
        }),
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

    // Regenerate follow-ups for pending invoices
    if (data.steps || data.isActive !== undefined) {
      await regenerateAllFollowUps(user.id);
    }

    return NextResponse.json(schedule);
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

// DELETE schedule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Check if schedule can be deleted
    const canDelete = await canDeleteSchedule(user.id, id);
    if (!canDelete.canDelete) {
      return NextResponse.json(
        { error: canDelete.reason },
        { status: 400 }
      );
    }

    await prisma.schedule.delete({
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
