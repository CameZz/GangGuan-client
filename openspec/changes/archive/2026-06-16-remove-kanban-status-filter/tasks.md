## 1. TaskFilter 组件改造

- [x] 1.1 在 `TaskFilter.vue` 中添加 `showStatusFilter` prop，默认值为 `true`
- [x] 1.2 使用 `v-if="showStatusFilter"` 控制状态筛选区域的显示

## 2. KanbanView 应用配置

- [x] 2.1 在 `KanbanView.vue` 中调用 TaskFilter 时设置 `showStatusFilter=false`

## 3. 验证

- [x] 3.1 验证看板界面不显示状态筛选
- [x] 3.2 验证列表界面正常显示状态筛选
