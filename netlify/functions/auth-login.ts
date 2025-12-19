/**
 * GET /api/auth-login
 *
 * Redirects to Google OAuth login
 */

import type { Handler } from '@netlify/functions';
import { OAuth2Client } from 'google-auth-library';

const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = `${SITE_URL}/.netlify/functions/auth-callback`;

export const handler: Handler = async () => {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    hd: 'zenlytic.com', // Restrict to Zenlytic domain
    prompt: 'select_account',
  });

  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
    },
    body: '',
  };
};
