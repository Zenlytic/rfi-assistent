/**
 * Auth utilities for protecting routes
 */

import * as jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export interface User {
  email: string;
  name: string;
  picture: string;
  domain: string;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

export function verifySession(cookieHeader: string | undefined): User | null {
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies.session;

  if (!sessionToken) {
    return null;
  }

  try {
    const payload = jwt.verify(sessionToken, SESSION_SECRET) as User;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(cookieHeader: string | undefined): { user: User } | { error: { statusCode: number; body: string } } {
  const user = verifySession(cookieHeader);

  if (!user) {
    return {
      error: {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - please log in' }),
      },
    };
  }

  return { user };
}
