/**
 * POST /api/ask
 * 
 * Ask a single question, returns response with citations.
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { askQuestion } from './_shared/claude.js';
import { requireAuth } from './_shared/auth.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Require authentication
  const authResult = requireAuth(event.headers.cookie);
  if ('error' in authResult) {
    return {
      statusCode: authResult.error.statusCode,
      headers,
      body: authResult.error.body,
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { question, context: questionContext } = body;

    if (!question || typeof question !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Question is required' }),
      };
    }

    console.log('Processing question:', question.slice(0, 100));

    const result = await askQuestion(question, questionContext);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error in /api/ask:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process question',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
