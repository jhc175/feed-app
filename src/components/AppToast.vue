<script setup lang="ts">
withDefaults(
  defineProps<{
    message: string
    tone?: 'success' | 'error' | 'info'
    visible?: boolean
  }>(),
  { tone: 'info', visible: false }
)
</script>

<template>
  <div
    class="toast"
    data-testid="toast"
    role="status"
    aria-live="polite"
    :class="{ 'is-visible': visible }"
    :data-tone="tone"
  >
    {{ message }}
  </div>
</template>
