## 1. Filter Contract

- [x] 1.1 Add `myParticipationOnly?: boolean` to the `TaskFilters` interface in `TaskFilter.vue`, `KanbanView.vue`, and `ListView.vue`.
- [x] 1.2 Add local state in `TaskFilter.vue` for the “自己参与的任务” toggle.
- [x] 1.3 Include `myParticipationOnly` in the filter emit payload and clear it in `clearFilters`.
- [x] 1.4 Update `hasActiveFilters` so the new toggle makes the clear button visible.

## 2. UI Implementation

- [x] 2.1 Add a checkbox/toggle control labeled “自己参与的任务” to the shared task filter row.
- [x] 2.2 Ensure the filter row still wraps cleanly with the existing select controls.

## 3. Page Filtering

- [x] 3.1 In `KanbanView.vue`, filter tasks by `task.participants.some(p => p.memberId === currentUserId)` when `myParticipationOnly` is enabled.
- [x] 3.2 In `ListView.vue`, apply the same participant filter before sorting.
- [x] 3.3 Ensure missing `currentUser` returns no tasks for the enabled participant filter and does not throw.
- [x] 3.4 Verify the new filter combines with project, planning, status, stage, priority, assignee, and abandoned-task visibility.

## 4. Verification

- [x] 4.1 Run `npm run build`.
- [ ] 4.2 Manually check the kanban view with the filter off and on.
- [ ] 4.3 Manually check the list view with the filter off and on, including at least one additional filter condition.
