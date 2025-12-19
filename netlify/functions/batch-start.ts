/**
 * POST /api/batch-start
 *
 * Starts a batch processing job. Returns immediately with a job ID.
 * The actual processing happens in the background function.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth } from './_shared/auth.js';
import { createJob } from './_shared/job-store.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface BatchQuestion {
  id: string;
  question: string;
  context?: string;
}

export const handler: Handler = async (event: HandlerEvent) => {
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
    const { questions, instructions } = body as {
      questions: BatchQuestion[];
      instructions?: string;
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Questions array is required',
        }),
      };
    }

    // Create a job (now async with Netlify Blobs)
    const job = await createJob(questions, instructions);

    console.log(`Created batch job ${job.id} with ${questions.length} questions`);

    // Trigger the background function
    const siteUrl = process.env.URL || process.env.SITE_URL || 'http://localhost:8888';
    const backgroundUrl = `${siteUrl}/.netlify/functions/batch-background`;

    // Fire and forget - don't await
    fetch(backgroundUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err) => {
      console.error('Failed to trigger background function:', err);
    });

    // Return immediately with job ID
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId: job.id,
        status: 'pending',
        total: questions.length,
        message: 'Job started. Poll /api/batch-status for progress.',
      }),
    };
  } catch (error) {
    console.error('Error in /api/batch-start:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to start batch job',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
