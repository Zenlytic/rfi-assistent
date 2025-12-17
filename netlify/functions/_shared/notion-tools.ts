/**
 * Notion Tools
 * 
 * Provides search and fetch capabilities for Zenlytic's Notion workspace.
 */

import { Client } from '@notionhq/client';
import { NOTION_PAGES, CC_CONTROLS } from './system-prompt.js';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

/**
 * Search Notion workspace
 */
export async function searchNotion(
  query: string,
  pageFilter?: string
): Promise<string> {
  try {
    const response = await notion.search({
      query,
      filter: { property: 'object', value: 'page' },
      page_size: 10,
    });

    if (response.results.length === 0) {
      return `No results found for "${query}" in Notion.`;
    }

    const results = await Promise.all(
      response.results.slice(0, 5).map(async (page: any) => {
        const title = 
          page.properties?.title?.title?.[0]?.plain_text ||
          page.properties?.Name?.title?.[0]?.plain_text ||
          'Untitled';

        try {
          const blocks = await notion.blocks.children.list({
            block_id: page.id,
            page_size: 5,
          });

          const content = blocks.results
            .map((block: any) => {
              const richText = block[block.type]?.rich_text;
              return richText?.map((t: any) => t.plain_text).join('') || '';
            })
            .filter(Boolean)
            .join('\n');

          return `## ${title}\n${content.slice(0, 800)}${content.length > 800 ? '...' : ''}`;
        } catch {
          return `## ${title}\n[Content preview unavailable]`;
        }
      })
    );

    return results.join('\n\n---\n\n');
  } catch (error) {
    console.error('Notion search error:', error);
    return `Error searching Notion: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

/**
 * Get a specific Notion page by ID or CC control number
 */
export async function getNotionPage(pageIdOrControl: string): Promise<string> {
  try {
    let pageId = pageIdOrControl;

    // Check if it's a CC control reference
    const upperControl = pageIdOrControl.toUpperCase();
    if (CC_CONTROLS[upperControl]) {
      pageId = CC_CONTROLS[upperControl];
    }

    // Check main page aliases
    const aliases: Record<string, string> = {
      'employee_handbook': NOTION_PAGES.EMPLOYEE_HANDBOOK,
      'security_homepage': NOTION_PAGES.SECURITY_HOMEPAGE,
      'engineering_wiki': NOTION_PAGES.ENGINEERING_WIKI,
      'soc2': NOTION_PAGES.SOC2_PAGE,
    };
    const lowerAlias = pageIdOrControl.toLowerCase().replace(/\s+/g, '_');
    if (aliases[lowerAlias]) {
      pageId = aliases[lowerAlias];
    }

    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const title =
      page.properties?.title?.title?.[0]?.plain_text ||
      page.properties?.Name?.title?.[0]?.plain_text ||
      'Untitled';

    // Get all blocks with pagination
    let allBlocks: any[] = [];
    let cursor: string | undefined;

    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });
      allBlocks = allBlocks.concat(response.results);
      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    const content = allBlocks
      .map((block: any) => {
        const type = block.type;
        const richText = block[type]?.rich_text;
        const text = richText?.map((t: any) => t.plain_text).join('') || '';

        switch (type) {
          case 'heading_1': return `# ${text}`;
          case 'heading_2': return `## ${text}`;
          case 'heading_3': return `### ${text}`;
          case 'bulleted_list_item': return `• ${text}`;
          case 'numbered_list_item': return `1. ${text}`;
          case 'to_do': return `${block[type]?.checked ? '☑' : '☐'} ${text}`;
          case 'divider': return '---';
          default: return text;
        }
      })
      .filter(Boolean)
      .join('\n\n');

    return `# ${title}\n\n${content}`;
  } catch (error) {
    console.error('Notion page fetch error:', error);
    return `Error fetching page: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}
