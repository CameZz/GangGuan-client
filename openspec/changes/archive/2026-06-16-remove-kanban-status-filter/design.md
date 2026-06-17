## Context

当前 `TaskFilter.vue` 组件同时被 `ListView.vue` 和 `KanbanView.vue` 使用。看板界面已经按状态分列显示，状态筛选功能冗余。需要让 TaskFilter 支持隐藏状态筛选选项。

## Goals / Non-Goals

**Goals:**
- 看板界面不显示状态筛选器
- 列表界面保留状态筛选功能
- TaskFilter 组件支持通过 prop 控制是否显示状态筛选

**Non-Goals:**
- 不修改列表界面的筛选行为
- 不改变 TaskFilter 的其他筛选功能

## Decisions

### 1. 通过 prop 控制状态筛选显示
- **决策**: 添加 `showStatusFilter` prop，默认为 true
- **理由**: 保持组件复用性，不影响列表界面

### 2. 在 KanbanView 中隐藏状态筛选
- **决策**: 在 KanbanView 中设置 `showStatusFilter=false`
- **理由**: 看板已按状态分列，筛选冗余

## Risks / Trade-offs

- [风险] 无，纯 UI 调整，不影响数据逻辑
