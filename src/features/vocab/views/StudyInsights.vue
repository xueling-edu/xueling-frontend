<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { getStudyFamiliarity, getStudyHistory } from '@/features/vocab/api'
import type { StudyDayStats, StudyFamiliarity } from '@/features/vocab/types'
import PageHeading from '@/components/PageHeading.vue'
import StudyGrowthCalendar from './StudyGrowthCalendar.vue'

const memory = ref<StudyFamiliarity | null>(null)
const memoryError = ref(false)
const recentDays = ref<StudyDayStats[] | null>(null)
const recentError = ref(false)
const recentReviews = computed(() => recentDays.value?.reduce((sum, day) => sum + day.reviewCount, 0) ?? 0)
const recentNewWords = computed(() => recentDays.value?.reduce((sum, day) => sum + day.newWords, 0) ?? 0)
const maxReviews = computed(() => Math.max(1, ...(recentDays.value ?? []).map(day => day.reviewCount)))
const recentFirst = computed(() => [...(recentDays.value ?? [])].reverse().slice(0, 7))
const stages = computed(() => [
  { key: 'LEARNING', name: '初学与重学', count: memory.value?.learningCount ?? 0, className: 'learning' },
  { key: 'CONSOLIDATING', name: '巩固中', count: memory.value?.consolidatingCount ?? 0, className: 'consolidating' },
  { key: 'STABLE', name: '较稳固', count: memory.value?.stableCount ?? 0, className: 'stable' }
])

async function loadMemory() {
  memoryError.value = false
  try {
    memory.value = (await getStudyFamiliarity({ stage: 'ALL', page: 1 })).data
  } catch {
    memoryError.value = true
  }
}

async function loadRecent() {
  recentError.value = false
  try {
    recentDays.value = (await getStudyHistory(7)).data ?? []
  } catch {
    recentError.value = true
  }
}

onMounted(() => {
  void loadMemory()
  void loadRecent()
  if (window.location.hash === '#growth-calendar') {
    void nextTick(() => document.getElementById('growth-calendar')?.scrollIntoView())
  }
})
</script>

<template>
  <main class="insights-page">
    <div class="xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '学习进度' }]"
        title="学习进度"
        description="记录每一天的坚持，看看单词正在怎样变得熟悉。"
      />

      <StudyGrowthCalendar />

      <div class="insight-paths">
        <section class="memory-story" aria-labelledby="memory-story-title">
          <div class="story-heading">
            <div><span class="eyebrow">MEMORY MAP / 记忆地图</span><h2 id="memory-story-title">这些词，记得怎么样？</h2></div>
          </div>
          <div v-if="memory" class="memory-story-body">
            <div class="memory-number"><strong>{{ memory.learnedCount }}</strong><span>个已学单词</span></div>
            <div class="memory-breakdown">
              <div class="memory-track" role="img" :aria-label="stages.map(item => `${item.name} ${item.count} 个`).join('，')">
                <span v-for="item in stages" :key="item.key" :class="item.className" :style="{ width: `${memory.learnedCount ? item.count / memory.learnedCount * 100 : 0}%` }"></span>
              </div>
              <div class="stage-links">
                <router-link v-for="item in stages" :key="item.key" :to="{ path: '/english/vocab/insights/words', query: { stage: item.key } }">
                  <i :class="item.className" aria-hidden="true"></i><span>{{ item.name }}</span><strong>{{ item.count }}</strong>
                </router-link>
              </div>
            </div>
          </div>
          <p v-else-if="memoryError" class="story-state" role="alert">记忆状态暂时无法读取。<button type="button" @click="loadMemory">重试</button></p>
          <p v-else class="story-state" role="status">正在整理记忆状态…</p>
          <router-link v-if="memory?.learnedCount" class="story-link all-words-link" to="/english/vocab/insights/words">查看全部已学单词 <span aria-hidden="true">→</span></router-link>
          <router-link v-if="memory?.dueCount" class="due-note" to="/english/vocab/study">有 {{ memory.dueCount }} 个词待复习 <span aria-hidden="true">→</span></router-link>
        </section>

        <section class="recent-story" aria-labelledby="recent-story-title">
          <div class="story-heading">
            <div><span class="eyebrow">STUDY RHYTHM / 学习节奏</span><h2 id="recent-story-title">最近七天</h2></div>
            <router-link class="story-link" to="/english/vocab/insights/history">完整记录 <span aria-hidden="true">→</span></router-link>
          </div>
          <template v-if="recentDays">
            <p class="recent-summary"><strong>{{ recentReviews }}</strong> 次回忆 <span>·</span> {{ recentNewWords }} 个新词</p>
            <div v-if="recentReviews" class="recent-bars" role="img" :aria-label="recentFirst.map(day => `${day.date} 回忆 ${day.reviewCount} 次`).join('，')">
              <div v-for="day in recentFirst" :key="day.date" class="recent-bar"><span>{{ day.date.slice(5) }}</span><i><b :style="{ width: `${day.reviewCount / maxReviews * 100}%` }"></b></i><strong>{{ day.reviewCount }}</strong></div>
            </div>
            <p v-else class="recent-empty">还没有学习记录。从今天的一次回忆开始。</p>
          </template>
          <p v-else-if="recentError" class="story-state" role="alert">学习记录暂时无法读取。<button type="button" @click="loadRecent">重试</button></p>
          <p v-else class="story-state" role="status">正在整理最近的记录…</p>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.insights-page { min-height:100vh; background:var(--xl-bg); color:var(--xl-ink); }
.insight-paths { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(300px,1fr); align-items:start; gap:44px; padding:6px 0 76px; }
.story-heading { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:22px; }
.eyebrow { color:#65836c; font-size:11px; font-weight:800; letter-spacing:.13em; }
.story-heading h2 { margin:8px 0 0; font:650 clamp(24px,2.5vw,31px)/1.2 var(--xl-font-display); }
.story-link { flex:none; padding-bottom:3px; color:var(--xl-brand); font-size:13px; font-weight:800; text-decoration:none; white-space:nowrap; }
.story-link:hover,.due-note:hover { text-decoration:underline; text-underline-offset:4px; }
.all-words-link { display:flex; width:max-content; gap:8px; margin-top:17px; }
.memory-story-body { display:grid; grid-template-columns:130px minmax(0,1fr); gap:26px; align-items:center; padding:25px 0; border-top:1px solid var(--xl-border); border-bottom:1px solid var(--xl-border); }
.memory-number { display:flex; flex-direction:column; gap:5px; }
.memory-number strong { font:650 52px/1 var(--xl-font-display); font-variant-numeric:tabular-nums; }
.memory-number span { color:var(--xl-ink-soft); font-size:12px; }
.memory-track { display:flex; height:15px; overflow:hidden; border-radius:99px; background:#e7ece6; }
.memory-track span.learning,.stage-links i.learning { background:#d9a96c; }
.memory-track span.consolidating,.stage-links i.consolidating { background:#85aaba; }
.memory-track span.stable,.stage-links i.stable { background:#4e8a62; }
.stage-links { display:grid; gap:2px; margin-top:15px; }
.stage-links a { display:grid; grid-template-columns:8px minmax(0,1fr) auto; align-items:center; gap:9px; min-height:31px; padding:2px 4px; border-radius:6px; color:var(--xl-ink-soft); font-size:12px; text-decoration:none; }
.stage-links a:hover { background:#edf3e9; color:var(--xl-brand); }
.stage-links i { width:8px; height:8px; border-radius:50%; }
.stage-links strong { color:var(--xl-ink); font-size:14px; }
.due-note { display:inline-flex; gap:12px; margin-top:17px; color:var(--xl-brand); font-size:13px; font-weight:800; text-decoration:none; }
.recent-story { padding-left:38px; border-left:1px solid var(--xl-border); }
.recent-summary { margin:0 0 18px; padding-top:15px; border-top:1px solid var(--xl-border); color:var(--xl-ink-soft); font-size:13px; }
.recent-summary strong { color:var(--xl-ink); font:650 28px var(--xl-font-display); }
.recent-summary span { margin:0 4px; }
.recent-bars { display:grid; gap:8px; }
.recent-bar { display:grid; grid-template-columns:38px minmax(0,1fr) 24px; align-items:center; gap:10px; color:var(--xl-ink-soft); font-size:11px; }
.recent-bar i { display:block; height:8px; overflow:hidden; border-radius:5px; background:#e7ede5; }
.recent-bar b { display:block; height:100%; border-radius:5px; background:#6c9b73; }
.recent-bar strong { color:var(--xl-ink); font-variant-numeric:tabular-nums; text-align:right; }
.recent-empty,.story-state { color:var(--xl-ink-soft); font-size:13px; line-height:1.6; }
.story-state button { border:0; background:transparent; color:var(--xl-brand); font-weight:800; cursor:pointer; }
.story-link:focus-visible,.stage-links a:focus-visible,.due-note:focus-visible,.story-state button:focus-visible { outline:3px solid #b9975d; outline-offset:3px; }
@media (max-width:950px) { .insight-paths { grid-template-columns:1fr; gap:42px; }.recent-story { padding-left:0; border-left:0; } }
@media (max-width:600px) { .story-heading { align-items:start; flex-direction:column; gap:8px; }.story-link { margin-top:0; }.memory-story-body { grid-template-columns:96px minmax(0,1fr); gap:12px; }.memory-number strong { font-size:40px; } }
</style>
