# ZedImpact

A multi-tenant nonprofit management platform built with Next.js, Clerk, and Prisma.

## Features

- Multi-tenant architecture with per-org data isolation
- Donor management and donation tracking
- Event management
- Contact/volunteer management
- Board portal
- Donor portal
- AI-powered reports (OpenRouter)
- Role-based access control (admin, staff, volunteer, donor)

## Tech Stack

- **Framework**: Next.js (App Router)
- **Auth**: Clerk
- **Database**: PostgreSQL + Prisma
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Animations**: Framer Motion

## Getting Started

```bash
pnpm install
cp .env.example .env.local
# Fill in CLERK_*, DATABASE_URL, OPENROUTER_API_KEY
pnpm db:push
pnpm dev
```

## Development

Set `SKIP_AUTH=true` in `.env.local` to bypass Clerk in development.

```bash
pnpm dev        # Start dev server (default port 3000)
pnpm build      # Production build
pnpm typecheck  # Run TypeScript check
pnpm lint       # Run ESLint
```

## Project Structure

```
src/
  app/
    (dashboard)/[orgSlug]/admin/  ← Admin pages per org
    (dashboard)/[orgSlug]/donor/  ← Donor portal
    (dashboard)/[orgSlug]/board/  ← Board portal
    (public)/[orgSlug]/store/     ← Public donation store
    api/                          ← API routes
  components/
    admin/     ← Admin-specific components
    ui/        ← Base UI components (shadcn/ui)
  lib/
    db.ts      ← Prisma client
    auth.ts    ← Clerk helpers
  prisma/
    schema.prisma
```
