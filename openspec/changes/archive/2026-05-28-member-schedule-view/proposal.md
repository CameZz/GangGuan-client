## Why

当前时间轴页面以任务为纵轴，适合查看单个任务的进度安排。但在项目管理中，PM 还需要一个"人员视角"来审视每个成员的工作负载和排期情况——谁在什么时间段手上有哪些活、是否过载。目前缺少这个视角，排期评估只能靠人脑推算。

## What Changes

- 新增独立页面"成员排期表"，路由为 `/project/:projectId/member-schedule`
- 纵轴为成员（头像+姓名+角色），横轴为时间（复用现有时间轴的日期槽位结构）
- 每个成员行显示其参与的所有任务条，颜色按所属迭代（Planning）区分
- 色条上显示任务名称，悬停提示任务详情（名称、阶段、优先级）
- 同一成员同时段有多个同迭代任务时，重叠部分显示斜线阴影表示过载
- 侧边栏新增入口，与"时间轴"并列

## Capabilities

### New Capabilities
- `member-schedule-view`: 成员排期表页面，包含成员-时间网格、按迭代着色的任务条、同色重叠斜线阴影、筛选器

### Modified Capabilities

## Impact

- 新增 `src/views/MemberScheduleView.vue` 视图组件
- 修改 `src/router/index.ts` 添加路由
- 修改 `src/components/layout/AppSidebar.vue` 添加侧边栏入口
- 复用现有 stores（task、member、project、planning）和类型定义，无后端变更
