import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Tokens firmados (HMAC) para QR de check-in y enlaces de confirmación.
 * PRD/06 §6.4, PRD/09 §9.1. Formato: base64url(payload).base64url(signature).
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no configurado');
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export interface TokenPayload {
  rid: string; // registrationId
  eid: string; // eventId
  kind: 'qr' | 'confirm';
  exp?: number; // epoch ms
  nonce: string;
}

export function signToken(data: Omit<TokenPayload, 'nonce'>): string {
  const payload: TokenPayload = { ...data, nonce: randomBytes(8).toString('hex') };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];

  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
