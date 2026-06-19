import { NextResponse } from 'next/server';

/** Health check para web (PRD/09 §9.6). */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'web',
    timestamp: new Date().toISOString(),
  });
}
