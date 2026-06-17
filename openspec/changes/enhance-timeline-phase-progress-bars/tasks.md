## 1. Phase Bar Data

- [x] 1.1 Replace timeline bar source from task participants to scheduled task phases.
- [x] 1.2 Keep task row filtering compatible with visible scheduled phases in the current date range.
- [x] 1.3 Reuse the existing timeline grid positioning logic for phase startTime and endTime.
- [x] 1.4 Handle phases without startTime or endTime gracefully without rendering invalid bars.

## 2. Timeline Color And Progress Helpers

- [x] 2.1 Add a timeline-local deterministic assignee color helper based on assigneeId.
- [x] 2.2 Add expected progress calculation using elapsed time divided by estimated phase duration.
- [x] 2.3 Add health status calculation for not started, on track, behind, overdue, and completed phases.
- [x] 2.4 Add tooltip/detail text helpers for task title, phase name, assignee, dates, progress, and status.

## 3. Timeline Rendering

- [x] 3.1 Render phase bars with assignee name, phase name, and progress percentage.
- [x] 3.2 Add an internal progress fill layer whose width follows phase progress.
- [x] 3.3 Apply orange, green, or red progress fill colors according to phase health status.
- [x] 3.4 Keep assignee identity color visually separate from the progress health color.
- [x] 3.5 Ensure multiple phase bars in one task row stack cleanly without overlap.

## 4. Scoped Styling And Regression Checks

- [x] 4.1 Confirm kanban, list, task modal, and member schedule colors are not changed.
- [x] 4.2 Verify same assignee has the same timeline color across multiple phase bars.
- [x] 4.3 Verify not-started, on-track, ahead, behind, overdue, and completed color cases.
- [x] 4.4 Run npm run build.
