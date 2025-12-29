import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/api-error-handler';
import { getUsageStats } from '@/lib/billing/subscription-service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const usage = await getUsageStats(user.id);

    return NextResponse.json(usage);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}