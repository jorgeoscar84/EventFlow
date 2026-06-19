import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PlanLimitError } from '@eventflow/db';
import { AuthError } from './auth';

/** Respuestas JSON consistentes (PRD/06 §6.1). */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Envuelve un handler traduciendo errores comunes a respuestas HTTP. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    if (e instanceof AuthError) return fail(e.status, e.code, e.message);
    if (e instanceof PlanLimitError) return fail(402, 'PLAN_LIMIT', e.message);
    if (e instanceof ZodError) return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', e.flatten());
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return fail(409, 'CONFLICT', 'El recurso ya existe');
    }
    console.error('[api] error no controlado:', e);
    return fail(500, 'INTERNAL', 'Error interno');
  });
}
