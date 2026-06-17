## ADDED Requirements

### Requirement: 角色筛选多选
角色筛选器 SHALL 支持同时选中多个角色，显示选中角色的成员并集。

#### Scenario: 选中多个角色
- **WHEN** 用户选中"美术"和"UI"两个角色
- **THEN** 成员列表显示所有美术和 UI 角色的成员

#### Scenario: 取消选中某个角色
- **WHEN** 用户取消选中"UI"
- **THEN** 成员列表仅显示美术角色的成员

#### Scenario: 全部取消选中
- **WHEN** 用户取消所有角色选中
- **THEN** 显示全部成员（等同于无筛选）
