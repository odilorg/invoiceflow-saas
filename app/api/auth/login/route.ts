import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession, loginSchema } from '@/lib/auth';
import { checkRateLimit, authRateLimit } from '@/lib/rate-limit';
import { apiSuccess, apiError, commonErrors } from '@/lib/api-response';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Rate limiting - 10 attempts per minute per email
    const identifier = `login:${email.toLowerCase()}`;
    const rateCheck = await checkRateLimit(authRateLimit, identifier);

    if (!rateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(rateCheck.reset),
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        apiError('Invalid credentials'),
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        apiError('Invalid credentials'),
        { status: 401 }
      );
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json(
      apiSuccess({ user: { id: user.id, email: user.email, name: user.name } })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        commonErrors.validation(error.errors),
        { status: 400 }
      );
    }
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      commonErrors.internal(),
      { status: 500 }
    );
  }
}
