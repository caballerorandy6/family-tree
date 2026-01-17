# CLAUDE.md

## Project
FamilyTree - Digital family tree application (Turborepo Monorepo)

## Stack
- Frontend: Next.js 16+, React 19, TypeScript, TailwindCSS, Shadcn UI, Zustand
- Backend: Express.js 5+, TypeScript, Prisma 6+
- Database: PostgreSQL (Railway)
- Storage: Digital Ocean Spaces
- Auth: NextAuth.js v5 + JWT
- Monorepo: Turborepo + pnpm

## React Best Practices (MANDATORY)

This project follows Vercel's react-best-practices skill.
Full rules: `~/.claude/skills/vercel-react-best-practices/AGENTS.md`

### CRITICAL - Always Apply
- `Promise.all()` for parallel async - NEVER sequential awaits
- Direct imports only - NEVER from barrel/index files
- `next/dynamic` for heavy components (charts, editors, maps)
- Defer analytics until after hydration

### HIGH - Apply for Performance
- `React.cache()` for request deduplication
- Default to Server Components, add 'use client' only when needed
- Suspense boundaries for streaming/loading states

### MEDIUM - Apply When Relevant
- useMemo for expensive calculations
- useCallback for stable function references
- Colocate state near where it's used
- Optimistic UI updates

## Commands

```bash
pnpm dev              # All apps
pnpm --filter web dev # Frontend only
pnpm --filter api dev # Backend only
pnpm build            # Build all
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to DB
pnpm db:studio        # Prisma Studio
pnpm db:seed          # Seed demo data
```

## Structure

```
family-tree/
├── apps/
│   ├── web/          # Next.js 16 + React 19
│   └── api/          # Express.js 5+
├── packages/
│   ├── database/     # Prisma schema + client
│   ├── validations/  # Shared Zod schemas
│   ├── types/        # Shared TS types
│   └── config-typescript/
```

## Code Rules

1. ALL files TypeScript (.ts/.tsx), strict mode
2. NO `any` type - use `unknown` + type guards
3. Zod validation on client AND server (shared schemas)
4. Direct imports always - no barrel files
5. `Promise.all()` for parallel data fetching
6. Server Components by default
7. Run `pnpm typecheck` before completing any task

## File Naming
- Components: PascalCase (TreeView.tsx)
- Utils: camelCase (formatDate.ts)
- Types: PascalCase with .types.ts suffix
- Schemas: camelCase with .schema.ts suffix

## API Response Format

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

## Environment Variables

```env
# Database
DATABASE_URL=

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=

# Digital Ocean Spaces
DO_SPACES_ENDPOINT=
DO_SPACES_REGION=
DO_SPACES_BUCKET=
DO_SPACES_ACCESS_KEY=
DO_SPACES_SECRET_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# API
NEXT_PUBLIC_API_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
```
