# Ajazz Japan Landing — 问卷调查功能开发指南（给 Sky）

---

## 一、项目信息

| 项目 | 说明 |
|------|------|
| **项目名称** | Ajazz Japan Landing（ajazz-japan-landing） |
| **用途** | 黑爵（Ajazz）日本市场产品展示页 + 问卷调查 |
| **在线地址** | https://ajazz-japan-landing.vercel.app |
| **框架** | Next.js 14（TypeScript） |
| **部署方式** | GitHub main 分支 push → Vercel 自动部署（约 30 秒上线） |

---

## 二、仓库权限

**你已被添加为仓库 Collaborator（write 权限）。**

请前往 GitHub 确认邀请通知（右上角铃铛 → Accept）。

- **仓库地址：** https://github.com/xieyee-dev/ajazz-japan-landing
- **Git Clone：**
  ```bash
  git clone https://github.com/xieyee-dev/ajazz-japan-landing.git
  cd ajazz-japan-landing
  ```

---

## 三、环境变量（已配好，无需你配置）

以下环境变量已在 **Vercel Dashboard** 配置，并注入到 **Production / Preview / Development** 三个环境。

### 3.1 数据库连接（Supabase）

| 变量名 | 说明 |
|--------|------|
| `POSTGRES_URL` | ✅ 数据库连接字符串（等同于 `DATABASE_URL`） |
| `POSTGRES_URL_NON_POOLING` | ✅ 非连接池模式的数据库 URL |
| `POSTGRES_PRISMA_URL` | ✅ Prisma 连接地址 |
| `POSTGRES_USER` | ✅ 数据库用户名 |
| `POSTGRES_PASSWORD` | ✅ 数据库密码 |
| `POSTGRES_HOST` | ✅ 数据库主机 |
| `POSTGRES_DATABASE` | ✅ 数据库名称 |
| `SUPABASE_URL` | ✅ Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | ✅ 匿名密钥（前端可用） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 服务角色密钥（后端管理用） |
| `SUPABASE_JWT_SECRET` | ✅ JWT 密钥 |

### 3.2 问卷调查专用

| 变量名 | 值 | 说明 |
|--------|----|------|
| `SURVEY_ADMIN_PASSWORD` | `***` | 管理员登录密码 |
| `SURVEY_ADMIN_SECRET` | `***` | 管理员 API Secret（可用于 JWT 签名等） |

### 3.3 本地开发使用环境变量

本地开发时，在项目根目录创建 `.env.local` 文件，填入：

```bash
# 从 Vercel Dashboard 获取这些值（Project Settings → Environment Variables）
POSTGRES_URL=your_postgres_url_here
POSTGRES_URL_NON_POOLING=your_non_pooling_url_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SURVEY_ADMIN_PASSWORD=lnfOZMneOXJUmwob
SURVEY_ADMIN_SECRET=J6LHcruf3n7jdUIgMvYKfplkksazapBF
```

> ⚠️ `.env.local` 已包含在 `.gitignore` 中，不会提交到 GitHub。

---

## 四、数据库信息

| 项目 | 说明 |
|------|------|
| **服务** | Supabase（PostgreSQL） |
| **项目名** | supabase-aero-pocket |
| **机房** | Tokyo, Japan（东京，延迟最低） |
| **计划** | Free（免费版） |
| **管理后台** | https://supabase.com/dashboard/project/supabase-aero-pocket |

### 推荐表结构

问卷功能需要一张表存储提交数据。在 Supabase SQL Editor 中执行：

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

## 五、代码接入参考

### 5.1 读取环境变量

```typescript
const databaseUrl = process.env.POSTGRES_URL;
const adminPassword = process.env.SURVEY_ADMIN_PASSWORD;
const adminSecret = process.env.SURVEY_ADMIN_SECRET;
```

### 5.2 推荐目录结构

```
app/
├── survey/                    ← 问卷根目录
│   ├── page.tsx               ← 问卷页面
│   └── api/
│       ├── submit/route.ts    ← 提交问卷 POST API
│       └── admin/route.ts     ← 管理后台 GET/POST API
```

### 5.3 本地开发启动

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器 → http://localhost:3007
```

---

## 六、数据库连接示例

### 使用 Supabase SDK

安装依赖：

```bash
npm install @supabase/supabase-js
```

示例代码 `app/survey/api/submit/route.ts`：

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        respondent_name: body.name,
        respondent_age: body.age,
        respondent_gender: body.gender,
        respondent_email: body.email,
        keyboard_type: body.keyboardType,
        keyboard_layout: body.keyboardLayout,
        keyboard_color: body.keyboardColor,
        keyboard_qmk: body.qmk,
        keyboard_hotswap: body.hotswap,
        keyboard_rgb: body.rgb,
        mouse_color: body.mouseColor,
        sensor_performance: body.sensorPerformance,
        raw_data: body
      });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

### 使用 Prisma ORM（可选）

如更习惯 ORM 方式：

```bash
npm install prisma @prisma/client
npx prisma init
```

在 `prisma/schema.prisma` 中定义模型后：

```bash
npx prisma db push
```

连接字符串用 `POSTGRES_PRISMA_URL` 环境变量。

---

## 七、开发 / 提交流程

### 分支策略

```bash
# 1. 创建功能分支
git checkout -b feat/survey

# 2. 开发完成后
git add .
git commit -m "feat: add survey questionnaire page"
git push origin feat/survey

# 3. 在 GitHub 上提 Pull Request → main
# 4. Review 后合并 → Vercel 自动部署
```

### 预览部署

每次 push 分支后，Vercel 会自动生成一个 Preview URL（会显示在 GitHub PR 页面），你可以直接预览效果。

---

## 八、问卷内容（参考）

以下为预设的问卷问题：

### 键盘部分
1. 希望购买的键盘类型（メカニカル / ゲーミング / 静音 / その他）
2. 键盘尺寸偏好（60% / 65% / 75% / TKL / フルサイズ）
3. 配列偏好（ANSI / JIS）
4. 颜色偏好（黒 / 白 / ピンク / ブルー / グリーン / パープル）
5. QMK/VIA 対応是否需要（是 / 否）
6. ホットスワップ対応是否需要（是 / 否）
7. RGB ライティング是否需要（是 / 否）

### 鼠标部分
1. 颜色偏好
2. 传感器性能要求

### 个人信息（任意）
- 名前 / 年齢 / 性別 / メールアドレス

---

## 九、管理后台参考

建议的简易管理后台功能：

| 路径 | 功能 |
|------|------|
| `/survey/admin` | 管理后台登录页（用 `SURVEY_ADMIN_PASSWORD` 认证） |
| `/survey/admin/results` | 问卷结果列表 / 导出 |
| `/survey/api/admin/stats` | API：统计数据（总数、每日提交量等） |

认证方式建议：Session 或 JWT（用 `SURVEY_ADMIN_SECRET` 签名）。

---

## 十、注意事项

1. 📦 **不要提交 `.env.local` 或任何环境变量文件到 Git**
2. 🌿 **不要直接 push main 分支**，用 feature branch + PR
3. 🔒 **Supabase 的 `SERVICE_ROLE_KEY` 只用于后端 API，不要暴露到前端代码**
4. 📱 问卷页面适配手机端（日本用户移动端比例高）
5. 🇯🇵 问卷文本用日语
6. ❓ 如有问题可以提 Issue 或联系我（Main Assistant）review

---

_文档版本：v1.0 | 生成日期：2026-07-04_
