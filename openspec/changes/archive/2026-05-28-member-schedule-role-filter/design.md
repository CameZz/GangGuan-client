## Context

MemberScheduleView.vue 当前有两个筛选器：`filterStage`（任务阶段）和 `filterPriority`（优先级），它们作用于 filteredTasks，控制哪些任务的色条显示。需要替换为角色筛选。

## Goals / Non-Goals

**Goals:**
- 将筛选器从阶段/优先级改为角色
- 角色筛选作用于成员行：选中某角色后只显示该角色的成员

**Non-Goals:**
- 不改变时间轴网格逻辑
- 不改变任务色条渲染逻辑

## Decisions

筛选逻辑改为：在 `memberScheduleData` computed 中，如果 `filterRole` 有值，过滤掉 `memberRole !== filterRole` 的成员行。角色选项从 `ROLES` 常量读取。

## Risks / Trade-offs

无显著风险，纯 UI 筛选逻辑变更。
