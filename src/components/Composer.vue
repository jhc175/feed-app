<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { MAX_LENGTH, WARN_LENGTH, countChars } from '../lib/text'
import { usePostsStore } from '../stores/posts'
import type { AddFailureReason } from '../types/post'

const emit = defineEmits<{ notify: [message: string, tone: 'success' | 'error'] }>()

const store = usePostsStore()
const draft = shallowRef('')
const submitting = shallowRef(false)
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')

const length = computed(() => countChars(draft.value))
const isOver = computed(() => length.value > MAX_LENGTH)
const isWarn = computed(() => !isOver.value && length.value > WARN_LENGTH)
const canPublish = computed(() => length.value > 0 && draft.value.trim().length > 0 && !isOver.value)
const counterText = computed(() => `${length.value} / ${MAX_LENGTH}`)

const failureMessages: Record<AddFailureReason, string> = {
  empty: '先写点什么再发布吧',
  'too-long': `已超出 ${MAX_LENGTH} 字上限`,
  network: '发布失败：无法连接后端服务'
}

async function publish(): Promise<void> {
  if (!canPublish.value || submitting.value) return

  submitting.value = true
  try {
    const result = await store.add(draft.value)
    if (!result.ok) {
      emit('notify', failureMessages[result.reason], 'error')
      return
    }

    draft.value = ''
    textarea.value?.focus()
    emit('notify', '已发布', 'success')
  } finally {
    submitting.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void publish()
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
        :disabled="!canPublish || submitting"
        @click="publish"
      >
        {{ submitting ? '发布中…' : '发布' }}
      </button>
    </div>
    <p class="composer__hint">Ctrl / ⌘ + Enter 快捷发布 · 内容会保存到本机后端</p>
  </section>
</template>
