import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession, loginSchema } from '@/lib/auth';
import { checkRateLimit, authRateLimit } from '@/lib/rate-limit';
import { apiSuccess, apiError, commonErrors } from '@/lib/api-response';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

/**
 * Extract client IP from request headers
 * Handles proxy scenarios (x-forwarded-for, x-real-ip)
 */
function getClientIp(req: NextRequest): string {
  // Check x-forwarded-for (standard proxy header)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP in comma-separated list (original client IP)
    return forwardedFor.split(',')[0].trim();
  }

  // Check x-real-ip (alternative proxy header)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown';
}

/**
 * Dummy hash for timing-safe password comparison when user not found
 * Pre-computed bcrypt hash to match timing of real password verification
 */
const DUMMY_PASSWORD_HASH = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Normalize email (lowercase + trim)
    const emailNormalized = email.toLowerCase().trim();

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // DUAL RATE LIMITING:
    // 1. Per-IP: Prevent single attacker from brute-forcing many emails
    // 2. Per-IP+Email: Prevent attacker from DoS-ing specific victim email
    const ipIdentifier = `login-ip:${clientIp}`;
    const ipEmailIdentifier = `login:${clientIp}:${emailNormalized}`;

    // Check per-IP rate limit (global protection)
    const ipRateCheck = await checkRateLimit(authRateLimit, ipIdentifier);
    if (!ipRateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(ipRateCheck.reset),
        { status: 429 }
      );
    }

    // Check per-IP+Email rate limit (targeted protection)
    const ipEmailRateCheck = await checkRateLimit(authRateLimit, ipEmailIdentifier);
    if (!ipEmailRateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(ipEmailRateCheck.reset),
        { status: 429 }
      );
    }

    // Find user with normalized email
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    // TIMING-SAFE PASSWORD VERIFICATION
    // Always run bcrypt compare (even if user not found) to prevent timing attacks
    let isValidPassword = false;
    if (user) {
      isValidPassword = await verifyPassword(password, user.passwordHash);
    } else {
      // User not found - run dummy bcrypt to match timing of real verification
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    }

    // Check credentials (same error message for user-not-found vs wrong-password)
    if (!user || !isValidPassword) {
      return NextResponse.json(
        apiError('Invalid credentials'),
        { status: 401 }
      );
    }

    // Create session (sets httpOnly cookie with secure token)
    await createSession(user.id);

    // Return minimal user data (avoid leaking sensitive fields)
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
    // Log error without sensitive data (no password, no request body)
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      commonErrors.internal(),
      { status: 500 }
    );
  }
}
