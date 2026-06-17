## Context

The timeline currently renders task `participants` as role-colored bars. Task phase planning now stores richer execution data on `Task.phases`: phase name, assignee, progress, start time, and end time. The timeline should use that phase data so a user can see who owns each scheduled phase and whether progress is healthy.

## Goals / Non-Goals

**Goals:**
- Render timeline bars from task phases rather than participant schedule rows.
- Show assignee, phase name, and progress percentage on each visible phase bar.
- Keep assignee colors stable inside the timeline view.
- Use progress status colors only in the timeline view: orange before start, green when complete/on-track/ahead, red when behind or overdue.
- Preserve existing timeline filtering, date grid, rest-day collapse, and task row structure.

**Non-Goals:**
- Do not change colors in kanban, list, task modal, or member schedule.
- Do not add new task data fields or migrate existing data.
- Do not change phase progress editing behavior.
- Do not introduce dependency/blocking rules between phases.

## Decisions

1. Use task phases as timeline bar source.

   Each `TaskPhase` already contains `assigneeId`, `progress`, `startTime`, and `endTime`, so timeline bars should be generated from `task.phases` with a valid `startTime`. This aligns the timeline with the phase plan users configure in the task modal. The previous participant-based bars can remain as legacy fallback only when a task has no usable phases.

2. Separate assignee identity color from progress health color.

   A stable assignee color identifies who owns the phase. The progress fill color communicates schedule health. This avoids overloading one color channel with both identity and status.

3. Keep assignee colors timeline-local.

   The timeline can derive a deterministic color from `memberId`, using a fixed palette and stable hash. That gives the same member the same timeline color without changing global member avatar or badge styling.

4. Compute expected progress from elapsed working time.

   For a phase with `startTime` and `endTime`, expected progress uses only working time inside that range. Default weekends and configured `nonWorkdays` are excluded; configured `extraWorkdays` are included.

   `clamp((elapsedWorkingTime / totalWorkingTime) * 100, 0, 100)`

   Status color rules:
   - `progress >= 100`: green
   - `now < startTime`: orange
   - `elapsedWorkingTime > totalWorkingTime && progress < 100`: red
   - `progress >= expectedProgress`: green
   - otherwise: red

5. Show progress as a fill inside the same bar.

   The phase bar should have one visible progress fill layer proportional to `phase.progress`. It should not add a second independent progress bar below the timeline bar.

## Risks / Trade-offs

- [Tasks without phase times disappear from the timeline] -> Treat phases without `startTime` as unscheduled and optionally keep the existing no-bar behavior.
- [Very short bars may not fit labels] -> Use compact labels and expose full details through tooltip/title.
- [Member color collisions are possible with a small palette] -> Use enough colors and deterministic hashing; collisions are acceptable in V1 because labels remain visible.
- [Current date makes health color time-dependent] -> Compute status at render time so refresh naturally updates color.

## Migration Plan

No data migration is required. Existing tasks with normalized phases can render immediately. If a task lacks usable phase schedule data, keep current empty/no-bar behavior or legacy participant fallback during implementation.

## Open Questions

- Should tasks with no scheduled phases appear in a separate “未排期” section later?
- Should phase health status be filterable in a future version?
