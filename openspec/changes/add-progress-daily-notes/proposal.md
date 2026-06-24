## Why

成员排期页的阶段进度视图目前只能展示系统自动记录的进度变更（拖动进度条产生）。但部分成员的工作很细碎，没有对应的任务单据，无法通过进度变更来体现当天的工作内容。需要支持用户在阶段进度单元格中自定义填写纯文本备注，作为工作日志的补充。

## What Changes

- 新增 `DailyNote` 数据模型，存储成员 + 项目 + 日期维度的纯文本备注。
- 新增服务端 API：批量查询、创建/更新（upsert）、删除备注。
- 改造阶段进度视图的单元格渲染，支持同时展示进度变更和自定义备注。
- 改造详情面板，顶部展示备注（可编辑），底部展示进度变更（只读）。
- 空单元格对当前用户显示 `+` 按钮，支持直接填写备注。

## Capabilities

### New Capabilities
- `progress-daily-notes`: 在阶段进度视图中按成员+项目+日期填写和展示自定义纯文本备注。

### Modified Capabilities
- `member-progress-grid`: 阶段进度单元格支持展示备注卡片，空单元格支持当前用户点击填写。

## Impact

- 新增 Prisma model `DailyNote`，需要数据库迁移。
- 新增服务端路由模块 `daily-notes.ts` 和服务模块 `daily-note.service.ts`。
- 新增客户端 API 模块 `daily-notes.ts` 和类型定义。
- 改造 `MemberScheduleView.vue` 的单元格渲染逻辑和详情面板。
- 不影响现有进度变更的记录和展示逻辑。
