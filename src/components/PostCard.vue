<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '../lib/time'
import type { Post } from '../types/post'

const props = defineProps<{ post: Post; now?: number }>()
const emit = defineEmits<{
  'toggle-like': [id: string]
  delete: [id: string]
}>()

const liked = computed(() => props.post.liked)
const timeLabel = computed(() => formatRelativeTime(props.post.createdAt, props.now ?? Date.now()))
const timeTitle = computed(() =>
  new Date(props.post.createdAt).toLocaleString('zh-CN', { hour12: false })
)
const likeCount = computed(() => (props.post.liked ? 1 : 0))
const likeLabel = computed(() => (props.post.liked ? '取消点赞' : '点赞'))

function requestDelete(): void {
  const preview =
    props.post.content.length > 24 ? `${props.post.content.slice(0, 24)}…` : props.post.content
  if (window.confirm(`确定删除这条短文吗？\n\n${preview}`)) emit('delete', props.post.id)
}
</script>

<template>
  <li class="post">
    <p class="post__content" data-testid="post-content">{{ post.content }}</p>
    <div class="post__meta">
      <time
        class="post__time"
        data-testid="post-time"
        :datetime="new Date(post.createdAt).toISOString()"
        :title="timeTitle"
      >
        {{ timeLabel }}
      </time>
      <div class="post__actions">
        <button
          class="post__like"
          :class="{ 'is-liked': liked }"
          data-testid="post-like"
          type="button"
          :aria-pressed="liked"
          :aria-label="likeLabel"
          :title="likeLabel"
          @click="emit('toggle-like', post.id)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M12 20.3 4.7 13a4.1 4.1 0 0 1 5.8-5.8l1.5 1.5 1.5-1.5A4.1 4.1 0 0 1 19.3 13Z"
              :fill="liked ? 'currentColor' : 'none'"
            />
          </svg>
          <span class="post__like-count" data-testid="post-like-count">{{ likeCount }}</span>
        </button>
        <button
          class="post__delete"
          data-testid="post-delete"
          type="button"
          title="删除"
          aria-label="删除这条短文"
          @click="requestDelete"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M9.5 7V5.6c0-.9.7-1.6 1.6-1.6h1.8c.9 0 1.6.7 1.6 1.6V7" />
            <path d="M6.2 7l.9 11.3c.08.98.9 1.7 1.9 1.7h6c1 0 1.82-.72 1.9-1.7L18.8 7" />
            <path d="M10.4 11v5.4M13.6 11v5.4" />
          </svg>
        </button>
      </div>
    </div>
  </li>
</template>
