## Why

看板界面已经按状态（待办、进行中、已完成）分列显示，状态筛选功能冗余，增加了界面复杂度。移除后可简化筛选器，让用户专注于其他筛选维度。

## What Changes

- 移除看板界面中的状态筛选选项
- 保留列表界面的状态筛选功能（列表未按状态分组）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `task-filter`: 移除看板界面的状态筛选功能

## Impact

- 影响组件: `KanbanView.vue`、`TaskFilter.vue`
- 影响类型: `TaskFilters` 接口使用方式
