import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createSession, registerSchema } from '@/lib/auth';
import { seedDefaultTemplatesAndSchedule } from '@/lib/seed-defaults';
import { checkRateLimit, authRateLimit } from '@/lib/rate-limit';
import { apiSuccess, apiError, commonErrors } from '@/lib/api-response';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    // Rate limiting - 10 attempts per minute (prevents spam signups)
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `register:${clientIP}`;
    const rateCheck = await checkRateLimit(authRateLimit, identifier);

    if (!rateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(rateCheck.reset),
        { status: 429 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        apiError('User already exists'),
        { status: 400 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Seed default templates and schedule
    try {
      await seedDefaultTemplatesAndSchedule(user.id);
    } catch (seedError) {
      console.error('[SEED_ERROR]', user.id, seedError);
      // Don't fail registration if seeding fails
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json(
      apiSuccess({ user: { id: user.id, email: user.email, name: user.name } }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        commonErrors.validation(error.errors),
        { status: 400 }
      );
    }
    console.error('[REGISTER_ERROR]', error);
    return NextResponse.json(
      commonErrors.internal(),
      { status: 500 }
    );
  }
}
