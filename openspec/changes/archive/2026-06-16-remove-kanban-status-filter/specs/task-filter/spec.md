## MODIFIED Requirements

### Requirement: 任务筛选器状态筛选可见性
系统 SHALL 允许调用方控制任务筛选器中状态筛选选项的可见性。

**目的**：让看板界面可以隐藏冗余的状态筛选，同时保留列表界面的完整筛选功能。
**输入**：`showStatusFilter` prop（布尔值，默认 true）。
**输出**：当 `showStatusFilter=false` 时，状态筛选区域不显示。
**验证方法**：在看板界面验证状态筛选不显示，在列表界面验证状态筛选正常显示。

#### Scenario: 看板界面不显示状态筛选
- **WHEN** 用户打开看板界面
- **THEN** 任务筛选器 MUST 不显示状态筛选选项

#### Scenario: 列表界面显示状态筛选
- **WHEN** 用户打开列表界面
- **THEN** 任务筛选器 SHALL 显示状态筛选选项

#### Scenario: 默认显示状态筛选
- **WHEN** 使用 TaskFilter 组件且未设置 `showStatusFilter` prop
- **THEN** 状态筛选选项 SHALL 默认显示
