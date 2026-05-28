## 1. 数据模型

- [x] 1.1 在 `Planning` 接口中新增 `nonWorkdays: string[]` 和 `extraWorkdays: string[]` 字段
- [x] 1.2 在 mock 数据中为所有 Planning 补充 `nonWorkdays: []` 和 `extraWorkdays: []` 默认值
- [x] 1.3 在 `mock.ts` 的 `createPlanning` 和 `updatePlanning` 中支持新字段

## 2. 工作日判断逻辑

- [x] 2.1 在 `TimelineView.vue` 中实现 `isWorkday(date)` 函数：检查日期是否在 nonWorkdays/extraWorkdays 中，结合默认周一~周五模式判断
- [x] 2.2 实现 `toggleWorkday(date)` 函数：根据日期是默认工作日还是默认休息日，将其加入或移除对应的例外数组

## 3. 时间轴灰化显示

- [x] 3.1 在日期列头渲染中，对非工作日添加 `non-workday` CSS 类
- [x] 3.2 在网格单元格渲染中，对非工作日对应的 4 个格子添加灰化样式类
- [x] 3.3 编写灰化样式：灰色半透明背景，降低文字对比度

## 4. 管理员切换交互

- [x] 4.1 在日期列头上添加点击事件，仅对管理员/PM 角色生效
- [x] 4.2 点击后调用 `toggleWorkday`，通过 `planningStore.updatePlanning` 持久化
- [x] 4.3 日期列头显示工作/休息状态指示器（如"休"标记）
- [x] 4.4 非管理员用户不显示点击交互，日期列头为只读

## 5. Store 层支持

- [x] 5.1 确认 `planningStore.updatePlanning` 能正确传递并持久化新字段
