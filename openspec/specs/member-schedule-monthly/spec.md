## ADDED Requirements

### Requirement: 按月查看时间轴
时间轴 SHALL 按整月显示，右上角提供年份和月份选择器。

#### Scenario: 默认显示当前年月
- **WHEN** 用户进入成员排期表
- **THEN** 时间轴默认显示当前年月的日期，年月选择器选中当前年月

#### Scenario: 切换月份
- **WHEN** 用户通过年月选择器切换到 2026年3月
- **THEN** 时间轴更新为 3/1 至 3/31 的日期网格

#### Scenario: 切换年份
- **WHEN** 用户将年份切换为 2025
- **THEN** 月份保持不变，时间轴更新为 2025年对应月份

### Requirement: 限定当前项目成员
成员列表 SHALL 仅显示当前项目中参与任务的成员，不显示未参与当前项目的成员。

#### Scenario: 当前项目有参与成员
- **WHEN** 项目 A 有成员张三和李四参与的任务
- **THEN** 成员排期表仅显示张三和李四（他们的行内仍显示所有项目的任务）

#### Scenario: 成员在当前项目无任务但其他项目有任务
- **WHEN** 成员王五只在项目 B 有任务，当前查看项目 A
- **THEN** 王五不显示在成员列表中

### Requirement: 路由包含项目标识
成员排期表 SHALL 通过路由参数或 store 获取当前项目 ID。

#### Scenario: 通过路由访问
- **WHEN** 用户访问 `/member-schedule/:projectId`
- **THEN** 使用路由参数中的 projectId 确定当前项目

#### Scenario: 无路由参数时回退
- **WHEN** 用户访问 `/member-schedule`（无 projectId）
- **THEN** 回退到 projectStore.currentProjectId
