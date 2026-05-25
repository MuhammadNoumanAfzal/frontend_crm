# CloserHolic HRMS — Frontend

Admin and employee portals for the HR Management System: **Next.js** (App Router), **TanStack Query**, **Tailwind CSS v4**, and **shadcn/ui**-style components (Base UI primitives).

## Tech stack

| Area | Stack |
|------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, `tw-animate-css` |
| Components | shadcn/ui patterns, Lucide icons |
| Data | TanStack Query, REST client (`fetch`) |
| Forms | react-hook-form, Zod |
| Charts | [shadcn Chart](https://ui.shadcn.com/docs/components/radix/chart) (`ChartContainer`, tooltips, legend) — import chart primitives from `@/components/ui/chart` only; Recharts stays an internal dependency |
| Theming | `next-themes` (light / dark), brand color `#d24726` |

## Output mode

The app is configured for **static export** (`output: "export"` in `next.config.ts`), suitable for hosting on any static file host (S3, CloudFront, Netlify, GitHub Pages with the right base path, etc.). Images use `unoptimized: true` for compatibility with static export.

## Prerequisites

- **Node.js** 20+ (recommended)
- **pnpm** (package manager used in this repo)
- **Backend API** running (see repository root and `../backend/README.md`)

## Environment

Create `frontend/.env.local` (not committed):

```bash
# Optional — defaults to http://localhost:4000/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at [http://localhost:3000](http://localhost:3000) |
| `pnpm build` | Production build → `out/` (static export) |
| `pnpm start` | Serves a production build when not using static export only |
| `pnpm lint` | ESLint |

## Local development

1. Start the backend (`cd ../backend && pnpm dev`).
2. `cd frontend && pnpm install && pnpm dev`.
3. Open `/login`, then sign in with a seeded user (see root or backend README).

## App structure (high level)

```
src/
├── app/                 # Routes: /login, /admin/*, /portal/*
├── components/          # Layout shell, dashboard UI, forms, ui/
├── lib/
│   ├── api/             # API client, types
│   ├── auth/            # JWT session helpers
│   └── query/           # React Query provider & hooks
└── hooks/
```

**Roles:** `ADMIN` → `/admin/*` (dashboard, employees, payroll, leaves, assets, visa, recruitment, settings). `EMPLOYEE` → `/portal/*` (overview, profile, leaves, assets).

## Related docs

- Repository overview: [`../README.md`](../README.md)
- API & database: [`../backend/README.md`](../backend/README.md)
