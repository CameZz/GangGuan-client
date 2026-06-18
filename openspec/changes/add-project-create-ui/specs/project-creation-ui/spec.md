## ADDED Requirements

### Requirement: Authorized project creation entry
The system SHALL display a project creation entry on the project selection page only for users with project management permission.

- 目的：允许管理员/PM 从项目选择界面开始创建项目。
- 输入：当前登录用户权限状态。
- 输出：有权限用户看到“新建项目”入口；无权限用户不看到该入口。
- 验证方法：分别使用管理员/PM 和普通成员账号访问项目选择页。

#### Scenario: Project manager sees create entry
- **WHEN** an admin or PM opens the project selection page
- **THEN** the page shows a visible “新建项目” action

#### Scenario: Non-manager does not see create entry
- **WHEN** a non-project-manager opens the project selection page
- **THEN** the page does not show the project creation action

### Requirement: Project creation form
The system SHALL open a project creation form that collects the project name and description.

- 目的：复用现有项目表单完成基础项目信息录入。
- 输入：用户点击“新建项目”入口。
- 输出：显示新建项目弹窗，包含项目名称和描述字段。
- 验证方法：点击入口并检查弹窗标题、字段和按钮状态。

#### Scenario: Open creation modal
- **WHEN** an authorized user clicks “新建项目”
- **THEN** the system opens a modal titled “新建项目”
- **THEN** the modal contains project name and description inputs

#### Scenario: Require project name
- **WHEN** the creation form has an empty project name
- **THEN** the system prevents submission or reports that the project name is required

### Requirement: Successful project creation flow
The system SHALL create the project through the existing project store action and transition into the created project.

- 目的：让项目创建和进入项目形成一个连续工作流。
- 输入：有效项目名称和描述。
- 输出：新项目被保存，成为当前项目，并打开该项目看板。
- 验证方法：提交有效表单，确认项目列表新增项目且路由进入 `/kanban/:projectId`。

#### Scenario: Create and enter project
- **WHEN** an authorized user submits a valid project creation form
- **THEN** the system calls the project creation flow
- **THEN** the created project becomes the current project
- **THEN** the user is navigated to the created project's kanban page

### Requirement: Project creation failure feedback
The system SHALL keep the creation modal open and show failure feedback when project creation fails.

- 目的：避免服务端失败时用户误以为项目已经创建。
- 输入：项目创建接口失败或返回无项目数据。
- 输出：弹窗保持打开并显示失败提示，用户可修正或重试。
- 验证方法：模拟创建接口失败，确认没有跳转且错误信息可见。

#### Scenario: Creation fails
- **WHEN** the project creation request fails
- **THEN** the system keeps the creation modal open
- **THEN** the system displays a creation failure message
- **THEN** the current project selection remains unchanged
