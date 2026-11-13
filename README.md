# Chirp

一个本机运行的极简短文分享工具：写下不超过 280 字的片段，发布后立刻出现在时间线顶部，可以点赞、可以删除。

前端是 **Vue 3 + Pinia + TypeScript + Vite**，后端是 **Hono** + **内存存储**，通过 RESTful API 通信。数据由本机后端进程持有，不再依赖浏览器 `localStorage`。测试用 **Vitest + Vue Test Utils**，按 TDD（先写测试、再写实现）的方式开发。

## 快速开始

```bash
npm install
npm run dev        # 同时启动前端与后端
```

- 前端：`http://localhost:5173`
- 后端：`http://127.0.0.1:3002`（Vite 把 `/api` 代理到这里）

只启动其中一端：

| 命令 | 说明 |
| --- | --- |
| `npm run dev:web` | 只启动 Vite 开发服务器 |
| `npm run dev:api` | 只启动后端（`tsx watch`，改代码自动重启） |
| `npm start` | 以非 watch 模式启动后端 |

其他脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 类型检查 + 生产构建，产物在 `dist/` |
| `npm run preview` | 预览构建产物（需另起后端） |
| `npm run typecheck` | `vue-tsc` 类型检查（含 `server/`） |
| `npm run test` | Vitest 监听模式（web + server 两个项目） |
| `npm run test:run` | 单次运行全部单元、组件与 API 测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

需要 Node.js 20.19+ / 22.12+（本项目在 Node 22.23 上验证）。

## 功能

- **发布**：多行输入，280 字上限，实时计数（超过 240 变琥珀、超限变红）；空内容、纯空格、超长时发布按钮禁用；`Ctrl` / `⌘` + `Enter` 快捷发布；提交中按钮置灰防重复提交
- **时间线**：单列卡片流，最新在最前，保留换行，显示相对时间（刚刚 / x 分钟前 / x 小时前 / x 天前 / 具体日期），每分钟自动刷新
- **点赞**：卡片心形按钮切换选中态并显示计数，状态写回后端，刷新后保留
- **删除**：二次确认后从时间线与后端移除，列表有进出场动效
- **体验**：暖米白 + 墨绿 + 琥珀配色、跟随系统深色模式、窄栏居中布局、480px 断点、`prefers-reduced-motion` 下关闭动效

## 目录结构

```
chirp/
├── index.html                    # Vite 入口，挂载 #app
├── vite.config.ts                # Vite + Vitest（web / server 双项目）+ /api 代理
├── vitest.setup.ts               # web 项目的 jsdom 前置
├── tsconfig.json
├── server/                       # 后端：Hono + 内存存储
│   ├── index.ts                  # 启动入口（默认 127.0.0.1:3002）
│   ├── app.ts                    # 路由、状态码与错误体契约
│   ├── store.ts                  # 进程内内存存储（数组 + 副本隔离）
│   ├── validate.ts               # 请求体校验（空内容 / 超长 / 类型）
│   └── __tests__/                # 存储、校验、路由集成测试
├── src/
│   ├── main.ts                   # createApp + Pinia + 全局样式
│   ├── App.vue                   # 组合顶栏、发布区、时间线、轻提示
│   ├── types/post.ts             # Post 与 AddResult 类型契约
│   ├── lib/
│   │   ├── text.ts               # countChars（按码点）、长度阈值
│   │   ├── time.ts               # formatRelativeTime
│   │   ├── id.ts                 # createId（randomUUID + 降级，服务端使用）
│   │   ├── api.ts                # 后端 API 客户端（fetch 封装 + ApiError）
│   │   └── __tests__/            # 纯函数与 API 客户端测试
│   ├── stores/
│   │   ├── posts.ts              # Pinia setup store：load / add / remove / toggleLike
│   │   └── __tests__/            # store 行为测试
│   ├── components/
│   │   ├── AppHeader.vue         # 品牌与条数
│   │   ├── Composer.vue          # 输入、计数、校验、快捷发布
│   │   ├── Timeline.vue          # 列表、空状态、删除/点赞编排、时间刷新
│   │   ├── PostCard.vue          # 单条内容、相对时间、点赞、删除确认
│   │   ├── AppToast.vue          # aria-live 轻提示
│   │   └── __tests__/            # 组件交互测试
│   └── styles/
│       ├── tokens.css            # 设计令牌、明暗色板、重置
│       └── app.css               # 布局、组件样式、动效、响应式
└── README.md
```

## HTTP API

`Base path: /api`，请求与响应均为 JSON。前端开发时由 Vite 代理到 `http://127.0.0.1:3002`。

| 方法 | 路径 | 请求体 | 成功响应 |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `200` `{ "status": "ok" }` |
| `GET` | `/api/posts` | — | `200` `{ "posts": Post[] }`（`createdAt` 倒序） |
| `GET` | `/api/posts/:id` | — | `200` `{ "post": Post }` |
| `POST` | `/api/posts` | `{ "content": string }` | `201` `{ "post": Post }` + `Location` 头 |
| `PATCH` | `/api/posts/:id` | `{ "liked"?: boolean, "bookmarked"?: boolean }` | `200` `{ "post": Post }` |
| `POST` | `/api/posts/:id/repost` | `{ "content"?: string }`（可完全省略 body） | `201` `{ "post": Post }` + `Location` 头 |
| `DELETE` | `/api/posts/:id` | — | `204` 无 body |

- `GET /api/posts` 支持查询参数 `bookmarked`：`?bookmarked=true` 只返回已收藏的帖子，其它值或不带参数返回全部
- `PATCH /api/posts/:id` 是局部更新：`liked` / `bookmarked` 至少出现一个，出现就必须是布尔值
- `POST /api/posts/:id/repost` 的 `content` 是转发语，可以省略（纯转发）；转发语 trim 后为空也按纯转发处理，不会报 `empty_content`

失败响应统一为：

```json
{ "error": { "code": "too_long", "message": "内容长度超出上限（最多 280 个字符）" } }
```

| `code` | 状态码 | 触发条件 |
| --- | --- | --- |
| `invalid_body` | `400` | 非法 JSON、缺字段、字段类型不对 |
| `empty_content` | `422` | `content` trim 后为空（仅 `POST /api/posts`） |
| `too_long` | `422` | `content` 或转发语码点数超过 280 |
| `not_found` | `404` | id 不存在（含转发的源帖不存在），或路径不存在 |

### 数据模型

```json
{
  "id": "0f9c3a1e-6b1c-4b7e-9c2f-2f7a1d8b6c11",
  "content": "第一条短文。\n换行会被保留。",
  "createdAt": 1763000000000,
  "liked": false,
  "bookmarked": false,
  "repostOf": null,
  "repostCount": 0
}
```

转发帖的样子（`repostOf` 是源帖的值快照）：

```json
{
  "id": "6d0e2b44-1c8f-4f6a-9b3d-7c5a2e9f4d10",
  "content": "值得一转",
  "createdAt": 1763000005000,
  "liked": false,
  "bookmarked": false,
  "repostOf": {
    "id": "0f9c3a1e-6b1c-4b7e-9c2f-2f7a1d8b6c11",
    "content": "第一条短文。\n换行会被保留。",
    "createdAt": 1763000000000
  },
  "repostCount": 0
}
```

- `id`：由服务端生成，`crypto.randomUUID()`，不支持时降级为 `p-<时间戳>-<随机串>`
- `content`：服务端 `trim` 后的文本，按 Unicode 码点计数，上限 280；纯转发（不带转发语）时为空字符串
- `createdAt`：epoch 毫秒，由服务端写入
- `liked`：是否已点赞，初始为 `false`
- `bookmarked`：是否已收藏，初始为 `false`
- `repostOf`：`null` 表示原创；非 `null` 表示这是转发，值为源帖的 `{ id, content, createdAt }` 快照
- `repostCount`：被转发次数，初始为 `0`

转发是**扁平**的：转发一条转发帖时，新帖的 `repostOf` 指向最初的原帖而不是那条转发帖，因此 `repostOf` 永远只有一层，不会嵌套。

### 存储

服务端用进程内的数组保存全部帖子，重启即清空。每条返回给调用方的数据都是副本（`repostOf` 也复制一层），外部改动不会污染存储内部状态。

- 列表排序：`createdAt` 倒序，`createdAt` 相同时后插入的在前；`GET /api/posts?bookmarked=true` 复用同一顺序
- 转发计数：转发成功时最初原帖的 `repostCount` 加一；删除自己的转发帖时回退一次（不低于 0）
- 删除源帖**不级联**删除转发帖：转发帖仍能正常读取，`repostOf` 快照完好，之后继续基于它转发时计数不再变化
- 删除未命中的 id 返回 `false`，不改动任何数据

需要重置时重启后端进程即可。

## 分层与 TDD 约定

依赖方向单向：`server`（内存存储 + HTTP 契约）← `src/lib/api.ts`（API 客户端）← `src/stores`（Pinia）← `src/components`（视图）。

- 组件不直接调用 `fetch`，只与 store 交互；网络或服务端失败由 store 捕获、回滚内存并返回原因
- 每个写操作走「先请求成功、再更新内存状态」的顺序，保证界面与后端不漂移
- 校验前置：`Composer` 与服务端都会校验空内容和长度，避免无谓的网络往返
- 开发顺序为：纯函数 → 服务端 → API 客户端 → store → 组件 → 整体联调，每层先写用例再实现

## 已知限制

- 数据只存在后端进程内存里，**重启或关闭进程即丢失**，也不跨机器、不跨浏览器共享
- 点赞是单机状态（0 / 1），不是多人计数
- 不跨标签页实时同步（另一个标签页需刷新）
- 未做分页与虚拟滚动，条目数量受进程内存限制
- 旧版 `localStorage`（`chirp.posts.v1` / `chirp.posts.v2`）里的数据不会自动迁移到后端
