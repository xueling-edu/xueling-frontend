<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getStudyHistory, getStudyReviewCounts } from '@/features/vocab/api'
import type { StudyDayStats, StudyReviewCount } from '@/features/vocab/types'
import PageHeading from '@/components/PageHeading.vue'
import FamiliarityPanel from './FamiliarityPanel.vue'
import StudyGrowthCalendar from './StudyGrowthCalendar.vue'

const days = ref<7 | 30>(7)
const rows = ref<StudyDayStats[]>([])
const loading = ref(false)
const error = ref('')
const reviewCounts = ref<StudyReviewCount | null>(null)
const reviewCountsError = ref(false)
let latestHistoryRequest = 0
const totalReviews = computed(() => rows.value.reduce((sum, row) => sum + row.reviewCount, 0))
const totalNew = computed(() => rows.value.reduce((sum, row) => sum + row.newWords, 0))
const totalTime = computed(() => rows.value.reduce((sum, row) => sum + row.studyTimeMs, 0))
const recallSamples = computed(() => rows.value.reduce((sum, row) => sum + row.dueRecallAttempts, 0))
const recallRate = computed(() => recallSamples.value === 0 ? null
  : rows.value.reduce((sum, row) => sum + (row.dueRecallRate ?? 0) * row.dueRecallAttempts, 0) / recallSamples.value)
const goodOrEasyRate = computed(() => recallSamples.value === 0 ? null
  : rows.value.reduce((sum, row) => sum + (row.goodOrEasyRate ?? 0) * row.dueRecallAttempts, 0) / recallSamples.value)
const maxReviews = computed(() => Math.max(1, ...rows.value.map(row => row.reviewCount)))
const latestFirst = computed(() => [...rows.value].reverse())

function formatTime(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)} 秒`
  return `${Math.round(ms / 60_000)} 分钟`
}

async function loadHistory(value: 7 | 30 = days.value) {
  const requestId = ++latestHistoryRequest
  days.value = value
  loading.value = true
  error.value = ''
  try {
    const response = await getStudyHistory(value)
    if (requestId === latestHistoryRequest) rows.value = response.data ?? []
  } catch (cause: any) {
    if (requestId === latestHistoryRequest) {
      error.value = cause?.msg || '学习进度暂时无法读取，请稍后重试。'
    }
  } finally {
    if (requestId === latestHistoryRequest) loading.value = false
  }
}

async function loadReviewCounts() {
  reviewCountsError.value = false
  try {
    reviewCounts.value = (await getStudyReviewCounts()).data
  } catch {
    reviewCountsError.value = true
  }
}

onMounted(() => {
  void loadHistory()
  void loadReviewCounts()
})
</script>

<template>
  <main class="insights-page">
    <div class="insights-shell xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '学习进度' }]"
        title="学习进度"
        description="看清哪些单词需要巩固，回顾每天的学习节奏。"
      />

      <StudyGrowthCalendar />

      <FamiliarityPanel />

      <div class="history-heading">
        <div><span>STUDY RHYTHM / 学习节奏</span><h2>近 {{ days }} 天回顾</h2></div>
        <div class="range-switch" role="group" aria-label="统计时间范围">
          <button v-for="value in [7, 30] as const" :key="value" type="button"
            :class="{ active: days === value }" :aria-pressed="days === value"
            @click="loadHistory(value)">近 {{ value }} 天</button>
        </div>
      </div>

      <div v-if="loading" class="state-panel" role="status">正在整理学习进度…</div>
      <div v-else-if="error" class="state-panel" role="alert">
        <p>{{ error }}</p><button type="button" @click="loadHistory()">重新加载</button>
      </div>
      <template v-else>
        <section class="summary" aria-label="学习汇总">
          <div><span>回忆次数</span><strong>{{ totalReviews }}</strong></div>
          <div><span>新学单词</span><strong>{{ totalNew }}</strong></div>
          <div><span>学习用时</span><strong>{{ formatTime(totalTime) }}</strong></div>
          <div><span>到期回忆率</span><strong>{{ recallRate === null ? '—' : `${Math.round(recallRate * 100)}%` }}</strong><small>样本 {{ recallSamples }} 次 · 记得或容易 {{ goodOrEasyRate === null ? '—' : `${Math.round(goodOrEasyRate * 100)}%` }}</small><small v-if="recallSamples > 0 && recallSamples < 20">样本较少，仅供参考</small></div>
        </section>

        <section class="history" aria-labelledby="history-title">
          <div class="section-heading">
            <h2 id="history-title">每日记录</h2>
            <p>每日记录汇总全部词书；历史积压按已学卡片回算，今天只计学习计划内的待复习词。</p>
          </div>
          <p v-if="totalReviews === 0" class="empty-note">这段时间还没有评分记录。完成一次今日学习后，记录会出现在这里。</p>
          <div v-for="row in latestFirst" :key="row.date" class="day-row">
            <time :datetime="row.date">{{ row.date.slice(5) }}</time>
            <div class="bar" :aria-label="`${row.date} 回忆 ${row.reviewCount} 次`">
              <span :style="{ width: `${row.reviewCount / maxReviews * 100}%` }"></span>
            </div>
            <strong>{{ row.reviewCount }} 次</strong>
            <span>新词 {{ row.newWords }}</span>
            <span>用时 {{ formatTime(row.studyTimeMs) }}</span>
            <span>到期回忆 {{ row.dueRecallRate === null ? '—' : `${Math.round(row.dueRecallRate * 100)}%` }} <small>({{ row.dueRecallAttempts }})</small></span>
            <span>积压 {{ row.dueBacklog }}</span>
          </div>
        </section>
        <section v-if="reviewCounts" class="distribution" aria-labelledby="distribution-title">
          <div class="section-heading">
            <h2 id="distribution-title">每词回忆次数</h2>
            <p>统计当前已学习的单词，每个词只计入一个区间。</p>
          </div>
          <div class="distribution-grid">
            <div><span>1 次</span><strong>{{ reviewCounts.once }}</strong></div>
            <div><span>2 次</span><strong>{{ reviewCounts.twice }}</strong></div>
            <div><span>3–5 次</span><strong>{{ reviewCounts.threeToFive }}</strong></div>
            <div><span>6 次及以上</span><strong>{{ reviewCounts.sixOrMore }}</strong></div>
          </div>
        </section>
        <p v-else-if="reviewCountsError" class="empty-note distribution-error">复习次数暂时无法读取。<button type="button" @click="loadReviewCounts">重试</button></p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.insights-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.history-heading { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-top:44px; }.history-heading span { color:#65836c; font-size:11px; font-weight:800; letter-spacing:.13em; }.history-heading h2 { margin:6px 0 0; font:650 27px/1.2 var(--xl-font-display); }
.section-heading p { color: var(--xl-ink-soft); }
.range-switch { display: inline-flex; gap: 6px; padding: 5px; border: 1px solid var(--xl-border); border-radius: 12px; background: var(--xl-surface); }
.range-switch button { border: 0; border-radius: 8px; padding: 9px 18px; background: transparent; color: var(--xl-ink-soft); cursor: pointer; }
.range-switch button.active { background: var(--xl-brand); color: white; }
.range-switch button { min-height: 40px; font-weight: 750; transition: background-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.range-switch button:hover:not(.active) { background: #edf3e9; color: var(--xl-brand); }
.range-switch button.active { box-shadow: 0 2px 0 #1f422d; }
.range-switch button:active { transform: translateY(1px); box-shadow: none; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 16px; border: 1px solid var(--xl-border); border-radius: 14px; background: var(--xl-surface); }
.summary > div { display: flex; flex-direction: column; gap: 8px; min-height: 130px; padding: 24px; border-right: 1px solid var(--xl-border); }
.summary > div:last-child { border-right: 0; }
.summary span, .summary small, .day-row > span { color: var(--xl-ink-soft); font-size: 12px; }
.summary strong { font: 600 30px/1.2 var(--xl-font-display); }
.history { margin-top: 48px; }
.distribution { margin-top: 48px; }
.distribution-error { margin-top: 48px; }
.distribution-error button { margin-left: 8px; border: 0; background: transparent; color: var(--xl-brand); font-weight: 700; cursor: pointer; }
.distribution-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.distribution-grid > div { display: flex; flex-direction: column; gap: 8px; padding: 20px; border: 1px solid var(--xl-border); border-radius: 12px; background: var(--xl-surface); }
.distribution-grid span { color: var(--xl-ink-soft); font-size: 12px; }
.distribution-grid strong { font: 600 30px/1.2 var(--xl-font-display); }
.section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.section-heading h2 { font: 650 28px/1.2 var(--xl-font-display); }
.day-row { display: grid; grid-template-columns: 56px minmax(90px, 1fr) 55px repeat(4, minmax(85px, auto)); align-items: center; gap: 14px; padding: 15px 10px; border-bottom: 1px solid var(--xl-border); font-size: 13px; }
.day-row time { font-weight: 700; }
.day-row strong { white-space: nowrap; }
.bar { height: 10px; border-radius: 5px; background: #e7ede5; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--xl-brand); border-radius: 5px; }
.empty-note, .state-panel { padding: 28px; border: 1px solid var(--xl-border); border-radius: 12px; background: var(--xl-surface); color: var(--xl-ink-soft); }
.state-panel button { margin-top: 12px; border: 0; background: var(--xl-brand); color: white; border-radius: 8px; padding: 10px 16px; cursor: pointer; }
.state-panel button { min-height: var(--xl-button-height); padding: 0 18px; border: 1px solid #254c35; border-radius: var(--xl-button-radius); font-weight: 800; box-shadow: var(--xl-button-shadow); transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease; }
.state-panel button:hover { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.state-panel button:active { transform: translateY(1px); box-shadow: var(--xl-button-shadow-pressed); }
@media (max-width: 850px) {
  .history-heading { align-items:start; flex-direction:column; }
  .summary { grid-template-columns: repeat(2, 1fr); }
  .distribution-grid { grid-template-columns: repeat(2, 1fr); }
  .summary > div:nth-child(2) { border-right: 0; }
  .summary > div:nth-child(-n+2) { border-bottom: 1px solid var(--xl-border); }
  .day-row { grid-template-columns: 55px 1fr 50px; gap: 8px; }
  .day-row > span { grid-column: span 1; }
  .day-row > span:nth-of-type(2) { grid-column: 2; }
  .section-heading { display: block; }
}
</style>
