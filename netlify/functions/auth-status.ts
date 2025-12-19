/**
 * GET /api/auth-status
 *
 * Returns current user info if logged in
 */

import type { Handler } from '@netlify/functions';
import * as jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET!;

const headers = {
  'Content-Type': 'application/json',
};

interface SessionPayload {
  email: string;
  name: string;
  picture: string;
  domain: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
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

export const handler: Handler = async (event) => {
  const cookies = parseCookies(event.headers.cookie);
  const sessionToken = cookies.session;

  if (!sessionToken) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ authenticated: false }),
    };
  }

  try {
    const payload = jwt.verify(sessionToken, SESSION_SECRET) as SessionPayload;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authenticated: true,
        user: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        },
      }),
    };
  } catch {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ authenticated: false }),
    };
  }
};
