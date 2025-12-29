import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // PHASE 4: Consolidate 6 count queries into 2 aggregated queries
    const [invoiceStats, followUpStats] = await Promise.all([
      // Single query to get all invoice counts by status
      prisma.invoice.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: {
          id: true,
        },
      }),
      // Single query to get followUp counts by status
      prisma.followUp.groupBy({
        by: ['status'],
        where: {
          invoice: {
            userId: user.id,
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Build invoice counts from aggregated data
    let totalInvoices = 0;
    let pendingInvoices = 0;
    let paidInvoices = 0;
    let overdueInvoices = 0;

    for (const stat of invoiceStats) {
      const count = stat._count.id;
      totalInvoices += count;

      switch (stat.status) {
        case 'PENDING':
          pendingInvoices = count;
          break;
        case 'PAID':
          paidInvoices = count;
          break;
        case 'OVERDUE':
          overdueInvoices = count;
          break;
      }
    }

    // Build followUp counts from aggregated data
    const totalFollowUpsSent = followUpStats.find(s => s.status === 'SENT')?._count.id || 0;

    // Upcoming followUps still needs a separate query due to date filter + status filter
    // But now we only do 3 queries total instead of 6
    const upcomingFollowUps = await prisma.followUp.count({
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
    });

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
