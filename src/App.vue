<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AppToast from './components/AppToast.vue'
import Composer from './components/Composer.vue'
import Timeline from './components/Timeline.vue'
import { usePostsStore } from './stores/posts'

type ToastTone = 'success' | 'error' | 'info'

const store = usePostsStore()
store.load()

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

onUnmounted(() => {
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <a class="skip-link" href="#composerInput">跳到发布区</a>

  <AppHeader :total="store.total" />

  <main class="page">
    <Composer @notify="notify" />
    <Timeline @notify="notify" />
  </main>

  <footer class="site-footer">
    <p>Chirp · 纯本地存档，不联网、不上传，清空浏览器数据会一并清空。</p>
  </footer>

  <AppToast :message="toastMessage" :tone="toastTone" :visible="toastVisible" />
</template>
