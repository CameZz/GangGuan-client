## 1. 路由与导航

- [x] 1.1 修改 `src/router/index.ts`：`/member-schedule` 路由去掉 `requiresProject` meta
- [x] 1.2 修改 `AppHeader.vue`：成员排期导航链接改为 `/member-schedule`（不依赖 projectId）

## 2. 数据源改造

- [x] 2.1 移除 filteredTasks 中对 `selectedProjectId` 和 `selectedPlanningId` 的过滤，改为读取全量 tasks
- [x] 2.2 移除 route.params.projectId 和 route.query.planning 的 watchEffect 同步逻辑

## 3. 时间轴范围动态计算

- [x] 3.1 timelineStart 改为遍历所有任务取最早 startTime，无数据时回退到当前日期 -7 天
- [x] 3.2 timelineEnd 改为遍历所有任务取最晚 endTime，无数据时回退到当前日期 +7 天

## 4. 颜色与图例

- [x] 4.1 planningColorMap 改为基于所有项目的所有迭代生成颜色映射
- [x] 4.2 图例显示格式改为"项目名 - 迭代名"
