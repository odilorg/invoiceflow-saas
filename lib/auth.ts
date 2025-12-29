import { cookies } from 'next/headers';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

const SESSION_COOKIE = 'session_token';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Custom error for unauthorized access.
 * API routes should catch this and return 401.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Hash a plain token to store in database.
 * Uses SHA-256 for deterministic lookups.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a new session for the user.
 * Generates a cryptographically secure token (64 hex chars).
 * Stores tokenHash in database, returns plaintext token for cookie.
 */
export async function createSession(userId: string): Promise<string> {
  // Generate secure random token (32 bytes = 64 hex chars)
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Set cookie with plaintext token (client needs this for subsequent requests)
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // See docs/AUTH_SECURITY.md for CSRF considerations
    expires: expiresAt,
    path: '/',
  });

  return token;
}

/**
 * Retrieves the current session.
 * - Hashes cookie token to query database
 * - Excludes revoked sessions (if revokedAt is set)
 * - Clears cookie and deletes expired/invalid sessions automatically
 * - Returns minimal user fields (id, email, name) to reduce exposure
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  // Query by tokenHash, exclude revoked sessions, select minimal user fields
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          planStatus: true,
        },
      },
    },
  });

  // Session missing, expired, or revoked - clean up
  if (!session || session.expiresAt < new Date() || session.revokedAt) {
    // Clear cookie
    cookieStore.delete(SESSION_COOKIE);

    // Best-effort delete session from DB (don't throw if already deleted)
    if (session?.id) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }

    return null;
  }

  return session;
}

/**
 * Returns the current authenticated user or null.
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Requires an authenticated user.
 * Throws UnauthorizedError if no user (API routes should catch and return 401).
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Deletes the current session and clears cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Revokes a session by ID (soft delete - sets revokedAt timestamp).
 * Useful for "logout from all devices" or admin session termination.
 */
export async function revokeSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
