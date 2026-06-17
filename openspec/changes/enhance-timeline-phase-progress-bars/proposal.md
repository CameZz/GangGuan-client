## Why

当前时间轴横条只表达参与者排期，无法直观看出阶段执行者是谁、阶段进度是否健康。任务阶段计划已经记录执行者、起止时间和进度，时间轴应复用这些信息，让项目排期和进度风险在同一视图中可见。

## What Changes

- 将时间轴横条从参与者排期条调整为任务阶段条。
- 阶段条展示执行者、阶段名和进度百分比。
- 同一执行者在时间轴内使用固定人员识别色，其他界面颜色不变。
- 阶段条内部进度填充按健康状态显示橘黄、绿色或红色。
- 增加基于当前时间、阶段起止时间和阶段进度的进度健康判断。
- 悬浮阶段条时展示任务、阶段、执行者、起止时间、当前进度和状态说明。

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `iteration-timeline`: 时间轴横条从参与者排期展示升级为阶段执行者与进度健康展示。

## Impact

- Affected code: `src/views/TimelineView.vue`, task phase display helpers, timeline styles.
- Data: Reuses existing `Task.phases[].assigneeId`, `progress`, `startTime`, and `endTime`; no schema migration required.
- UI scope: Timeline view only; kanban, list, task modal, and member schedule colors remain unchanged.
