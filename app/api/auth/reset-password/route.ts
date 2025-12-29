import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { apiSuccess, apiError, commonErrors } from '@/lib/api-response';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Hash the token to query database
    const tokenHash = hashToken(token);

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Validate token
    if (!resetToken) {
      return NextResponse.json(
        apiError('Invalid or expired reset token'),
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        apiError('Reset token has expired. Please request a new password reset.'),
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (resetToken.usedAt) {
      return NextResponse.json(
        apiError('Reset token has already been used. Please request a new password reset.'),
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user password and mark token as used (transaction for atomicity)
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),

      // Mark token as used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),

      // Invalidate all existing sessions for this user (force re-login)
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    console.log(`[Password Reset] Password updated for user ${resetToken.user.email}`);

    return NextResponse.json(
      apiSuccess({
        message: 'Password has been reset successfully. You can now log in with your new password.',
      })
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        commonErrors.validation(error.errors),
        { status: 400 }
      );
    }

    console.error('[RESET_PASSWORD_ERROR]', error);
    return NextResponse.json(
      commonErrors.internal(),
      { status: 500 }
    );
  }
}
