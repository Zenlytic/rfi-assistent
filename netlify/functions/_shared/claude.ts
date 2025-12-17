/**
 * Claude Service
 * 
 * Handles Claude API calls with tool use for Notion search and Q&A lookup.
 */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, NOTION_PAGES } from './system-prompt.js';
import { searchNotion, getNotionPage } from './notion-tools.js';
import { searchQAPairs } from './qa-store.js';
import { searchDocs, getDocsPage } from './docs-tools.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tool definitions
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_notion',
    description: `Search Zenlytic's Notion workspace for policies, procedures, and documentation.

IMPORTANT: Always search Notion BEFORE answering questions about:
- Security policies (CC* controls)
- Training requirements  
- HR procedures
- Compliance/audit evidence
- Architecture/technical details

Use page_filter to target specific sections:
- employee_handbook: ALL CC* policies, training, HR
- security_homepage: SOC2 reports, audit evidence
- engineering_wiki: Architecture, Zoë, technical docs`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query - be specific, e.g. "CC1.1.3 training" or "incident response"',
        },
        page_filter: {
          type: 'string',
          enum: ['employee_handbook', 'security_homepage', 'engineering_wiki', 'all'],
          description: 'Which Notion section to search',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_notion_page',
    description: 'Get full content of a specific Notion page by ID or CC control number (e.g., "CC1.1.3", "CC2.3.3")',
    input_schema: {
      type: 'object' as const,
      properties: {
        page_id: {
          type: 'string',
          description: 'Notion page ID or CC control number',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'search_qa_pairs',
    description: 'Search previously approved Q&A responses for similar questions. Use this for common questions about SOC2, encryption, training, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Question to search for',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_docs',
    description: `Search Zenlytic's public documentation (docs.zenlytic.com).

Use this for questions about:
- Data sources and connections (Snowflake, BigQuery, Databricks, etc.)
- Authentication (SSO, SAML, Okta, Microsoft Entra)
- Security practices and IP whitelisting
- Legal documents (Terms of Service, DPA, Subprocessors)
- Customer support policies

Sections available:
- data-sources: Database connection setup guides
- authentication-and-security: SSO, security features
- legal-and-support: Legal docs, subprocessors, support policy`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query - e.g. "subprocessors", "snowflake setup", "okta SSO"',
        },
        section: {
          type: 'string',
          enum: ['data-sources', 'authentication-and-security', 'legal-and-support'],
          description: 'Optional: limit search to a specific section',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_docs_page',
    description: 'Get full content of a specific documentation page from docs.zenlytic.com',
    input_schema: {
      type: 'object' as const,
      properties: {
        page_path: {
          type: 'string',
          description: 'Path to the page, e.g. "legal-and-support/legal/subprocessors" or "data-sources/snowflake_setup"',
        },
      },
      required: ['page_path'],
    },
  },
];

/**
 * Process a tool call
 */
async function processToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  console.log(`Tool call: ${toolName}`, toolInput);
  
  switch (toolName) {
    case 'search_notion': {
      const { query, page_filter } = toolInput as { query: string; page_filter?: string };
      return await searchNotion(query, page_filter);
    }
    case 'get_notion_page': {
      const { page_id } = toolInput as { page_id: string };
      return await getNotionPage(page_id);
    }
    case 'search_qa_pairs': {
      const { query } = toolInput as { query: string };
      return searchQAPairs(query);
    }
    case 'search_docs': {
      const { query, section } = toolInput as { query: string; section?: string };
      return searchDocs(query, section);
    }
    case 'get_docs_page': {
      const { page_path } = toolInput as { page_path: string };
      return getDocsPage(page_path);
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

export interface AskResult {
  answer: string;
  citations: string[];
  searches: string[];
}

/**
 * Ask a question and get a response with citations
 */
export async function askQuestion(
  question: string,
  context?: string
): Promise<AskResult> {
  const searches: string[] = [];

  let userMessage = question;
  if (context) {
    userMessage = `Context: ${context}\n\nQuestion: ${question}`;
  }

  // Initial API call
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: [{ role: 'user', content: userMessage }],
  });

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      searches.push(`${toolUse.name}: ${JSON.stringify(toolUse.input)}`);
      const result = await processToolCall(
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.slice(0, 10000), // Limit result size
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
  }

  // Extract final text
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  const answer = textBlocks.map((block) => block.text).join('\n');

  // Extract citations from answer
  const citationMatches = answer.match(/\[([^\]]+)\]/g) || [];
  const citations = [...new Set(citationMatches.map((c) => c.slice(1, -1)))];

  return { answer, citations, searches };
}
