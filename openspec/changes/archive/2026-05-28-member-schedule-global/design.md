## Context

当前 MemberScheduleView 的数据流：
1. 从 route 获取 projectId → filteredTasks 按 projectId + planningId 过滤
2. 按 memberId 分组 → memberScheduleData
3. 时间轴范围取自 selectedPlanning.createdAt → selectedPlanning.deadline

需要改为全局视图，不再依赖选中的项目和迭代。

## Goals / Non-Goals

**Goals:**
- 成员排期表展示所有项目、所有迭代中该成员的任务
- 时间轴范围动态适配所有任务的时间跨度
- 每个成员行显示其在不同项目/迭代中的任务，颜色按迭代区分

**Non-Goals:**
- 不增加项目/迭代筛选器（保持简洁，全局一览）
- 不修改现有 stores 的数据结构

## Decisions

### 1. 数据源

直接从 taskStore.tasks 和 memberStore.members 读取全量数据，不按 projectId/planningId 过滤。在 memberScheduleData computed 中按 memberId 聚合所有任务。

### 2. 时间轴范围

动态计算：遍历所有成员的所有任务，取最早 startTime 到最晚 endTime。如果没有任务有时间数据，回退到当前日期 ±7 天。

### 3. 颜色映射

保留按迭代着色的逻辑。由于跨项目，不同项目的同名迭代会是不同颜色。图例中显示"项目名 - 迭代名"以区分。

### 4. 路由

路由改为 `/member-schedule`（不再需要 projectId），但仍保留 `/member-schedule/:projectId` 作为可选（向下兼容）。

## Risks / Trade-offs

- [任务量大时性能] → 全量任务数据在前端过滤，当前 mock 数据量小无问题，后续如数据量大可加分页或虚拟滚动
- [时间轴范围过大] → 如果有任务跨度很大，网格会很宽，可通过限制最大天数来缓解
