# AGENTS.md

## Project Overview

A collaborative task tracking application. List-based view (not kanban) with sortable/filterable columns. Multiple users can be assigned to tasks and post updates. Task states and priority levels are user-configurable.

**Stack:** Next.js 16 (App Router) + Convex (serverless backend) + Convex Auth (Google OAuth) + Tailwind CSS v4 + shadcn/ui. React Compiler must be enabled. TypeScript throughout. Package manager is **npm**. Hosted on Vercel.

## Build / Lint / Test Commands

```bash
npm install              # Install dependencies
npm run dev              # Next.js frontend + Convex backend in parallel
npm run dev:frontend     # next dev (frontend only)
npm run dev:backend      # convex dev (backend only)
npm run build            # next build (production)
npm run lint             # eslint . --ignore-pattern "convex/_generated/**"
```

**No test runner is configured. No test files should be created.** All testing is done manually by the developer. Do not install jest, vitest, or any test framework. Do not write test files.

## Architecture & Features

### Core Entities

- **Users** -- authenticated via Convex Auth + Google OAuth. No roles; all users are equal. Any user can create/edit/delete tasks, projects, states, and priorities.
- **Projects** -- any user can create, rename, and archive projects. Every task belongs to exactly one project.
- **Tasks** -- the central entity. Fields: title, description, state, priority, project, assignees (many-to-many), tags (many-to-many), creator, created/updated timestamps.
- **Task Updates** -- chronological comments/notes on a task. Any user can post updates on any task.
- **Task States** -- user-configurable (stored in DB, not hardcoded). Default seed values: `To Do`, `In Progress`, `Done`. Users can add, rename, reorder, and remove states.
- **Priority Levels** -- user-configurable (stored in DB, not hardcoded). Default seed values: `Urgent`, `High`, `Medium`, `Low`. Users can add, rename, reorder, and remove priority levels.
- **Tags** -- user-configurable labels (stored in DB, not hardcoded). Each tag has a name and a color. Users can create, rename, recolor, and delete tags. Tasks can have zero or more tags (many-to-many, stored as an array of tag IDs on the task document). Tags appear as a column in the task list and can be used for filtering.

### UI Requirements

- **List view only** -- no kanban board. Tasks displayed in a table/list with columns.
- **Visible columns:** task title, state, assignees, project, priority, tags, created date, updated date.
- **Filtering:** filter by state, assignee, project, priority, tag. Multiple filters can be active simultaneously.
- **Multi-column sorting:** e.g., sort by priority (ascending) then by created date (ascending) to surface urgent long-standing tasks first. The UI must allow specifying multiple sort keys with direction.
- **Inline or modal editing** for task fields (state, priority, assignees).

### Data Model (Convex Schema)

States and priorities are stored as documents with an `order` field (integer) for user-controlled ordering. Tasks reference them by Convex document ID.

Assignees are a many-to-many relationship between tasks and users, stored as an array of user IDs on the task document (Convex supports arrays in documents).

Tags are stored as their own table (name + color + timestamps). Tasks hold an array of tag IDs for the many-to-many relationship.

## Project Structure

```
app/                        # Next.js App Router
  layout.tsx                # Root layout (providers, fonts)
  page.tsx                  # Home / task list view
  signin/page.tsx           # Sign-in page (Google OAuth)
components/                 # Shared React components
  ui/                       # shadcn/ui components (Button, Table, Dialog, etc.)
  ConvexClientProvider.tsx  # Convex + Auth provider wrapper
convex/                     # Convex backend
  _generated/               # Auto-generated (DO NOT EDIT)
  schema.ts                 # Database schema
  auth.ts                   # Convex Auth setup (Google provider)
  auth.config.ts            # Auth provider configuration
  http.ts                   # HTTP router (auth endpoints)
  tasks.ts                  # Task queries and mutations
  projects.ts               # Project queries and mutations
  taskStates.ts             # Task state queries and mutations
  priorities.ts             # Priority queries and mutations
  tags.ts                   # Tag queries and mutations
  updates.ts                # Task update queries and mutations
proxy.ts                    # Next.js middleware (route protection)
```

## Code Style Guidelines

### Formatting

- 2-space indentation, semicolons always, double quotes, trailing commas in multi-line constructs.
- No enforced line length limit. Single blank line between top-level declarations.

### Imports

- **Named imports** from packages: `import { v } from "convex/values";`
- **`import type`** for type-only imports: `import type { Metadata } from "next";`
- **`@/*` path alias** (maps to project root) for all cross-directory imports.
- **Import order:** third-party packages first, then internal imports. No blank line between groups.

### TypeScript

- **Strict mode** enabled. Prefer **`type`** over `interface`. Define types **inline** (no `types.ts` files).
- Use **`satisfies`** for type-safe config objects. **No `any`** in hand-written code.
- Non-null assertion `!` is acceptable for env vars: `process.env.NEXT_PUBLIC_CONVEX_URL!`

### Naming Conventions

| Category                | Convention        | Example                               |
| ----------------------- | ----------------- | ------------------------------------- |
| React components        | PascalCase        | `TaskList`, `FilterBar`               |
| Component files         | PascalCase `.tsx` | `TaskList.tsx`, `FilterBar.tsx`       |
| Functions / variables   | camelCase         | `createTask`, `sortTasks`             |
| Non-component files     | camelCase `.ts`   | `tasks.ts`, `schema.ts`               |
| Config files            | kebab-case        | `next.config.ts`, `eslint.config.mjs` |
| Convex function exports | camelCase         | `listTasks`, `updateTask`             |

### React / Next.js Patterns

- **`function` declarations** for React components (not arrow functions).
- **Arrow functions** for callbacks, event handlers, and Convex handler bodies.
- **`"use client"`** directive only when client-side hooks or interactivity are needed. Server components are the default.
- **Default exports** for pages, layouts, and config files. **Named exports** for everything else.
- **Fragment shorthand** `<>...</>` instead of `<React.Fragment>`.
- **Nullish coalescing** `??` and **optional chaining** `?.` for safe access.
- **React Compiler** is enabled -- do not use `React.memo`, `useMemo`, or `useCallback` manually; the compiler handles memoization.

### Promise / Async Patterns

- Prefix un-awaited promise calls with **`void`** to suppress floating-promise lint warnings.
- In event handlers, prefer **`.then()/.catch()` chains** over async/await.
- Use **`async`** for server components and Convex function handlers.

### Error Handling

- **State-based error display** with `.catch()` in client components.
- **Null/undefined checks** before rendering data (loading states).
- No try/catch blocks or Error Boundaries in this codebase.

### Styling & UI Components

- **Tailwind CSS v4** (CSS-first config in `globals.css`, no `tailwind.config.*`).
- **shadcn/ui is mandatory for ALL UI elements.** Never hand-write HTML buttons, inputs, cards, dialogs, tables, dropdowns, popovers, or any interactive/structural component. Always use the corresponding shadcn/ui component (`Button`, `Input`, `Card`, `Dialog`, `Table`, `Select`, `DropdownMenu`, `Popover`, `Badge`, `Label`, etc.).
- Install shadcn components via `npx shadcn@latest add <component>`. They live in `components/ui/`.
- The shadcn theme is configured in `globals.css` using CSS variables (`--background`, `--foreground`, `--primary`, `--card`, `--border`, etc.) and integrated via `@theme inline`.
- Use the **`slate-*`** color palette consistently for any custom Tailwind classes outside of shadcn components.
- Support dark mode via Tailwind's **`dark:`** variant prefix (class-based, not `prefers-color-scheme`).
- No CSS modules or styled-components.

### Convex Backend

- All functions use the **`{ args: { ... }, handler: async (ctx, args) => { ... } }`** pattern.
- Use **`v.number()`, `v.string()`, `v.id("tableName")`** etc. from `convex/values` for argument validation.
- **Named exports** for queries, mutations, and actions (not default exports).
- Never edit files in **`convex/_generated/`**.
- Schema defined in `convex/schema.ts` using `defineSchema` and `defineTable`.
- Organize backend functions by entity: one file per entity (`tasks.ts`, `projects.ts`, etc.).
- When unsure about Convex APIs, patterns, or best practices, **search the official Convex documentation at https://docs.convex.dev** before guessing.

### Middleware

- Route protection in `proxy.ts` using `convexAuthNextjsMiddleware` and `createRouteMatcher`.
- All routes except `/signin` are protected. Unauthenticated users redirect to `/signin`.

## ESLint Configuration

Flat config (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, and `@convex-dev/eslint-plugin`. The `convex/_generated/**` directory is excluded.

## Environment Variables

- `NEXT_PUBLIC_CONVEX_URL` -- Convex deployment URL (required, public)
- Google OAuth client ID and secret -- configured via Convex Auth environment variables
- Local values in `.env.local` (gitignored)
