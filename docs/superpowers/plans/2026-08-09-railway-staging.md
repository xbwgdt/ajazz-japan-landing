# AJAZZ JAPAN Railway 测试环境实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在现有 Railway 项目中建立与正式资源隔离的 `staging` 环境，通过公开 HTTPS 地址验收 AJAZZ JAPAN 商城和 Payload 商品后台，同时保证正式数据库、R2、Stripe 和 RMS 不受影响。

**架构：** 使用 `CMS_DEPLOYMENT_ENV` 区分 `production`、`staging` 和 `local`。Railway 在迁移前执行发布闸门；应用运行时再次保护 Stripe、R2 和 RMS。测试环境使用独立 PostgreSQL、私有 R2 Bucket、Railway HTTPS 域名和测试管理员账号。

**技术栈：** Next.js 16、Payload CMS 3、PostgreSQL、Railway、Cloudflare R2、Stripe 测试模式、Vitest、TypeScript。

## 全局约束

- 只操作 `xbwgdt/ajazz-japan-landing` 和分支 `feat/ajazz-japan-store`。
- 不推送或修改 `xieyee-dev/ajazz-japan-landing`。
- 不切换 `ajazz.jp` 或 `media.ajazz.jp` 流量。
- 不读取、复制或修改正式 PostgreSQL、R2、Stripe、RMS 或 Cron 密钥。
- 测试环境不得配置 `RMS_SERVICE_SECRET` 或 `RMS_LICENSE_KEY`。
- 测试环境必须设置 `RMS_SYNC_ENABLED=false`。
- Stripe 只允许未配置或使用 `sk_test_` 开头的测试密钥。
- R2 Bucket 必须为 `ajazz-japan-media-staging`，保持私有，由 Payload 接口提供受控读取。
- 所有 Vitest 命令使用 `--maxWorkers=1`。
- 不提交 `.env`、截图中的密钥、数据库 URL 或后台密码。
- 保留用户已有的 `.superpowers/sdd/product-admin-task-4-report.md` 和 `.superpowers/sdd/product-admin-task-5-report.md` 修改，不暂存、不覆盖。

## 文件结构

- 修改 `scripts/verify-cms-release-gate.mjs`：按环境执行迁移前发布检查。
- 修改 `tests/deployment/cms-release-gate.test.ts`：覆盖 production、staging、local 和失败关闭行为。
- 新建 `lib/deployment/staging-safety.ts`：提供 Stripe、R2、RMS 的运行时安全函数。
- 新建 `tests/deployment/staging-runtime-safety.test.ts`：验证运行时安全函数。
- 修改 `lib/commerce/stripe.ts`：创建 Stripe 客户端前验证测试环境密钥。
- 修改 `lib/cms/r2-storage.ts`：创建 R2 客户端前验证测试 Bucket。
- 修改 `tests/cms/media-storage.test.ts`：验证测试环境拒绝正式 R2 配置。
- 修改 `lib/rms/cron.ts`：允许明确停用 RMS 同步。
- 修改 `app/api/cron/rms-inventory/route.ts`：读取 `RMS_SYNC_ENABLED`。
- 修改 `tests/rms/cron.test.ts`：验证停用后不会调用 RMS。
- 修改 `.env.example`、`README.md` 和 `docs/operations/product-admin-cms.md`：记录环境变量和正式环境边界。
- 新建 `docs/operations/railway-staging.md`：记录测试环境创建、验证和清理步骤。
- 新建 `tests/deployment/railway-staging-readiness.test.ts`：防止测试环境要求和文档发生偏移。

---

### 任务 1：把发布闸门改为环境感知模式

**文件：**
- 修改：`scripts/verify-cms-release-gate.mjs`
- 修改：`tests/deployment/cms-release-gate.test.ts`

**接口：**
- 输入：`CMS_DEPLOYMENT_ENV`、`RAILWAY_ENVIRONMENT_NAME`、发布确认变量和测试资源变量。
- 输出：检查通过时退出码 `0`；任一条件不满足时退出码非 `0`，阻止 `pnpm cms:migrate`。

- [ ] **步骤 1：重构测试环境生成器并写失败测试**

在 `tests/deployment/cms-release-gate.test.ts` 中建立不会继承本机相关变量的基础环境：

```ts
const controlledEnvironment = () => {
  const environment = { ...process.env };
  for (const key of [
    "CMS_DEPLOYMENT_ENV",
    "CMS_RELEASE_CREDENTIALS_ROTATED",
    "CMS_RELEASE_HISTORY_CLEANUP_APPROVED",
    "CMS_STAGING_ISOLATION_CONFIRMED",
    "NEXT_PUBLIC_SITE_URL",
    "RAILWAY_ENVIRONMENT_NAME",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
    "RMS_SYNC_ENABLED",
    "STRIPE_SECRET_KEY",
  ]) {
    delete environment[key];
  }
  return environment;
};
```

增加以下测试：

```ts
it("allows production only after both production attestations", () => {
  expect(() => runGate({
    ...controlledEnvironment(),
    CMS_DEPLOYMENT_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
  })).toThrow();

  expect(runGate({
    ...controlledEnvironment(),
    CMS_DEPLOYMENT_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    CMS_RELEASE_CREDENTIALS_ROTATED: "confirmed",
    CMS_RELEASE_HISTORY_CLEANUP_APPROVED: "confirmed",
  })).toContain("production release gate passed");
});

it("allows an isolated staging environment", () => {
  expect(runGate({
    ...controlledEnvironment(),
    CMS_DEPLOYMENT_ENV: "staging",
    RAILWAY_ENVIRONMENT_NAME: "staging",
    CMS_STAGING_ISOLATION_CONFIRMED: "confirmed",
    NEXT_PUBLIC_SITE_URL: "https://ajazz-staging.up.railway.app",
    R2_BUCKET: "ajazz-japan-media-staging",
    RMS_SYNC_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_staging_value",
  })).toContain("staging release gate passed");
});
```

同时增加失败用例：staging 使用 `sk_live_`、`https://ajazz.jp`、
`https://media.ajazz.jp`、非 `-staging` Bucket、启用 RMS、Railway 环境名不一致；
Railway 中使用 `local`；环境类型缺失或未知。

- [ ] **步骤 2：运行测试并确认失败**

运行：

```powershell
pnpm exec vitest run tests/deployment/cms-release-gate.test.ts --maxWorkers=1
```

预期：失败，旧脚本没有识别 `CMS_DEPLOYMENT_ENV`，也没有 staging 分支。

- [ ] **步骤 3：实现环境感知发布闸门**

将 `scripts/verify-cms-release-gate.mjs` 改为显式分支。实现必须满足：

```js
const environment = process.env.CMS_DEPLOYMENT_ENV;
const railwayEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME;

const fail = (message) => {
  console.error(`CMS release blocked: ${message}`);
  process.exit(1);
};

const requireExact = (name, expected) => {
  if (process.env[name] !== expected) {
    fail(`${name} must equal ${expected}`);
  }
};

if (environment === "production") {
  requireExact("RAILWAY_ENVIRONMENT_NAME", "production");
  requireExact("CMS_RELEASE_CREDENTIALS_ROTATED", "confirmed");
  requireExact("CMS_RELEASE_HISTORY_CLEANUP_APPROVED", "confirmed");
  console.log("CMS production release gate passed; schema migration may proceed.");
} else if (environment === "staging") {
  requireExact("RAILWAY_ENVIRONMENT_NAME", "staging");
  requireExact("CMS_STAGING_ISOLATION_CONFIRMED", "confirmed");
  requireExact("RMS_SYNC_ENABLED", "false");

  if (!process.env.R2_BUCKET?.endsWith("-staging")) {
    fail("R2_BUCKET must identify a staging bucket");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL === "https://ajazz.jp") {
    fail("staging cannot use the production site URL");
  }
  if (process.env.R2_PUBLIC_URL === "https://media.ajazz.jp") {
    fail("staging cannot use the production media URL");
  }
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    fail("staging accepts Stripe test mode only");
  }
  console.log("CMS staging release gate passed; schema migration may proceed.");
} else if (environment === "local") {
  if (railwayEnvironment) {
    fail("Railway cannot deploy with CMS_DEPLOYMENT_ENV=local");
  }
  console.log("CMS local environment accepted.");
} else {
  fail("CMS_DEPLOYMENT_ENV must be production, staging, or local");
}
```

错误信息不得包含数据库 URL、密钥值或完整环境变量内容。

- [ ] **步骤 4：运行专项测试**

运行：

```powershell
pnpm exec vitest run tests/deployment/cms-release-gate.test.ts --maxWorkers=1
```

预期：全部通过。

- [ ] **步骤 5：提交任务 1**

```powershell
git add scripts/verify-cms-release-gate.mjs tests/deployment/cms-release-gate.test.ts
git commit -m "feat: separate CMS release gates by environment"
```

---

### 任务 2：增加 staging 运行时安全保护

**文件：**
- 新建：`lib/deployment/staging-safety.ts`
- 新建：`tests/deployment/staging-runtime-safety.test.ts`
- 修改：`lib/commerce/stripe.ts`
- 修改：`lib/cms/r2-storage.ts`
- 修改：`tests/cms/media-storage.test.ts`

**接口：**
- 产生：`assertStripeEnvironmentSafety`、`assertR2EnvironmentSafety`、`isRmsSyncEnabled`。
- 使用者：Stripe 客户端工厂、R2 配置工厂和 RMS 定时接口。

- [ ] **步骤 1：为纯安全函数写失败测试**

新建 `tests/deployment/staging-runtime-safety.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  assertR2EnvironmentSafety,
  assertStripeEnvironmentSafety,
  isRmsSyncEnabled,
} from "../../lib/deployment/staging-safety";

describe("staging runtime safety", () => {
  it("rejects live Stripe and production R2 in staging", () => {
    expect(() => assertStripeEnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      STRIPE_SECRET_KEY: "sk_live_forbidden",
    })).toThrow("Stripe test mode");

    expect(() => assertR2EnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media",
      R2_PUBLIC_URL: "https://media.ajazz.jp",
    })).toThrow("staging R2");
  });

  it("accepts staging test resources and disables RMS only on exact false", () => {
    expect(() => assertStripeEnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      STRIPE_SECRET_KEY: "sk_test_allowed",
    })).not.toThrow();
    expect(() => assertR2EnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media-staging",
    })).not.toThrow();
    expect(isRmsSyncEnabled({ RMS_SYNC_ENABLED: "false" })).toBe(false);
    expect(isRmsSyncEnabled({ RMS_SYNC_ENABLED: "true" })).toBe(true);
  });
});
```

- [ ] **步骤 2：运行测试并确认模块不存在**

```powershell
pnpm exec vitest run tests/deployment/staging-runtime-safety.test.ts --maxWorkers=1
```

预期：失败，提示找不到 `lib/deployment/staging-safety.ts`。

- [ ] **步骤 3：实现纯运行时安全模块**

新建 `lib/deployment/staging-safety.ts`：

```ts
type DeploymentEnvironment = Record<string, string | undefined>;

export function assertStripeEnvironmentSafety(environment: DeploymentEnvironment) {
  if (environment.CMS_DEPLOYMENT_ENV !== "staging") return;
  const secretKey = environment.STRIPE_SECRET_KEY;
  if (secretKey && !secretKey.startsWith("sk_test_")) {
    throw new Error("Staging permits Stripe test mode only");
  }
}

export function assertR2EnvironmentSafety(environment: DeploymentEnvironment) {
  if (environment.CMS_DEPLOYMENT_ENV !== "staging") return;
  if (!environment.R2_BUCKET?.endsWith("-staging")) {
    throw new Error("Staging R2 bucket is not isolated");
  }
  if (environment.R2_PUBLIC_URL === "https://media.ajazz.jp") {
    throw new Error("Staging R2 cannot use the production media URL");
  }
}

export function isRmsSyncEnabled(environment: DeploymentEnvironment) {
  return environment.RMS_SYNC_ENABLED !== "false";
}
```

- [ ] **步骤 4：把安全函数接入 Stripe 和 R2**

在 `lib/commerce/stripe.ts` 的三个 `configuredStripe...` 工厂读取密钥前调用：

```ts
import { assertStripeEnvironmentSafety } from "../deployment/staging-safety";

assertStripeEnvironmentSafety(process.env);
```

在 `lib/cms/r2-storage.ts` 的 `createR2StorageOptions` 开头调用：

```ts
import { assertR2EnvironmentSafety } from "../deployment/staging-safety";

assertR2EnvironmentSafety(environment);
```

在 `tests/cms/media-storage.test.ts` 增加 staging 使用正式 Bucket 和正式媒体地址时抛错的测试，同时保留私有 Bucket、Payload 受控读取的现有断言。

- [ ] **步骤 5：运行安全与现有媒体测试**

```powershell
pnpm exec vitest run tests/deployment/staging-runtime-safety.test.ts tests/cms/media-storage.test.ts tests/commerce/checkout-handler.test.ts tests/commerce/stripe-webhook-handler.test.ts --maxWorkers=1
```

预期：全部通过；错误信息不包含任何密钥值。

- [ ] **步骤 6：提交任务 2**

```powershell
git add lib/deployment/staging-safety.ts tests/deployment/staging-runtime-safety.test.ts lib/commerce/stripe.ts lib/cms/r2-storage.ts tests/cms/media-storage.test.ts
git commit -m "feat: protect staging payment and media resources"
```

---

### 任务 3：让 staging 明确停用 RMS 同步

**文件：**
- 修改：`lib/rms/cron.ts`
- 修改：`app/api/cron/rms-inventory/route.ts`
- 修改：`tests/rms/cron.test.ts`

**接口：**
- `createRmsInventoryCronHandler` 新增 `enabled: boolean` 依赖。
- 停用时返回 HTTP `503` 和固定错误 `RMS inventory sync is disabled`，且不调用 `sync()`。

- [ ] **步骤 1：写停用 RMS 的失败测试**

在 `tests/rms/cron.test.ts` 增加：

```ts
it("does not call RMS when inventory sync is disabled", async () => {
  let syncCalls = 0;
  const handler = createRmsInventoryCronHandler({
    enabled: false,
    secret: "cron-secret",
    async sync() {
      syncCalls += 1;
      return { updated: 1, failed: 0 };
    },
  });

  const response = await handler(new Request(
    "https://ajazz-staging.up.railway.app/api/cron/rms-inventory",
    { headers: { authorization: "Bearer cron-secret" } },
  ));

  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({
    error: "RMS inventory sync is disabled",
  });
  expect(syncCalls).toBe(0);
});
```

现有成功测试增加 `enabled: true`。

- [ ] **步骤 2：运行测试并确认类型或行为失败**

```powershell
pnpm exec vitest run tests/rms/cron.test.ts --maxWorkers=1
```

预期：失败，因为处理器尚未接收或执行 `enabled`。

- [ ] **步骤 3：实现停用分支并接入路由**

在 `lib/rms/cron.ts` 中，认证成功后、调用 `sync()` 前加入：

```ts
if (!dependencies.enabled) {
  return Response.json(
    { error: "RMS inventory sync is disabled" },
    { status: 503 },
  );
}
```

在 `app/api/cron/rms-inventory/route.ts` 传入：

```ts
import { isRmsSyncEnabled } from "../../../../lib/deployment/staging-safety";

enabled: isRmsSyncEnabled(process.env),
```

未经授权的请求仍优先返回 `401`，避免泄露运行状态。

- [ ] **步骤 4：运行 RMS 与 Cloudflare Cron 测试**

```powershell
pnpm exec vitest run tests/rms/cron.test.ts tests/rms/sync.test.ts tests/cloudflare/operations-cron.test.ts --maxWorkers=1
```

预期：全部通过。

- [ ] **步骤 5：提交任务 3**

```powershell
git add lib/rms/cron.ts app/api/cron/rms-inventory/route.ts tests/rms/cron.test.ts
git commit -m "feat: disable RMS inventory sync in staging"
```

---

### 任务 4：补齐 staging 配置和运维文档

**文件：**
- 修改：`.env.example`
- 修改：`README.md`
- 修改：`docs/operations/product-admin-cms.md`
- 新建：`docs/operations/railway-staging.md`
- 新建：`tests/deployment/railway-staging-readiness.test.ts`

**接口：**
- 文档提供唯一的 staging 变量清单和创建顺序。
- 自动化测试锁定 staging 不使用正式域名、RMS 密钥或 Stripe 正式模式。

- [ ] **步骤 1：写 staging 文档完整性失败测试**

新建 `tests/deployment/railway-staging-readiness.test.ts`，读取设计、运维文档、`.env.example` 和 `railway.json`，至少断言：

```ts
expect(documentation).toContain("CMS_DEPLOYMENT_ENV=staging");
expect(documentation).toContain("CMS_STAGING_ISOLATION_CONFIRMED=confirmed");
expect(documentation).toContain("RMS_SYNC_ENABLED=false");
expect(documentation).toContain("ajazz-japan-media-staging");
expect(documentation).toContain("feat/ajazz-japan-store");
expect(documentation).toContain("BOOTSTRAP_ADMIN_PASSWORD");
expect(documentation).toContain("Stripe 测试模式");
expect(documentation).toContain("私有 R2 Bucket");
expect(railway.deploy.preDeployCommand).toBe(
  "pnpm cms:release:check && pnpm cms:migrate",
);
```

并断言 staging 变量区不包含 `RMS_SERVICE_SECRET`、`RMS_LICENSE_KEY`、
`CMS_RELEASE_CREDENTIALS_ROTATED` 或 `CMS_RELEASE_HISTORY_CLEANUP_APPROVED`。

- [ ] **步骤 2：运行测试并确认文档缺失**

```powershell
pnpm exec vitest run tests/deployment/railway-staging-readiness.test.ts --maxWorkers=1
```

预期：失败，因为 `docs/operations/railway-staging.md` 尚不存在。

- [ ] **步骤 3：更新示例变量与 README**

在 `.env.example` 增加以下非密钥示例：

```env
CMS_DEPLOYMENT_ENV=local
RMS_SYNC_ENABLED=false
CMS_STAGING_ISOLATION_CONFIRMED=
```

README 分开列出 production、staging 和一次性 bootstrap 变量，不把后台初始化密码写入长期配置区。

- [ ] **步骤 4：编写 staging 运维文档**

`docs/operations/railway-staging.md` 必须按顺序记录：

1. 推送 `feat/ajazz-japan-store` 到 `fork`。
2. 在 Railway 创建空的持久化 `staging` 环境，不复制 production 变量。
3. 添加独立 PostgreSQL 和 GitHub 网站服务。
4. 生成 Railway HTTPS 域名。
5. 创建私有 `ajazz-japan-media-staging` R2 Bucket 和仅限该 Bucket 的 Object Read & Write 凭证。
6. 检查数据库引用和 R2 名称后，才设置 `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`。
7. 配置 staging 变量并保持 RMS 关闭、Stripe 正式密钥为空。
8. 部署、检查迁移和 `/api/health`。
9. 临时设置 bootstrap 变量，创建管理员后立即删除密码。
10. 执行桌面、手机和功能验收。

文档明确说明 R2 Bucket 默认私有，媒体通过 Payload 读取。Cloudflare 官方文档说明 R2 Bucket 默认不公开，Bucket 级 Object Read & Write Token 可以限制到指定 Bucket。

- [ ] **步骤 5：运行部署文档测试**

```powershell
pnpm exec vitest run tests/deployment --maxWorkers=1
```

预期：全部通过。

- [ ] **步骤 6：提交任务 4**

```powershell
git add .env.example README.md docs/operations/product-admin-cms.md docs/operations/railway-staging.md tests/deployment/railway-staging-readiness.test.ts
git commit -m "docs: add Railway staging operations guide"
```

---

### 任务 5：完成代码验证并推送到用户自己的 GitHub 仓库

**文件：**
- 验证整个工作树，不修改业务文件。

**接口：**
- 输出：可由 Railway staging 拉取的 `fork/feat/ajazz-japan-store` 分支。

- [ ] **步骤 1：运行完整测试**

```powershell
pnpm exec vitest run --maxWorkers=1
```

预期：全部通过，无跳过的 staging 安全测试。

- [ ] **步骤 2：运行类型检查和生产构建**

```powershell
pnpm exec tsc --noEmit
pnpm build
```

预期：类型检查退出码 `0`；Next.js 显示 `Compiled successfully` 并列出 `/admin`、`/api/cms`、`/api/health` 和 RMS/Stripe 路由。

- [ ] **步骤 3：检查提交边界和敏感值**

```powershell
git diff --check
git status --short
git log -8 --oneline
```

只允许两份既有 Task 4/5 报告保持未暂存。搜索当前分支新增文件中的 `sk_live_`、`whsec_`、真实 PostgreSQL URL 和 RMS 密钥；只允许测试用伪值或文档变量名。

- [ ] **步骤 4：推送当前功能分支到 `xbwgdt`**

```powershell
git push fork feat/ajazz-japan-store
```

预期：`fork/feat/ajazz-japan-store` 与本地 `HEAD` 指向同一个提交；不向 `origin` 推送。

---

### 任务 6：创建 Railway 和 Cloudflare staging 资源

**文件：**
- 不修改仓库文件。
- 外部资源：Railway `staging` 环境、独立 PostgreSQL、网站服务、私有 Cloudflare R2 Bucket。

**接口：**
- 输入：已推送的 `xbwgdt/ajazz-japan-landing` 功能分支。
- 输出：可访问的 Railway HTTPS staging URL 和通过健康检查的部署。

- [ ] **步骤 1：在 Railway 创建空 staging 环境**

在现有项目顶部环境菜单选择 **New Environment**，选择 **Empty Environment**，名称输入 `staging`。不要选择 Duplicate Environment，避免复制 production 服务和变量。Railway 官方环境文档确认，持久化 staging 环境与 production 配置相互隔离。

- [ ] **步骤 2：添加独立 PostgreSQL**

确认当前环境显示 `staging`，再添加 PostgreSQL 服务。数据库服务名称固定为 `Postgres-staging`。网站服务的 `DATABASE_URL` 使用该服务的 Railway 引用变量，不粘贴正式数据库 URL。

- [ ] **步骤 3：添加 GitHub 网站服务**

选择 GitHub 仓库 `xbwgdt/ajazz-japan-landing`，部署分支设置为 `feat/ajazz-japan-store`，服务名称设置为 `ajazz-store-staging`。生成 Railway 公共域名并记录为验收地址。

- [ ] **步骤 4：创建私有 R2 Bucket 和限定凭证**

在 Cloudflare R2 创建 `ajazz-japan-media-staging`，保持 Public Development URL 和自定义域名关闭。创建仅限该 Bucket 的 Object Read & Write Token，记录一次性显示的 Access Key ID 和 Secret Access Key，随后只写入 Railway staging 变量。不得创建 Account Admin Token。

- [ ] **步骤 5：配置 staging 变量**

在 `ajazz-store-staging` 的 Variables 中配置：

```env
CMS_DEPLOYMENT_ENV=staging
CMS_STAGING_ISOLATION_CONFIRMED=confirmed
RMS_SYNC_ENABLED=false
NEXT_PUBLIC_SITE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
R2_BUCKET=ajazz-japan-media-staging
```

`DATABASE_URL` 必须引用 `Postgres-staging`。不配置 `R2_PUBLIC_URL`、
`RMS_SERVICE_SECRET`、`RMS_LICENSE_KEY`、Stripe 正式密钥或 production 发布确认变量。

`PAYLOAD_SECRET` 和 `CRON_SECRET` 分别运行一次以下命令生成，每次只把输出
写入对应的 Railway sealed variable，不写入文件或聊天：

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY` 使用步骤 4 中一次性显示的
Bucket 限定凭证。`R2_ENDPOINT` 从 Cloudflare R2 **Account Details > S3 API**
复制完整 Endpoint，不手工猜测 Account ID。

- [ ] **步骤 6：部署并验证基础运行状态**

审核 Railway staged changes 后部署。日志必须依次出现 staging release gate 通过、Payload migration 成功、Next.js 启动和 `/api/health` 返回 `200`。若任一步失败，停止，不修改 production。

- [ ] **步骤 7：创建测试管理员并删除初始化密码**

临时配置 `BOOTSTRAP_ADMIN_EMAIL=xiet@a-jazz.com`。使用上一步相同的
48-byte 随机命令单独生成 `BOOTSTRAP_ADMIN_PASSWORD`，写入 Railway 后不在
终端或文档再次显示。重新部署，然后将 Railway CLI 链接到当前项目、
`staging` 环境和 `ajazz-store-staging` 服务，在已部署容器中运行：

```powershell
railway ssh -e staging pnpm cms:bootstrap-admin
```

管理员创建成功后立即从 Railway staging 删除 `BOOTSTRAP_ADMIN_PASSWORD`。保留邮箱变量不是运行要求，也可以一并删除。

---

### 任务 7：执行 HTTPS 浏览器验收

**文件：**
- 新建本地验收证据目录：`artifacts/cms-acceptance/staging/desktop/`
- 新建本地验收证据目录：`artifacts/cms-acceptance/staging/mobile/`
- 不提交包含账号、订单地址或密钥的截图。

**接口：**
- 输入：Railway HTTPS staging URL、测试管理员、测试商品和可选 Stripe 测试密钥。
- 输出：浏览器验收记录；未满足的项目明确标记为待完成。

- [ ] **步骤 1：验证环境身份**

访问 staging `/api/health`、首页和 `/admin`。确认域名不是 `ajazz.jp`，页面资源没有使用 `media.ajazz.jp`，RMS 定时接口在正确授权下返回 `503` 和 `RMS inventory sync is disabled`。

- [ ] **步骤 2：完成后台商品流程**

登录 Payload，创建测试商品 `STAGING-AJAZZ-QA-001`，添加两个颜色、测试价格、缩略图和图片。依次验证草稿、预览、发布、下架、归档、恢复和版本恢复。测试完成后将商品归档，不删除审计证据。

- [ ] **步骤 3：验证媒体隔离**

上传一张不含个人信息的测试图片，确认对象只出现在 `ajazz-japan-media-staging`，前台通过 staging Payload 地址读取，浏览器无法列出 Bucket 或获得 R2 写入凭证。

- [ ] **步骤 4：验证商城和订单后台**

检查商品搜索、筛选、详情颜色切换、二重价格规则、购物车、订单导出、发货、退款和库存返还。只使用测试订单和测试地址。

- [ ] **步骤 5：有 Stripe 测试密钥时执行测试结账**

仅当 `STRIPE_SECRET_KEY` 以 `sk_test_` 开头且 Webhook 使用测试模式时执行。未配置 Stripe 测试账户时，将结账验收标记为“等待 Stripe 测试密钥”，其他 staging 验收继续进行，不得填写正式密钥。

- [ ] **步骤 6：检查桌面和手机布局**

分别使用 `1440x900` 和 `390x844`，截图管理员登录、后台首页、商品编辑、商城列表和商品详情。检查文字截断、重叠、缺图、按钮可用性和浏览器控制台错误。

- [ ] **步骤 7：形成验收结论**

记录每项通过、失败或等待外部条件。只有全部必需项目通过时才称 staging 验收完成。此任务不触发 production 部署，不切换 `ajazz.jp`。

## 最终验证清单

- [ ] production 发布闸门仍需要两项正式确认。
- [ ] staging 只接受 Railway 环境名 `staging`。
- [ ] staging PostgreSQL 与 production 不共享。
- [ ] staging R2 私有且凭证仅限 `ajazz-japan-media-staging`。
- [ ] staging RMS 同步无法执行。
- [ ] staging 不接受 Stripe 正式密钥。
- [ ] `BOOTSTRAP_ADMIN_PASSWORD` 已删除。
- [ ] 完整测试、类型检查和生产构建通过。
- [ ] 桌面及手机截图已逐张检查。
- [ ] `ajazz.jp`、production Railway 和正式数据未被修改。

## 参考资料

- Railway 环境支持同一项目中的隔离 staging，并提供 Empty Environment：`https://docs.railway.com/environments`
- Railway 环境变量在构建和运行时可用：`https://docs.railway.com/variables`
- Railway SSH 可在指定环境的已部署容器中运行命令：`https://docs.railway.com/cli/ssh`
- Cloudflare R2 Bucket 默认私有：`https://developers.cloudflare.com/r2/buckets/create-buckets/`
- Cloudflare R2 Token 可限制为指定 Bucket 的 Object Read & Write：`https://developers.cloudflare.com/r2/api/tokens/`
