import { NextRequest, NextResponse } from 'next/server';
import { UnauthorizedError } from './auth';

/**
 * Centralized error handler for API routes.
 * Catches UnauthorizedError and returns 401, all other errors return 500.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Log unexpected errors for debugging
  console.error('API Error:', error);

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Wrapper for async API route handlers.
 * Automatically catches errors and returns appropriate HTTP status codes.
 *
 * Usage:
 * export const GET = withErrorHandler(async (request) => {
 *   const user = await requireUser(); // Throws UnauthorizedError if not logged in
 *   return NextResponse.json({ user });
 * });
 */
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
