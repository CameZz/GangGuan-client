## 1. Permission Helper

- [x] 1.1 Add or expose a reusable project-management permission check for `isAdmin || role === 'pm'`.
- [x] 1.2 Ensure the check works when there is no logged-in user.

## 2. Navigation Entry

- [x] 2.1 Add a “项目详情” link/button to the current project navigation in `AppHeader.vue`.
- [x] 2.2 Show the project detail entry only when the current user is an admin or PM.
- [x] 2.3 Link the entry to `/project/:id` for the current project and do not inherit planning query.

## 3. Route Guard

- [x] 3.1 Add route metadata for project-detail manager-only access.
- [x] 3.2 Update the router guard to block users who are not admin or PM from `/project/:id`.
- [x] 3.3 Redirect blocked users to the current project kanban when possible, otherwise to project selection.

## 4. Project Detail Controls

- [x] 4.1 Hide or disable the “编辑项目” action for users without project-management permission.
- [x] 4.2 Hide or disable phase library add, rename, reorder, and enable/disable controls for users without permission.
- [x] 4.3 Hide or block project delete actions for users without permission.
- [x] 4.4 Keep task preview and read-only project information usable for allowed users.

## 5. Verification

- [x] 5.1 Run `npm run build`.
- [x] 5.2 Verify admin users see the project detail entry and can open the page.
- [x] 5.3 Verify PM users see the project detail entry and can open the page.
- [x] 5.4 Verify ordinary users do not see the project detail entry.
- [x] 5.5 Verify ordinary users who directly open `/project/:id` are redirected.
- [x] 5.6 Verify project detail management controls are available only to admin and PM.
