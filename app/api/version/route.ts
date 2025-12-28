import { NextRequest, NextResponse } from 'next/server';
import { getCurrentBuildId } from '@/lib/api-version-check';

export async function GET(req: NextRequest) {
  const clientBuildId = req.headers.get('X-Client-Build-Id');
  const serverBuildId = getCurrentBuildId();

  // Always return fresh version (no cache)
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Server-Build-Id': serverBuildId,
  };

  return NextResponse.json(
    {
      version: serverBuildId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      clientVersion: clientBuildId || 'unknown',
      updateAvailable: clientBuildId && clientBuildId !== serverBuildId && clientBuildId !== 'unknown',
    },
    { headers }
  );
}