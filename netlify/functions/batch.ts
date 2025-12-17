/**
 * POST /api/batch
 * 
 * Process multiple questions from a JSON array.
 * For file uploads, the frontend will parse Excel/CSV and send as JSON.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { askQuestion } from './_shared/claude.js';

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

interface BatchResult {
  id: string;
  question: string;
  answer: string;
  citations: string[];
  error?: string;
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

  try {
    const body = JSON.parse(event.body || '{}');
    const { questions } = body as { questions: BatchQuestion[] };

    if (!Array.isArray(questions) || questions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Questions array is required',
          example: { questions: [{ id: '1', question: 'Your question here' }] }
        }),
      };
    }

    // Limit batch size to prevent timeouts
    const maxBatchSize = 10;
    if (questions.length > maxBatchSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Batch size limited to ${maxBatchSize} questions. Got ${questions.length}.`,
          suggestion: 'Split into multiple requests or use streaming endpoint.'
        }),
      };
    }

    console.log(`Processing batch of ${questions.length} questions`);

    const results: BatchResult[] = [];

    for (const q of questions) {
      try {
        const result = await askQuestion(q.question, q.context);
        results.push({
          id: q.id,
          question: q.question,
          answer: result.answer,
          citations: result.citations,
        });
      } catch (error) {
        results.push({
          id: q.id,
          question: q.question,
          answer: '',
          citations: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Small delay between questions
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total: questions.length,
        processed: results.length,
        results,
      }),
    };
  } catch (error) {
    console.error('Error in /api/batch:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process batch',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
