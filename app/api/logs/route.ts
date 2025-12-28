import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

// GET all email logs for current user's invoices
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const logs = await prisma.emailLog.findMany({
      where: {
        followUp: {
          invoice: {
            userId: user.id,
          },
        },
      },
      include: {
        followUp: {
          include: {
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
    });

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
