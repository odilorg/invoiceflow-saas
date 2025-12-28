import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Get the current build version from BUILD_ID or fallback to timestamp
 */
export function getCurrentBuildId(): string {
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      return fs.readFileSync(buildIdPath, 'utf8').trim();
    }
  } catch (error) {
    // Ignore errors
  }
  return process.env.BUILD_VERSION || `v${Date.now()}`;
}

/**
 * Check if the client build ID matches the server build ID for critical APIs
 * Returns a 409 response if mismatch detected on critical endpoints
 */
export function checkApiVersionCompatibility(
  req: NextRequest,
  options?: {
    enforceFor?: string[]; // List of critical API paths that require version match
    warnOnly?: boolean; // If true, only add warning header instead of returning 409
  }
): NextResponse | null {
  const path = req.nextUrl.pathname;
  const clientBuildId = req.headers.get('X-Client-Build-Id');
  const serverBuildId = getCurrentBuildId();

  // Default critical endpoints that must have matching versions
  const defaultCriticalPaths = [
    '/api/schedules',
    '/api/templates',
    '/api/invoices',
  ];

  const criticalPaths = options?.enforceFor || defaultCriticalPaths;

  // Check if current path is critical
  const isCriticalPath = criticalPaths.some(criticalPath =>
    path.startsWith(criticalPath)
  );

  if (!isCriticalPath) {
    return null; // No version check needed
  }

  // Skip version check if client didn't send build ID (backwards compatibility)
  if (!clientBuildId || clientBuildId === 'unknown') {
    return null;
  }

  // Check for version mismatch
  if (clientBuildId !== serverBuildId) {
    if (options?.warnOnly) {
      // Only add warning header
      return null;
    }

    // Return 409 Conflict with upgrade message
    return NextResponse.json(
      {
        error: 'Version mismatch detected',
        message: 'A new version is available. Please refresh the page to get the latest updates.',
        clientVersion: clientBuildId,
        serverVersion: serverBuildId,
        code: 'UPGRADE_REQUIRED',
      },
      {
        status: 409,
        headers: {
          'X-Server-Build-Id': serverBuildId,
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return null; // Versions match, proceed normally
}

/**
 * Wrapper to apply version checking to API route handlers
 */
export function withVersionCheck(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options?: {
    enforceFor?: string[];
    warnOnly?: boolean;
  }
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Check version compatibility
    const versionError = checkApiVersionCompatibility(req, options);
    if (versionError) {
      return versionError;
    }

    // Call the original handler
    const response = await handler(req, context);

    // Add server build ID to response headers
    response.headers.set('X-Server-Build-Id', getCurrentBuildId());

    return response;
  };
}