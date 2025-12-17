/**
 * /api/qa-pairs
 * 
 * GET - List all Q&A pairs
 * POST - Add a new Q&A pair
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { getAllQAPairs, addQAPair, searchQAPairs } from './_shared/qa-store.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET - List all or search
    if (event.httpMethod === 'GET') {
      const query = event.queryStringParameters?.q;
      
      if (query) {
        const results = searchQAPairs(query);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ query, results }),
        };
      }

      const pairs = getAllQAPairs();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: pairs.length, pairs }),
      };
    }

    // POST - Add new pair
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { question, answer, keywords } = body;

      if (!question || !answer) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Question and answer are required' }),
        };
      }

      const newPair = addQAPair(
        question,
        answer,
        keywords || []
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          message: 'Q&A pair added',
          pair: newPair,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error in /api/qa-pairs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
