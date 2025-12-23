/**
 * Notion Export Script
 *
 * Exports Notion content to local JSON files for fast, pre-indexed search.
 * Run with: npx tsx scripts/export-notion.ts
 *
 * Requires NOTION_TOKEN environment variable (loaded from .env).
 */

import { Client } from '@notionhq/client';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually (avoid adding dotenv dependency)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Root pages to export
const ROOT_PAGES = {
  employee_handbook: {
    id: 'dc73011524e54feaa2a69d78d6e5164e',
    name: 'Employee Handbook',
  },
  security_homepage: {
    id: '6b8833be227a437a8f846f9cd5c896e4',
    name: 'Security Homepage',
  },
  engineering_wiki: {
    id: '3f72c85f50d947ec97543db5242260f9',
    name: 'Engineering Wiki',
  },
  business_continuity_plan: {
    id: '129a8dad05ac801cb803e69297ecf8c7',
    name: 'Business Continuity Plan',
  },
};

interface IndexedPage {
  id: string;
  title: string;
  parent: string;
  content: string;
  keywords: string[];
  lastUpdated: string;
}

interface NotionIndex {
  exportedAt: string;
  pages: IndexedPage[];
}

/**
 * Extract plain text from rich text array
 */
function extractText(richText: any[]): string {
  if (!richText) return '';
  return richText.map((t: any) => t.plain_text || '').join('');
}

/**
 * Get page title from properties
 */
function getPageTitle(page: any): string {
  const titleProp = page.properties?.title?.title || page.properties?.Name?.title;
  return titleProp?.[0]?.plain_text || 'Untitled';
}

/**
 * Fetch all blocks from a page (with pagination)
 */
async function fetchAllBlocks(pageId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      start_cursor: cursor,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Convert blocks to plain text content
 */
function blocksToText(blocks: any[]): string {
  return blocks
    .map((block: any) => {
      const type = block.type;
      const richText = block[type]?.rich_text;
      const text = extractText(richText);

      switch (type) {
        case 'heading_1':
          return `# ${text}`;
        case 'heading_2':
          return `## ${text}`;
        case 'heading_3':
          return `### ${text}`;
        case 'bulleted_list_item':
          return `• ${text}`;
        case 'numbered_list_item':
          return `- ${text}`;
        case 'to_do':
          return `${block[type]?.checked ? '☑' : '☐'} ${text}`;
        case 'divider':
          return '---';
        case 'code':
          return `\`\`\`\n${text}\n\`\`\``;
        case 'quote':
          return `> ${text}`;
        default:
          return text;
      }
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Extract keywords from content
 */
function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const keywords = new Set<string>();

  // Extract CC control numbers
  const ccMatches = text.match(/cc[\d\.]+/gi) || [];
  ccMatches.forEach((m) => keywords.add(m.toUpperCase()));

  // Common security/compliance terms
  const terms = [
    'soc2', 'soc 2', 'encryption', 'aes', 'tls', 'mfa', 'authentication',
    'access control', 'training', 'security', 'compliance', 'audit',
    'incident', 'breach', 'gdpr', 'privacy', 'backup', 'disaster recovery',
    'rpo', 'rto', 'business continuity', 'penetration test', 'vulnerability',
    'employee', 'onboarding', 'background check', 'policy', 'procedure',
    'data classification', 'retention', 'byod', 'mdm', 'sso', 'saml',
    'aws', 'infrastructure', 'network', 'firewall', 'logging', 'monitoring',
    'vendor', 'third party', 'subprocessor', 'api', 'integration'
  ];

  terms.forEach((term) => {
    if (text.includes(term)) {
      keywords.add(term);
    }
  });

  return Array.from(keywords);
}

/**
 * Recursively fetch child pages
 */
async function fetchChildPages(
  parentId: string,
  parentName: string,
  depth = 0
): Promise<IndexedPage[]> {
  if (depth > 3) return []; // Limit recursion depth

  const pages: IndexedPage[] = [];
  const indent = '  '.repeat(depth);

  try {
    const blocks = await fetchAllBlocks(parentId);

    // Find child_page blocks
    const childPageBlocks = blocks.filter((b) => b.type === 'child_page');

    for (const childBlock of childPageBlocks) {
      const childId = childBlock.id;
      const childTitle = childBlock.child_page?.title || 'Untitled';
      console.log(`${indent}📄 ${childTitle}`);

      try {
        // Fetch the page content
        const childBlocks = await fetchAllBlocks(childId);
        const content = blocksToText(childBlocks);
        const keywords = extractKeywords(childTitle, content);

        pages.push({
          id: childId,
          title: childTitle,
          parent: parentName,
          content,
          keywords,
          lastUpdated: new Date().toISOString(),
        });

        // Recursively fetch children
        const grandchildren = await fetchChildPages(childId, childTitle, depth + 1);
        pages.push(...grandchildren);

        // Rate limiting - be nice to Notion API
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`${indent}  ❌ Error fetching ${childTitle}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error fetching children of ${parentName}:`, err);
  }

  return pages;
}

/**
 * Export a root page and all its children
 */
async function exportRootPage(
  key: string,
  page: { id: string; name: string }
): Promise<IndexedPage[]> {
  console.log(`\n📚 Exporting: ${page.name}`);
  console.log('─'.repeat(40));

  const pages: IndexedPage[] = [];

  try {
    // First, get the root page content itself
    const rootBlocks = await fetchAllBlocks(page.id);
    const rootContent = blocksToText(rootBlocks);
    const rootKeywords = extractKeywords(page.name, rootContent);

    pages.push({
      id: page.id,
      title: page.name,
      parent: 'root',
      content: rootContent,
      keywords: rootKeywords,
      lastUpdated: new Date().toISOString(),
    });

    // Then fetch all child pages
    const children = await fetchChildPages(page.id, page.name);
    pages.push(...children);

    console.log(`✅ Exported ${pages.length} pages from ${page.name}`);
  } catch (err) {
    console.error(`❌ Error exporting ${page.name}:`, err);
  }

  return pages;
}

/**
 * Main export function
 */
async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN environment variable required');
    console.error('   Set it with: export NOTION_TOKEN=your_token');
    process.exit(1);
  }

  console.log('🚀 Starting Notion export...');
  console.log('━'.repeat(50));

  const allPages: IndexedPage[] = [];

  // Export each root page
  for (const [key, page] of Object.entries(ROOT_PAGES)) {
    const pages = await exportRootPage(key, page);
    allPages.push(...pages);
  }

  // Create output directory
  const outputDir = join(__dirname, '..', 'config', 'notion-index');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Build the index
  const index: NotionIndex = {
    exportedAt: new Date().toISOString(),
    pages: allPages,
  };

  // Write the full index
  const indexPath = join(outputDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📁 Full index written to: ${indexPath}`);

  // Also create a lightweight search index (just titles, keywords, and snippets)
  const searchIndex = allPages.map((p) => ({
    id: p.id,
    title: p.title,
    parent: p.parent,
    keywords: p.keywords,
    snippet: p.content.slice(0, 500), // First 500 chars
  }));

  const searchIndexPath = join(outputDir, 'search-index.json');
  writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
  console.log(`📁 Search index written to: ${searchIndexPath}`);

  // Summary
  console.log('\n━'.repeat(50));
  console.log('📊 Export Summary:');
  console.log(`   Total pages: ${allPages.length}`);
  console.log(`   Full index size: ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
  console.log(`   Search index size: ${(JSON.stringify(searchIndex).length / 1024).toFixed(1)} KB`);
  console.log('\n✅ Export complete!');
}

main().catch(console.error);
