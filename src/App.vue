<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
const AIAssistant = defineAsyncComponent(() => import('@/components/AIAssistant.vue'))
const TranslateDrawer = defineAsyncComponent(() => import('@/components/TranslateDrawer.vue'))
import { usePreferencesStore } from '@/stores/preferences'

const route = useRoute()
const preferencesStore = usePreferencesStore()
const focusedRoutes = new Set([
  'home',
  'english',
  'english-vocab',
  'english-vocab-study',
  'english-vocab-insights',
  'english-vocab-review',
  'english-vocab-book',
  'english-articles',
  'english-article-detail',
  'user-profile',
  'settings',
  'feedback',
])
const showUtilities = computed(() => !focusedRoutes.has(String(route.name)))
const showWordLookup = computed(() => route.meta.requiresAuth === true && preferencesStore.preferences.wordLookupEnabled)
</script>

<template>
  <div id="app-container">
    <router-view />
    <AIAssistant v-if="showUtilities" />
    <TranslateDrawer v-if="showWordLookup" :class="{ 'is-solo': !showUtilities }" />
  </div>
</template>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  font-family: var(--xl-font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 确保路由视图占满整个容器 */
#app {
  display: flex;
  flex-direction: column;
}
</style>
