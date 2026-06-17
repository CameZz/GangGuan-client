## 1. 类型定义更新

- [x] 1.1 在 `src/types/index.ts` 的 `TaskPhase` 接口中添加 `startTime: string | null` 字段
- [x] 1.2 更新 `createTaskPhaseFromTemplate` 函数，初始化 `startTime` 为 `null`

## 2. TaskModal 组件修改

- [x] 2.1 在 `TaskModal.vue` 中添加 `v-if="isEditing"` 条件到参与者选择区域
- [x] 2.2 在阶段计划列表的每个阶段项中添加起始时间选择器
- [x] 2.3 添加 `updateTaskPhaseStartTime` 方法处理时间更新

## 3. 数据兼容性处理

- [x] 3.1 更新 `normalizeTaskPhases` 函数，为旧数据补充 `startTime: null`
- [x] 3.2 测试加载现有任务数据，确保不报错

## 4. 测试验证

- [x] 4.1 测试新建任务时不显示参与者选择
- [x] 4.2 测试编辑任务时正常显示参与者选择
- [x] 4.3 测试阶段起始时间的选择和保存功能
