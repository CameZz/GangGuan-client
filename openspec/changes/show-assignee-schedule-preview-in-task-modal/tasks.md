## 1. Schedule Preview Data

- [x] 1.1 Add a two-week preview date range in `TaskModal.vue`, starting from local today and ending before day 15.
- [x] 1.2 Build compact day slots and work slots for the preview range using project workday configuration.
- [x] 1.3 Aggregate saved task phases by selected assignee, current project, scheduled time overlap, and preview range.
- [x] 1.4 Exclude the currently edited task's saved phases from the saved aggregation.
- [x] 1.5 Merge current form phases back into preview data as draft schedule items, including the active row's draft phase.

## 2. Task Modal UI

- [x] 2.1 Render the preview directly under the selected phase row only when that row has an assignee.
- [x] 2.2 Render date labels and compact phase bars without a member/title heading line.
- [x] 2.3 Show a lightweight `未来两周暂无排期` empty state when the selected assignee has no preview items.
- [x] 2.4 Style saved items and current draft items so users can distinguish the phase being edited.
- [x] 2.5 Add tooltip/title text with task title, phase name, iteration, time range, and progress for each preview bar.
- [x] 2.6 Add a selected state for phase plan rows and keep only the selected phase's schedule preview expanded.
- [x] 2.7 Compress the two-week schedule grid to fit the modal width without relying on horizontal scrolling in normal desktop layouts.

## 3. Verification

- [ ] 3.1 Verify selecting different phase rows and assignees updates the preview immediately.
- [ ] 3.2 Verify editing an existing task does not duplicate that task's old saved phase schedule.
- [x] 3.3 Verify the preview omits the `张三 · 未来两周排期` heading text.
- [x] 3.4 Run the project build and fix any type or template errors.
- [ ] 3.5 Browser-check the task modal in desktop and narrow widths for layout overflow.
