import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { checkRateLimit, authRateLimit } from '@/lib/rate-limit';
import { apiSuccess, commonErrors } from '@/lib/api-response';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Extract client IP from request headers
 */
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Normalize email
    const emailNormalized = email.toLowerCase().trim();

    // Rate limiting - CRITICAL to prevent email spam
    const clientIp = getClientIp(req);
    const identifier = `forgot-password:${clientIp}:${emailNormalized}`;
    const rateCheck = await checkRateLimit(authRateLimit, identifier);

    if (!rateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(rateCheck.reset),
        { status: 429 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (user) {
      // Generate secure reset token (32 bytes = 64 hex chars)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Delete any existing unused reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null, // Only delete unused tokens
        },
      });

      // Create new reset token in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Get base URL for reset link (use APP_URL in production, fallback to request headers)
      const baseUrl = process.env.APP_URL ||
        `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host') || 'localhost:3005'}`;

      // Send reset email (or log in dev mode)
      await sendPasswordResetEmail(emailNormalized, resetToken, baseUrl);

      console.log(`[Password Reset] Token generated for ${emailNormalized}`);
      console.log(`[Password Reset] Reset URL: ${baseUrl}/reset-password?token=${resetToken}`);
    }

    // ALWAYS return success to prevent email enumeration
    // (same response whether user exists or not)
    return NextResponse.json(
      apiSuccess({
        message: 'If an account exists with this email, password reset instructions have been sent.',
      })
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        commonErrors.validation(error.errors),
        { status: 400 }
      );
    }

    console.error('[FORGOT_PASSWORD_ERROR]', error);
    return NextResponse.json(
      commonErrors.internal(),
      { status: 500 }
    );
  }
}
