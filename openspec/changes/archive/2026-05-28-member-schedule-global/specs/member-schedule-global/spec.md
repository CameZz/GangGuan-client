## ADDED Requirements

### Requirement: 全局数据读取
成员排期表 SHALL 读取所有项目、所有迭代的任务数据，不受当前选中项目或迭代的限制。

#### Scenario: 页面加载显示全局数据
- **WHEN** 用户进入成员排期表页面
- **THEN** 显示所有项目中所有成员参与的任务，不限定在某个项目或迭代

#### Scenario: 成员跨项目有任务
- **WHEN** 成员 A 在项目 X 的迭代 1 有任务，在项目 Y 的迭代 2 有任务
- **THEN** 成员 A 的行内同时显示两个项目的任务条，颜色分别对应各自迭代

### Requirement: 动态时间轴范围
时间轴的起止日期 SHALL 根据所有任务的实际时间动态计算，不依赖选中迭代的 createdAt/deadline。

#### Scenario: 任务有明确时间
- **WHEN** 所有任务中最早 startTime 为 5/1，最晚 endTime 为 6/15
- **THEN** 时间轴范围为 5/1 至 6/15

#### Scenario: 无任务有时间数据
- **WHEN** 没有任何任务有 startTime
- **THEN** 时间轴范围为当前日期 ±7 天

### Requirement: 跨项目迭代图例
底部图例 SHALL 显示所有涉及的迭代，格式为"项目名 - 迭代名"以区分不同项目的同名迭代。

#### Scenario: 多个项目有迭代
- **WHEN** 项目 A 和项目 B 各有迭代"v1.0"
- **THEN** 图例分别显示"A - v1.0"和"B - v1.0"，颜色不同

### Requirement: 路由独立于项目选择
成员排期表 SHALL 可通过 `/member-schedule` 直接访问，不需要先选择项目。

#### Scenario: 直接访问
- **WHEN** 用户访问 `/member-schedule`
- **THEN** 页面正常加载全局成员排期数据
