## Context

看板 `KanbanView.vue` 和列表 `ListView.vue` 都复用 `TaskFilter.vue` 接收筛选条件，但任务过滤逻辑分别在页面内的 `filteredTasks` computed 中完成。现有筛选支持状态、阶段、优先级和负责人；“负责人”来自 `task.assigneeId`，而用户提出的“自己参与的任务”应匹配 `task.participants[].memberId`。

当前登录用户可从 `useUserStore().currentUser` 获取，任务类型已包含 `participants`，因此不需要新增数据模型或接口。

## Goals / Non-Goals

**Goals:**
- 在看板和列表中提供一致的“自己参与的任务”筛选入口。
- 让筛选与现有项目、迭代、状态、阶段、优先级、负责人、废弃任务显示规则叠加生效。
- 未登录或无当前用户时保持稳定，不抛异常。

**Non-Goals:**
- 不改变任务参与者的数据结构。
- 不改变负责人筛选的语义。
- 不扩展到时间轴、成员排期表或其他页面。

## Decisions

1. 在 `TaskFilter.vue` 的筛选 payload 中新增布尔字段 `myParticipationOnly`。

   理由：该组件已经是看板和列表的共享筛选入口，新增字段能保证两个页面交互一致。备选方案是在两个页面各自添加开关，但会造成 UI 和清空逻辑重复。

2. 在页面级 `filteredTasks` 中使用 `userStore.currentUser?.id` 过滤 `participants`。

   理由：看板和列表当前已经在页面内组合项目、迭代、状态和废弃任务筛选，继续沿用该模式改动最小。备选方案是重构到 `taskStore.getTasksByFilters`，但现有页面并未使用该 helper，重构范围会超过本需求。

3. “自己参与”仅指 `participants[].memberId === currentUser.id`，不包含 `assigneeId`。

   理由：需求表述为“参与”，且任务已有参与者数组用于排期和角色分工；负责人筛选仍由现有成员下拉控制。若未来需要“我负责或我参与”，应新增明确筛选项。

## Risks / Trade-offs

- [当前用户 id 与成员 id 不一致] → 现有 mock 数据中用户和成员共用 id；若后续账号体系拆分，需要补充 user-member 映射。
- [筛选条件增加后 UI 换行] → 使用现有 `TaskFilter` 的 flex-wrap 布局，移动端保持自然换行。
- [重复过滤逻辑] → 本次遵循现有页面模式；若后续任务视图继续增加，可再抽取共享过滤函数。
