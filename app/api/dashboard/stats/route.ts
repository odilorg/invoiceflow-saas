import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const [
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      totalFollowUpsSent,
      upcomingFollowUps,
    ] = await Promise.all([
      prisma.invoice.count({
        where: { userId: user.id },
      }),
      prisma.invoice.count({
        where: {
          userId: user.id,
          status: 'PENDING',
        },
      }),
      prisma.invoice.count({
        where: {
          userId: user.id,
          status: 'PAID',
        },
      }),
      prisma.invoice.count({
        where: {
          userId: user.id,
          status: 'OVERDUE',
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'SENT',
          invoice: {
            userId: user.id,
          },
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledDate: {
            gte: new Date(),
          },
          invoice: {
            userId: user.id,
            status: 'PENDING',
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      totalFollowUpsSent,
      upcomingFollowUps,
      planStatus: user.planStatus,
    });
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
