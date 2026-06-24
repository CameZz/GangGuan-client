## Tasks

### 1. 数据模型 — DailyNote
- [x] 在 `schema.prisma` 中新增 `DailyNote` model
- [x] 在 `User` model 中新增 `dailyNotes` 反向关系
- [x] 在 `Project` model 中新增 `dailyNotes` 反向关系
- [x] 执行 `prisma db push` 同步数据库 schema（`prisma generate` 需手动执行）

### 2. 服务端 — DailyNote Service
- [x] 新建 `src/services/daily-note.service.ts`
- [x] 实现 `getByProjectAndDateRange(projectId, startDate, endDate)`
- [x] 实现 `upsert(projectId, memberId, dateKey, content)`
- [x] 实现 `delete(projectId, memberId, dateKey)`

### 3. 服务端 — API 路由
- [x] 新建 `src/routes/daily-notes.ts`
- [x] 实现 `GET /api/projects/:projectId/daily-notes`
- [x] 实现 `PUT /api/projects/:projectId/daily-notes/:dateKey`
- [x] 实现 `DELETE /api/projects/:projectId/daily-notes/:dateKey`
- [x] 在 `app.ts` 中注册路由

### 4. 客户端 — 类型与 API
- [x] 在 `types/index.ts` 中新增 `DailyNote` 接口
- [x] 新建 `api/daily-notes.ts`，实现 `getByDateRange`、`upsert`、`remove`

### 5. 客户端 — MemberScheduleView 数据层
- [x] 加载 `dailyNotesData`，按月过滤为 `monthDailyNotes`
- [x] 改造 `memberProgressData` computed，合并备注到 cell 数据
- [x] 新增 `ProgressCell.note` 字段

### 6. 客户端 — 单元格渲染
- [x] 实现备注卡片样式（蓝色背景，📝 图标 + 截断文本）
- [x] 实现合并卡片样式（备注 + 进度变更上下排列）
- [x] 空单元格对当前用户显示 `+` 按钮
- [x] 非当前用户的空单元格保持空白

### 7. 客户端 — 详情面板
- [x] 在面板顶部新增备注区域（只读态）
- [x] 实现编辑态（textarea + 保存/取消按钮）
- [x] 实现删除按钮
- [x] 当前用户可编辑，他人只读
- [x] 备注区域和进度变更区域按条件显隐
