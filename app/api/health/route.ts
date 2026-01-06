import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Health check endpoint for load balancers and monitoring
 * GET /api/health
 * 
 * Returns:
 * - 200: Service healthy
 * - 503: Service unhealthy (database disconnected)
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
      checks: {
        database: {
          status: 'connected',
          responseTime: `${responseTime}ms`,
        },
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('[HEALTH] Database check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
        checks: {
          database: {
            status: 'disconnected',
            responseTime: `${responseTime}ms`,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      { status: 503 }
    );
  }
}
