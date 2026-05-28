## Context

现有 TimelineView.vue 以任务为纵轴，使用 CSS Grid 实现时间轴网格，每个任务行内显示多个参与者色条。复用该网格结构，将纵轴从任务切换为成员，即可实现人员视角的排期表。

数据关系：Task → participants[] → memberId，需要反转这个映射，按 memberId 聚合任务。

## Goals / Non-Goals

**Goals:**
- 提供成员视角的排期总览，方便 PM 评估人员负载
- 复用现有时间轴的网格结构和工作日逻辑
- 按迭代（Planning）着色，直观区分不同迭代的任务
- 同色重叠用斜线阴影提示过载

**Non-Goals:**
- 不支持拖拽调整排期（仅只读视图）
- 不做成员工时统计（后续可扩展）
- 不修改现有 Task/Participant 数据结构

## Decisions

### 1. 组件结构：独立视图 vs TimelineView 子组件

**选择：独立视图 `MemberScheduleView.vue`**

理由：虽然网格结构相似，但行逻辑完全不同（按成员 vs 按任务），强行复用会导致条件分支过多。CSS 和工具函数可以提取共用。

### 2. 数据聚合方式

在 computed 中遍历 filteredTasks，按 participant.memberId 分组：
```
memberTasks = Map<memberId, Array<{ task, participant }>>
```
每个成员行内，再按时间段渲染色条。一个成员同一时段的多个同 planning 任务，标记为重叠。

### 3. 迭代配色方案

为每个 Planning 生成一个固定色值，使用预设调色板循环分配：
```
const PLANNING_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#f43f5e', '#06b6d4']
```
通过 `planningIndex % PLANNING_COLORS.length` 映射。

### 4. 同色重叠斜线阴影

使用 CSS `repeating-linear-gradient` 实现斜线 pattern，作为伪元素叠加在重叠区域上方：
```css
.overlap-indicator {
  background: repeating-linear-gradient(
    45deg, transparent, transparent 3px,
    rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px
  );
}
```
检测重叠：同一成员的两个任务时间段有交集 且 planningId 相同。

### 5. 路由与导航

路由：`/project/:projectId/member-schedule`
侧边栏入口：在"时间轴"下方新增"成员排期表"菜单项。

## Risks / Trade-offs

- [成员数量多时行高过大] → 限制最大行高，超出部分任务条堆叠需滚动，初期先用重叠方案，如反馈不佳再改为堆叠
- [Planning 颜色可辨识度] → 预设 8 色调色板，超过 8 个迭代时颜色会重复，但实际场景中同项目并发迭代通常不超过 5 个
