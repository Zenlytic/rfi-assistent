/**
 * Local Notion Index Search
 *
 * Provides fast, local search over pre-indexed Notion content.
 * Falls back to live Notion API if local index is unavailable.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface IndexedPage {
  id: string;
  title: string;
  parent: string;
  keywords: string[];
  snippet: string;
}

interface FullPage {
  id: string;
  title: string;
  parent: string;
  content: string;
  keywords: string[];
  lastUpdated: string;
}

interface FullIndex {
  exportedAt: string;
  pages: FullPage[];
}

let searchIndex: IndexedPage[] | null = null;
let fullIndex: FullIndex | null = null;

/**
 * Load the search index (lazy loaded, cached in memory)
 */
function loadSearchIndex(): IndexedPage[] {
  if (searchIndex) return searchIndex;

  // Try multiple possible paths (functions vs scripts context)
  const possiblePaths = [
    join(__dirname, '..', '..', '..', 'config', 'notion-index', 'search-index.json'),
    join(__dirname, '..', '..', 'config', 'notion-index', 'search-index.json'),
    join(process.cwd(), 'config', 'notion-index', 'search-index.json'),
  ];

  for (const indexPath of possiblePaths) {
    if (existsSync(indexPath)) {
      const data = readFileSync(indexPath, 'utf-8');
      searchIndex = JSON.parse(data);
      console.log(`Loaded search index from ${indexPath} (${searchIndex!.length} pages)`);
      return searchIndex!;
    }
  }

  console.warn('Search index not found, local search unavailable');
  return [];
}

/**
 * Load the full index (for getting complete page content)
 */
function loadFullIndex(): FullIndex | null {
  if (fullIndex) return fullIndex;

  const possiblePaths = [
    join(__dirname, '..', '..', '..', 'config', 'notion-index', 'index.json'),
    join(__dirname, '..', '..', 'config', 'notion-index', 'index.json'),
    join(process.cwd(), 'config', 'notion-index', 'index.json'),
  ];

  for (const indexPath of possiblePaths) {
    if (existsSync(indexPath)) {
      const data = readFileSync(indexPath, 'utf-8');
      fullIndex = JSON.parse(data);
      console.log(`Loaded full index from ${indexPath}`);
      return fullIndex;
    }
  }

  console.warn('Full index not found');
  return null;
}

/**
 * Calculate relevance score for a page given a query
 */
function scoreMatch(page: IndexedPage, queryTerms: string[]): number {
  let score = 0;
  const titleLower = page.title.toLowerCase();
  const snippetLower = page.snippet.toLowerCase();
  const keywordsLower = page.keywords.map((k) => k.toLowerCase());

  for (const term of queryTerms) {
    // Exact keyword match (highest priority)
    if (keywordsLower.includes(term)) {
      score += 10;
    }
    // Keyword contains term
    else if (keywordsLower.some((k) => k.includes(term))) {
      score += 5;
    }

    // Title contains term (high priority)
    if (titleLower.includes(term)) {
      score += 8;
    }

    // Snippet contains term
    if (snippetLower.includes(term)) {
      score += 3;
    }

    // CC control number exact match
    if (/^cc[\d\.]+$/i.test(term) && keywordsLower.includes(term)) {
      score += 15;
    }
  }

  return score;
}

/**
 * Search the local Notion index
 */
export function searchLocalIndex(query: string, limit = 5): string {
  const index = loadSearchIndex();
  if (index.length === 0) {
    return 'Local index not available';
  }

  // Tokenize query
  const queryTerms = query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 2);

  // Score all pages
  const scored = index
    .map((page) => ({
      page,
      score: scoreMatch(page, queryTerms),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return `No local results for "${query}"`;
  }

  // Format results
  return scored
    .map(({ page, score }) => {
      return `## ${page.title}\n**Parent:** ${page.parent}\n**Keywords:** ${page.keywords.join(', ')}\n\n${page.snippet}...`;
    })
    .join('\n\n---\n\n');
}

/**
 * Get full page content from local index
 */
export function getLocalPage(pageIdOrTitle: string): string | null {
  const index = loadFullIndex();
  if (!index) return null;

  const searchLower = pageIdOrTitle.toLowerCase();

  // Find by ID or title
  const page = index.pages.find(
    (p) =>
      p.id === pageIdOrTitle ||
      p.id.replace(/-/g, '') === pageIdOrTitle.replace(/-/g, '') ||
      p.title.toLowerCase() === searchLower ||
      p.title.toLowerCase().includes(searchLower)
  );

  if (!page) return null;

  return `# ${page.title}\n\n**Parent:** ${page.parent}\n**Keywords:** ${page.keywords.join(', ')}\n\n${page.content}`;
}

/**
 * Check if local index is available
 */
export function hasLocalIndex(): boolean {
  return loadSearchIndex().length > 0;
}

/**
 * Get index metadata
 */
export function getIndexMetadata(): { available: boolean; pageCount: number; exportedAt?: string } {
  const index = loadSearchIndex();
  const full = loadFullIndex();

  return {
    available: index.length > 0,
    pageCount: index.length,
    exportedAt: full?.exportedAt,
  };
}
