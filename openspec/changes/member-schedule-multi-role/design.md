## Context

当前角色筛选用 `<select v-model="filterRole">` 单选，filterRole 类型为 `RoleType | ''`。需要改为多选。

## Goals / Non-Goals

**Goals:**
- 角色筛选支持多选
- 保持 UI 简洁，不引入额外依赖

**Non-Goals:**
- 不改变其他筛选逻辑

## Decisions

使用 checkbox 组替代 select 下拉框。filterRole 从 `ref<RoleType | ''>` 改为 `ref<RoleType[]>([])`。模板中用一组 checkbox 按钮展示角色选项，选中高亮。过滤逻辑：空数组 = 全部，非空 = 角色并集。

## Risks / Trade-offs

- checkbox 组占空间比下拉框大，但角色只有 10 个，可以接受
