## Context

当前 `TaskModal.vue` 组件在新建和编辑任务时都显示参与者选择区域。用户反馈新建任务时参与者选择增加了操作复杂度。同时，`TaskPhase` 接口缺少 `startTime` 字段，无法记录阶段开始时间。

## Goals / Non-Goals

**Goals:**
- 简化新建任务流程，移除参与者选择
- 为任务阶段添加起始时间记录功能
- 保持编辑任务时的完整功能

**Non-Goals:**
- 不修改现有参与者数据结构
- 不影响已有任务的参与者数据

## Decisions

### 1. 条件渲染参与者区域
- **决策**: 使用 `v-if="isEditing"` 控制参与者区域显示
- **理由**: 新建时不需要，编辑时保留完整功能

### 2. TaskPhase 添加 startTime 字段
- **决策**: 在 `TaskPhase` 接口添加 `startTime: string | null`
- **理由**: 与现有 `Participant` 接口的 `startTime` 保持一致

### 3. 阶段时间选择器位置
- **决策**: 在阶段列表的每个阶段项中添加时间选择器
- **理由**: 与阶段进度滑块并排显示，便于关联操作

## Risks / Trade-offs

- [风险] 已有任务的阶段数据缺少 startTime 字段 → 通过 `normalizeTaskPhases` 函数补充默认值
- [风险] 时间选择器占用空间 → 使用紧凑布局，与进度滑块同行显示
