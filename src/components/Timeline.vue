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

async function handleDelete(id: string): Promise<void> {
  const ok = await store.remove(id)
  if (ok) {
    emit('notify', '已删除', 'success')
    return
  }
  emit('notify', '删除失败：服务端未响应', 'error')
}

async function handleToggleLike(id: string): Promise<void> {
  const ok = await store.toggleLike(id)
  if (!ok) emit('notify', '操作失败：服务端未响应', 'error')
}
</script>

<template>
  <section class="timeline" aria-labelledby="timelineTitle">
    <div class="timeline__head">
      <h2 id="timelineTitle" class="timeline__title">时间线</h2>
      <span class="timeline__rule" aria-hidden="true"></span>
    </div>

    <TransitionGroup v-if="store.total > 0" tag="ul" name="post" class="timeline__list">
      <PostCard
        v-for="post in store.sortedPosts"
        :key="post.id"
        :post="post"
        :now="now"
        @delete="handleDelete"
        @toggle-like="handleToggleLike"
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
      <p class="empty__title">还没有任何短文</p>
      <p class="empty__text">写下第一条，让这条时间线开始滚动。</p>
    </div>
  </section>
</template>
