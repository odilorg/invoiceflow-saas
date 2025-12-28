import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { checkRateLimit, authRateLimit } from '@/lib/rate-limit';
import { apiSuccess, commonErrors } from '@/lib/api-response';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Rate limiting - CRITICAL to prevent email spam
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `forgot-password:${clientIP}:${email}`;
    const rateCheck = await checkRateLimit(authRateLimit, identifier);

    if (!rateCheck.success) {
      return NextResponse.json(
        commonErrors.rateLimit(rateCheck.reset),
        { status: 429 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // In production, you would send an email here
    if (user) {
      // Generate a reset token (in production, save this to DB)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // In a full implementation, you would:
      // 1. Save the resetToken and resetTokenExpiry to the user record
      // 2. Send an email with a reset link containing the token
      // 3. Create a reset page that accepts the token

      console.log(`[Password Reset] Token generated for ${email}: ${resetToken}`);

      // For now, just log it (in production, send email via Brevo)
      // await sendPasswordResetEmail(email, resetToken);
    }

    // Always return success to prevent email enumeration
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