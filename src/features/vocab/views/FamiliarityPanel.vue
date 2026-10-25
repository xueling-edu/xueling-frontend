<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getStudyFamiliarity, getStudySettings, getWordBooks } from '@/features/vocab/api'
import type { FamiliarityStage, StudyFamiliarity, StudyFamiliarityWord, WordBookVo } from '@/features/vocab/types'

const books = ref<WordBookVo[]>([])
const bookId = ref('')
const stage = ref<FamiliarityStage>('ALL')
const page = ref(1)
const data = ref<StudyFamiliarity | null>(null)
const loading = ref(true)
const error = ref('')
const timeZone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai')
let latestRequest = 0

const segments = computed(() => [
  { key: 'LEARNING' as const, label: '初学与重学', count: data.value?.learningCount ?? 0 },
  { key: 'CONSOLIDATING' as const, label: '巩固中', count: data.value?.consolidatingCount ?? 0 },
  { key: 'STABLE' as const, label: '较稳固', count: data.value?.stableCount ?? 0 }
])
const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.wordCount ?? 0) / (data.value?.pageSize ?? 20))))
const selectedStageLabel = computed(() => stage.value === 'ALL' ? '全部已学单词' : segments.value.find(item => item.key === stage.value)?.label)

function stageLabel(value: StudyFamiliarityWord['stage']) {
  return segments.value.find(item => item.key === value)?.label ?? value
}

function dueLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('zh-CN', {
    timeZone: timeZone.value, month: 'long', day: 'numeric'
  }).format(date)
}

async function load() {
  const requestId = ++latestRequest
  loading.value = true
  error.value = ''
  try {
    const response = await getStudyFamiliarity({ bookId: bookId.value || undefined, stage: stage.value, page: page.value })
    if (requestId === latestRequest) data.value = response.data
  } catch (cause: any) {
    if (requestId === latestRequest) error.value = cause?.msg || '熟悉程度暂时无法读取，请稍后重试。'
  } finally {
    if (requestId === latestRequest) loading.value = false
  }
}

function selectStage(value: FamiliarityStage) {
  if (stage.value === value) return
  stage.value = value
  page.value = 1
  void load()
}

function selectBook(event: Event) {
  bookId.value = (event.target as HTMLSelectElement).value
  page.value = 1
  void load()
}

function goToPage(value: number) {
  page.value = value
  void load()
}

onMounted(() => {
  void load()
  void getWordBooks().then(response => { books.value = response.data ?? [] }).catch(() => {})
  void getStudySettings().then(response => { timeZone.value = response.data.timeZone }).catch(() => {})
})
</script>

<template>
  <section class="familiarity" aria-labelledby="familiarity-title">
    <div class="familiarity-heading">
      <div>
        <span class="eyebrow">MEMORY MAP / 记忆地图</span>
        <h2 id="familiarity-title">这些词，记得怎么样？</h2>
        <p>按记忆阶段查看已学单词；移出计划的词仍保留记录，但暂停复习。词书筛选只作用于本区。</p>
      </div>
      <label class="book-filter" title="仅筛选记忆地图，下面的每日记录仍汇总全部词书">词书
        <select :value="bookId" aria-label="筛选词书" @change="selectBook">
          <option value="">全部词书</option>
          <option v-for="book in books" :key="book.id" :value="book.id">{{ book.name }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading && !data" class="panel-state" role="status">正在整理记忆地图…</div>
    <div v-else-if="error" class="panel-state" role="alert">{{ error }} <button type="button" @click="load">重试</button></div>
    <template v-else-if="data">
      <div class="memory-overview">
        <div class="overview-lead">
          <span>已学习</span><strong>{{ data.learnedCount }}</strong><small>个不同单词</small>
        </div>
        <div class="overview-content">
          <div class="memory-track" role="img" :aria-label="`初学与重学 ${data.learningCount} 个，巩固中 ${data.consolidatingCount} 个，较稳固 ${data.stableCount} 个`">
            <span v-for="item in segments" :key="item.key" :class="item.key.toLowerCase()"
              :style="{ width: `${data.learnedCount ? item.count / data.learnedCount * 100 : 0}%` }"></span>
          </div>
          <div class="segment-actions" role="group" aria-label="按熟悉阶段查看单词">
            <button v-for="item in segments" :key="item.key" type="button" :class="['segment-action', item.key.toLowerCase(), { active: stage === item.key }]"
              :aria-pressed="stage === item.key" @click="selectStage(item.key)">
              <i aria-hidden="true"></i><span>{{ item.label }}</span><strong>{{ item.count }}</strong>
            </button>
          </div>
        </div>
        <router-link class="due-callout" to="/english/vocab/study">
          <span>现在待复习</span><strong>{{ data.dueCount }}</strong><small>去完成今日学习 ↗</small>
        </router-link>
      </div>
      <p class="metric-note">“较稳固”表示 FSRS 估计的记忆稳定性达到 30 天，并不表示永远不会忘记。已到期的单词仍应按计划复习。</p>

      <div class="detail-grid">
        <section class="word-panel" aria-labelledby="word-list-title">
          <div class="panel-heading">
            <div><span class="eyebrow">EXPLORE</span><h3 id="word-list-title">{{ selectedStageLabel }} <small>{{ data.wordCount }}</small></h3></div>
            <button v-if="stage !== 'ALL'" class="all-button" type="button" @click="selectStage('ALL')">查看全部</button>
          </div>
          <p v-if="data.words.length === 0" class="empty-note">这里还没有单词。继续学习后，记忆阶段会逐步出现。</p>
          <ul v-else class="word-list">
            <li v-for="word in data.words" :key="word.wordId">
              <div class="word-main"><strong>{{ word.word }}</strong><span>{{ word.meaning }}</span></div>
              <div class="word-meta"><span :class="['stage-tag', word.stage.toLowerCase()]">{{ stageLabel(word.stage) }}</span><span v-if="!word.inStudyPlan" class="paused-tag">已暂停</span><span v-else-if="word.due" class="due-tag">待复习</span><span v-else>下次 {{ dueLabel(word.dueAt) }}</span></div>
            </li>
          </ul>
          <div v-if="totalPages > 1" class="pager"><button type="button" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">上一页</button><span>{{ page }} / {{ totalPages }}</span><button type="button" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">下一页</button></div>
        </section>

        <section class="attention-panel" aria-labelledby="attention-title">
          <span class="eyebrow">REVISIT</span><h3 id="attention-title">值得再看一眼</h3>
          <p class="attention-intro">最近忘记过，或在正式复习中多次遗忘的词。</p>
          <p v-if="data.attentionWords.length === 0" class="attention-empty">目前没有反复遗忘的词，保持现在的复习节奏。</p>
          <ol v-else>
            <li v-for="word in data.attentionWords" :key="word.wordId"><div><strong>{{ word.word }}</strong><span>{{ word.meaning }}</span></div><small>{{ word.lastRating === 1 ? '上次忘记' : `已遗忘 ${word.lapseCount} 次` }}{{ !word.inStudyPlan ? ' · 已暂停' : word.due ? ' · 待复习' : '' }}</small></li>
          </ol>
          <router-link v-if="data.attentionWords.some(word => word.inStudyPlan)" class="attention-link" to="/english/vocab/study">按计划复习 ↗</router-link>
          <router-link v-else-if="data.attentionWords.length" class="attention-link" to="/english/vocab">管理学习计划 ↗</router-link>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.familiarity { margin-top: 30px; }
.familiarity-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; margin-bottom:18px; }
.eyebrow { color:#65836c; font-size:11px; font-weight:800; letter-spacing:.13em; }
.familiarity h2 { margin:8px 0 7px; font:650 clamp(25px,3vw,34px)/1.2 var(--xl-font-display); }
.familiarity h3 { margin:6px 0 0; font:650 21px/1.2 var(--xl-font-display); }
.familiarity-heading p,.metric-note,.attention-intro { margin:0; color:var(--xl-ink-soft); font-size:13px; line-height:1.65; }
.book-filter { display:flex; align-items:center; gap:10px; color:var(--xl-ink-soft); font-size:12px; white-space:nowrap; }
.book-filter select { min-height:42px; max-width:200px; padding:0 13px; border:1px solid var(--xl-border); border-radius:10px; background:var(--xl-surface); color:var(--xl-ink); font:inherit; font-weight:700; }
.panel-state { padding:26px; border:1px solid var(--xl-border); border-radius:14px; background:var(--xl-surface); color:var(--xl-ink-soft); }
.panel-state button,.all-button { border:0; background:none; color:var(--xl-brand); font-weight:800; cursor:pointer; }
.memory-overview { display:grid; grid-template-columns:165px minmax(0,1fr) 170px; overflow:hidden; border:1px solid #c8d8c5; border-radius:17px; background:#fbfcf8; box-shadow:0 12px 32px #224a2710; }
.overview-lead,.due-callout { display:flex; flex-direction:column; justify-content:center; gap:3px; padding:22px 25px; }
.overview-lead { border-right:1px solid #dce6d8; }
.overview-lead span,.due-callout span { color:var(--xl-ink-soft); font-size:12px; }
.overview-lead strong,.due-callout strong { font:700 38px/1.1 var(--xl-font-display); font-variant-numeric:tabular-nums; }
.overview-lead small,.due-callout small { color:var(--xl-ink-soft); font-size:11px; }
.overview-content { display:flex; flex-direction:column; justify-content:center; gap:16px; min-width:0; padding:25px 28px; }
.memory-track { display:flex; height:16px; overflow:hidden; border-radius:99px; background:#e7ece6; }
.memory-track span { min-width:0; transition:width .35s ease; }
.memory-track .learning { background:#d9a96c; }.memory-track .consolidating { background:#85aaba; }.memory-track .stable { background:#4e8a62; }
.segment-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
.segment-action { display:flex; align-items:center; gap:8px; min-height:34px; padding:5px 8px; border:1px solid transparent; border-radius:8px; background:transparent; color:var(--xl-ink-soft); text-align:left; cursor:pointer; }
.segment-action:hover,.segment-action.active { border-color:#c9d9c7; background:#eef4eb; color:var(--xl-ink); }
.segment-action i { flex:none; width:8px; height:8px; border-radius:50%; background:#d9a96c; }.segment-action.consolidating i { background:#85aaba; }.segment-action.stable i { background:#4e8a62; }
.segment-action span { min-width:0; font-size:12px; }.segment-action strong { margin-left:auto; color:var(--xl-ink); font-size:15px; }
.due-callout { border-left:1px solid #dce6d8; background:#eaf2e8; color:var(--xl-brand); text-decoration:none; }
.due-callout:hover { background:#dfeedd; }.due-callout small { color:var(--xl-brand); font-weight:800; }
.metric-note { margin:9px 2px 0; font-size:11px; }
.detail-grid { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr); align-items:start; gap:16px; margin-top:24px; }
.word-panel,.attention-panel { min-width:0; padding:22px 24px; border:1px solid var(--xl-border); border-radius:15px; background:var(--xl-surface); }
.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }.panel-heading h3 small { color:var(--xl-ink-soft); font:600 14px var(--xl-font-display); }
.word-list,.attention-panel ol { margin:0; padding:0; list-style:none; }.word-list li { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:66px; border-top:1px solid var(--xl-border); }
.word-main,.attention-panel li div { display:flex; flex-direction:column; min-width:0; gap:3px; }.word-main strong,.attention-panel li strong { font:650 17px var(--xl-font-display); }.word-main span,.attention-panel li span { overflow:hidden; color:var(--xl-ink-soft); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
.word-meta { display:flex; align-items:center; justify-content:end; gap:8px; flex-wrap:wrap; color:var(--xl-ink-soft); font-size:11px; white-space:nowrap; }.stage-tag,.due-tag { padding:4px 7px; border-radius:6px; font-weight:750; }.stage-tag.learning { background:#faefdf; color:#8a5a29; }.stage-tag.consolidating { background:#e7f1f4; color:#416b79; }.stage-tag.stable { background:#e6f1e5; color:#3f7450; }.due-tag { background:#fae9e2; color:#ac5a3b; }
.paused-tag { padding:4px 7px; border-radius:6px; background:#edf0ea; color:#667969; font-weight:750; }
.empty-note,.attention-empty { padding:20px 0; color:var(--xl-ink-soft); font-size:13px; line-height:1.6; }.pager { display:flex; align-items:center; justify-content:end; gap:14px; padding-top:16px; border-top:1px solid var(--xl-border); color:var(--xl-ink-soft); font-size:12px; }.pager button { min-height:32px; padding:0 10px; border:1px solid var(--xl-border); border-radius:7px; background:var(--xl-surface); color:var(--xl-brand); cursor:pointer; }.pager button:disabled { opacity:.45; cursor:default; }
.attention-panel { background:#f9faf5; }.attention-intro { margin:9px 0 15px; }.attention-panel li { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:64px; border-top:1px solid var(--xl-border); }.attention-panel li small { color:#a36140; font-size:11px; white-space:nowrap; }.attention-link { display:inline-flex; margin-top:14px; color:var(--xl-brand); font-size:13px; font-weight:800; text-decoration:none; }
@media (max-width:900px) { .memory-overview { grid-template-columns:130px minmax(0,1fr); }.due-callout { grid-column:1/-1; flex-direction:row; align-items:baseline; gap:10px; padding:15px 20px; border-top:1px solid #dce6d8; border-left:0; }.due-callout strong { font-size:25px; }.detail-grid { grid-template-columns:1fr; } }
@media (max-width:600px) { .familiarity-heading { display:block; }.book-filter { margin-top:15px; }.memory-overview { grid-template-columns:1fr; }.overview-lead { flex-direction:row; align-items:baseline; gap:9px; padding:16px 20px; border-right:0; border-bottom:1px solid #dce6d8; }.overview-lead strong { font-size:28px; }.overview-content { padding:18px 14px; }.segment-actions { gap:2px; }.segment-action { flex-wrap:wrap; gap:4px; }.segment-action strong { flex-basis:100%; margin-left:16px; }.word-panel,.attention-panel { padding:18px 16px; }.word-list li { align-items:start; padding:13px 0; }.word-meta { max-width:115px; } }
@media (prefers-reduced-motion:reduce) { .memory-track span { transition:none; } }
</style>
