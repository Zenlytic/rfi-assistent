/**
 * GET /api/batch-status?jobId=xxx
 *
 * Poll for batch job status and results.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth } from './_shared/auth.js';
import { getJob } from './_shared/job-store.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
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

  const jobId = event.queryStringParameters?.jobId;

  if (!jobId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'jobId query parameter required' }),
    };
  }

  const job = await getJob(jobId);

  if (!job) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Job not found. It may have expired or never existed.' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      total: job.questions.length,
      processed: job.results.length,
      results: job.results,
      error: job.error,
    }),
  };
};
