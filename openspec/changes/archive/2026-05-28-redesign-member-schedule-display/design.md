## Context

当前 `MemberScheduleView.vue` 使用甘特图式布局：每天 4 列（每 6 小时一格），任务条通过 CSS Grid 的 `gridColumn` 定位横跨多个时段。重叠任务通过 `assignRowIndices` 分配不同行，同迭代重叠时叠加斜线阴影。

用户希望改为表格式布局，每天分为上午/下午两列，任务条按连续单元格横跨，重叠任务以半透明+描边方式区分，筛选器保持不变。

## Goals / Non-Goals

**Goals:**
- 将网格从每天 4 列改为每天 2 列（上午/下午）
- 任务条横跨连续半天单元格，不在单元格内断裂
- 重叠任务：先开始的实色在上，后开始的半透明+描边在下
- 保持现有筛选器（角色 Chip + 年月选择器）不变
- 保持底部迭代图例不变

**Non-Goals:**
- 不改变数据源和 Store 层逻辑
- 不改变筛选行为
- 不新增筛选维度
- 不改变 tooltip 内容

## Decisions

### 1. 时间槽位计算：从 6 小时改为 12 小时

当前 `getSlotIndex` 按 `Math.floor(hourOfDay / 6)` 将一天分为 4 槽。改为 `Math.floor(hourOfDay / 12)` 分为 2 槽（0-11 为上午，12-23 为下午）。

`GRID_SLOT_WIDTH` 从 48px 调大以适应表格单元格的视觉效果。

### 2. 重叠任务处理：单行 + 层叠显示

当前 `assignRowIndices` 为重叠任务分配不同行（纵向堆叠）。改为所有任务都在同一行（`rowIndex = 0`），通过 `z-index` 和透明度控制层叠顺序：
- 按开始时间排序，最早开始的任务 `z-index` 最高，实色显示
- 后续重叠任务 `z-index` 递减，使用半透明背景 + 描边

### 3. 描边方案

后开始的重叠任务添加 `border: 2px solid` 描边，颜色与任务所属迭代颜色一致但加深，确保在半透明背景下仍可辨识。

### 4. 任务条连续性

任务条仍通过 `gridColumn` 跨列显示。`totalSlots` 改为 `daySlots.length * 2`。`getBarStyle` 中 `startSlot` 和 `endSlot` 计算逻辑相应调整。

## Risks / Trade-offs

- **单元格变宽导致信息密度降低** → 每天从 4 格变 2 格，单格更宽，但整体更紧凑（去掉了行高堆叠）
- **重叠多任务时辨识度下降** → 通过描边+半透明分层缓解，hover tooltip 提供完整信息
- **`GRID_SLOT_WIDTH` 需要调优** → 可能在实现时微调数值
