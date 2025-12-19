/**
 * GET /api/auth-callback
 *
 * Handles Google OAuth callback, creates session token
 */

import type { Handler } from '@netlify/functions';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';

const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SESSION_SECRET = process.env.SESSION_SECRET!;
const REDIRECT_URI = `${SITE_URL}/.netlify/functions/auth-callback`;
const ALLOWED_DOMAIN = 'zenlytic.com';

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const error = event.queryStringParameters?.error;

  if (error) {
    return {
      statusCode: 302,
      headers: {
        Location: `${SITE_URL}?error=${encodeURIComponent(error)}`,
      },
      body: '',
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing authorization code' }),
    };
  }

  try {
    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Verify the ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    const { email, name, picture, hd } = payload;

    // Verify domain
    if (hd !== ALLOWED_DOMAIN) {
      return {
        statusCode: 302,
        headers: {
          Location: `${SITE_URL}?error=${encodeURIComponent('Access restricted to Zenlytic employees')}`,
        },
        body: '',
      };
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        email,
        name,
        picture,
        domain: hd,
      },
      SESSION_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie and redirect to app
    return {
      statusCode: 302,
      headers: {
        Location: SITE_URL,
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
      },
      body: '',
    };
  } catch (err) {
    console.error('Auth callback error:', err);
    return {
      statusCode: 302,
      headers: {
        Location: `${SITE_URL}?error=${encodeURIComponent('Authentication failed')}`,
      },
      body: '',
    };
  }
};
