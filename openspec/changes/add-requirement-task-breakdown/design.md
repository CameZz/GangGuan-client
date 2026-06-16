## Context

当前系统只有 `Task` 一种业务对象。`TaskModal.vue` 负责建单/编辑，`KanbanView.vue`、`ListView.vue`、`ProjectDetailView.vue` 直接展示任务集合，`TimelineView.vue` 和 `MemberScheduleView.vue` 基于任务参与者和排期计算工作量。

新需求要表达“需求单 -> 任务单”的拆分关系。需求单用于记录需求目标和拆分进度，任务单用于执行、分配、排期。用户已明确 V1 不允许在需求单下面再创建需求单。

## Goals / Non-Goals

**Goals:**
- 建单时区分“需求单”和“任务单”。
- 支持一个需求单包含多个任务单。
- 任务单可选择所属需求单。
- 看板、列表和项目详情能识别并展示需求单与任务单关系。
- 时间轴、成员排期和工作量统计只计算任务单。

**Non-Goals:**
- 不支持需求单多级嵌套。
- 不引入独立后端 API 或外部依赖。
- 不重写任务 store 或视图架构。
- 不把需求单作为可排期的执行项。

## Decisions

1. 在现有 `Task` 模型上增加 `itemType: 'requirement' | 'task'` 和 `parentRequirementId: string | null`。

   理由：现有 store、mock API、WebSocket 事件和视图都围绕 Task 工作，扩展字段比引入新实体更小。备选方案是新增 Requirement 实体，但会导致任务弹窗、列表和看板需要双数据源合并。

2. 现有历史任务默认视为 `itemType: 'task'`，`parentRequirementId` 默认为 `null`。

   理由：保持兼容，不需要迁移现有 mock 数据和视图逻辑才能继续运行。

3. 需求单不能设置 `parentRequirementId`，任务单的 `parentRequirementId` 只能指向 `itemType === 'requirement'` 的同项目需求单。

   理由：这是 V1 的核心边界，避免无限嵌套导致状态、进度、拖拽和删除规则复杂化。

4. 需求单状态和进度在视图层按子任务汇总，真实执行字段仍属于任务单。

   理由：需求单是管理对象，不是执行对象。保留 `status` 字段作为存储兼容，但展示时优先使用子任务汇总结果。无子任务需求显示为“待拆分”。

5. 时间轴、成员排期和工作量相关计算过滤 `itemType === 'task'`。

   理由：这些视图表达人和时间的执行负载，需求单没有参与者排期，不应重复计入。

## Risks / Trade-offs

- [沿用 Task 模型会让需求单携带部分无效字段] -> 在弹窗中按类型隐藏执行字段，并在保存时给需求单写入空参与者、空负责人等安全默认值。
- [需求状态由子任务汇总可能与存储 status 不一致] -> 需求卡片和列表展示使用汇总状态；编辑表单弱化或隐藏需求单状态。
- [删除需求单会留下孤儿任务] -> 默认禁止删除含有子任务的需求单，提示先移出或删除子任务。
- [视图过滤遗漏导致需求单进入排期] -> 在时间轴、成员排期和统计入口统一按 `itemType === 'task'` 过滤。
