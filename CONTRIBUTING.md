# Contributing to Zenlytic RFI Assistant

## Getting Started

1. Clone the repository with submodules:
   ```bash
   git clone --recurse-submodules https://github.com/Zenlytic/rfi-assistent.git
   ```

2. Install dependencies:
   ```bash
   npm install
   cd netlify/functions && npm install && cd ../..
   cd packages/web && npm install && cd ../..
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

## Development Workflow

### Branch Strategy

- `main` - Production branch (protected)
- Feature branches - Create from `main` for new work

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Test locally:
   ```bash
   # Terminal 1
   npx netlify functions:serve

   # Terminal 2
   cd packages/web && npm run dev
   ```

4. Commit with clear messages:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. Push and create PR:
   ```bash
   git push -u origin feature/your-feature-name
   ```

6. Create PR on GitHub targeting `main`

### Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Code Standards

### TypeScript

- Use strict TypeScript
- Define interfaces for all data structures
- Avoid `any` type

### React

- Functional components only
- Use hooks for state and effects
- Keep components small and focused

### Styling

- Use Tailwind CSS classes
- Follow existing color scheme (zenlytic-* colors)
- Mobile-responsive design

## Project Structure

```
├── packages/web/src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page-level components
│   ├── hooks/         # Custom React hooks
│   └── main.tsx       # App entry point
│
├── netlify/functions/
│   ├── _shared/       # Shared utilities
│   │   ├── claude.ts  # Claude API integration
│   │   ├── auth.ts    # Auth middleware
│   │   └── *.ts       # Other shared code
│   └── *.ts           # API endpoint handlers
│
├── config/            # Static configuration files
└── docs/              # Documentation submodule
```

## Adding New Features

### New API Endpoint

1. Create `netlify/functions/your-endpoint.ts`
2. Add auth middleware if needed:
   ```typescript
   import { requireAuth } from './_shared/auth.js';

   // In handler:
   const authResult = requireAuth(event.headers.cookie);
   if ('error' in authResult) {
     return { statusCode: 401, ... };
   }
   ```

### New Knowledge Source

1. Add tool definition in `netlify/functions/_shared/claude.ts`
2. Implement search/fetch functions
3. Add to `processToolCall` switch statement

### New UI Page

1. Create component in `packages/web/src/pages/`
2. Add to navigation in `App.tsx`
3. Update `Navbar.tsx` if needed

## Testing

### Local Testing

```bash
# Run frontend
cd packages/web && npm run dev

# Run functions
npx netlify functions:serve

# Build check
cd packages/web && npm run build
```

### Production Testing

- Create PR for deploy preview
- Test on preview URL before merging

## Troubleshooting

### Common Issues

**Functions not loading:**
- Check `netlify/functions/package.json` dependencies
- Verify environment variables are set

**Auth not working locally:**
- Add localhost redirect URI in Google Cloud Console
- Set `SITE_URL=http://localhost:8888` in .env

**Docs search not working:**
- Run `git submodule update --init --recursive`

## Questions?

Contact the project maintainers or open an issue on GitHub.
