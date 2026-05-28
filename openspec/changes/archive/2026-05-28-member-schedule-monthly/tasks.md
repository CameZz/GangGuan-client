## 1. 路由恢复

- [x] 1.1 在 `src/router/index.ts` 恢复 `/member-schedule/:projectId` 路由（带 requiresProject）

## 2. 年月选择器

- [x] 2.1 新增 `selectedYear` 和 `selectedMonth` ref，默认当前年月
- [x] 2.2 在模板右上角添加年份和月份下拉选择器
- [x] 2.3 timelineStart 改为选中年月1日，timelineEnd 改为选中年月末日

## 3. 成员过滤

- [x] 3.1 获取当前项目 ID（route.params.projectId 回退到 projectStore.currentProjectId）
- [x] 3.2 memberScheduleData 中仅保留当前项目有参与任务的成员

## 4. 导航链接

- [x] 4.1 AppHeader 导航链接恢复为 getNavLink('/member-schedule') 格式
