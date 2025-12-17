/**
 * Docs Tools
 *
 * Provides search and fetch capabilities for Zenlytic's public documentation.
 * Docs are stored in the /docs submodule (synced from zenlytic-docs repo).
 */

import * as fs from 'fs';
import * as path from 'path';

// Docs sections to search
const DOCS_SECTIONS = [
  'authentication-and-security',
  'data-sources',
  'legal-and-support',
];

// Map section names to docs.zenlytic.com URLs
const SECTION_URLS: Record<string, string> = {
  'authentication-and-security': 'https://docs.zenlytic.com/authentication-and-security',
  'data-sources': 'https://docs.zenlytic.com/data-sources',
  'legal-and-support': 'https://docs.zenlytic.com/legal-and-support',
};

/**
 * Get the docs directory path
 */
function getDocsPath(): string {
  // In Netlify functions, the docs folder is at the repo root
  // During build, we're in /var/task or similar
  const possiblePaths = [
    path.join(process.cwd(), 'docs'),
    path.join(__dirname, '..', '..', '..', 'docs'),
    '/var/task/docs',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return possiblePaths[0]; // Default
}

/**
 * Read all markdown files from a directory recursively
 */
function readMarkdownFiles(dir: string): Array<{ path: string; content: string; name: string }> {
  const results: Array<{ path: string; content: string; name: string }> = [];

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        results.push(...readMarkdownFiles(fullPath));
      } else if (item.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          results.push({
            path: fullPath,
            content,
            name: item.name.replace('.md', ''),
          });
        } catch (err) {
          console.error(`Error reading ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }

  return results;
}

/**
 * Search docs for a query string
 */
export function searchDocs(query: string, section?: string): string {
  const docsPath = getDocsPath();
  const searchTerms = query.toLowerCase().split(/\s+/);

  const sectionsToSearch = section && DOCS_SECTIONS.includes(section)
    ? [section]
    : DOCS_SECTIONS;

  const results: Array<{ file: string; section: string; excerpt: string; score: number }> = [];

  for (const sec of sectionsToSearch) {
    const sectionPath = path.join(docsPath, sec);
    const files = readMarkdownFiles(sectionPath);

    for (const file of files) {
      const contentLower = file.content.toLowerCase();
      const nameLower = file.name.toLowerCase();

      // Calculate relevance score
      let score = 0;
      for (const term of searchTerms) {
        // Title matches worth more
        if (nameLower.includes(term)) {
          score += 10;
        }
        // Count occurrences in content
        const regex = new RegExp(term, 'gi');
        const matches = file.content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        // Extract relevant excerpt
        const queryIndex = contentLower.indexOf(searchTerms[0]);
        const start = Math.max(0, queryIndex - 100);
        const end = Math.min(file.content.length, queryIndex + 500);
        const excerpt = file.content.slice(start, end).trim();

        // Get relative path for URL
        const relativePath = file.path.replace(docsPath + '/', '').replace('.md', '');

        results.push({
          file: relativePath,
          section: sec,
          excerpt: excerpt.length > 600 ? excerpt.slice(0, 600) + '...' : excerpt,
          score,
        });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return `No results found for "${query}" in Zenlytic docs.`;
  }

  // Return top 5 results
  const topResults = results.slice(0, 5);
  const output = topResults.map((r) => {
    const url = `${SECTION_URLS[r.section]}/${r.file.replace(r.section + '/', '')}`;
    return `## ${r.file}\nSource: ${url}\n\n${r.excerpt}`;
  });

  return output.join('\n\n---\n\n');
}

/**
 * Get full content of a specific docs page
 */
export function getDocsPage(pagePath: string): string {
  const docsPath = getDocsPath();

  // Normalize the path
  let normalizedPath = pagePath
    .replace(/^\//, '')
    .replace(/\/$/, '');

  // Add .md extension if missing
  if (!normalizedPath.endsWith('.md')) {
    normalizedPath += '.md';
  }

  const fullPath = path.join(docsPath, normalizedPath);

  try {
    if (!fs.existsSync(fullPath)) {
      // Try to find the file
      for (const section of DOCS_SECTIONS) {
        const altPath = path.join(docsPath, section, normalizedPath);
        if (fs.existsSync(altPath)) {
          const content = fs.readFileSync(altPath, 'utf-8');
          const url = `${SECTION_URLS[section]}/${normalizedPath.replace('.md', '')}`;
          return `Source: ${url}\n\n${content}`;
        }
      }
      return `Page not found: ${pagePath}`;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    // Determine section for URL
    const section = DOCS_SECTIONS.find((s) => normalizedPath.startsWith(s));
    const url = section
      ? `${SECTION_URLS[section]}/${normalizedPath.replace(section + '/', '').replace('.md', '')}`
      : `https://docs.zenlytic.com/${normalizedPath.replace('.md', '')}`;

    return `Source: ${url}\n\n${content}`;
  } catch (error) {
    console.error('Error reading docs page:', error);
    return `Error reading page: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}
