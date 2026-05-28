## 1. 筛选器改造

- [x] 1.1 `filterRole` 类型从 `RoleType | ''` 改为 `RoleType[]`，默认空数组
- [x] 1.2 模板中将 select 下拉框替换为 checkbox 按钮组，每个角色一个可点击的标签
- [x] 1.3 memberScheduleData 过滤逻辑改为：空数组显示全部，非空时匹配 `.includes(member.role)`
