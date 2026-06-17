## ADDED Requirements

### Requirement: 任务阶段起始时间选择
系统 SHALL 允许用户在任务阶段选择时设置每个阶段的起始时间。

#### Scenario: 设置阶段起始时间
- **WHEN** 用户在任务阶段列表中选择一个阶段
- **THEN** 系统显示时间选择器，用户可以设置该阶段的起始时间

#### Scenario: 保存阶段起始时间
- **WHEN** 用户设置阶段起始时间并保存任务
- **THEN** 系统将起始时间保存到 TaskPhase 的 startTime 字段

#### Scenario: 显示已设置的起始时间
- **WHEN** 用户打开已有任务的编辑面板
- **THEN** 系统在阶段列表中显示每个阶段已设置的起始时间
