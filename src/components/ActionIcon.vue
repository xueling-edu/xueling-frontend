<script setup lang="ts">
defineProps<{ name: 'volume' | 'search' | 'eye' | 'eye-off' | 'refresh' | 'plus' | 'check' | 'clock' }>()
</script>

<template>
  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'volume'">
      <path d="M11 5 6.7 9H3v6h3.7L11 19V5Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" />
    </template>
    <template v-else-if="name === 'eye' || name === 'eye-off'">
      <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.3" />
      <path v-if="name === 'eye-off'" d="m3 21 18-18" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.8 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.2-2" />
    </template>
    <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'check'" d="m4.5 12 5 5 10-10" />
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </template>
  </svg>
</template>

<style scoped>
.action-icon { display: inline-block; flex: none; width: 1.15em; height: 1.15em; vertical-align: -.16em; }
</style>
