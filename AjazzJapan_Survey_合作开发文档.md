# Ajazz Japan Landing — 问卷调查功能合作开发文档

---

## 一、项目概况

| 项目 | 说明 |
|------|------|
| 项目名称 | Ajazz Japan Landing（ajazz-japan-landing） |
| 用途 | 黑爵（Ajazz）日本市场产品展示页 + 问卷调查 |
| 域名 | `ajazz-japan-landing.vercel.app` |
| 框架 | Next.js 14（TypeScript） |
| 部署方式 | GitHub → Vercel 自动部署（push main 分支后约 30s 上线） |
| 当前类型 | 纯静态页面（无后端，无数据库） |

---

## 二、合作开发流程

### 2.1 仓库地址

```
https://github.com/xieyee-dev/ajazz-japan-landing
```

### 2.2 Git 协作方式

#### 方式 A：作为仓库 Collaborator（推荐）

1. 提供 Sky 的 GitHub 用户名
2. 管理员在 GitHub 仓库 Settings → Collaborators 中添加
3. Sky 获得 push 权限，可直接推送分支

#### 方式 B：Fork + Pull Request

1. Sky fork 仓库到自己的 GitHub 账号
2. 在 fork 中创建 `feat/survey` 分支开发
3. 完成后向主仓库 main 分支提交 Pull Request
4. 管理员 review 后合并

### 2.3 推荐分支策略

| 分支 | 用途 |
|------|------|
| `main` | 生产环境，Vercel 自动部署 |
| `feat/survey` | 问卷功能开发分支 |
| `feat/*` | 其他功能分支 |

开发流程：
```
git checkout -b feat/survey
# 开发问卷功能...
git add .
git commit -m "feat: add survey questionnaire page"
git push origin feat/survey
# 完成后提 PR → main
```

---

## 三、问卷调查功能需求

### 3.1 页面位置

- **路径：** `/survey`
- **说明：** 作为网站二级页面，从首页导航或按钮入口进入

### 3.2 问卷内容（预填示例）

问卷含产品调研问题，包括：

- 理想的键盘类型（机械键盘？60%/65%/75%/TKL/Full Size？）
- 键盘布局偏好（ANSI/JIS）
- 键盘颜色偏好（黒/白/ピンク/ブルー/グリーン/パープル）
- 功能需求（QMK/VIA 対応？ホットスワップ？RGB？）
- マウス颜色偏好
- センサー性能要求
- 応募者情報（名前/年齢/性別/メールアドレス）

### 3.3 管理后台需求

- 问卷提交后数据入库
- 管理员可查看问卷结果
- 需要管理员认证（密码/Secret）

---

## 四、环境变量需求

以下环境变量需要在 **Vercel Dashboard**（`Project Settings → Environment Variables`）中配置：

| 变量名 | 说明 | 提供方 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | 待定（见第五部分） |
| `SURVEY_ADMIN_PASSWORD` | 管理员登录密码 | 管理员生成 |
| `SURVEY_ADMIN_SECRET` | JWT/API Secret | 管理员生成 |

### Vercel 环境变量设置步骤

1. 打开 https://vercel.com/xieyee-dev/ajazz-japan-landing/settings/environment-variables
2. 分别添加以上三个变量（Environment 选择 `Production` + `Preview` + `Development`）
3. 保存后重新部署

---

## 五、数据库选择

当前项目为纯静态页面，无数据库。问卷调查功能需要数据库支持。

### 推荐选项

#### 选项 A：Supabase（推荐 ⭐）

- **类型：** PostgreSQL
- **免费额度：** 500MB 数据库 + 5GB 带宽
- **Vercel 集成：** 一键关联，自动注入 `DATABASE_URL`
- **优势：** 免费、PostgreSQL 生态成熟、Vercel 原生支持
- **设置方式：**
  1. 在 Supabase 官网创建项目（https://supabase.com）
  2. 或在 Vercel Dashboard → Storage 中一键创建
  3. 建表：`survey_responses`（存储问卷结果）
  4. 获取 `DATABASE_URL` 填入 Vercel 环境变量

#### 选项 B：MongoDB Atlas

- **类型：** MongoDB
- **免费额度：** 512MB
- **优势：** Schema-less，适合问卷数据结构灵活

#### 选项 C：其他

- 如果有现成的数据库，也可以直接用

### 推荐数据库表结构（Supabase / PostgreSQL）

```sql
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  respondent_name VARCHAR(100),
  respondent_age INT,
  respondent_gender VARCHAR(10),
  respondent_email VARCHAR(200),
  keyboard_type TEXT,
  keyboard_layout TEXT,
  keyboard_color TEXT,
  keyboard_qmk BOOLEAN,
  keyboard_hotswap BOOLEAN,
  keyboard_rgb BOOLEAN,
  mouse_color TEXT,
  sensor_performance TEXT,
  raw_data JSONB
);
```

---

## 六、代码接入参考

### 6.1 读取环境变量

```typescript
// app/survey/api/route.ts 或类似位置
const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.SURVEY_ADMIN_PASSWORD;
const adminSecret = process.env.SURVEY_ADMIN_SECRET;
```

### 6.2 创建 API Route

Next.js 14 App Router 下创建 API：

```
app/
├── survey/
│   ├── page.tsx          # 问卷页面
│   └── api/
│       ├── submit/route.ts   # 提交问卷 API
│       └── admin/route.ts    # 管理后台 API
```

示例 `app/survey/api/submit/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  // 使用 DATABASE_URL 连接数据库存储结果
  // 返回 { success: true }
  return NextResponse.json({ success: true });
}
```

---

## 七、部署

- push main 分支后，Vercel 自动构建部署
- 如需手动触发：Vercel Dashboard → Deployments → Redeploy
- 可配置 Preview Deployments 用于分支预览

---

## 八、联系人

| 角色 | 说明 |
|------|------|
| Eric（项目负责人） | 决策、环境变量审批、数据库选型 |
| Sky（前端开发者） | 问卷调查页面开发 |
| Main Assistant | 代码 review、部署支持、技术协调 |

---

## 九、下一步行动清单

- [ ] Eric 提供 Sky 的 GitHub 用户名
- [ ] 管理员将 Sky 添加为仓库 Collaborator
- [ ] Eric 选定数据库类型（推荐 Supabase）
- [ ] 创建数据库并获取 `DATABASE_URL`
- [ ] 在 Vercel Dashboard 配置环境变量
- [ ] 生成 `SURVEY_ADMIN_PASSWORD` 和 `SURVEY_ADMIN_SECRET`
- [ ] Sky 开始开发问卷功能
- [ ] 开发完成 → PR → review → merge → 自动部署

---

_文档版本：v1.0 | 生成日期：2026-07-04_
