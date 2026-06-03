<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FundiFlow — Kenyan Tailoring SaaS

## Stack

- **Framework:** Next.js 16 (App Router) — `next dev --webpack` / `next build --webpack`
- **React:** 19
- **Language:** TypeScript (strict), `@/*` path alias maps to `./src/*`
- **Styling:** Tailwind CSS v4, `tailwind-merge` + `clsx` for class merging
- **Database:** Supabase (migrated from Firebase Firestore). Supabase tables use **snake_case** columns; use `transformKeysToSnake` from `@/lib/case-utils`
- **Auth:** Supabase Auth, session stored in Zustand (`@/store/session-store.ts`)
- **State:** Zustand + React Context (auth)
- **Forms:** `react-hook-form` + `zod` + `@hookform/resolvers`
- **Offline-first:** Dexie.js (IndexedDB) + custom `SyncEngine` (`@/lib/sync-engine.ts`) with priority queue and retry/backoff
- **PWA:** `next-pwa` with Workbox runtime caching
- **UI:** shadcn-style `src/components/ui/`, `lucide-react` icons, `framer-motion` animations, `sonner` toasts
- **Tables:** `@tanstack/react-table`, Charts: `recharts`
- **SMS:** Africa's Talking via `src/app/api/send-sms/`
- **Images:** Cloudinary via `src/app/api/cloudinary/`

## Architecture

```
src/
├── app/                # Next.js App Router pages
│   ├── (dashboard)/    # Protected app shell (layout.tsx + dashboard-shell.tsx)
│   │   ├── analytics/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── finance/
│   │   ├── inventory/
│   │   ├── messages/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── pos/
│   │   ├── production/
│   │   ├── profile/
│   │   └── settings/
│   ├── (marketing)/    # Public marketing pages
│   ├── api/            # API routes (cloudinary, send-sms)
│   ├── auth/           # Auth routes (login, register, callback, forgot-password, change-password)
│   └── layout.tsx      # Root layout (AuthProvider, Toaster, PWARegister)
├── features/           # Feature-scoped providers & logic (e.g., auth/components/)
├── modules/            # Domain modules — each has components/ and optionally hooks/
│   ├── analytics/
│   ├── customers/
│   ├── dashboard/
│   ├── finance/
│   ├── inventory/      # has hooks/
│   ├── orders/
│   ├── payments/
│   ├── production/
│   └── shared/         # data-table, use-business-context, use-permissions
├── components/
│   ├── ui/             # Primitive UI components (button, card, dialog, table, etc.)
│   ├── shared/         # empty-state, loading-screen
│   ├── dashboard/
│   ├── messaging/
│   ├── notifications/
│   ├── profile/
│   └── pwa/            # pwa-register
├── constants/          # navigation.ts
├── hooks/              # useNetworkStatus, usePWAInstall, useSyncEngine
├── lib/                # Config and utilities
│   ├── supabase.ts     # Supabase client
│   ├── firebase.ts     # Legacy Firebase — DO NOT use
│   ├── sync-engine.ts  # Offline sync engine
│   ├── local-db.ts     # Dexie schema
│   ├── case-utils.ts   # camelCase ↔ snake_case converter
│   ├── permissions.ts
│   └── utils.ts
├── schemas/            # Zod validation schemas (auth, customer, order, payment)
├── services/           # Service layer (auth, firestore, finance, messaging, notifications, etc.)
├── store/              # Zustand stores (session-store)
├── test/               # Test entry page
└── types/              # TypeScript definitions (business, customer, domain, employee, order, index)
```

## Conventions

- **Imports:** Use `@/` path alias (`import { x } from "@/lib/utils"`)
- **Components:** Default exports for pages, named exports for everything else
- **Styling:** Tailwind utility classes; use `cn()` from `@/lib/utils` for conditional classes
- **DB operations:** Go through services in `src/services/`. For offline operations, enqueue via Dexie and let SyncEngine handle Supabase sync
- **New routes:** Add route folders under `src/app/(dashboard)/` for protected pages, wire into the dashboard layout
- **Module structure:** Place domain-specific components in `src/modules/<name>/components/`, shared UI in `src/components/ui/`, feature context in `src/features/`
- **Permissions:** Use RBAC helpers from `src/lib/permissions.ts` and `src/modules/shared/use-permissions.ts`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Webpack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm start` | Start production server |

## Supabase

- Supabase config in `supabase/config.toml`, migrations in `supabase/migrations/`
- Collections map: see `COLLECTION_TABLE_MAP` in `src/lib/sync-engine.ts`
- Firestore rules in `firestore.rules` (legacy reference), indexes in `firestore.indexes.json`
