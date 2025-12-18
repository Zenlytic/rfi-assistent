# Zenlytic RFI Response Assistant

AI-powered application for responding to security questionnaires, RFIs, RFPs, and vendor risk assessments. Uses Claude API with live Notion workspace access to provide citation-backed answers.

## Features

- **Ask Page** - Single question lookup with real-time responses
- **Batch Page** - Upload Excel/CSV questionnaires, process all at once, download results
- **Admin Page** - Manage approved Q&A pairs for common questions
- **Live Notion Access** - Real-time search of Employee Handbook, Security Homepage, Engineering Wiki
- **Citation-backed Answers** - Every response includes source citations

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/zenlytic/rfi-assistant.git
cd zenlytic-rfi-assistant

# Install root dependencies
npm install

# Install function dependencies
cd netlify/functions && npm install && cd ../..

# Install web dependencies
cd packages/web && npm install && cd ../..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key
NOTION_TOKEN=secret_your-notion-token
```

### 3. Set Up Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration named "RFI Assistant"
3. Copy the "Internal Integration Secret" to `NOTION_TOKEN`
4. Share these pages with the integration:
   - Employee Handbook
   - Security Homepage  
   - Engineering Wiki

### 4. Run Locally

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start development server
netlify dev
```

Open http://localhost:8888

## Deployment to Netlify

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/rfi-assistant.git
git push -u origin main
```

### 2. Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect your GitHub repository
4. Build settings should auto-detect from `netlify.toml`

### 3. Add Environment Variables

In Netlify dashboard > Site settings > Environment variables:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `NOTION_TOKEN` | Your Notion integration token |

### 4. Deploy

Netlify will automatically deploy on push to main.

## API Endpoints

### POST /api/ask
Ask a single question.

### POST /api/batch  
Process multiple questions (max 10 per request).

### GET /api/qa-pairs
List all approved Q&A pairs.

### POST /api/qa-pairs
Add a new Q&A pair.

## Updating Knowledge

**Add Q&A Pairs:** Use the Admin page or edit `config/qa-pairs.json`

**Update System Prompt:** Edit `netlify/functions/_shared/system-prompt.ts`

**Add Notion Pages:** Edit `config/notion-pages.json`

## Documentation

This app includes a submodule linking to [zenlytic-docs](https://github.com/Zenlytic/zenlytic-docs) for searching public documentation from docs.zenlytic.com.

To update the docs submodule:
```bash
git submodule update --remote docs
```

## License

Proprietary - Zenlytic Internal Use Only
