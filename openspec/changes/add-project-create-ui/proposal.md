## Why

项目选择页目前只能进入已有项目，无法从界面创建新项目；当系统接入真实服务端后，项目初始化和团队开局仍需要外部手段完成。增加新建项目入口可以让管理员/PM 在前端完成项目创建，并立即进入后续任务管理流程。

## What Changes

- 在项目选择界面提供“新建项目”入口。
- 复用现有项目弹窗收集项目名称和描述。
- 创建成功后自动选中新项目并进入该项目看板。
- 创建失败时保留弹窗并展示失败反馈，避免误以为已创建。
- 新建入口仅对具备项目管理权限的用户可见。

## Capabilities

### New Capabilities
- `project-creation-ui`: Defines the user-facing behavior for creating projects from the project selection UI.

### Modified Capabilities
- None.

## Impact

- Affected UI: `src/views/ProjectSelectView.vue`, `src/components/project/ProjectModal.vue`.
- Affected state/API flow: `src/stores/project.ts` existing `createProject` action.
- No new dependency expected.
