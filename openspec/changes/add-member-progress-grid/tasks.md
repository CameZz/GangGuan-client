## 1. Data Model And Mock API

- [x] 1.1 Extend `TaskProgressHistory` with an `assigneeId` field for the stage owner snapshot.
- [x] 1.2 Update mock progress history seed data to include `assigneeId` values matching each historical phase owner.
- [x] 1.3 Update mock progress history creation to persist `assigneeId` when a phase progress change is recorded.
- [x] 1.4 Add or expose a store/API method for reading progress histories across tasks in the current project.

## 2. Progress Aggregation

- [x] 2.1 Build project-scoped filtering for progress histories by task `projectId`.
- [x] 2.2 Build month-range filtering for progress histories by `createdAt`.
- [x] 2.3 Group progress histories by `assigneeId` and date.
- [x] 2.4 Calculate each cell's change count and net progress delta in percentage points.
- [x] 2.5 Prepare cell detail records with task name, planning name, phase name, owner, operator, old progress, new progress, delta, and time.

## 3. Member Schedule Data Scope

- [x] 3.1 Ensure member schedule data uses current project as the boundary and does not filter by selected planning.
- [x] 3.2 Ensure schedule rows include project members who own visible phase schedules or visible progress changes.
- [x] 3.3 Keep planning information only for color, legend, tooltip, and detail labels.
- [x] 3.4 Preserve current month/year selection and current-date auto-scroll behavior.

## 4. Page View Switching

- [x] 4.1 Add `成员排期` / `阶段进度` segmented control to `MemberScheduleView`.
- [x] 4.2 Store the active member schedule view in local component state.
- [x] 4.3 Render the existing schedule grid only when `成员排期` is active.
- [x] 4.4 Render the new progress grid only when `阶段进度` is active.

## 5. Progress Grid UI

- [x] 5.1 Render date columns using the same monthly date range as member schedule.
- [x] 5.2 Render member rows using stage owner grouping.
- [x] 5.3 Render empty progress cells for dates without progress changes.
- [x] 5.4 Render non-empty progress cells with count and signed net delta, such as `2次 +75pp`.
- [x] 5.5 Add hover or click detail display for a non-empty progress cell.
- [x] 5.6 Handle no-data states for projects or months without progress changes.

## 6. Verification

- [x] 6.1 Verify progress histories remain visible under the original task detail progress history tab.
- [x] 6.2 Verify project A does not show project B schedule or progress data.
- [x] 6.3 Verify multiple plannings in the same project appear together in both views.
- [x] 6.4 Verify admin edits to another member's phase progress are grouped under the phase owner, with the admin shown as operator.
- [x] 6.5 Run `npm run build`.
