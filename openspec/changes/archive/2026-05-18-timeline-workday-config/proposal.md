## Why

时间轴视图目前将迭代时间范围内的每一天等同显示，但实际工作中并非每天都是工作日（周末、法定节假日）。需要区分工作日和非工作日，让排期规划更准确。

## What Changes

- Planning 接口新增 `nonWorkdays`（休息日例外）和 `extraWorkdays`（加班日例外）字段
- 默认工作日模式：周一~周五上班，周六日休息
- 时间轴中非工作日格子灰化显示
- 管理员可在时间轴上点击日期列头，切换某天的工作/休息状态

## Capabilities

### New Capabilities
- `workday-config`: 迭代工作日配置，支持设置休息日例外和加班日例外

### Modified Capabilities
- `iteration-timeline`: 时间轴视图增加非工作日灰化显示及管理员切换交互

## Impact

- 修改文件：`types/index.ts`、`utils/mock.ts`、`stores/planning.ts`、`views/TimelineView.vue`
- 无新增依赖
