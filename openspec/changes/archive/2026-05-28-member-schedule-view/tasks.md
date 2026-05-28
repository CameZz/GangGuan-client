## 1. 路由与导航

- [x] 1.1 在 `src/router/index.ts` 添加 `/project/:projectId/member-schedule` 路由
- [x] 1.2 在 `src/components/layout/AppSidebar.vue` 添加"成员排期表"菜单项，位于"时间轴"下方

## 2. 视图组件骨架

- [x] 2.1 创建 `src/views/MemberScheduleView.vue`，搭建页面结构：头部筛选器、网格容器、底部图例
- [x] 2.2 实现数据聚合逻辑：从 taskStore 按 memberId 分组任务
- [x] 2.3 实现左侧成员信息栏：头像、姓名、角色

## 3. 时间轴网格

- [x] 3.1 复用 TimelineView 的时间槽位计算逻辑（daySlots、totalSlots、getSlotIndex）
- [x] 3.2 实现顶部日期标签行（sticky header）
- [x] 3.3 实现网格单元格和工作日标记

## 4. 任务色条与迭代着色

- [x] 4.1 实现 Planning 颜色分配逻辑（预设调色板循环映射）
- [x] 4.2 渲染成员行内的任务色条，颜色按迭代区分，显示任务名称
- [x] 4.3 实现色条悬停 tooltip（任务名称、迭代、阶段、优先级）

## 5. 同色重叠斜线阴影

- [x] 5.1 实现重叠检测逻辑：同一成员同时段同 planning 的任务
- [x] 5.2 实现斜线阴影 CSS pattern，叠加在重叠区域

## 6. 筛选与图例

- [x] 6.1 实现任务阶段和优先级筛选器
- [x] 6.2 实现底部迭代颜色图例
