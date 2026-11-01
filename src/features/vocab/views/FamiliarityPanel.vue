<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getStudyFamiliarity, getStudySettings, getWordBooks } from '@/features/vocab/api'
import type { FamiliarityStage, StudyFamiliarity, StudyFamiliarityWord, WordBookVo } from '@/features/vocab/types'

const props = withDefaults(defineProps<{ initialStage?: FamiliarityStage }>(), { initialStage: 'ALL' })

const books = ref<WordBookVo[]>([])
const bookId = ref('')
const bookOpen = ref(false)
const bookQuery = ref('')
const bookFilter = ref<HTMLElement | null>(null)
const bookTrigger = ref<HTMLButtonElement | null>(null)
const bookSearch = ref<HTMLInputElement | null>(null)
const stage = ref<FamiliarityStage>(props.initialStage)
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
const selectedBookLabel = computed(() => books.value.find(book => book.id === bookId.value)?.name ?? '全部词书')
const filteredBooks = computed(() => books.value.filter(book => book.name.toLocaleLowerCase().includes(bookQuery.value.trim().toLocaleLowerCase())))

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

function selectBook(value: string) {
  bookOpen.value = false
  bookQuery.value = ''
  void nextTick(() => bookTrigger.value?.focus())
  if (bookId.value === value) return
  bookId.value = value
  page.value = 1
  void load()
}

function toggleBook() {
  bookOpen.value = !bookOpen.value
  bookQuery.value = ''
  if (bookOpen.value) void nextTick(() => bookSearch.value?.focus())
}

function closeBook(restoreFocus = false) {
  bookOpen.value = false
  bookQuery.value = ''
  if (restoreFocus) void nextTick(() => bookTrigger.value?.focus())
}

function closeBookOnOutsideClick(event: MouseEvent) {
  if (bookOpen.value && !bookFilter.value?.contains(event.target as Node)) closeBook()
}

function goToPage(value: number) {
  page.value = value
  void load()
}

onMounted(() => {
  document.addEventListener('click', closeBookOnOutsideClick)
  void load()
  void getWordBooks().then(response => { books.value = response.data ?? [] }).catch(() => {})
  void getStudySettings().then(response => { timeZone.value = response.data.timeZone }).catch(() => {})
})
onUnmounted(() => document.removeEventListener('click', closeBookOnOutsideClick))
</script>

<template>
  <section class="familiarity" aria-labelledby="familiarity-title">
    <div class="familiarity-heading">
      <div>
        <span class="eyebrow">MEMORY MAP / 记忆地图</span>
        <h2 id="familiarity-title">这些词，记得怎么样？</h2>
        <p>按记忆阶段查看已学单词；移出计划的词仍保留记录，但暂停复习。词书筛选只作用于本区。</p>
      </div>
      <div ref="bookFilter" class="book-filter" title="仅筛选记忆地图，下面的每日记录仍汇总全部词书" @keydown.esc.stop="closeBook(true)">
        <span id="book-filter-label">词书</span>
        <button ref="bookTrigger" type="button" class="book-trigger" aria-labelledby="book-filter-label book-filter-value"
          aria-controls="book-filter-panel" :aria-expanded="bookOpen" @click="toggleBook">
          <span id="book-filter-value" class="book-trigger-value" :title="selectedBookLabel">{{ selectedBookLabel }}</span><span class="book-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m4.5 6.25 3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div v-if="bookOpen" id="book-filter-panel" class="book-panel" aria-label="选择词书">
          <label class="book-search"><span class="sr-only">搜索词书</span><svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="7.75" cy="7.75" r="4.75" stroke="currentColor" stroke-width="1.6"/><path d="m11.4 11.4 3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input ref="bookSearch" v-model="bookQuery" type="search" placeholder="搜索词书" autocomplete="off"></label>
          <div class="book-options">
            <button v-if="!bookQuery.trim()" type="button" :aria-pressed="!bookId" @click="selectBook('')"><span>全部词书</span><svg v-if="!bookId" class="book-check" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m3.5 9 3.7 3.7 7.3-7.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button v-for="book in filteredBooks" :key="book.id" type="button" :aria-pressed="bookId === book.id" :title="book.name" @click="selectBook(book.id)"><span>{{ book.name }}</span><svg v-if="bookId === book.id" class="book-check" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m3.5 9 3.7 3.7 7.3-7.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <p v-if="!filteredBooks.length" class="book-empty">没有匹配的词书</p>
          </div>
          <p class="book-panel-note">仅筛选记忆地图</p>
        </div>
      </div>
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
.familiarity { margin-top: 0; }
.familiarity-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; margin-bottom:18px; }
.eyebrow { color:#65836c; font-size:11px; font-weight:800; letter-spacing:.13em; }
.familiarity h2 { margin:8px 0 7px; font:650 clamp(25px,3vw,34px)/1.2 var(--xl-font-display); }
.familiarity h3 { margin:6px 0 0; font:650 21px/1.2 var(--xl-font-display); }
.familiarity-heading p,.metric-note,.attention-intro { margin:0; color:var(--xl-ink-soft); font-size:13px; line-height:1.65; }
.book-filter { position:relative; display:flex; align-items:center; gap:10px; color:var(--xl-ink-soft); font-size:12px; white-space:nowrap; }
.book-trigger { display:flex; align-items:center; justify-content:space-between; gap:13px; width:205px; min-height:44px; padding:0 13px 0 15px; border:1px solid #cddccf; border-radius:11px; background:var(--xl-surface); color:var(--xl-ink); box-shadow:0 2px 0 #e6ece3; font-size:13px; font-weight:750; cursor:pointer; transition:border-color .18s ease, background-color .18s ease, box-shadow .18s ease; }.book-trigger:hover,.book-trigger[aria-expanded="true"] { border-color:#86a58b; background:#fbfdf9; box-shadow:0 0 0 3px #e8f0e7; }.book-trigger-value { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.book-chevron { flex:none; color:#6a8b70; font-size:20px; line-height:1; transition:transform .18s ease; }.book-trigger[aria-expanded="true"] .book-chevron { transform:rotate(180deg); }
.book-panel { position:absolute; right:0; top:calc(100% + 9px); z-index:6; width:min(288px, calc(100vw - 48px)); padding:10px; border:1px solid #ceddcb; border-radius:14px; background:var(--xl-surface); box-shadow:0 16px 38px #1d3c2a26; animation:book-panel-in .18s ease-out; }.book-search { display:flex; align-items:center; gap:7px; height:38px; padding:0 10px; border:1px solid #dce5d9; border-radius:9px; background:#f7f9f4; color:#78927b; font-size:20px; }.book-search:focus-within { border-color:#7c9d81; box-shadow:0 0 0 2px #e7f0e4; }.book-search input { min-width:0; width:100%; border:0; outline:0; background:transparent; color:var(--xl-ink); font-size:12px; }.book-options { max-height:232px; overflow:auto; padding:7px 0 2px; }.book-options button { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; min-height:39px; padding:7px 10px; border:0; border-radius:8px; background:transparent; color:var(--xl-ink); text-align:left; font-size:12px; cursor:pointer; }.book-options button > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.book-options button > span:last-child { color:#3d8050; font-size:15px; }.book-options button:hover,.book-options button[aria-pressed="true"] { background:#eaf2e7; }.book-options button[aria-pressed="true"] { font-weight:800; }.book-empty { padding:10px; color:var(--xl-ink-soft); font-size:12px; }.book-panel-note { margin:5px 3px 0; padding:9px 7px 2px; border-top:1px solid #e7ede4; color:#7c8c7d; font-size:11px; }.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@keyframes book-panel-in { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
.book-chevron { display:grid; place-items:center; width:24px; height:24px; border:1px solid #d6e5d5; border-radius:8px; background:#eaf2e8; }.book-chevron svg { width:15px; height:15px; }.book-trigger:hover .book-chevron, .book-trigger[aria-expanded="true"] .book-chevron { background:#deebdc; border-color:#bad1b8; }
.book-search > svg { flex:none; width:17px; height:17px; }.book-check { flex:none; width:17px; height:17px; color:#3d8050; }
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
@media (max-width:600px) { .familiarity-heading { display:block; }.book-filter { margin-top:15px; }.book-trigger { width:min(240px, calc(100vw - 90px)); }.book-panel { left:0; right:auto; }.memory-overview { grid-template-columns:1fr; }.overview-lead { flex-direction:row; align-items:baseline; gap:9px; padding:16px 20px; border-right:0; border-bottom:1px solid #dce6d8; }.overview-lead strong { font-size:28px; }.overview-content { padding:18px 14px; }.segment-actions { gap:2px; }.segment-action { flex-wrap:wrap; gap:4px; }.segment-action strong { flex-basis:100%; margin-left:16px; }.word-panel,.attention-panel { padding:18px 16px; }.word-list li { align-items:start; padding:13px 0; }.word-meta { max-width:115px; } }
@media (prefers-reduced-motion:reduce) { .memory-track span { transition:none; } }
</style>
