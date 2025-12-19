/**
 * POST /api/batch-background
 *
 * Background function for processing batch jobs.
 * Runs up to 15 minutes on Netlify Pro.
 *
 * Named with -background suffix to enable Netlify background function mode.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { askQuestion } from './_shared/claude.js';
import { getJob, updateJob, addResult } from './_shared/job-store.js';

export const handler: Handler = async (event: HandlerEvent) => {
  // Background functions only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { jobId } = JSON.parse(event.body || '{}');

    if (!jobId) {
      console.error('No jobId provided');
      return { statusCode: 400, body: 'jobId required' };
    }

    const job = getJob(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return { statusCode: 404, body: 'Job not found' };
    }

    console.log(`Background: Starting job ${jobId} with ${job.questions.length} questions`);

    // Update status to processing
    updateJob(jobId, { status: 'processing' });

    // Process each question sequentially (no timeout pressure in background)
    for (const q of job.questions) {
      try {
        console.log(`Processing question ${q.id}: ${q.question.slice(0, 50)}...`);

        // Combine context with custom instructions
        let fullContext = q.context || '';
        if (job.instructions) {
          fullContext = fullContext
            ? `${fullContext}\n\nAdditional instructions: ${job.instructions}`
            : `Additional instructions: ${job.instructions}`;
        }

        // Use Sonnet (quality) - no need for fast mode in background
        const result = await askQuestion(q.question, fullContext || undefined);

        addResult(jobId, {
          id: q.id,
          question: q.question,
          answer: result.answer,
          citations: result.citations,
        });

        console.log(`Completed question ${q.id}`);
      } catch (error) {
        console.error(`Error processing question ${q.id}:`, error);
        addResult(jobId, {
          id: q.id,
          question: q.question,
          answer: '',
          citations: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Mark job as completed
    updateJob(jobId, { status: 'completed' });
    console.log(`Background: Completed job ${jobId}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, jobId }) };
  } catch (error) {
    console.error('Background function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};
