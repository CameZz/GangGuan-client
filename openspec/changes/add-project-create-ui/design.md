## Context

项目选择页当前只展示已有项目并支持进入项目看板；项目弹窗组件已经具备“新建项目/编辑项目”的双态标题和基础字段；项目 store 已提供 `createProject` 异步动作并接入服务端。缺口主要在项目选择页没有入口、没有创建后的导航闭环，也没有失败反馈。

## Goals / Non-Goals

**Goals:**
- 在项目选择页提供管理员/PM 可用的新建项目入口。
- 复用现有 `ProjectModal`，保持项目表单体验一致。
- 创建成功后自动选中新项目并进入该项目看板。
- 创建失败时保留弹窗并给出清晰反馈。

**Non-Goals:**
- 不新增后端 API 或调整项目数据模型。
- 不在本次变更中扩展阶段库编辑、成员分配、权限配置等项目初始化向导。
- 不改变已有项目详情页的编辑项目行为。

## Decisions

1. Use `ProjectSelectView` as the primary entry point.
   - Rationale: this is the first project-level screen after login and already owns selecting a project.
   - Alternative considered: Dashboard empty state. That path is secondary and can later route to the project selection page.

2. Reuse `ProjectModal` for creation.
   - Rationale: the component already supports `project` being absent and displays “新建项目”.
   - Alternative considered: inline form card. That would duplicate validation and modal behavior.

3. Gate visibility with `userStore.isProjectManager`.
   - Rationale: the app already treats admin and PM as project managers.
   - Alternative considered: always show the button and let the API reject. That creates avoidable failed interactions.

4. After success, set the current project and navigate to `/kanban/:projectId`.
   - Rationale: this matches existing project selection behavior and gets the user into the next useful workflow immediately.
   - Alternative considered: stay on the project list. That is less direct for the primary “start managing this project” flow.

## Risks / Trade-offs

- Backend may require fields beyond name and description -> Mitigation: include default client values only if existing API/store contract requires them during implementation.
- Duplicate project creation from repeated clicks -> Mitigation: disable modal actions while saving.
- Permission mismatch between UI and API -> Mitigation: hide the entry for non-project managers and still handle API failure gracefully.
