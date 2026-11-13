<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue'
import AppBackdrop from './components/AppBackdrop.vue'
import AppHeader from './components/AppHeader.vue'
import AppToast from './components/AppToast.vue'
import Composer from './components/Composer.vue'
import Timeline from './components/Timeline.vue'
import { usePostsStore } from './stores/posts'

type ToastTone = 'success' | 'error' | 'info'

const store = usePostsStore()

const toastMessage = shallowRef('')
const toastTone = shallowRef<ToastTone>('info')
const toastVisible = shallowRef(false)

let toastTimer = 0

function notify(message: string, tone: ToastTone = 'info'): void {
  toastMessage.value = message
  toastTone.value = tone
  toastVisible.value = true

  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
  }, 2200)
}

onMounted(async () => {
  const ok = await store.load()
  if (!ok) notify('加载失败：无法连接后端服务', 'error')
})

onUnmounted(() => {
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <a class="skip-link" href="#composerInput">跳到发布区</a>

  <AppBackdrop />

  <AppHeader :total="store.total" />

  <main class="page">
    <Composer @notify="notify" />
    <Timeline @notify="notify" />
  </main>

  <footer class="site-footer">
    <svg
      class="site-footer__divider"
      viewBox="0 0 260 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 6c16-7 32 7 48 0s32 7 48 0 32 7 48 0 32 7 48 0 32 7 48 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
      />
    </svg>
    <p>Chirp · 数据保存在本机后端服务，刷新页面不会丢失。</p>
  </footer>

  <AppToast :message="toastMessage" :tone="toastTone" :visible="toastVisible" />
</template>
