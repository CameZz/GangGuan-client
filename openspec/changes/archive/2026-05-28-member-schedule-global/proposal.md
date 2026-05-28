## Why

当前成员排期表和时间轴一样，限定在选中的迭代内。但成员排期的核心价值是看一个人的全局负载——一个成员可能同时参与多个项目的多个迭代。限定在单迭代内无法看到真实的工作量分布。

## What Changes

- 移除成员排期表对"选中迭代"的依赖，改为全局读取所有项目、所有迭代的任务
- 数据源从"当前项目当前迭代的 filteredTasks"变为"所有项目下该成员参与的所有任务"
- 时间轴范围改为动态计算：取所有任务中最早 startTime 到最晚 endTime
- 颜色仍按迭代区分，但图例需展示跨项目的迭代名称（带项目前缀）
- 路由不再需要 projectId 参数，改为独立路径 `/member-schedule`

## Capabilities

### New Capabilities
- `member-schedule-global`: 成员排期表全局视图，跨项目跨迭代展示成员排期

### Modified Capabilities

## Impact

- 大幅修改 `src/views/MemberScheduleView.vue` 的数据获取和聚合逻辑
- 修改 `src/router/index.ts` 路由（去掉 projectId 依赖）
- 修改 `AppHeader.vue` 导航链接
