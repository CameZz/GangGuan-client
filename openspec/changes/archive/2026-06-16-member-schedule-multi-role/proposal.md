## Why

成员排期表的角色筛选器当前是单选，但 PM 经常需要同时查看多个角色的排期（如"美术 + UI"或"所有程序"）。单选需要反复切换，效率低。

## What Changes

- 角色筛选器从单选下拉框改为多选，支持同时选中多个角色
- 未选中任何角色时显示全部成员（行为不变）
- 选中多个角色时，显示这些角色的成员并集

## Capabilities

### New Capabilities
- `member-schedule-multi-role`: 角色筛选器多选

### Modified Capabilities

## Impact

- 修改 `src/views/MemberScheduleView.vue` 的筛选器 UI 和过滤逻辑
