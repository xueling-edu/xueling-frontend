<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getStudyStats, getWordBooks } from '@/features/vocab/api'
import type { StudyStats, WordBookVo } from '@/features/vocab/types'
import PageHeading from '@/components/PageHeading.vue'

const studyStats = ref<StudyStats | null>(null)
const wordBooks = ref<WordBookVo[] | null>(null)
const statsError = ref(false)
const needsPlan = computed(() => wordBooks.value !== null && !wordBooks.value.some(book => book.studyEnabled))
const focusActionTo = computed(() => needsPlan.value ? '/english/vocab' : '/english/vocab/study')
const focusActionLabel = computed(() => {
  if (needsPlan.value) return '选择词书开始'
  if (studyStats.value?.checkedIn) return studyStats.value.dueCount > 0 ? '继续复习' : '查看今日学习'
  return studyStats.value?.todayReviewed ? '继续学习' : '开始学习'
})
const focusTitle = computed(() => {
  if (studyStats.value?.checkedIn) return '今日已自动打卡'
  if (needsPlan.value) return '先选择一本词书'
  if (!studyStats.value) return '今日单词'
  if (studyStats.value.dueCount > 0) return '先完成到期复习'
  return studyStats.value.todayReviewed > 0 ? '继续完成今日学习' : '今日单词'
})
const focusDescription = computed(() => {
  if (studyStats.value?.checkedIn && needsPlan.value) return '今天已打卡；选择词书后可以继续学习。'
  if (needsPlan.value) return '把想学的词书加入计划，今天的单词就会从这里开始。'
  if (!studyStats.value) return '先回忆，再揭晓答案，按计划稳步积累。'
  if (studyStats.value.checkedIn) return studyStats.value.dueCount > 0
    ? `今天已打卡，另有 ${studyStats.value.dueCount} 张卡片可以再次复习。`
    : '今天的学习已记录；后续卡片可以再复习，不影响今天的打卡。'
  if (studyStats.value.dueCount > 0) return `有 ${studyStats.value.dueCount} 个词已到期，先巩固再学习新词。`
  return studyStats.value.todayReviewed > 0 ? '今天已有学习记录，继续完成当前可学的单词即可自动打卡。' : '现在没有可复习的单词，可以从新词开始。'
})

onMounted(async () => {
  await Promise.all([
    getStudyStats().then(response => { studyStats.value = response.data }).catch(error => {
      statsError.value = true
      console.error('读取学习统计失败', error)
    }),
    getWordBooks().then(response => { wordBooks.value = response.data }).catch(error => {
      console.error('读取词书计划失败', error)
    })
  ])
})
</script>

<template>
  <main class="english-dashboard">
    <div class="dashboard-shell xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习' }]"
        title="英语学习"
        description="从单词到阅读，按自己的节奏持续进步。"
      >
        <template #mark>Aa</template>
      </PageHeading>

      <section class="daily-focus" aria-labelledby="daily-focus-title">
        <div class="focus-main">
          <div class="focus-copy">
            <p class="section-label"><span class="label-line" aria-hidden="true"></span> 今日任务</p>
            <h2 id="daily-focus-title">{{ focusTitle }}</h2>
            <p class="focus-description">{{ focusDescription }}</p>
            <div class="focus-actions">
              <router-link :to="focusActionTo" class="focus-action">
                {{ focusActionLabel }} <span aria-hidden="true">↗</span>
              </router-link>
              <router-link to="/english/vocab/insights" class="progress-action">
                查看学习进度 <span aria-hidden="true">↗</span>
              </router-link>
            </div>
          </div>
          <div class="focus-illustration" aria-hidden="true">
            <span class="study-card study-card-back"></span>
            <span class="study-card study-card-front"><span>word</span><i></i><i></i></span>
          </div>
        </div>
        <div class="today-stats" aria-label="今日单词学习数据">
          <div class="stat-item"><span>待复习</span><strong>{{ studyStats?.dueCount ?? '—' }}</strong><small>张</small></div>
          <div class="stat-item"><span>已回忆</span><strong>{{ studyStats?.todayReviewed ?? '—' }}</strong><small>次</small></div>
          <div class="stat-item"><span>新学单词</span><strong>{{ studyStats?.todayNew ?? '—' }}</strong><small>个</small></div>
        </div>
      </section>
      <p v-if="statsError" class="stats-note" role="status">学习数据暂时无法读取，仍可继续学习。</p>

      <section class="learning-modules" aria-label="更多学习入口">
        <div class="module-grid">
          <article class="module-card vocab-card">
            <div class="module-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none"><path d="M9 12.5A3.5 3.5 0 0 1 12.5 9H37v29H13a4 4 0 0 0-4 4V12.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 38a4 4 0 0 1 4-4h24M18 18h11M18 24h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="module-body">
              <h3>词书管理</h3>
              <p>选择词书，调整学习计划。</p>
            </div>
            <router-link class="module-link" to="/english/vocab">管理词书 <span aria-hidden="true">↗</span></router-link>
          </article>
          <article class="module-card article-card">
            <div class="module-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none"><path d="M24 39c-4.1-2.9-9-4.2-16-4.2V10c7 0 11.9 1.3 16 4.2 4.1-2.9 9-4.2 16-4.2v24.8c-7 0-11.9 1.3-16 4.2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M24 14.2V39M13 17h5M30 17h5M13 23h5M30 23h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="module-body">
              <h3>英语阅读</h3>
              <p>选择文章，在语境中学习。</p>
            </div>
            <router-link class="module-link" to="/english/articles">浏览文章 <span aria-hidden="true">↗</span></router-link>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.english-dashboard { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.daily-focus { overflow: hidden; border: 1px solid #cad9c8; border-radius: var(--xl-radius-lg); background: #eaf1e7; }
.focus-main { position: relative; min-height: 214px; display: flex; align-items: center; justify-content: space-between; padding: 30px 42px; overflow: hidden; }
.focus-copy { position: relative; z-index: 1; flex: 1; min-width: 0; }
.section-label { display: flex; align-items: center; gap: 9px; color: #4d7055; font-size: 12px; font-weight: 800; }
.label-line { width: 18px; height: 2px; border-radius: 2px; background: var(--xl-brand); }
.daily-focus h2 { max-width: 600px; margin: 14px 0 6px; font: 700 clamp(25px, 3vw, 34px)/1.3 var(--xl-font-display); letter-spacing: -.025em; }
.focus-description { margin:0; color:#4d7055; font-size:13px; line-height:1.6; }
.focus-actions { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-top:24px; }
.focus-action, .progress-action { width:fit-content; min-height:48px; display:inline-flex; align-items:center; justify-content:space-between; gap:24px; padding:0 18px; border-radius:var(--xl-button-radius); font-size:14px; font-weight:800; text-decoration:none; transition:background-color .18s, border-color .18s, transform .18s, box-shadow .18s; }
.focus-action { background: var(--xl-brand); color: white; box-shadow: var(--xl-button-shadow); }
.focus-action:hover { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.focus-action:active { transform: translateY(1px); box-shadow: var(--xl-button-shadow-pressed); }
.progress-action { border:1px solid #a7c0a9; background:#f7faf4; color:var(--xl-brand); box-shadow:var(--xl-outline-shadow); }
.progress-action:hover { border-color:#7fa286; background:#eef5eb; transform:translateY(-2px); box-shadow:0 4px 0 #d7e2d5; }
.progress-action:active { transform:translateY(1px); box-shadow:none; }
.focus-action:focus-visible, .progress-action:focus-visible { outline:3px solid #dbaa53; outline-offset:3px; }
.focus-illustration { position: relative; flex: none; width: 225px; height: 185px; margin: 0 28px; }
.focus-illustration::before { content: ''; position: absolute; inset: -28px 6px -26px; border: 1px solid #c4d7c2; border-radius: 50%; }
.study-card { position: absolute; width: 122px; height: 150px; border-radius: 12px; }
.study-card-back { top: 18px; left: 68px; transform: rotate(15deg); background: #adc8aa; }
.study-card-front { top: 17px; left: 43px; display: flex; flex-direction: column; gap: 13px; padding: 24px 16px; transform: rotate(-7deg); border: 1px solid #dce6d7; background: #fffefa; box-shadow: 0 12px 24px #315b4022; }
.study-card-front span { color: var(--xl-brand); font: italic 24px/1 var(--xl-font-display); }
.study-card-front i { display: block; width: 74px; height: 5px; border-radius: 4px; background: #d6e0d1; }
.study-card-front i:last-child { width: 54px; }
.today-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid #cad9c8; background: #f7f9f4; }
.stat-item { min-width: 0; min-height: 82px; display: flex; align-items: baseline; gap: 5px; padding: 18px 25px; border-right: 1px solid #dbe5d9; }
.stat-item:last-child { border-right: 0; }
.stat-item span { margin-right: auto; color: var(--xl-ink-soft); font-size: 12px; }
.stat-item strong { color: var(--xl-brand); font: 700 28px/1.2 var(--xl-font-display); font-variant-numeric: tabular-nums; }
.stat-item small { color: var(--xl-ink-soft); font-size: 12px; }
.stats-note { margin-top: 10px; color: #8b6430; font-size: 12px; }
.learning-modules { margin-top: 24px; }
.module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.module-card { min-width: 0; min-height: 202px; display: grid; grid-template-columns: 56px 1fr; grid-template-rows: 1fr auto; column-gap: 18px; padding: 26px; border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); background: var(--xl-surface); transition: border-color .18s, box-shadow .18s; }
.module-card:hover { border-color: #a9bda7; box-shadow: var(--xl-shadow-card); }
.module-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 14px; background: #e7efe4; color: var(--xl-brand); }
.module-icon svg { width: 34px; height: 34px; }
.article-card .module-icon { background: #f5ead8; color: #936927; }
.module-body h3 { margin: 2px 0 7px; font: 700 21px/1.25 var(--xl-font-display); }
.module-body p { max-width: 310px; color: var(--xl-ink-soft); font-size: 13px; line-height: 1.6; }
.module-link { grid-column: 2; display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; width: fit-content; min-height: 42px; margin-top: 18px; padding: 0 14px; border: 1px solid #b8cbb9; border-radius: var(--xl-button-radius); color: var(--xl-brand); font-size: 13px; font-weight: 800; text-decoration: none; box-shadow: var(--xl-outline-shadow); transition: background-color .18s, border-color .18s; }
.module-link:hover { background: #edf3e9; border-color: #8eae93; }
@media (max-width: 760px) {
  .focus-main { min-height: 0; padding: 26px 24px 28px; }
  .focus-illustration { display: none; }
  .daily-focus h2 { font-size: clamp(23px, 6vw, 29px); }
  .today-stats .stat-item { min-height: 80px; flex-wrap: wrap; gap: 2px 4px; padding: 13px 14px; }
  .stat-item span { flex-basis: 100%; }
  .stat-item strong { font-size: 25px; }
  .learning-modules { margin-top: 16px; }
  .module-grid { grid-template-columns: 1fr; gap: 12px; }
  .module-card { min-height: 0; padding: 20px; }
}
@media (max-width: 420px) {
  .focus-main { padding: 24px 20px 26px; }
  .focus-actions { align-items:stretch; flex-direction:column; }
  .focus-action, .progress-action { width:100%; }
  .today-stats .stat-item { padding-inline: 10px; }
  .stat-item span, .stat-item small { font-size: 11px; }
  .module-card { grid-template-columns: 48px 1fr; gap: 12px; padding: 18px; }
  .module-icon { width: 44px; height: 44px; border-radius: 11px; }
  .module-icon svg { width: 29px; height: 29px; }
  .module-body h3 { font-size: 19px; }
}
@media (prefers-reduced-motion: reduce) { .focus-action:hover, .focus-action:active, .progress-action:hover, .progress-action:active { transform: none; } }
</style>
