## 1. Project Selection Entry

- [x] 1.1 Import and wire `ProjectModal` in `ProjectSelectView.vue`.
- [x] 1.2 Add local state for modal open/close, saving status, and creation error message.
- [x] 1.3 Add a “新建项目” button to the project selection page header.
- [x] 1.4 Gate the create button with `userStore.isProjectManager`.

## 2. Creation Flow

- [x] 2.1 Handle modal save by validating a non-empty project name.
- [x] 2.2 Call `projectStore.createProject` with the form data and any required default project fields.
- [x] 2.3 Disable modal actions while the create request is pending.
- [x] 2.4 On success, set the created project as current and route to `/kanban/:projectId`.
- [x] 2.5 On failure, keep the modal open and display a visible error message.

## 3. Modal Behavior

- [x] 3.1 Extend `ProjectModal` to accept optional saving and error props without breaking edit mode.
- [x] 3.2 Prevent duplicate save submissions from the modal while saving.
- [x] 3.3 Ensure cancel/close clears creation error state.

## 4. Verification

- [x] 4.1 Verify admin/PM users can see and open the creation modal.
- [x] 4.2 Verify non-project-manager users cannot see the creation entry.
- [x] 4.3 Verify successful creation navigates to the new project kanban page.
- [x] 4.4 Verify failed creation keeps the modal open and shows an error.
- [x] 4.5 Run `npm run build`.
