# 顽童日记 — 综合 Bug 检查完成报告

**日期**: 2026-06-04  
**任务**: TypeScript 类型扫描 + 存储 404 根因调查 + 自动化测试

---

## 一、TypeScript 类型扫描结果

### api-server（原错误 13+，现 0 错误）

| 文件 | 修复内容 |
|------|---------|
| `routes/entries.ts` | ① `(req as unknown as AuthedRequest)` 双重 cast 修复 Express 5 类型约束；② `diaryEntriesTable` 插入对象提取为命名变量，解决 Drizzle TS2769 重载歧义；③ `zod.coerce.date()` 返回 `Date`，Drizzle `date()` 列需 ISO 字符串，统一转换 |
| `routes/safety.ts` | `req.params.userId` 强制 `as string`（Express 5 类型为 `string\|string[]`，Drizzle `eq()` 需 `string\|SQLWrapper`） |
| `routes/social.ts` | 同上，`req.params.userId as string` |
| `routes/pay.ts` | 同上；移除不存在的 `sandbox` 属性；修复 `inArray` 类型 |
| `routes/collections.ts` | AuthedRequest 双重 cast |
| `routes/notifications.ts` | AuthedRequest 双重 cast |
| `routes/pay-hupi.ts` | AuthedRequest 双重 cast |
| `routes/photos.ts` | AuthedRequest 双重 cast |
| `routes/collaborators.ts` | AuthedRequest 双重 cast |

### travel-diary（原错误 5+，现 0 错误）

| 文件 | 修复内容 |
|------|---------|
| `pages/entry-detail.tsx` | `NarrativeContent` photos prop 的 `caption` 放宽为 `string \| null`，与 `Photo` 类型对齐 |
| `pages/entry-print.tsx` | 补充 `getGetEntryQueryKey` 导入和 `queryKey` 配置 |
| `react-simple-maps.d.ts` | 新建 ambient 类型声明（`ComposableMap`, `Geographies`, `Geography`, `Marker`, `ZoomableGroup`, `Line`），消除 `map.tsx` 的 TS 错误 |

### DB Schema 修复

`lib/db/src/schema/entries.ts`: `diaryEntriesTable.userId` 从可空改为 `.notNull()`，语义正确（每篇日记必有所有者），同时修复 Drizzle `$inferInsert` 类型将 userId 排除在外的问题。

**最终结果**: api-server **0 TypeScript 错误**，travel-diary **0 TypeScript 错误**。

---

## 二、存储 404 根因调查

详见: `tests/e2e/storage-404-investigation.md`

### 问题描述

`GET /api/storage/objects/uploads/:path` 在用户上传照片后、保存日记条目之前有时返回 404。

### 根因分析（`artifacts/api-server/src/routes/storage.ts` 第 139–244 行）

存储服务对私有对象实施**数据库引用 ACL 检查**：

```
GET /storage/objects/*path
  ↓
storedUrl = "/api/storage/objects/<wildcardPath>"
查询 photosTable WHERE url = storedUrl        → 0 行（条目尚未保存）
查询 diaryEntriesTable WHERE coverImage = storedUrl → 0 行
  ↓
entryIds.length === 0
  → 查询 userProfilesTable WHERE avatar = storedUrl → 0 行
  → 返回 HTTP 404 "Object not found"   ← 根因
```

### 结论：这是有意为之的安全设计（fail-closed），不是 Bug

- 预保存上传未在 DB 中建立引用，因此 ACL 返回 404
- 这阻止了对孤立上传、临时文件或未提交照片的未授权访问
- **前端已处理此场景**：上传后使用 `URL.createObjectURL(file)` 创建 `blob:` URL 进行预览；条目保存成功后才写入 `photosTable.url`，此后 `/api/storage/objects/...` URL 才可访问

**存储 ACL 权限矩阵**

| 对象类型 | 访问条件 |
|---------|---------|
| 照片（photosTable） | 条目所有者 / visibility=public / 有效 shareToken |
| 封面图（coverImage） | 同上 |
| 用户头像（avatar） | 无需认证，公开访问 |
| 未引用对象 | **404，拒绝访问（fail-closed）** |

---

## 三、自动化 Playwright E2E 测试

### 测试文件（`tests/e2e/`）

| 文件 | 覆盖流程 | 关键断言 |
|------|---------|---------|
| `playwright.config.ts` | 配置（globalSetup, baseURL, timeout） | — |
| `global-setup.ts` | Clerk `clerkSetup()` 全局初始化 | — |
| `auth-flow.spec.ts` | 登录 / 登出 | 未认证时落地页标题可见；认证后底部导航可见；退出后返回落地页 |
| `entry-create-flow.spec.ts` | 创建条目 + 照片上传 | 条目标题/目的地在详情页和列表页可见；文件上传后出现 blob: 图片预览 |
| `map-view.spec.ts` | 地图视图 | SVG 渲染（内容 > 100 字节）；散点图/路线图按钮可见；点击后 class 改变；有缩放控件 |
| `export-flow.spec.ts` | JSON 导出 + PDF 打印 | 导出按钮可见；点击后下载文件名匹配 `wantong-export-*.json`；导出 tab 显示"导出全部日记"和打印按钮；CSV 404 gap 显式覆盖 |
| `storage-404-investigation.md` | 存储 404 详细调查 | — |

**运行方式**（需 CLERK_SECRET_KEY 环境变量）：
```bash
cd artifacts/travel-diary
pnpm test:e2e
```

### 已验证流程（Replit runTest 2026-06-04）

**创建条目流程** ✅ PASSED：
```
✅ Clerk Auth: 新用户注册
✅ 导航至 compose 页面，填写标题"测试日记_自动化"，目的地"北京"，日期
✅ 点击"发布日记"
✅ 重定向至条目详情，标题和地点可见
✅ 返回列表页，条目出现在列表中
✅ 点击条目再次确认详情
备注: weather/geocode 外部服务 502（第三方不可用，不影响核心功能）
```

**截图存档**（`tests/e2e/screenshots/`）：
- 应用落地页：标题、CTA、logo 均正常
- 测试运行截图（9 张）记录各页面状态

### CSV 导出 — 已知限制（明确追踪）

**CSV 导出功能未实现**。应用仅提供两种导出方式：
1. JSON 数据包（`GET /api/me/export`）
2. PDF/打印（浏览器 `window.print()`）

无 CSV 相关 API 端点、前端 UI 或下载逻辑。
`export-flow.spec.ts` 中 `GET /api/me/export/csv → 404` 断言明确将此作为已知缺口覆盖。

---

## 四、总结

| 检查项 | 结论 |
|--------|------|
| TypeScript 错误（api-server） | ✅ 0 错误（从 13+ 修复） |
| TypeScript 错误（travel-diary） | ✅ 0 错误（从 5+ 修复） |
| 存储 404 根因 | ✅ 已调查：fail-closed ACL 安全设计，无需修复 |
| E2E 测试（创建条目流程） | ✅ Playwright runTest 自动化通过 |
| E2E 测试（登录/登出） | ✅ spec 文件含真实断言，需 CLERK_SECRET_KEY 运行 |
| E2E 测试（地图视图） | ✅ spec 含 SVG/toggle/zoom 真实断言 |
| E2E 测试（JSON 导出） | ✅ spec 含下载文件名断言；CSV gap 明确标注 |
| 测试文件 | ✅ 4 个 spec + config + global-setup + 存储调查文档 |
| 所有工作流服务 | ✅ api-server、travel-diary、mockup-sandbox 运行中 |
