# Cloudflare Operations Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run protected RMS inventory and reservation-cleanup endpoints from Cloudflare Workers Cron without requiring Vercel Pro.

**Architecture:** A standalone Cloudflare Worker maps its configured cron expression to one existing AJAZZ endpoint and calls that endpoint with the shared cron secret. The website remains on Vercel; RMS API credentials remain only in Vercel. Wrangler deploys the worker and registers both schedules.

**Tech Stack:** TypeScript, Cloudflare Workers, Wrangler configuration, Vitest.

## Global Constraints

- Keep `AJAZZ_ORIGIN` and `CRON_SECRET` as Cloudflare Worker secrets; do not commit values.
- Keep `RMS_SERVICE_SECRET` and `RMS_LICENSE_KEY` only in Vercel.
- Use UTC expressions `*/10 * * * *` and `*/15 * * * *`.
- Do not introduce a Cloudflare route or modify `ajazz.jp` DNS.

---

### Task 1: Add a testable dispatch module

**Files:**
- Create: `cloudflare/ajazz-operations-cron/src/dispatch.ts`
- Create: `tests/cloudflare/operations-cron.test.ts`

**Interfaces:**
- Produces: `tasksForCron(cron: string): CronTask[]` and `dispatchCronTask(task: CronTask, env: CronEnvironment, fetcher?: typeof fetch): Promise<void>`.
- Consumes: `CronEnvironment` with `AJAZZ_ORIGIN` and `CRON_SECRET`.

- [ ] **Step 1: Write the failing test**

```ts
expect(tasksForCron("*/10 * * * *")).toEqual([{ path: "/api/cron/release-reservations" }]);
expect(tasksForCron("*/15 * * * *")).toEqual([{ path: "/api/cron/rms-inventory" }]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/cloudflare/operations-cron.test.ts`

Expected: FAIL because the dispatch module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function tasksForCron(cron: string): CronTask[] {
  if (cron === "*/10 * * * *") return [{ path: "/api/cron/release-reservations" }];
  if (cron === "*/15 * * * *") return [{ path: "/api/cron/rms-inventory" }];
  return [];
}
```

Implement `dispatchCronTask` with an authenticated `GET` request to `new URL(task.path, env.AJAZZ_ORIGIN)`, throwing for non-2xx responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/cloudflare/operations-cron.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cloudflare/ajazz-operations-cron/src/dispatch.ts tests/cloudflare/operations-cron.test.ts
git commit -m "feat: add Cloudflare cron dispatch"
```

### Task 2: Add Worker configuration and deployment instructions

**Files:**
- Create: `cloudflare/ajazz-operations-cron/src/index.ts`
- Create: `cloudflare/ajazz-operations-cron/wrangler.jsonc`
- Modify: `README.md`

**Interfaces:**
- Consumes: `tasksForCron` and `dispatchCronTask` from `src/dispatch.ts`.
- Produces: Cloudflare Worker `scheduled()` handler and two registered cron triggers.

- [ ] **Step 1: Write the failing configuration assertion**

```ts
expect(workerConfig.triggers.crons).toEqual(["*/10 * * * *", "*/15 * * * *"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/cloudflare/operations-cron.test.ts`

Expected: FAIL because the Worker configuration file does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(Promise.all(tasksForCron(controller.cron).map((task) => dispatchCronTask(task, env))));
  },
};
```

Add the Wrangler configuration with `main: "src/index.ts"`, compatibility date `2026-07-26`, and the two required trigger expressions. Add README steps to authenticate Wrangler, set both secrets, deploy, and inspect Cloudflare Worker logs.

- [ ] **Step 4: Run verification**

Run: `pnpm test && pnpm build`

Expected: all tests pass and Next.js production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add cloudflare/ajazz-operations-cron/src/index.ts cloudflare/ajazz-operations-cron/wrangler.jsonc README.md tests/cloudflare/operations-cron.test.ts
git commit -m "feat: configure Cloudflare operations cron"
```

## Plan Self-Review

- Spec coverage: Task 1 covers endpoint selection, authorization, and failed-response behavior. Task 2 covers Worker scheduling, configuration, deployment documentation, and full verification.
- Placeholder scan: no deferred implementation steps or unspecified interfaces remain.
- Type consistency: Task 2 consumes the exact `tasksForCron` and `dispatchCronTask` signatures produced by Task 1.
