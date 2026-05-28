## Context

MemberScheduleView 当前用所有任务的 startTime/endTime 动态计算时间范围，成员也是所有有任务的成员。需要改为按月查看 + 限定当前项目成员。

## Goals / Non-Goals

**Goals:**
- 时间轴按月显示，通过年月选择器切换
- 成员限定为当前项目（route.params.projectId 或 projectStore.currentProjectId）的参与成员
- 任务仍跨项目读取

**Non-Goals:**
- 不改变任务数据的读取方式（仍全量）

## Decisions

### 1. 年月选择器

新增 `selectedYear` 和 `selectedMonth` ref，默认值为当前年月。下拉框：年份范围 currentYear-3 ~ currentYear+1，月份 1-12。

### 2. 时间范围

timelineStart = new Date(selectedYear, selectedMonth - 1, 1)
timelineEnd = new Date(selectedYear, selectedMonth, 0) // 月末

### 3. 当前项目成员

从 route.params.projectId 获取当前项目 ID（回退到 projectStore.currentProjectId）。遍历所有任务，找出 projectId 匹配的任务中的 memberId 集合，用该集合过滤成员。

### 4. 路由

恢复 `/member-schedule/:projectId` 路由（需要 projectId 来确定成员范围）。

## Risks / Trade-offs

- 无显著风险
