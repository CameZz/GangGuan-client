## Why

成员排期表当前的筛选器是任务阶段和优先级，但在人员视角下，按角色筛选更有实际意义——PM 需要快速查看某类角色（如所有美术、所有程序）的排期情况。

## What Changes

- 删除成员排期表右上角的"任务阶段"和"优先级"筛选器
- 新增"角色"筛选器，选项来自 ROLES 列表（PM、策划、美术、UI、程序等）
- 选中某角色后，仅显示该角色的成员行及其任务条

## Capabilities

### New Capabilities
- `member-schedule-role-filter`: 成员排期表按角色筛选

### Modified Capabilities

## Impact

- 修改 `src/views/MemberScheduleView.vue` 的筛选器和过滤逻辑
