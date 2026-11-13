<script setup lang="ts">
import { computed } from 'vue'

const { total } = defineProps<{ total: number }>()

const countLabel = computed(() => `${total} 条短文`)
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <div class="brand">
        <span class="brand__mark" aria-hidden="true">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M6.6 6.6h18.8a2.6 2.6 0 0 1 2.6 2.6v9.2a2.6 2.6 0 0 1-2.6 2.6h-11.5l-5.2 4v-4H6.6a2.6 2.6 0 0 1-2.6-2.6V9.2a2.6 2.6 0 0 1 2.6-2.6Z"
            />
            <path d="M11.2 12.7h9.6M11.2 16.5h5.9" />
          </svg>
        </span>
        <div class="brand__text">
          <p class="brand__title">Chirp</p>
          <p class="brand__sub">写点什么，让它飞出去</p>
        </div>
      </div>
      <p class="site-header__meta" data-testid="post-count">{{ countLabel }}</p>
    </div>
  </header>
</template>
