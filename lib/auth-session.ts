import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'azulerp_session';
export const LEGACY_SESSION_COOKIE = 'verdeorto_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type SessionUser = {
  id: number;
  username: string;
  role: string;
  nom_complet?: string;
  email?: string;
  avatar?: string;
  statut?: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const payload = encode(JSON.stringify({ ...user, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function readSession(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(LEGACY_SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

export function readSessionToken(token?: string): SessionUser | null {
  if (!token) return null;

  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.id || !decoded.username || !decoded.role || decoded.exp < Date.now()) return null;
    return {
      id: Number(decoded.id),
      username: String(decoded.username),
      role: String(decoded.role),
      nom_complet: decoded.nom_complet ? String(decoded.nom_complet) : undefined,
      email: decoded.email ? String(decoded.email) : undefined,
      avatar: decoded.avatar ? String(decoded.avatar) : undefined,
      statut: decoded.statut === undefined ? undefined : Number(decoded.statut),
    };
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ success: false, error: 'Authentification requise.' }, { status: 401 });
}

export function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(LEGACY_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
