/* ============================================================
   Chirp · 全部行为逻辑
   三层结构：存储层 / 纯函数层 / 视图层，单向数据流
   posts（内存数组）是唯一数据源：
   写入 → persist() → render()
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "chirp.posts.v1";
  var MAX_LENGTH = 280;
  var WARN_LENGTH = 240;
  var REMOVE_DURATION = 200;

  /** @type {Array<{id: string, content: string, createdAt: number}>} */
  var posts = [];
  var els = {};
  var highlightedId = null;
  var toastTimer = null;

  /* ---------------------------------------------------------
     纯函数层
     --------------------------------------------------------- */

  /** 按 Unicode 码点计数，避免 emoji 被算成 2 个字符 */
  function countChars(text) {
    return Array.from(text).length;
  }

  function createId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (err) {
      /* 忽略，走降级 */
    }
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  /**
   * 相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前 / YYYY-MM-DD
   * @param {number} timestamp epoch 毫秒
   * @param {number} [now] 便于测试注入
   */
  function formatRelativeTime(timestamp, now) {
    var current = typeof now === "number" ? now : Date.now();
    var diff = current - timestamp;
    if (!isFinite(diff) || diff < 0) diff = 0;

    var MINUTE = 60 * 1000;
    var HOUR = 60 * MINUTE;
    var DAY = 24 * HOUR;

    if (diff < MINUTE) return "刚刚";
    if (diff < HOUR) return Math.floor(diff / MINUTE) + " 分钟前";
    if (diff < DAY) return Math.floor(diff / HOUR) + " 小时前";
    if (diff < 7 * DAY) return Math.floor(diff / DAY) + " 天前";

    var date = new Date(timestamp);
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  /* ---------------------------------------------------------
     存储层
     --------------------------------------------------------- */

  function isPlainPost(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      value.id.length > 0 &&
      typeof value.content === "string" &&
      typeof value.createdAt === "number" &&
      isFinite(value.createdAt)
    );
  }

  /** 读取并校验；任何异常或脏数据都退化为空数组，绝不让页面白屏 */
  function loadPosts() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return [];
    }
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isPlainPost).sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * 写回 localStorage
   * @returns {boolean} 成功为 true；超配额 / 被禁用为 false
   */
  function savePosts(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------------------------------------------------------
     视图层
     --------------------------------------------------------- */

  var DELETE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 7h16M9.5 7V5.6c0-.9.7-1.6 1.6-1.6h1.8c.9 0 1.6.7 1.6 1.6V7" />' +
    '<path d="M6.2 7l.9 11.3c.08.98.9 1.7 1.9 1.7h6c1 0 1.82-.72 1.9-1.7L18.8 7" />' +
    '<path d="M10.4 11v5.4M13.6 11v5.4" />' +
    "</svg>";

  function createCard(post) {
    var li = document.createElement("li");
    li.className = "post";
    li.dataset.id = post.id;

    var content = document.createElement("p");
    content.className = "post__content";
    content.textContent = post.content;

    var meta = document.createElement("div");
    meta.className = "post__meta";

    var time = document.createElement("time");
    time.className = "post__time";
    time.dateTime = new Date(post.createdAt).toISOString();
    time.dataset.createdAt = String(post.createdAt);
    time.textContent = formatRelativeTime(post.createdAt);
    time.title = new Date(post.createdAt).toLocaleString("zh-CN", { hour12: false });

    var del = document.createElement("button");
    del.type = "button";
    del.className = "post__delete";
    del.dataset.action = "delete";
    del.dataset.id = post.id;
    del.title = "删除";
    del.setAttribute("aria-label", "删除这条短文");
    del.innerHTML = DELETE_ICON;

    meta.appendChild(time);
    meta.appendChild(del);
    li.appendChild(content);
    li.appendChild(meta);
    return li;
  }

  function render() {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < posts.length; i += 1) {
      fragment.appendChild(createCard(posts[i]));
    }

    els.list.textContent = "";
    els.list.appendChild(fragment);

    var isEmpty = posts.length === 0;
    els.empty.hidden = !isEmpty;
    els.list.hidden = isEmpty;
    els.count.textContent = isEmpty ? "0 条短文" : posts.length + " 条短文";

    if (highlightedId) {
      var fresh = els.list.querySelector('[data-id="' + highlightedId + '"]');
      if (fresh) fresh.classList.add("is-new");
      highlightedId = null;
    }
  }

  /** 只刷新时间文案，避免每次整表重建 */
  function refreshTimes() {
    var nodes = els.list.querySelectorAll("time[data-created-at]");
    for (var i = 0; i < nodes.length; i += 1) {
      var created = Number(nodes[i].dataset.createdAt);
      if (isFinite(created)) nodes[i].textContent = formatRelativeTime(created);
    }
  }

  function updateComposerState() {
    var length = countChars(els.input.value);
    var over = length > MAX_LENGTH;

    els.counter.textContent = length + " / " + MAX_LENGTH;
    els.counter.classList.toggle("is-warn", !over && length > WARN_LENGTH);
    els.counter.classList.toggle("is-over", over);
    els.publishBtn.disabled = length === 0 || els.input.value.trim().length === 0 || over;
  }

  function flash(message, tone) {
    els.toast.textContent = message;
    els.toast.dataset.tone = tone || "info";
    els.toast.classList.add("is-visible");

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2200);
  }

  /* ---------------------------------------------------------
     交互
     --------------------------------------------------------- */

  function publish() {
    var text = els.input.value.trim();

    if (!text) {
      flash("先写点什么再发布吧", "error");
      els.input.focus();
      return;
    }

    if (countChars(text) > MAX_LENGTH) {
      flash("已超出 " + MAX_LENGTH + " 字上限", "error");
      els.input.focus();
      return;
    }

    var post = { id: createId(), content: text, createdAt: Date.now() };
    var next = [post].concat(posts);

    if (!savePosts(next)) {
      flash("本地存储不可用或已满，请先删除部分内容", "error");
      return;
    }

    posts = next;
    highlightedId = post.id;
    els.input.value = "";
    updateComposerState();
    render();
    els.input.focus();
    flash("已发布", "success");
  }

  function removePost(id) {
    var target = null;
    for (var i = 0; i < posts.length; i += 1) {
      if (posts[i].id === id) {
        target = posts[i];
        break;
      }
    }
    if (!target) return;

    var preview = target.content.length > 24 ? target.content.slice(0, 24) + "…" : target.content;
    if (!window.confirm("确定删除这条短文吗？\n\n" + preview)) return;

    var card = els.list.querySelector('[data-id="' + id + '"]');
    var commit = function () {
      var next = posts.filter(function (item) {
        return item.id !== id;
      });
      if (!savePosts(next)) {
        flash("删除失败：本地存储不可用", "error");
        if (card) card.classList.remove("is-removing");
        return;
      }
      posts = next;
      render();
      flash("已删除", "success");
    };

    if (card) {
      card.classList.add("is-removing");
      window.setTimeout(commit, REMOVE_DURATION);
    } else {
      commit();
    }
  }

  function bindEvents() {
    els.input.addEventListener("input", updateComposerState);

    els.publishBtn.addEventListener("click", publish);

    els.input.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!els.publishBtn.disabled) publish();
      }
    });

    els.list.addEventListener("click", function (event) {
      var trigger = event.target.closest('[data-action="delete"]');
      if (!trigger) return;
      event.preventDefault();
      removePost(trigger.dataset.id);
    });

    window.setInterval(refreshTimes, 60 * 1000);
  }

  function init() {
    els.input = document.getElementById("composerInput");
    els.publishBtn = document.getElementById("publishBtn");
    els.counter = document.getElementById("counter");
    els.list = document.getElementById("timeline");
    els.empty = document.getElementById("emptyState");
    els.count = document.getElementById("postCount");
    els.toast = document.getElementById("toast");

    if (!els.input || !els.publishBtn || !els.list) return;

    posts = loadPosts();
    updateComposerState();
    render();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
