## 1. Data Model

- [x] 1.1 Add `ProjectPhaseTemplate`, `TaskPhaseStatus`, and `TaskPhase` types in `src/types/index.ts`.
- [x] 1.2 Add `phaseTemplates` to the `Project` interface.
- [x] 1.3 Add `phases` and optional current-phase compatibility fields to the `Task` interface.
- [x] 1.4 Update default project mock data to initialize phase libraries from current `TASK_STAGES`.
- [x] 1.5 Update mock task normalization so legacy tasks without `phases` receive a compatible phase plan.
- [x] 1.6 Ensure requirement items keep an empty phase plan and never receive execution phases.

## 2. Store And Flow Helpers

- [x] 2.1 Add helpers to get enabled phase templates for a project in order.
- [x] 2.2 Add helpers to build task phases from selected project templates.
- [x] 2.3 Add helper to derive the current task phase from ordered phase progress.
- [x] 2.4 Add helper to derive task `stage`, `assigneeId`, and `status` from phase progress.
- [x] 2.5 Add validation so task phases only reference templates from the same project.
- [x] 2.6 Add progress update logic that clamps values to 0-100 and recalculates phase/task state.

## 3. Project Phase Library UI

- [x] 3.1 Add a project phase library editor entry in project detail or project settings.
- [x] 3.2 Display project phase templates with name, order, and enabled state.
- [x] 3.3 Support adding a phase template to the current project.
- [x] 3.4 Support renaming and reordering project phase templates.
- [x] 3.5 Support disabling phase templates without mutating existing task phase snapshots.
- [x] 3.6 Keep phase library edits scoped to the selected project only.

## 4. Task Creation And Editing

- [x] 4.1 Replace direct current-stage selection in `TaskModal.vue` with task phase plan selection for task items.
- [x] 4.2 Let users select one or more enabled project phase templates for a task item.
- [x] 4.3 Let users reorder selected task phases before saving.
- [x] 4.4 Let users assign an executor for every selected task phase.
- [x] 4.5 Save task phases with template id, name snapshot, order, executor, progress, and status.
- [x] 4.6 Preserve existing requirement/task behavior so requirement items do not show phase plan controls.
- [x] 4.7 Ensure editing an existing task keeps its saved phase snapshots even if project templates changed.

## 5. Participant Progress

- [x] 5.1 Update the participants tab to render task phase rows with executor and progress bar.
- [x] 5.2 Show separate rows when the same member owns multiple phases.
- [x] 5.3 Allow a normal user to edit progress only for phases assigned to themselves.
- [x] 5.4 Allow an admin user to edit progress for any phase.
- [x] 5.5 Disable or lock progress controls for users without edit permission.
- [x] 5.6 Persist progress changes through the task store update path.

## 6. Automatic Flow

- [x] 6.1 Mark a phase as done when its progress reaches 100%.
- [x] 6.2 Mark a phase as in progress when its progress is between 1 and 99.
- [x] 6.3 Recalculate the current phase after each progress update.
- [x] 6.4 Move the task to in-progress when any phase has progress and unfinished phases remain.
- [x] 6.5 Move the task to done when all task phases reach 100%.
- [x] 6.6 Support admin lowering a completed phase progress and recalculate the task out of done when needed.

## 7. View Compatibility

- [x] 7.1 Update `TaskCard.vue` to display the derived current phase and phase progress.
- [x] 7.2 Update `KanbanView.vue` filters to use derived phase compatibility instead of direct manual stage changes.
- [x] 7.3 Update `ListView.vue` filters and rows to display derived current phase.
- [x] 7.4 Ensure timeline and member schedule keep excluding requirement items.
- [x] 7.5 Ensure member schedule and participant-derived workload still include task phase executors where appropriate.
- [x] 7.6 Add history labels or display text for phase progress changes where existing history UI is used.

## 8. Verification

- [x] 8.1 Run `npm run build`.
- [ ] 8.2 Create two projects with different phase libraries and verify each task modal only shows its project phases.
- [ ] 8.3 Create a task with selected phases, custom order, and different executors.
- [ ] 8.4 Verify direct current-stage editing is unavailable for task items.
- [ ] 8.5 Verify a normal user can only update their own phase progress.
- [ ] 8.6 Verify an admin can update any phase progress.
- [ ] 8.7 Set a phase to 100% and verify the task advances to the next incomplete phase.
- [ ] 8.8 Complete all phases and verify the task becomes done.
- [ ] 8.9 Load legacy tasks and verify they still display and edit correctly.
- [ ] 8.10 Verify requirement items do not receive task phases.
