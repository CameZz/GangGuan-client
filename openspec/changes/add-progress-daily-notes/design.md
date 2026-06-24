## 数据模型

新增 Prisma model `DailyNote`：

```prisma
model DailyNote {
  id        String   @id @default(uuid())
  content   String   @db.Text
  dateKey   String   @map("date_key")    // "2026-06-24" 格式
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  memberId  String   @map("member_id")
  member    User     @relation("DailyNoteAuthor", fields: [memberId], references: [id], onDelete: Cascade)

  projectId String   @map("project_id")
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([memberId, projectId, dateKey])
  @@index([projectId, dateKey])
  @@map("daily_notes")
}
```

- `dateKey` 使用 `YYYY-MM-DD` 字符串而非 DateTime，避免时区问题，便于前端按日匹配。
- 唯一约束 `(memberId, projectId, dateKey)` 保证每人每天每项目最多一条，天然支持 upsert。
- `User` model 新增反向关系 `dailyNotes DailyNote[] @relation("DailyNoteAuthor")`。
- `Project` model 新增反向关系 `dailyNotes DailyNote[]`。

## API 设计

### GET /api/projects/:projectId/daily-notes

批量查询项目在日期范围内的所有备注。

- Query: `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)
- 权限: `requireAuth`
- 返回: `{ notes: DailyNote[] }`

### PUT /api/projects/:projectId/daily-notes/:dateKey

创建或更新当天备注（只能操作自己的）。

- Body: `{ content: string }`
- 权限: `requireAuth`，服务端校验 `memberId === currentUser.id`
- 行为: `upsert` — 存在则更新 content，不存在则创建
- 返回: `{ note: DailyNote }`

### DELETE /api/projects/:projectId/daily-notes/:dateKey

删除当天备注（只能操作自己的）。

- 权限: `requireAuth`，服务端校验 `memberId === currentUser.id`
- 返回: `{ success: true }`

## 前端数据流

```
MemberScheduleView
│
├── progressHistoriesData (已有)
│     └── monthProgressHistories (已有，按月过滤)
│
├── dailyNotesData (新增)
│     └── monthDailyNotes (新增，按月过滤)
│
└── memberProgressData (改造)
      cell = {
        ...existing ProgressCell fields,
        note: { content, updatedAt } | null
      }
```

改造 `memberProgressData` computed：
- 遍历 `visibleDaySlots` 时，同时从 `monthDailyNotes` 中查找该成员+日期的备注。
- 当 `details` 和 `note` 都为空时，该 cell 为 `null`。
- 当只有 `note` 时，cell 仅包含 note 信息。
- 当只有 `details` 时，行为不变。
- 当两者都有时，cell 同时包含。

## 单元格渲染

三种卡片样式：
1. **进度卡片**（现有）— 绿色/红色背景，显示进度变更摘要
2. **备注卡片**（新增）— 蓝色背景，显示 `📝` 图标 + 备注内容截断
3. **合并卡片**（新增）— 备注在上，进度变更在下

空单元格：
- 当前用户是该成员时：显示 `+` 按钮（虚线边框，hover 高亮）
- 非当前用户：空白

## 详情面板

面板布局：
```
┌──────────────────────────────────┐
│ 成员名 · 日期           [关闭]   │
├──────────────────────────────────┤
│ 📝 今日备注         [编辑] [删除] │
│ (只读态: 文本内容)               │
│ (编辑态: textarea + 保存/取消)   │
├──────────────────────────────────┤
│ 📊 进度变更 (N次，净变化 ±Xpp)   │
│ (现有明细列表)                   │
└──────────────────────────────────┘
```

- 备注区域仅当该 cell 有备注或当前用户是该成员时显示。
- 进度变更区域仅当有进度变更时显示。
- 两个区域都无时（理论上不会发生，因为 cell 为 null），面板不显示。

## 权限判断

前端权限判断：
```ts
const canEditNote = (memberId: string) =>
  userStore.currentUser?.id === memberId
```

后端权限判断（PUT/DELETE 路由中）：
```ts
if (req.user.id !== memberId) return 403
```
