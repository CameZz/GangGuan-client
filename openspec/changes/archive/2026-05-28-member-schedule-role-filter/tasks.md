## 1. 替换筛选器

- [x] 1.1 删除 `filterStage` 和 `filterPriority` 相关代码（ref 定义、筛选逻辑、模板中的 select 元素）
- [x] 1.2 新增 `filterRole` ref，添加角色筛选下拉框，选项来自 ROLES 常量
- [x] 1.3 修改 `memberScheduleData` computed，添加按 `filterRole` 过滤成员行的逻辑
