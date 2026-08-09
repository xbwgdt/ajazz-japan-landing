# AJAZZ JAPAN Railway 测试环境设计

## 目的

在 Railway 中创建一个非正式环境，通过公开的 HTTPS 地址验收 AJAZZ
JAPAN 商城、Payload 商品管理后台、媒体文件和测试结账流程，再考虑发布到
正式环境。测试环境不得读取或修改正式订单、商品数据、媒体文件、Stripe
付款或乐天 RMS 库存。

## 已选方案

在现有 Railway 项目中新增一个名为 `staging` 的环境。两个环境可以属于
同一个 Railway 项目，但测试环境必须拥有独立的网站服务、PostgreSQL
数据库、环境变量和 Cloudflare R2 Bucket。正式环境保持不变，只有通过
单独的正式发布闸门和验收流程后，才允许为 `ajazz.jp` 提供服务。

与新建另一个 Railway 项目相比，这种方式更容易管理，同时仍能隔离资源。
禁止直接使用正式环境进行测试。

## 环境划分

### 正式环境

- Railway 环境名称：`production`。
- 网站地址：`https://ajazz.jp`。
- 媒体地址：`https://media.ajazz.jp`。
- 只有在正式发布流程批准后，才允许使用正式 PostgreSQL、正式 R2、
  Stripe 正式密钥和 RMS 密钥。
- 在确认密钥轮换及经过批准的 Git 历史清理之前，必须禁止部署。

### 测试环境

- Railway 环境名称：`staging`。
- 第一阶段使用 Railway 自动生成的 HTTPS 地址。
- 使用在 `staging` 环境中新建的空 PostgreSQL 服务。
- 使用名为 `ajazz-japan-media-staging` 的私有 R2 Bucket 和独立写入密钥。
  图片通过测试环境的 Payload 媒体接口读取，不直接公开 R2 Bucket。
- 只允许 Stripe 测试模式。发现 Stripe 正式密钥时必须阻止启动。
- 禁用 RMS 库存同步，不得把正式 RMS 密钥添加到测试环境。
- 数据库迁移完成后，创建测试环境专用的 Payload 管理员账号。
- 不接收 `ajazz.jp` 或 `media.ajazz.jp` 的流量。

## 环境识别与发布闸门

新增环境变量 `CMS_DEPLOYMENT_ENV`，只允许使用 `production`、`staging`
和 `local` 三个值。

发布检查命令必须按以下规则运行：

- `production`：必须同时满足 `RAILWAY_ENVIRONMENT_NAME=production`、
  `CMS_RELEASE_CREDENTIALS_ROTATED=confirmed` 和
  `CMS_RELEASE_HISTORY_CLEANUP_APPROVED=confirmed`，才能执行数据库迁移。
- `staging`：必须满足 `RAILWAY_ENVIRONMENT_NAME=staging`、
  `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`、
  `RMS_SYNC_ENABLED=false`；R2 Bucket 名称必须精确为
  `ajazz-japan-media-staging`；不得配置 `https://media.ajazz.jp` 作为
  媒体地址；Stripe 密钥必须为空，或以 `sk_test_` 开头。
- `local`：只有在不存在 Railway 环境变量时才允许本地开发。Railway
  中使用 `CMS_DEPLOYMENT_ENV=local` 时必须拒绝部署。
- 环境类型缺失、值不受支持或不同变量互相矛盾时，必须在数据库迁移前
  阻止部署。

`CMS_STAGING_ISOLATION_CONFIRMED` 是负责人对资源隔离情况的确认，不能
自动证明数据库确实独立。设置这个变量之前，负责人必须在 Railway 页面
确认测试环境的 `DATABASE_URL` 指向新建的测试 PostgreSQL 服务，而不是
共享变量或正式数据库。

## 测试环境变量

测试环境需要配置以下内容：

- 由测试环境 PostgreSQL 服务自动生成的 `DATABASE_URL`。
- 新生成的测试环境 `PAYLOAD_SECRET`。
- `CMS_DEPLOYMENT_ENV=staging`。
- 只在资源检查完成后设置
  `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`。
- 将 `NEXT_PUBLIC_SITE_URL` 设置为 Railway 自动生成的 HTTPS 地址。
- 设置 `RMS_SYNC_ENABLED=false`，并且不配置 `RMS_SERVICE_SECRET` 和
  `RMS_LICENSE_KEY`。
- 只有开始测试结账时，才配置 Stripe 测试模式密钥。
- 配置 `R2_BUCKET=ajazz-japan-media-staging`、独立的测试 R2 密钥和
  Endpoint。R2 Bucket 保持私有，图片由测试环境 Payload 接口读取。
- 只有创建测试管理员账号时，临时设置 `BOOTSTRAP_ADMIN_EMAIL` 和
  `BOOTSTRAP_ADMIN_PASSWORD`；账号创建后立即删除密码变量。

不得把任何正式密钥复制到测试环境。文档和截图可以显示变量名称及是否
已配置，但不得显示密钥内容。

## 数据与服务流程

1. GitHub 分支 `feat/ajazz-japan-store` 部署到 Railway 测试环境。
2. Railway 执行环境发布检查。
3. 检查通过后，才允许对测试 PostgreSQL 执行 Payload 数据库迁移。
4. Railway 启动 Next.js 应用，并通过 `/api/health` 检查运行状态。
5. 创建一次测试管理员账号，然后删除管理员初始化密码。
6. 测试商品和媒体文件只能写入测试 PostgreSQL 和测试 R2 Bucket。
7. Stripe Checkout 使用测试模式，RMS 同步保持关闭。
8. 使用 Railway 的 HTTPS 测试地址执行浏览器验收。

## 浏览器验收

只能使用代表性的测试商品，不得使用真实客户信息或正式订单数据。分别以
`1440x900` 桌面尺寸和 `390x844` 手机尺寸截图并检查。

必须检查以下项目：

- Payload 管理员登录和后台首页。
- 新增商品、保存草稿、预览、发布、下架、归档、恢复和版本恢复。
- 多颜色商品的缩略图、色块、图片、售价、二重价格批准状态和库存行为。
- 测试 R2 图片上传及通过 Payload 接口读取，并确认 R2 Bucket 不可公开
  写入或列出对象。
- 商品搜索和后台全部筛选条件。
- 商城商品列表、商品详情与后台已发布数据一致。
- 只使用 Stripe 测试模式结账。
- 使用测试订单检查订单导出、发货、退款和库存返还。
- 驱动页面跳转和外部链接安全。
- 页面不存在重叠、文字截断、图片缺失或应用程序控制台错误。

如果测试页面加载正式媒体文件、产生 Stripe 正式付款、触发 RMS 同步，
或者连接正式数据库，则测试环境不得通过验收。

## 失败处理与清理

- 发布闸门或数据库迁移失败时，保留上一个可用的测试环境部署。
- 测试商品或媒体操作失败时，不得触发正式环境的清理任务或 Webhook。
- 管理员账号创建后删除 `BOOTSTRAP_ADMIN_PASSWORD`。
- 保留测试环境用于以后正式发布前的验收，但应轮换或删除不再使用的测试
  密钥。
- 将来删除测试环境时，需要明确批准，并先确认待删除资源全部属于测试
  环境。清理测试环境时绝不删除正式资源。

## 实施与操作边界

实施阶段可以修改发布闸门代码、测试和文档，也可以在明确确认目标位置后
创建测试专用的 Railway 和 R2 资源。禁止推送到正式分支、切换
`ajazz.jp`、执行正式数据库迁移、修改正式环境变量、启用 RMS 同步或使用
Stripe 正式模式。

成功标准是：测试环境 HTTPS 网站通过全部自动化检查及桌面、手机浏览器
验收，同时正式环境保持不变。
