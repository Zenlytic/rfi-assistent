/**
 * Q&A Pairs Storage
 * 
 * Manages approved Q&A pairs for common questions.
 * In production, replace with Supabase or similar.
 */

import qaPairsData from '../../../config/qa-pairs.json';

interface QAPair {
  id: string;
  q: string;
  a: string;
  keywords: string[];
}

const qaPairs: QAPair[] = qaPairsData.pairs;

/**
 * Search Q&A pairs for matching questions
 */
export function searchQAPairs(query: string): string {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Score each pair by keyword matches
  const scored = qaPairs.map(pair => {
    let score = 0;
    
    // Check question similarity
    if (pair.q.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Check keywords
    for (const keyword of pair.keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 5;
      }
      for (const word of queryWords) {
        if (keyword.toLowerCase().includes(word) && word.length > 3) {
          score += 2;
        }
      }
    }
    
    return { pair, score };
  });

  // Get top matches with score > 0
  const matches = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.pair);

  if (matches.length === 0) {
    return 'No matching approved Q&A pairs found.';
  }

  return matches
    .map(qa => `**Q:** ${qa.q}\n**A:** ${qa.a}`)
    .join('\n\n---\n\n');
}

/**
 * Get all Q&A pairs
 */
export function getAllQAPairs(): QAPair[] {
  return qaPairs;
}

/**
 * Add a new Q&A pair (in-memory only for now)
 */
export function addQAPair(q: string, a: string, keywords: string[]): QAPair {
  const newPair: QAPair = {
    id: `qa_${Date.now()}`,
    q,
    a,
    keywords,
  };
  qaPairs.push(newPair);
  return newPair;
}
