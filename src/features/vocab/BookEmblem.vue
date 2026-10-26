<script setup lang="ts">
defineProps<{ icon: string }>()

const legacyIcons: Record<string, string> = {
  '📘': 'book', '📖': 'book', '📚': 'layers', '📕': 'book', '📗': 'leaf', '📙': 'book',
  '🎓': 'compass', '🗣️': 'quote', '📝': 'pen', '🧠': 'orbit', '🌟': 'spark', '🔥': 'spark'
}

function motif(icon: string) {
  return legacyIcons[icon] || (['book', 'leaf', 'layers', 'compass', 'quote', 'pen', 'orbit', 'spark'].includes(icon) ? icon : 'book')
}
</script>

<template>
  <svg class="book-emblem" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g v-if="motif(icon) === 'book'">
      <path d="M40 24c-8-5-18-5-27-2v35c10-3 19-2 27 3 8-5 17-6 27-3V22c-9-3-19-3-27 2Z" />
      <path d="M40 24v36M19 31c6-1 11 0 16 2m10 0c5-2 10-3 16-2M19 39c6-1 11 0 16 2m10 0c5-2 10-3 16-2" />
    </g>
    <g v-else-if="motif(icon) === 'leaf'">
      <path d="M17 56c22 2 42-11 46-38-27 3-43 16-46 38Zm0 0c10-13 21-21 38-29M33 40l-4-12m16 3 9 7" />
    </g>
    <g v-else-if="motif(icon) === 'layers'">
      <path d="m40 16 27 14-27 14-27-14 27-14Zm-27 25 27 14 27-14M13 52l27 14 27-14" />
    </g>
    <g v-else-if="motif(icon) === 'compass'">
      <circle cx="40" cy="40" r="25" /><circle cx="40" cy="40" r="3" /><path d="m47 33 9-9-9 23-23 9 9-23 14-0ZM40 11v4m0 50v4M11 40h4m50 0h4" />
    </g>
    <g v-else-if="motif(icon) === 'quote'">
      <path d="M16 24h48v31H36L23 65V55h-7V24Zm10 12h28m-28 9h19" />
    </g>
    <g v-else-if="motif(icon) === 'pen'">
      <path d="m22 55 3-15 27-27 15 15-27 27-15 3-3-3Zm3-15 15 15m8-38 15 15M15 66h50" />
    </g>
    <g v-else-if="motif(icon) === 'orbit'">
      <circle cx="40" cy="40" r="8" /><ellipse cx="40" cy="40" rx="28" ry="13" transform="rotate(-34 40 40)" /><ellipse cx="40" cy="40" rx="28" ry="13" transform="rotate(34 40 40)" /><circle cx="58" cy="25" r="2" fill="currentColor" stroke="none" />
    </g>
    <g v-else>
      <path d="M40 11 45 32l21 8-21 8-5 21-5-21-21-8 21-8 5-21Zm19 2 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" />
    </g>
  </svg>
</template>

<style scoped>
.book-emblem { display: block; width: 100%; height: 100%; }
</style>
