<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue'
import { usePostsStore } from '../stores/posts'
import PostCard from './PostCard.vue'

const emit = defineEmits<{ notify: [message: string, tone: 'success' | 'error'] }>()

const store = usePostsStore()
const now = shallowRef(Date.now())

const ticker = window.setInterval(() => {
  now.value = Date.now()
}, 60_000)

onUnmounted(() => {
  window.clearInterval(ticker)
})

/** 正在删除中的帖子 id：同一条被连续点击时只发一次 DELETE、只弹一次 toast */
const pendingDeleteIds = new Set<string>()

async function handleDelete(id: string): Promise<void> {
  if (pendingDeleteIds.has(id)) return
  pendingDeleteIds.add(id)

  try {
    const ok = await store.remove(id)
    if (ok) {
      emit('notify', '已删除', 'success')
      return
    }
    emit('notify', '删除失败：服务端未响应', 'error')
  } finally {
    pendingDeleteIds.delete(id)
  }
}

async function handleToggleLike(id: string): Promise<void> {
  const ok = await store.toggleLike(id)
  if (!ok) emit('notify', '操作失败：服务端未响应', 'error')
}

async function handleToggleBookmark(id: string): Promise<void> {
  const wasBookmarked = store.posts.find((post) => post.id === id)?.bookmarked ?? false
  const ok = await store.toggleBookmark(id)
  if (!ok) {
    emit('notify', '操作失败：服务端未响应', 'error')
    return
  }
  emit('notify', wasBookmarked ? '已取消收藏' : '已收藏', 'success')
}

async function handleRepost(id: string): Promise<void> {
  const ok = await store.repost(id)
  if (!ok) {
    emit('notify', '转发失败：服务端未响应', 'error')
    return
  }
  emit('notify', '已转发', 'success')
}
</script>

<template>
  <section class="timeline" aria-labelledby="timelineTitle">
    <div class="timeline__head">
      <h2 id="timelineTitle" class="timeline__title">时间线</h2>
      <span class="timeline__rule" aria-hidden="true"></span>
      <div class="filter" role="group" aria-label="筛选时间线">
        <button
          class="filter__btn"
          :class="{ 'is-active': !store.bookmarkedOnly }"
          data-testid="filter-all"
          type="button"
          :aria-pressed="!store.bookmarkedOnly"
          @click="store.bookmarkedOnly = false"
        >
          全部
        </button>
        <button
          class="filter__btn"
          :class="{ 'is-active': store.bookmarkedOnly }"
          data-testid="filter-bookmarked"
          type="button"
          :aria-pressed="store.bookmarkedOnly"
          @click="store.bookmarkedOnly = true"
        >
          收藏 {{ store.bookmarkedTotal }}
        </button>
      </div>
    </div>

    <TransitionGroup v-if="store.visiblePosts.length > 0" tag="ul" name="post" class="timeline__list">
      <PostCard
        v-for="post in store.visiblePosts"
        :key="post.id"
        :post="post"
        :now="now"
        @delete="handleDelete"
        @toggle-like="handleToggleLike"
        @toggle-bookmark="handleToggleBookmark"
        @repost="handleRepost"
      />
    </TransitionGroup>

    <p v-else-if="store.loading" class="empty" data-testid="loading-state">加载中…</p>

    <div v-else class="empty" data-testid="empty-state">
      <span class="empty__art" aria-hidden="true">
        <svg
          viewBox="0 0 96 96"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M46 24h28a9 9 0 0 1 9 9v19a9 9 0 0 1-9 9H62l-11 9.5V61H46a9 9 0 0 1-9-9V33a9 9 0 0 1 9-9Z"
          />
          <path d="M48.5 37h21M48.5 46h13" />
          <path d="M26 35c2.9 3.9 2.9 8.8 0 12.7M16.5 30c5 6.4 5 15.6 0 22" opacity=".55" />
          <circle cx="34" cy="19" r="2" fill="currentColor" stroke="none" opacity=".42" />
          <circle cx="78" cy="70" r="2.6" fill="currentColor" stroke="none" opacity=".28" />
          <circle cx="22" cy="67" r="1.6" fill="currentColor" stroke="none" opacity=".26" />
          <path d="M62 79c4.6 3 9.4 3 14.4 0" opacity=".32" />
        </svg>
      </span>
      <template v-if="store.bookmarkedOnly">
        <p class="empty__title">还没有收藏任何内容</p>
        <p class="empty__text">点一下卡片上的书签，把喜欢的短文留在这里。</p>
      </template>
      <template v-else>
        <p class="empty__title">还没有任何短文</p>
        <p class="empty__text">写下第一条，让这条时间线开始滚动。</p>
      </template>
    </div>
  </section>
</template>
