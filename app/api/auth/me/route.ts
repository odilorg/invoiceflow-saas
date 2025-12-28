import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get subscription data if it exists
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      renewsAt: true,
      endsAt: true,
      isActive: true,
      providerPlan: true,
    },
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    planStatus: user.planStatus,
    subscription: subscription || undefined,
  });
}
