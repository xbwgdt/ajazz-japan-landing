# Remove Survey From The Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all survey functionality while retaining protected order administration for fulfillment, refunds, and exports.

**Architecture:** Introduce `lib/admin-security.ts` for order administration, move login/logout under `/admin`, then delete the survey route, API, data, and style trees. The new admin module uses `ADMIN_PASSWORD` and a 32-character minimum `ADMIN_SECRET`; survey credentials are removed.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, PostgreSQL.

## Global Constraints

- Do not modify the legacy survey deployment or its database.
- Delete every `/survey` and `/api/survey` route from this branch.
- Keep `/admin/orders`, fulfillment actions, refund actions, restock actions, and CSV export password protected.
- Do not put real secret values in source control or Railway suggested-variable placeholders.

---

### Task 1: Migrate order administration authentication

**Files:**
- Create: `lib/admin-security.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`
- Modify: `app/admin/orders/page.tsx`
- Modify: `app/api/admin/orders/[id]/route.ts`
- Modify: `app/api/admin/orders/[id]/refund/route.ts`
- Modify: `app/api/admin/orders/[id]/restock/route.ts`
- Modify: `app/api/admin/orders/export.csv/route.ts`
- Test: `tests/admin/admin-security.test.ts`

**Interfaces:**
- Exports `ADMIN_COOKIE`, `verifyAdminPassword`, `createAdminToken`, `verifyAdminToken`, and `isSameOrigin`.
- Order routes redirect invalid sessions to `/admin/login`.

- [ ] **Step 1: Write the failing security test**

```ts
import { describe, expect, it, vi } from "vitest";

describe("order admin security", () => {
  it("uses ADMIN_PASSWORD and a 32-character ADMIN_SECRET", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "store-admin-password");
    vi.stubEnv("ADMIN_SECRET", "a".repeat(32));
    const security = await import("../../lib/admin-security");
    expect(security.verifyAdminPassword("store-admin-password")).toBe(true);
    expect(security.verifyAdminPassword("wrong-password")).toBe(false);
    expect(security.verifyAdminToken(security.createAdminToken())).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run tests/admin/admin-security.test.ts`

Expected: FAIL because `lib/admin-security` does not exist.

- [ ] **Step 3: Implement the module and admin login routes**

Extract only the HMAC token, constant-time password comparison, and same-origin helpers from `lib/survey-security.ts` into `lib/admin-security.ts`. Use `ADMIN_PASSWORD` and `ADMIN_SECRET`; reject secrets shorter than 32 characters. Copy the current login/logout flow to `/api/admin/login` and `/api/admin/logout`, redirect successful login to `/admin/orders`, and set `ADMIN_COOKIE` only for the `/admin` path. Replace every order-admin import of `lib/survey-security` with `lib/admin-security`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `pnpm vitest run tests/admin/admin-security.test.ts tests/admin/orders.test.ts tests/admin/order-status-handler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the working admin migration**

```bash
git add lib/admin-security.ts app/admin app/api/admin tests/admin
git commit -m "feat: separate store admin authentication"
```

### Task 2: Delete the survey feature and discovery links

**Files:**
- Delete: `app/survey/`
- Delete: `app/api/survey/`
- Delete: `lib/survey.ts`
- Delete: `lib/survey-db.ts`
- Delete: `lib/survey-security.ts`
- Modify: `app/layout.tsx`
- Modify: `components/store/Storefront.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`
- Test: `tests/deployment/survey-removal.test.ts`

**Interfaces:**
- Survey route files no longer exist.
- Sitemap has no `/survey` URL and storefront source has no `/survey` link.

- [ ] **Step 1: Write the failing removal test**

```ts
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";

describe("survey removal", () => {
  it("does not expose survey pages, APIs, or sitemap entries", () => {
    expect(existsSync(resolve(process.cwd(), "app/survey"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/api/survey"))).toBe(false);
    expect(sitemap().some((entry) => entry.url.includes("/survey"))).toBe(false);
    expect(readFileSync(resolve(process.cwd(), "components/store/Storefront.tsx"), "utf8")).not.toContain('href="/survey"');
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run tests/deployment/survey-removal.test.ts`

Expected: FAIL because survey paths, links, and sitemap entry still exist.

- [ ] **Step 3: Delete survey-only code and remove references**

Delete the two survey route trees and three survey library files. Remove `import "./survey/survey.css";` from `app/layout.tsx`, both `/survey` links from `Storefront.tsx`, the survey sitemap entry, and the `/survey/admin` robots disallow rule.

- [ ] **Step 4: Run the removal test and confirm GREEN**

Run: `pnpm vitest run tests/deployment/survey-removal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit survey removal**

```bash
git add -A app/survey app/api/survey lib/survey.ts lib/survey-db.ts lib/survey-security.ts app/layout.tsx components/store/Storefront.tsx app/sitemap.ts app/robots.ts tests/deployment/survey-removal.test.ts
git commit -m "feat: remove storefront survey"
```

### Task 3: Update configuration and deployment documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Test: `tests/deployment/admin-config.test.ts`

**Interfaces:**
- Deployment documentation lists `ADMIN_PASSWORD` and `ADMIN_SECRET` only.

- [ ] **Step 1: Write the failing configuration test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("store admin configuration", () => {
  it("documents dedicated admin credentials without survey variables", () => {
    const env = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(env).toContain("ADMIN_PASSWORD=");
    expect(env).toContain("ADMIN_SECRET=");
    expect(env).not.toContain("SURVEY_ADMIN_");
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run tests/deployment/admin-config.test.ts`

Expected: FAIL because `.env.example` documents `SURVEY_ADMIN_*`.

- [ ] **Step 3: Implement documentation changes**

Replace survey entries in `.env.example` and README with:

```dotenv
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SECRET=replace-with-at-least-32-random-characters
```

Document that these values protect `/admin/login` and remove all survey setup wording.

- [ ] **Step 4: Run complete verification**

Run: `pnpm test && pnpm build`

Expected: all tests pass; Next.js output contains `/admin/login`, `/api/admin/login`, and `/api/admin/logout`, but no `/survey` or `/api/survey` routes.

- [ ] **Step 5: Commit and push the completed change**

```bash
git add .env.example README.md tests/deployment
git commit -m "docs: configure store admin credentials"
git push fork feat/ajazz-japan-store
```

