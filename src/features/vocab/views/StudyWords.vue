<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { FamiliarityStage } from '@/features/vocab/types'
import PageHeading from '@/components/PageHeading.vue'
import FamiliarityPanel from './FamiliarityPanel.vue'

const route = useRoute()
const initialStage = computed<FamiliarityStage>(() => {
  const value = route.query.stage
  return value === 'LEARNING' || value === 'CONSOLIDATING' || value === 'STABLE' ? value : 'ALL'
})
</script>

<template>
  <main class="words-page">
    <div class="xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '学习进度', to: '/english/vocab/insights' }, { label: '单词明细' }]"
        title="单词明细"
        description="按记忆阶段和词书，找到想再看一眼的词。"
      />
      <FamiliarityPanel :key="initialStage" :initial-stage="initialStage" />
    </div>
  </main>
</template>

<style scoped>
.words-page { min-height:100vh; padding-bottom:76px; background:var(--xl-bg); color:var(--xl-ink); }
</style>
