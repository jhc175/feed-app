<script setup lang="ts">
/**
 * 纯装饰背景层：纸纹颗粒 / 圆点网格 / 双色光晕 / 右上同心弧。
 * 完全静态、不可交互、不进入无障碍树，不承载任何业务数据。
 */
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <span class="backdrop__glow backdrop__glow--teal"></span>
    <span class="backdrop__glow backdrop__glow--amber"></span>
    <span class="backdrop__grid"></span>
    <span class="backdrop__arcs"></span>
    <span class="backdrop__grain"></span>
  </div>
</template>
