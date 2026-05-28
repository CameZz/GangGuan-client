## Why

当前成员排期表使用甘特图式时间轴布局，每天 4 个时段（每 6 小时一格），任务条横向连续延伸。这种布局在屏幕空间利用上不够高效，且当成员任务较多时，纵向堆叠导致行高不可控。改为表格式布局（每天分上午/下午两格），能更紧凑地展示排期信息，提升可读性。

## What Changes

- 将时间轴网格从"每天 4 列（6h/slot）"改为"每天 2 列（上午/下午）"
- 任务条按连续单元格横跨显示，不再按小时段切分
- 重叠任务处理方式变更：先开始的任务实色显示，后开始的任务半透明 + 描边显示（替代当前的斜线阴影）
- 表头日期增加星期显示（如"5/28（三）"）
- 筛选器（角色 Chip + 年月选择器）保持不变
- 底部迭代颜色图例保持不变

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `member-schedule-view`: 网格布局从甘特图式时间轴改为表格式半天布局，重叠任务显示逻辑从斜线阴影改为半透明+描边

## Impact

- 修改文件：`src/views/MemberScheduleView.vue`
- 涉及计算逻辑：`daySlots`、`totalSlots`、`getSlotIndex`、`getBarStyle`、`assignRowIndices`、`hasSamePlanningOverlap`
- 涉及样式：网格布局、任务条、重叠样式
- 无 API / 依赖变更
