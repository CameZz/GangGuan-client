## 1. 时间槽位计算调整

- [x] 1.1 将 `GRID_SLOT_WIDTH` 从 48px 调整为适合表格单元格的宽度
- [x] 1.2 修改 `getSlotIndex` 函数，从 `Math.floor(hourOfDay / 6)` 改为 `Math.floor(hourOfDay / 12)`
- [x] 1.3 修改 `totalSlots` 计算，从 `daySlots.length * 4` 改为 `daySlots.length * 2`
- [x] 1.4 修改 `getBarStyle` 中的 `endSlot` 计算逻辑，适配半天槽位

## 2. 表头改为半天布局

- [x] 2.1 修改表头模板，每个日期下渲染上午和下午两个子列
- [x] 2.2 日期标签格式改为包含星期（如"5/28（三）"）
- [x] 2.3 更新 `schedule-grid-header` 的 `gridTemplateColumns` 为 `repeat(${totalSlots}, ${GRID_SLOT_WIDTH}px)`

## 3. 重叠任务层叠显示

- [x] 3.1 修改 `assignRowIndices` 函数，所有任务统一 `rowIndex = 0`
- [x] 3.2 新增排序逻辑：按开始时间排序，为每个任务分配 `z-index`（先开始的更高）
- [x] 3.3 修改 `task-bar` 样式，为后开始的重叠任务添加半透明背景（`opacity` 或 `rgba`）
- [x] 3.4 为后开始的重叠任务添加描边样式（`border: 2px solid`，颜色加深）

## 4. 重叠检测逻辑更新

- [x] 4.1 修改 `hasSamePlanningOverlap` 函数，适配新的半天槽位计算
- [x] 4.2 新增通用重叠检测，标记哪些任务需要显示为半透明+描边

## 5. 样式调整

- [x] 5.1 调整 `.grid-cell` 样式，适配新的两列布局
- [x] 5.2 调整 `.task-bar` 样式，确保在单行内正确显示
- [x] 5.3 调整周末列的背景色区分样式
