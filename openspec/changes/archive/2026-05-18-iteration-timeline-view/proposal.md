## Why

当前的时间轴视图（TimelineView）以角色为维度展示参与者的甘特条，但缺少一个直观查看**迭代内所有任务整体排期**的视图。用户需要快速了解当前迭代中每个任务的时间安排全貌，以便发现冲突、空档和依赖关系。

## What Changes

- 重构 `TimelineView.vue`，新增"任务时间轴"模式：以任务为行、日期为列的网格视图
- 时间范围固定为当前选中迭代的 `createdAt` → `deadline`
- 每天划分为 4 个时间格子（对应上午、下午、晚上、深夜）
- 任务在网格中以横条形式展示其参与者的排期区间
- 支持按阶段、优先级、负责人筛选任务

## Capabilities

### New Capabilities
- `iteration-timeline`: 迭代任务时间轴视图，以天×4格的网格展示迭代内所有任务的排期安排

### Modified Capabilities

## Impact

- 修改文件：`src/views/TimelineView.vue`（重构视图逻辑和模板）
- 类型定义无需修改，复用现有 `Task`、`Planning` 接口
- Store 无需修改，复用现有 task/planning/project store
