## Why

看板和列表目前只能按状态、阶段、优先级、负责人筛选，无法让登录用户快速聚焦自己实际参与的任务。任务已经有 `participants` 数据，新增“自己参与的任务”筛选可以减少跨项目/迭代查找成本。

## What Changes

- 在看板和列表共用的任务筛选区域新增“自己参与的任务”开关。
- 开启后，仅显示 `participants[].memberId` 包含当前登录用户 `id` 的任务。
- 该筛选与项目、迭代、状态、阶段、优先级、负责人和废弃任务显示规则叠加生效。
- 未登录或无当前用户时，开启该筛选应返回空结果，不报错。

## Capabilities

### New Capabilities
- `my-participating-task-filter`: 任务视图按当前用户参与关系筛选任务。

### Modified Capabilities
- 无

## Impact

- 影响 `src/components/task/TaskFilter.vue` 的筛选项和事件数据结构。
- 影响 `src/views/KanbanView.vue`、`src/views/ListView.vue` 的任务过滤逻辑。
- 复用现有 `userStore.currentUser`、`Task.participants` 数据，无后端或依赖变更。
