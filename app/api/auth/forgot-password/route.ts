import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

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
    return NextResponse.json({
      message: 'If an account exists with this email, password reset instructions have been sent.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}