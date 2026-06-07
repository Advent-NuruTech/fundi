---
name: project-rbac-system
description: Per-manager RBAC system implemented across Finance, Inventory, Analytics, and Dashboard modules
metadata:
  type: project
---

Full RBAC system was implemented with per-manager individual permission sets.

**Why:** Owner requested enterprise-grade financial visibility controls where each Admin Manager can have individually configured access to sensitive financial/inventory data.

**Key decisions:**
- `FinanceAccessSettings.managerPermissions: Record<uid, ManagerPermissions>` stores per-manager permissions in the existing `businesses.finance_access` JSONB column (no new table needed)
- Legacy global toggles (`managerCanSeeWeekHistory` etc.) kept for backwards compat and used as fallback
- `hasFullDashboardAccess` flag on `ManagerPermissions` grants owner-equivalent access to a specific manager

**Architecture:**
- `src/types/domain.ts` — `ManagerPermissions` type + updated `FinanceAccessSettings`
- `src/lib/permissions.ts` — `getManagerPermissions()`, `hasManagerPermission()` helpers
- `src/modules/shared/use-finance-permissions.ts` — client hook resolving effective permissions
- `src/features/settings/components/role-permissions-page.tsx` — per-manager permission matrix UI
- `src/app/(dashboard)/settings/role-permissions/page.tsx` — route at `/settings/role-permissions`
- `src/app/api/finance/owner-insights/route.ts` — server-side protected API (bearer token auth)
- `supabase/migrations/00016_manager_permissions.sql` — backfills `managerPermissions: {}` on existing rows

**Protected sections (owner-only unless granted):**
- Finance: Week/Month/Year earnings, Total Revenue, Investments, Savings, Reports, Profit Margins
- Analytics: Monthly Revenue, Revenue Analytics section
- Inventory: Stock Value card
- Dashboard: Financial Summary widget (already gated by `canReadFinance`)

**How to apply:** When adding new owner-only metrics, use `finPerms.hasOwnerAccess` from `useFinancePermissions()` hook. For new grantable permissions, add key to `ManagerPermissions` interface and a definition to `PERMISSION_DEFS` in role-permissions-page.tsx.
