# Chirp

一个只在本机运行的极简短文分享工具：写下不超过 280 字的片段，发布后立刻出现在时间线顶部，可以点赞、可以删除。所有数据保存在浏览器 `localStorage` 中，刷新、关闭再打开都还在。

无后端、不联网、不上传。技术栈 **Vue 3 + Pinia + TypeScript + Vite**，测试用 **Vitest + Vue Test Utils**，按 TDD（先写测试、再写实现）的方式开发。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
```

其他脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 类型检查 + 生产构建，产物在 `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | `vue-tsc` 类型检查 |
| `npm run test` | Vitest 监听模式 |
| `npm run test:run` | 单次运行全部单元与组件测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

需要 Node.js 20.19+ / 22.12+（本项目在 Node 22.23 上验证）。

## 功能

- **发布**：多行输入，280 字上限，实时计数（超过 240 变琥珀、超限变红）；空内容、纯空格、超长时发布按钮禁用；`Ctrl` / `⌘` + `Enter` 快捷发布
- **时间线**：单列卡片流，最新在最前，保留换行，显示相对时间（刚刚 / x 分钟前 / x 小时前 / x 天前 / 具体日期），每分钟自动刷新
- **点赞**：卡片心形按钮切换选中态并显示计数，状态随内容持久化，刷新后保留
- **删除**：二次确认后从时间线与本地存储中移除，列表有进出场动效
- **旧数据兼容**：自动读取上一版本（`chirp.posts.v1`）的内容，补齐点赞字段并迁移到 `chirp.posts.v2`
- **健壮性**：存储数据损坏时回退为空列表；配额写满时提示而非崩溃；所有文本以插值渲染（Vue 默认转义）
- **体验**：暖米白 + 墨绿 + 琥珀配色、跟随系统深色模式、窄栏居中布局、480px 断点、`prefers-reduced-motion` 下关闭动效

## 目录结构

```
chirp/
├── index.html                    # Vite 入口，挂载 #app
├── vite.config.ts                # Vite + Vitest 配置
├── vitest.setup.ts               # 每个用例前后清空 localStorage
├── tsconfig.json
├── src/
│   ├── main.ts                   # createApp + Pinia + 全局样式
│   ├── App.vue                   # 组合顶栏、发布区、时间线、轻提示
│   ├── types/post.ts             # Post 与 AddResult 类型契约
│   ├── lib/
│   │   ├── text.ts               # countChars（按码点）、长度阈值
│   │   ├── time.ts               # formatRelativeTime
│   │   ├── id.ts                 # createId（randomUUID + 降级）
│   │   ├── storage.ts            # localStorage 适配、schema 校验、v1 → v2 迁移
│   │   └── __tests__/            # 纯函数与存储测试
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

## 数据模型

`localStorage["chirp.posts.v2"]` 存一个 JSON 数组，读取时按 `createdAt` 倒序：

```json
[
  {
    "id": "0f9c3a1e-6b1c-4b7e-9c2f-2f7a1d8b6c11",
    "content": "第一条短文。\n换行会被保留。",
    "createdAt": 1763000000000,
    "liked": false
  }
]
```

- `id`：`crypto.randomUUID()`，不支持时降级为 `p-<时间戳>-<随机串>`
- `content`：已 `trim` 的文本
- `createdAt`：epoch 毫秒
- `liked`：是否已点赞

### 与上一版本的兼容

上一版（原生 JS）把数据存在 `chirp.posts.v1`，字段只有 `id / content / createdAt`。启动时若发现 `chirp.posts.v2` 不存在，会自动读取 v1、补齐 `liked: false` 并写回 v2；v2 一旦存在即以其为准，避免旧数据“复活”。

需要重置时在控制台执行：

```js
localStorage.removeItem('chirp.posts.v2');
location.reload();
```

## 分层与 TDD 约定

依赖方向单向：`lib`（纯函数与存储适配）← `stores`（Pinia）← `components`（视图）。

- 组件不直接读写 `localStorage`，只与 store 交互；存储失败由 store 回滚并返回原因
- 每个写操作走「先持久化、成功后再更新内存状态」的顺序，保证界面与存储不漂移
- 开发顺序为：纯函数 → store → 组件 → 整体联调，每层先写用例再实现

## 已知限制

- 数据只存在当前浏览器 + 当前站点来源下，清理站点数据即丢失
- 点赞是本地单机状态（0 / 1），不是多人计数
- 不跨标签页实时同步（另一个标签页需刷新）
- 未做分页与虚拟滚动，条目数量受 `localStorage` 容量限制（通常 5MB 左右）
