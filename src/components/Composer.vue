<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { MAX_LENGTH, WARN_LENGTH, countChars } from '../lib/text'
import { usePostsStore } from '../stores/posts'
import type { AddFailureReason } from '../types/post'

const emit = defineEmits<{ notify: [message: string, tone: 'success' | 'error'] }>()

const store = usePostsStore()
const draft = shallowRef('')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')

const length = computed(() => countChars(draft.value))
const isOver = computed(() => length.value > MAX_LENGTH)
const isWarn = computed(() => !isOver.value && length.value > WARN_LENGTH)
const canPublish = computed(() => length.value > 0 && draft.value.trim().length > 0 && !isOver.value)
const counterText = computed(() => `${length.value} / ${MAX_LENGTH}`)

const failureMessages: Record<AddFailureReason, string> = {
  empty: '先写点什么再发布吧',
  'too-long': `已超出 ${MAX_LENGTH} 字上限`,
  storage: '本地存储不可用或已满，请先删除部分内容'
}

function publish(): void {
  if (!canPublish.value) return

  const result = store.add(draft.value)
  if (!result.ok) {
    emit('notify', failureMessages[result.reason], 'error')
    return
  }

  draft.value = ''
  textarea.value?.focus()
  emit('notify', '已发布', 'success')
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    publish()
  }
}
</script>

<template>
  <section class="composer" aria-labelledby="composerTitle">
    <h1 id="composerTitle" class="sr-only">发布一条短文</h1>
    <label class="sr-only" for="composerInput">短文内容</label>
    <textarea
      id="composerInput"
      ref="textarea"
      v-model="draft"
      class="composer__input"
      data-testid="composer-input"
      rows="3"
      spellcheck="false"
      placeholder="此刻在想什么？随手写下几句……"
      autocomplete="off"
      @keydown="handleKeydown"
    ></textarea>
    <div class="composer__footer">
      <p
        class="counter"
        data-testid="composer-counter"
        :class="{ 'is-warn': isWarn, 'is-over': isOver }"
        aria-live="polite"
      >
        {{ counterText }}
      </p>
      <button
        class="btn btn--primary"
        data-testid="composer-submit"
        type="button"
        :disabled="!canPublish"
        @click="publish"
      >
        发布
      </button>
    </div>
    <p class="composer__hint">Ctrl / ⌘ + Enter 快捷发布 · 内容仅保存在本机浏览器</p>
  </section>
</template>
