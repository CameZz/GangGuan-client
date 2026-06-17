## Why

当前新建任务面板中包含参与者选择功能，但实际上新建任务时参与者信息并非必填，且用户反馈该功能增加了操作复杂度。同时，任务阶段选择时缺少起始时间的设置，导致无法准确记录每个阶段的开始时间。

## What Changes

- 移除新建任务面板中的参与者选择区域
- 在任务阶段选择时添加起始时间选择功能
- 保留编辑任务时的参与者管理功能

## Capabilities

### New Capabilities
- `phase-start-time`: 任务阶段起始时间选择功能

### Modified Capabilities
- `task-creation`: 移除新建任务时的参与者选择
- `task-phase-management`: 阶段选择增加起始时间字段

## Impact

- 影响组件: `TaskModal.vue`
- 影响类型定义: `TaskPhase` 接口需要添加 `startTime` 字段
- 影响存储: 任务阶段数据结构变更
