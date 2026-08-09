# Railway 测试环境运维指南

## 范围与隔离原则

本指南只建立持久化的 Railway `staging` 环境，用于验收商城和 Payload 商品后台。它不
部署 production、不切换 `ajazz.jp`，也不使用 production 数据库、R2、RMS 或 Stripe
正式模式资源。`CMS_DEPLOYMENT_ENV` 是发布闸门的环境分类；在 Railway 中必须为
`staging`，并且 `RAILWAY_ENVIRONMENT_NAME` 必须同为 `staging`。`RMS_SYNC_ENABLED` 仅在
值精确为 `false` 时关闭 RMS 同步；staging 必须保持该值。

R2 Bucket 默认不公开；保持 `ajazz-japan-media-staging` 为私有 Bucket，不启用 Public
Development URL 或自定义媒体域名。Payload 使用服务端 R2 凭证写入和读取媒体，浏览器
不能列举 Bucket，也不能获得写入凭证。[Cloudflare 的 R2 文档](https://developers.cloudflare.com/r2/buckets/create-buckets/)
说明 Bucket 默认不公开；其[认证文档](https://developers.cloudflare.com/r2/api/tokens/)
说明 `Object Read & Write` 凭证可以限制到指定 Bucket。

## 创建顺序

1. 将 `feat/ajazz-japan-store` 推送到 `fork`，供 Railway 从该分支构建；本指南本身不执行推送。
2. 在 Railway 创建名称为 `staging` 的空持久化环境。选择 Empty Environment，不要复制 production 环境或其变量。
3. 在该环境添加独立 PostgreSQL 服务，再添加 GitHub 网站服务。网站服务的 `DATABASE_URL` 只能引用此 PostgreSQL 服务的 Railway 引用变量。
4. 为网站服务生成 Railway HTTPS 域名，并记录它作为 staging 验收地址。不得绑定或使用 `https://ajazz.jp`。
5. 在 Cloudflare R2 创建私有 `ajazz-japan-media-staging` Bucket。创建仅限该 Bucket 的 `Object Read & Write` 凭证，并只将 Access Key ID 与 Secret Access Key 写入 Railway staging 变量。
6. 复核网站服务的 `DATABASE_URL` 引用指向 staging PostgreSQL，且 `R2_BUCKET` 名称精确为 `ajazz-japan-media-staging`；完成后才设置 `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`。
7. 按下方唯一清单配置 staging 长期变量，保持 RMS 关闭，并使 Stripe 正式密钥为空。
8. 部署服务，确认部署日志中的发布闸门与 Payload 迁移成功，再检查 `GET /api/health` 返回 `200`。
9. 仅在需要创建测试管理员时临时设置 bootstrap 变量，执行 `pnpm cms:bootstrap-admin` 创建后立即删除密码。
10. 进行桌面、手机和功能验收；确认管理员、媒体、商品流程、RMS 禁用响应，以及 Stripe 测试模式结账（已配置测试密钥时）都符合预期。

## Staging 变量清单（唯一）

以下是 staging 的唯一长期变量清单。尖括号内容表示在 Railway 控制台填写的值或引用，
不是可提交的值；不把任何凭证、密码或 production 值写入仓库。

```env
CMS_DEPLOYMENT_ENV=staging
RAILWAY_ENVIRONMENT_NAME=staging
DATABASE_URL=${{Postgres-staging.DATABASE_URL}}
PAYLOAD_SECRET=<staging-only-random-secret>
NEXT_PUBLIC_SITE_URL=https://<Railway-HTTPS-domain>
CRON_SECRET=<staging-only-random-secret>
RMS_SYNC_ENABLED=false
CMS_STAGING_ISOLATION_CONFIRMED=confirmed
R2_BUCKET=ajazz-japan-media-staging
R2_ACCESS_KEY_ID=<bucket-scoped-access-key-id>
R2_SECRET_ACCESS_KEY=<bucket-scoped-secret-access-key>
R2_ENDPOINT=https://<Cloudflare-account-id>.r2.cloudflarestorage.com
STRIPE_SECRET_KEY=<Stripe-test-mode-secret>
STRIPE_WEBHOOK_SECRET=<Stripe-test-mode-webhook-secret>
```

`STRIPE_SECRET_KEY` 仅可为 Stripe 测试模式密钥；没有测试密钥时保持为空并跳过结账验收，
绝不能填写正式密钥。不要设置 `R2_PUBLIC_URL`，也不要配置 production-only RMS 凭据
`RMS_SERVICE_SECRET` 或 `RMS_LICENSE_KEY`。同样不得在 staging 长期变量中设置 production
发布证明 `CMS_RELEASE_CREDENTIALS_ROTATED` 或
`CMS_RELEASE_HISTORY_CLEANUP_APPROVED`。

## 一次性管理员初始化

在第 8 步部署与迁移成功后，才临时设置 `BOOTSTRAP_ADMIN_EMAIL` 和
`BOOTSTRAP_ADMIN_PASSWORD`，然后执行：

```powershell
pnpm cms:bootstrap-admin
```

管理员创建成功后立即删除 `BOOTSTRAP_ADMIN_PASSWORD`；该密码不是长期 staging 配置，也
不应出现在日志、截图、工单或文档中。

## 验收与故障处理

桌面和手机均验证 Railway HTTPS 域名、`/admin`、首页、商品编辑与 Payload 私有媒体读取。
在已授权的 RMS 定时接口上确认返回禁用状态，且不发起 RMS 同步。若配置 Stripe 测试密钥，
完成测试模式结账；否则记录为等待测试密钥，不得以正式密钥替代。任一隔离检查、迁移或
`/api/health` 失败时，停止 staging 部署并修复该环境，不修改 production 服务或资源。
