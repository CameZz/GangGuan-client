## 1. Data Model

- [x] 1.1 Add `TaskItemType = 'requirement' | 'task'` to `src/types/index.ts`.
- [x] 1.2 Add `itemType` and `parentRequirementId` fields to the `Task` interface.
- [x] 1.3 Update mock task creation so missing `itemType` defaults to `task` and missing `parentRequirementId` defaults to `null`.
- [x] 1.4 Update existing mock task seed data or normalization so all current records behave as task items.
- [x] 1.5 Add helper logic to identify requirements, standalone tasks, and child tasks.

## 2. Task Store Rules

- [x] 2.1 Add a helper to get requirement options for a project.
- [x] 2.2 Add a helper to get child tasks for a requirement.
- [x] 2.3 Add validation so a requirement cannot have `parentRequirementId`.
- [x] 2.4 Add validation so a task can only reference a same-project requirement.
- [x] 2.5 Add delete protection for requirements that still have child tasks.

## 3. Modal Workflow

- [x] 3.1 Add a type selector in `TaskModal.vue` for new items: “需求单” and “任务单”.
- [x] 3.2 Hide execution-only fields for requirement items: assignee, participants, due date, task stage, and status where appropriate.
- [x] 3.3 Add a parent requirement selector for task items.
- [x] 3.4 Exclude parent requirement selection when editing requirement items.
- [x] 3.5 Add a child-task section when editing a requirement item.
- [x] 3.6 Allow creating a child task from a requirement detail view, prefilled with the requirement as parent.
- [x] 3.7 Ensure the child creation path only creates task items, not requirement items.

## 4. Save And Delete Behavior

- [x] 4.1 Update create handlers in `KanbanView.vue`, `ListView.vue`, and `ProjectDetailView.vue` to save item type and parent requirement fields.
- [x] 4.2 Ensure requirement saves write safe execution defaults: no assignee, empty participants, and no parent requirement.
- [x] 4.3 Ensure task saves preserve selected parent requirement.
- [x] 4.4 Show a user-facing error or disabled delete state when deleting a requirement with child tasks.
- [x] 4.5 Allow deleting a requirement that has no child tasks.

## 5. Kanban And List Display

- [x] 5.1 Update `TaskCard.vue` to visually distinguish requirement items from task items.
- [x] 5.2 Display requirement child-task progress such as `2/3`.
- [x] 5.3 Display empty requirements as “待拆分”.
- [x] 5.4 Update `KanbanView.vue` so requirement cards and task cards remain usable in status columns.
- [x] 5.5 Update `ListView.vue` to show requirement/task type and parent relationship.
- [x] 5.6 Keep standalone task display compatible with existing behavior.

## 6. Project Detail And Statistics

- [x] 6.1 Update `ProjectDetailView.vue` recent tasks preview to distinguish requirements and tasks.
- [x] 6.2 Update project task totals and completion stats to count task items only.
- [x] 6.3 Update assigned-member/team calculations to use task items only.
- [x] 6.4 Ensure requirement progress is shown where requirement items appear.

## 7. Execution Views

- [x] 7.1 Update `TimelineView.vue` filtering so requirement items never appear on the timeline.
- [x] 7.2 Update `MemberScheduleView.vue` so requirement items never create schedule rows or bars.
- [x] 7.3 Ensure “自己参与的任务” and other task filters continue to apply to task items.

## 8. Verification

- [x] 8.1 Run `npm run build`.
- [ ] 8.2 Manually create a requirement item and verify it does not require execution fields.
- [ ] 8.3 Manually create task items under a requirement and verify progress updates.
- [ ] 8.4 Verify the UI does not allow creating a requirement under a requirement.
- [ ] 8.5 Verify timeline and member schedule exclude requirement items.
- [ ] 8.6 Verify deleting a requirement with child tasks is blocked.
