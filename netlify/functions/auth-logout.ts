/**
 * GET /api/auth-logout
 *
 * Clears session cookie and redirects to home
 */

import type { Handler } from '@netlify/functions';

const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';

export const handler: Handler = async () => {
  return {
    statusCode: 302,
    headers: {
      Location: SITE_URL,
      'Set-Cookie': `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
    body: '',
  };
};
