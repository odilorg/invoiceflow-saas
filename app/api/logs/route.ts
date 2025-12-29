import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';
import { timeQuery } from '@/lib/performance'; // TEMPORARY: For baseline measurement

// GET all email logs for current user's invoices
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // TEMPORARY: Measure performance
    const logs = await timeQuery(
      'GET /api/logs',
      'findMany with nested relations (optimized)',
      () => prisma.emailLog.findMany({
        where: {
          followUp: {
            invoice: {
              userId: user.id,
            },
          },
        },
        select: {
          id: true,
          recipientEmail: true,
          subject: true,
          sentAt: true,
          success: true,
          errorMessage: true,
          followUp: {
            select: {
              id: true,
              invoice: {
                select: {
                  invoiceNumber: true,
                  clientName: true,
                },
              },
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      })
    );

    return NextResponse.json(logs);
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
