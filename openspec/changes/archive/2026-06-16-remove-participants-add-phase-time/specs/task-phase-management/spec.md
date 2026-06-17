## MODIFIED Requirements

### Requirement: 任务阶段管理增强
系统 SHALL 在任务阶段管理中添加起始时间字段支持。

#### Scenario: TaskPhase 接口更新
- **WHEN** 系统定义 TaskPhase 接口
- **THEN** 接口包含 startTime: string | null 字段

#### Scenario: 阶段列表显示时间选择器
- **WHEN** 用户在任务阶段计划区域查看阶段列表
- **THEN** 每个阶段项显示起始时间选择器

#### Scenario: 初始化阶段起始时间
- **WHEN** 系统从模板创建任务阶段
- **THEN** 阶段的 startTime 字段初始化为 null

#### Scenario: 兼容旧数据
- **WHEN** 系统加载缺少 startTime 字段的旧阶段数据
- **THEN** 系统自动补充 startTime 为 null
