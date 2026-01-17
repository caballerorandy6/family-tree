# CLAUDE.md

## Project
FamilyTree - Digital family tree application (Turborepo Monorepo)

## Stack
- Frontend: Next.js 16+, React 19, TypeScript, TailwindCSS, Shadcn UI, Zustand
- Backend: Express.js 5+, TypeScript, Prisma 6+
- Database: PostgreSQL (Railway)
- Storage: Cloudinary
- Auth: NextAuth.js v5 + JWT
- Monorepo: Turborepo + pnpm
- Tree Visualization: Custom horizontal timeline

## General Principles
- Review with maximum depth following best practices
- NEVER force unnecessary changes
- Always keep code simple and readable
- If something works well, don't change it

## React Best Practices (MANDATORY)

This project uses **React 19 Compiler** (`reactCompiler: true` in next.config.ts).
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
- ~~useMemo/useCallback~~ → **NOT NEEDED** (React 19 Compiler handles memoization automatically)
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

## Naming Conventions
- **Files**: kebab-case (my-component.tsx) or PascalCase for components (TreeView.tsx)
- **Components**: PascalCase (MyComponent)
- **Functions/Variables**: camelCase (myFunction)
- **Types/Interfaces**: PascalCase (MyType)
- **Constants**: UPPER_SNAKE_CASE (MY_CONSTANT)
- **Utils**: camelCase (formatDate.ts)
- **Types files**: PascalCase with .types.ts suffix
- **Schemas**: camelCase with .schema.ts suffix

## Styling
- Tailwind CSS for all styling
- Shadcn UI for components
- Mobile-first approach
- CSS variables in globals.css for theming

## Forms
- React Hook Form + Zod resolver
- Client-side AND server-side validation
- Sonner for toast notifications

## Git Commits
- Descriptive commits in English
- One feature per commit
- DO NOT include mentions of Claude, AI, or "Generated with" in commits
- DO NOT add Co-Authored-By lines

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

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

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
