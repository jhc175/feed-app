# Chirp

一个只用原生 HTML / CSS / JavaScript 写成的极简短文分享工具：写下不超过 280 字的片段，发布后立刻出现在时间线顶部；所有内容保存在本机浏览器的 `localStorage` 中，刷新、关闭再打开都还在。

无框架、无构建、无依赖、无后端、不联网。

## 运行

直接双击 `index.html` 用浏览器打开即可，也可以：

```powershell
start index.html
```

> 请用 `file://` 直接打开，不要用 `type="module"` 方式加载脚本；本项目刻意使用经典脚本 `<script src="app.js" defer>`，保证双击也能运行。

## 功能

- **发布短文**：多行输入，实时字数计数（上限 280，超过 240 变琥珀色），空内容、纯空格、超长时发布按钮禁用
- **快捷发布**：`Ctrl` / `⌘` + `Enter`
- **时间线**：单列卡片流，最新在最上方，保留换行，显示相对时间（刚刚 / x 分钟前 / x 小时前 / x 天前 / 日期），每分钟自动刷新
- **删除**：卡片删除按钮 + 二次确认，删除后立即从界面与本地存储移除
- **本地持久化**：`localStorage`，key 为 `chirp.posts.v1`
- **容错**：存储数据损坏时回退为空列表；配额写满时提示而不是崩溃
- **体验**：响应式布局、遵循系统深色模式、`prefers-reduced-motion` 下关闭动效、键盘可完整操作

## 数据结构

`localStorage["chirp.posts.v1"]` 存一个 JSON 数组，按 `createdAt` 倒序：

```json
[
  {
    "id": "0f9c3a1e-6b1c-4b7e-9c2f-2f7a1d8b6c11",
    "content": "第一条短文。\n换行会被保留。",
    "createdAt": 1763000000000
  }
]
```

- `id`：`crypto.randomUUID()`，不可用时降级为时间戳 + 随机串
- `content`：已 `trim` 的文本，渲染时用 `textContent` 写入，天然免疫 XSS
- `createdAt`：epoch 毫秒

需要重置数据时，在浏览器控制台执行：

```js
localStorage.removeItem("chirp.posts.v1");
location.reload();
```

## 目录结构

```
chirp/
├── index.html   # 页面结构
├── style.css    # 全部样式（设计令牌 / 明暗两套色板 / 响应式）
├── app.js       # 存储层 + 纯函数层 + 视图层（IIFE 单入口）
└── README.md
```

`app.js` 的约定：`posts` 内存数组是唯一数据源，所有写操作统一走 `保存 → 重新渲染`，界面与存储不会漂移。

## 版本管理

```powershell
git init -b main
git add .
git commit -m "feat: 发布、时间线与删除"
git remote add origin <你的仓库地址>
git push -u origin main
```

## 已知限制

- 数据只存在当前浏览器 + 当前文件路径下，换浏览器、清理站点数据即丢失
- 不跨标签页实时同步（另一个标签页需刷新才能看到新内容）
- 未做分页与虚拟滚动，条目数量受 `localStorage` 容量限制（通常 5MB 左右）
