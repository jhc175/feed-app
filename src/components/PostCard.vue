<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '../lib/time'
import type { Post } from '../types/post'

const props = defineProps<{ post: Post; now?: number }>()
const emit = defineEmits<{
  'toggle-like': [id: string]
  'toggle-bookmark': [id: string]
  repost: [id: string]
  delete: [id: string]
}>()

const liked = computed(() => props.post.liked)
const timeLabel = computed(() => formatRelativeTime(props.post.createdAt, props.now ?? Date.now()))
const timeTitle = computed(() =>
  new Date(props.post.createdAt).toLocaleString('zh-CN', { hour12: false })
)
const likeCount = computed(() => (props.post.liked ? 1 : 0))
const likeLabel = computed(() => (props.post.liked ? '取消点赞' : '点赞'))
const bookmarked = computed(() => props.post.bookmarked)
const bookmarkLabel = computed(() => (props.post.bookmarked ? '取消收藏' : '收藏'))

/** 纯转发没有正文，删除确认的预览回退到原帖快照。 */
const deletePreview = computed(() => {
  const text = props.post.content || props.post.repostOf?.content || ''
  return text.length > 24 ? `${text.slice(0, 24)}…` : text
})

function requestDelete(): void {
  if (window.confirm(`确定删除这条短文吗？\n\n${deletePreview.value}`)) emit('delete', props.post.id)
}
</script>

<template>
  <li class="post">
    <div v-if="post.repostOf" class="post__quote" data-testid="post-quote">
      <p class="post__quote-label" aria-label="转发自">转发自</p>
      <p class="post__quote-content" data-testid="post-quote-content">
        {{ post.repostOf.content }}
      </p>
    </div>

    <p v-if="post.content" class="post__content" data-testid="post-content">{{ post.content }}</p>

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
          class="post__repost"
          data-testid="post-repost"
          type="button"
          title="转发"
          aria-label="转发"
          @click="emit('repost', post.id)"
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
            <path d="M4 8.5h11.5a3.5 3.5 0 0 1 3.5 3.5v.6" />
            <path d="M7.6 5.2 4 8.5l3.6 3.3" />
            <path d="M20 15.5H8.5A3.5 3.5 0 0 1 5 12v-.6" />
            <path d="M16.4 18.8 20 15.5l-3.6-3.3" />
          </svg>
          <span class="post__repost-count" data-testid="post-repost-count">
            {{ post.repostCount }}
          </span>
        </button>
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
          class="post__bookmark"
          :class="{ 'is-bookmarked': bookmarked }"
          data-testid="post-bookmark"
          type="button"
          :aria-pressed="bookmarked"
          :aria-label="bookmarkLabel"
          :title="bookmarkLabel"
          @click="emit('toggle-bookmark', post.id)"
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
              d="M6.8 5.4h10.4a1 1 0 0 1 1 1v13.1l-6.2-3.7-6.2 3.7V6.4a1 1 0 0 1 1-1Z"
              :fill="bookmarked ? 'currentColor' : 'none'"
            />
          </svg>
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
