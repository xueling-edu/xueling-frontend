<template>
  <main class="vocab-page">
    <div class="vocab-shell xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '我的词书' }]"
        title="我的词书"
        :description="loadingBooks ? '选择词书，安排每天的学习。' : `共 ${wordBooks.length} 本词书，安排每天的学习。`"
      >
        <template #actions>
          <div class="header-actions">
            <router-link class="header-progress" to="/english/vocab/insights">学习进度 <span aria-hidden="true">↗</span></router-link>
            <button class="header-create" type="button" @click="dialogVisible = true">＋ 新建词书</button>
          </div>
        </template>
      </PageHeading>

      <section class="collection" aria-label="词书列表">

        <div v-if="loadingBooks" class="book-grid" aria-label="正在加载词书">
          <div v-for="index in 3" :key="index" class="book-skeleton" aria-hidden="true"></div>
        </div>
        <div v-else-if="booksError" class="collection-state" role="alert">
          <span class="state-symbol" aria-hidden="true">↻</span>
          <h3>词书暂时没有加载出来</h3>
          <p>{{ booksError }}</p>
          <button type="button" @click="fetchWordBooks">重新加载</button>
        </div>
        <div v-else-if="wordBooks.length === 0" class="collection-state">
          <span class="state-symbol" aria-hidden="true">＋</span>
          <h3>从第一本词书开始</h3>
          <p>创建自己的词书，收集想记住的单词。</p>
          <button type="button" @click="dialogVisible = true">创建单词本</button>
        </div>
        <div v-else class="book-grid">
          <article v-for="(book, index) in wordBooks" :key="book.id" class="book-card" :style="{ '--card-index': index }">
            <div class="book-card-top">
              <div class="book-cover" :style="{ background: book.color }" aria-hidden="true">
                <span class="cover-imprint">XUELING · WORDS</span>
                <span class="cover-art"><BookEmblem :icon="book.icon" /></span>
                <span class="cover-foot">{{ book.bookType === 'SYSTEM' ? 'THE COLLECTION' : 'MY COLLECTION' }}</span>
              </div>
              <div class="book-summary">
                <span class="book-kind">{{ book.bookType === 'SYSTEM' ? '系统词书' : '个人词书' }} <span aria-hidden="true">·</span> {{ String(index + 1).padStart(2, '0') }}</span>
                <h3>{{ book.name }}</h3>
                <p class="book-description">{{ book.bookType === 'SYSTEM' ? '循序积累，稳稳记住每一个词。' : '为你想记住的词，留一个位置。' }}</p>
                <div class="book-meta"><strong>{{ book.wordCount.toLocaleString() }}</strong><span>个单词</span><span class="meta-divider" aria-hidden="true"></span><span :class="['plan-indicator', { active: book.studyEnabled }]">{{ book.studyEnabled ? '学习中' : '未加入计划' }}</span></div>
              </div>
            </div>
            <div class="book-progress">
              <div class="progress-label">
                <span>学习覆盖率 <small>已学习 {{ book.learnedCount ?? 0 }} / {{ book.wordCount }}</small></span>
                <strong :aria-label="'学习覆盖率 ' + book.learningCoverage + '%'">{{ book.learningCoverage }}%</strong>
              </div>
              <div class="progress-track" role="progressbar" :aria-valuenow="Math.min(100, Math.max(0, book.learningCoverage))" aria-valuemin="0" aria-valuemax="100" :aria-label="book.name + ' 学习覆盖率'">
                <span :style="{ width: Math.min(100, Math.max(0, book.learningCoverage)) + '%' }"></span>
              </div>
            </div>
            <div class="book-actions">
              <button class="open-book" type="button" @click="handleBookClick(book.id)">查看词书 <span aria-hidden="true">↗</span></button>
              <button class="plan-toggle" :class="{ enabled: book.studyEnabled }" type="button" :disabled="busyBookId === book.id" :aria-pressed="!!book.studyEnabled" @click="toggleBook(book)">
                {{ busyBookId === book.id ? '更新中…' : book.studyEnabled ? '✓ 已加入计划' : '＋ 加入计划' }}
              </button>
              <router-link v-if="book.studyEnabled" class="start-study-link" to="/english/vocab/study" aria-label="开始今日学习">今日学习 <span aria-hidden="true">→</span></router-link>
            </div>
          </article>
        </div>
      </section>
    </div>

    <el-dialog v-model="dialogVisible" title="新建单词本" width="min(92vw, 480px)" align-center>
      <el-form label-position="top" @submit.prevent="createBook">
        <el-form-item label="词书名称">
          <el-input v-model="newBookForm.name" maxlength="30" show-word-limit placeholder="例如：四级核心词汇" />
        </el-form-item>
        <el-form-item label="选择封面色">
          <div class="color-options" role="group" aria-label="选择封面颜色">
            <button v-for="(color, index) in presetColors" :key="color" class="color-circle" :class="{ active: newBookForm.color === color }" :style="{ background: color }" type="button" :aria-label="'封面颜色 ' + (index + 1)" :aria-pressed="newBookForm.color === color" @click="newBookForm.color = color">
              <span v-if="newBookForm.color === color" aria-hidden="true">✓</span>
            </button>
          </div>
        </el-form-item>
        <el-form-item label="选择封面纹样">
          <div class="icon-options" role="group" aria-label="选择封面图标">
            <button v-for="(icon, index) in presetIcons" :key="icon" class="icon-item" :class="{ active: newBookForm.icon === icon }" type="button" :aria-label="'封面纹样 ' + (index + 1)" :aria-pressed="newBookForm.icon === icon" @click="newBookForm.icon = icon"><BookEmblem :icon="icon" /></button>
          </div>
        </el-form-item>
        <div class="dialog-actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" native-type="submit" :loading="creatingBook" :disabled="!newBookForm.name.trim()" @click="createBook">创建词书</el-button>
        </div>
      </el-form>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeading from '@/components/PageHeading.vue'
import BookEmblem from '@/features/vocab/BookEmblem.vue'
import { createWordBook, getWordBooks, setStudyBookEnabled } from '@/features/vocab/api'
import type { WordBookVo } from '@/features/vocab/types'

type DisplayBook = WordBookVo & { color: string; icon: string }

const router = useRouter()
const dialogVisible = ref(false)
const creatingBook = ref(false)
const loadingBooks = ref(true)
const booksError = ref('')
const busyBookId = ref<string | null>(null)
const wordBooks = ref<DisplayBook[]>([])
const presetColors = [
  'linear-gradient(145deg, #355e49, #78917b)',
  'linear-gradient(145deg, #8b513f, #c98f71)',
  'linear-gradient(145deg, #555e75, #8d9bb0)',
  'linear-gradient(145deg, #937947, #c8ac70)',
  'linear-gradient(145deg, #775c72, #b494aa)',
  'linear-gradient(145deg, #536c71, #92aaab)'
]
const presetIcons = ['book', 'leaf', 'layers', 'compass', 'quote', 'pen', 'orbit', 'spark']
const newBookForm = ref({ name: '', color: presetColors[0]!, icon: presetIcons[0]! })

async function fetchWordBooks() {
  loadingBooks.value = true
  booksError.value = ''
  try {
    const response = await getWordBooks()
    if (response.code !== 0 || !response.data) throw new Error(response.msg || '请稍后重试。')
    wordBooks.value = response.data.map((book, index) => ({
      ...book,
      learningCoverage: book.learningCoverage ?? book.mastery ?? 0,
      color: book.color || presetColors[index % presetColors.length]!,
      icon: book.icon || presetIcons[index % presetIcons.length]!
    }))
  } catch (error: any) {
    booksError.value = error?.msg || error?.message || '请检查网络后重试。'
  } finally {
    loadingBooks.value = false
  }
}

async function toggleBook(book: DisplayBook) {
  if (busyBookId.value) return
  busyBookId.value = book.id
  try {
    await setStudyBookEnabled(book.id, !book.studyEnabled)
    book.studyEnabled = !book.studyEnabled
    ElMessage.success(book.studyEnabled ? '已加入学习计划，现在可以开始今日学习' : '已移出学习计划，历史记录保留')
  } catch (error: any) {
    ElMessage.error(error?.msg || '更新学习计划失败')
  } finally {
    busyBookId.value = null
  }
}

function handleBookClick(id: string) { void router.push('/english/vocab/book/' + id) }

async function createBook() {
  const name = newBookForm.value.name.trim()
  if (!name || creatingBook.value) return
  creatingBook.value = true
  try {
    const response = await createWordBook({ ...newBookForm.value, name })
    if (response.code !== 0) throw new Error(response.msg || '创建失败')
    dialogVisible.value = false
    newBookForm.value = { name: '', color: presetColors[0]!, icon: presetIcons[0]! }
    await fetchWordBooks()
    ElMessage.success('词书已创建')
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.message || '创建失败，请稍后重试')
  } finally {
    creatingBook.value = false
  }
}

onMounted(() => { void fetchWordBooks() })
</script>

<style scoped>
.vocab-page { --ink: #243b2d; --muted: #667469; --line: #dce2d7; min-height: 100vh; background: #f5f5ee; color: var(--ink); font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; }
button { font: inherit; cursor: pointer; }
.header-actions { display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
.header-progress { display:inline-flex; align-items:center; gap:12px; min-height:var(--xl-button-height); padding:0 15px; border:1px solid #b8cbb9; border-radius:var(--xl-button-radius); background:var(--xl-surface); color:var(--xl-brand); font-size:13px; font-weight:800; text-decoration:none; box-shadow:var(--xl-outline-shadow); transition:background-color .18s, border-color .18s, transform .18s, box-shadow .18s; }
.header-progress:hover { background:#edf3e9; border-color:#8eae93; transform:translateY(-2px); box-shadow:0 4px 0 #d7e2d5; }
.header-progress:active { transform:translateY(1px); box-shadow:none; }
.header-progress:focus-visible { outline:3px solid #dbaa53; outline-offset:3px; }
.header-create { border: 1px solid #315b3f; color: #315b3f; background: transparent; border-radius: 9px; padding: 10px 16px; font-weight: 700; }
.header-create:hover, .header-create:focus-visible { background: #e8efe6; }
.collection { margin-top: 0; }
.start-study-link { display: inline-flex; align-items: center; gap: 10px; margin-top: 14px; color: var(--xl-brand); font-size: 13px; font-weight: 800; text-decoration: none; }
.start-study-link:hover { text-decoration: underline; }
.start-study-link:focus-visible { outline: 3px solid var(--xl-accent); outline-offset: 3px; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 20px; }.book-card { background: #fffefa; border: 1px solid #e4e8dc; border-radius: 13px; overflow: hidden; transition: transform .2s, box-shadow .2s; }.book-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px #29463113; }
.book-cover { height: 116px; display: grid; place-items: center; color: white; position: relative; }.book-cover::after { content: ''; position: absolute; width: 185px; height: 185px; border: 1px solid #ffffff55; border-radius: 50%; right: -28px; top: -65px; }.book-icon { z-index: 1; font-size: 42px; line-height: 1; filter: drop-shadow(0 5px 10px #0003); }
.book-body { padding: 19px; }.book-title-row { display: flex; align-items: start; justify-content: space-between; gap: 8px; min-height: 42px; }.book-title-row h3 { font-size: 17px; line-height: 1.45; overflow-wrap: anywhere; }.book-count { white-space: nowrap; font-size: 12px; color: #607360; background: #eaf0e8; border-radius: 5px; padding: 5px 7px; }.plan-status { display: inline-block; margin: 0 0 10px; color: #315b40; font-size: 12px; font-weight: 750; }.progress-label { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin: 4px 0 10px; }.progress-label strong { color: var(--ink); }.progress-track { background: #e8ede5; height: 6px; border-radius: 99px; overflow: hidden; }.progress-track span { display: block; background: #638c69; height: 100%; border-radius: inherit; }.book-actions { display: flex; gap: 8px; margin-top: 19px; }.book-actions button { min-height: 42px; border-radius: 7px; font-size: 12px; font-weight: 750; }.open-book { flex: 1; border: 0; background: #315b40; color: white; text-align: left; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; }.open-book:hover { background: #224a32; }.open-book.quiet { flex: 0 0 auto; border: 1px solid #c8d5c8; background: transparent; color: #315b40; gap: 8px; }.open-book.quiet:hover { background: #eaf1e8; }.plan-toggle { border: 1px solid #315b40; background: #315b40; color: white; padding: 0 12px; }.plan-toggle:not(.enabled) { order: -1; flex: 1; }.plan-toggle.enabled { background: #eaf1e8; border-color: #c8d5c8; color: #3a6346; }.plan-toggle:not(.enabled):hover { background: #224a32; }.plan-toggle.enabled:hover { background: #deebdc; }.plan-toggle:disabled { opacity: .55; cursor: wait; }
.collection-state { background: #fffefa; border: 1px dashed #c9d4c5; text-align: center; padding: 54px 18px; border-radius: 13px; }.state-symbol { display: inline-grid; place-items: center; width: 62px; height: 62px; border-radius: 50%; color: #497252; background: #eaf1e8; font-size: 30px; }.collection-state h3 { margin: 16px 0 7px; font: 600 23px Georgia, 'Songti SC', serif; }.collection-state p { color: var(--muted); margin-bottom: 20px; }.collection-state button { border: 0; color: white; background: #315b40; padding: 11px 19px; border-radius: 7px; }.book-skeleton { height: 345px; border-radius: 13px; background: linear-gradient(100deg, #e8ede5 20%, #f8faf5 40%, #e8ede5 60%); background-size: 200% 100%; animation: shimmer 1.5s linear infinite; }@keyframes shimmer { to { background-position-x: -200%; } }
.color-options, .icon-options { display: flex; flex-wrap: wrap; gap: 10px; }.color-circle, .icon-item { width: 43px; height: 43px; display: grid; place-items: center; border: 2px solid transparent; border-radius: 8px; }.color-circle.active, .icon-item.active { outline: 2px solid #345f43; outline-offset: 2px; }.color-circle span { color: white; font-weight: 900; }.icon-item { font-size: 23px; background: #eef2eb; }.dialog-actions { display: flex; justify-content: end; gap: 8px; margin-top: 20px; }
.header-create, .book-actions button, .collection-state button { min-height: var(--xl-button-height); border-radius: var(--xl-button-radius); font-size: 13px; font-weight: 800; transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease; }
.header-create, .open-book.quiet, .plan-toggle.enabled { background: var(--xl-surface); border-color: #b8cbb9; color: var(--xl-brand); box-shadow: var(--xl-outline-shadow); }
.header-create:hover, .open-book.quiet:hover, .plan-toggle.enabled:hover { background: #edf3e9; border-color: #8eae93; transform: translateY(-2px); box-shadow: 0 4px 0 #d7e2d5; }
.open-book:not(.quiet), .plan-toggle:not(.enabled), .collection-state button { border: 1px solid #254c35; background: var(--xl-brand); box-shadow: var(--xl-button-shadow); }
.open-book:not(.quiet):hover, .plan-toggle:not(.enabled):hover, .collection-state button:hover { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.header-create:active, .book-actions button:active:not(:disabled), .collection-state button:active { transform: translateY(1px); box-shadow: none; }
.book-actions button:disabled { box-shadow: none; transform: none; }
button:focus-visible { outline: 3px solid #dbaa53; outline-offset: 3px; }
@media (max-width: 440px) { .header-create { padding: 9px 10px; font-size: 12px; }.header-progress { padding:0 10px; font-size:12px; }.book-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .book-card, .header-create, .header-progress, .book-actions button, .collection-state button { transition: none; }.book-card:hover, .header-create:hover, .header-progress:hover, .header-progress:active, .book-actions button:hover, .book-actions button:active, .collection-state button:hover { transform: none; }.book-skeleton { animation: none; } }

/* A quiet reading-room catalogue: paper cards and small cloth-bound covers. */
.collection { margin-top: 4px; }
.book-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.book-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 23px 24px 17px;
  border: 1px solid #dedfd3;
  border-radius: 17px;
  background: #fffefa;
  box-shadow: 0 3px 0 #e8e8de, 0 11px 32px #293b2b09;
  overflow: visible;
  animation: card-enter .46s backwards;
  animation-delay: calc(min(var(--card-index), 6) * 55ms);
}
.book-card:hover { transform: translateY(-4px); box-shadow: 0 5px 0 #e1e5d9, 0 20px 35px #293b2b16; }
.book-card-top { display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 23px; align-items: center; min-height: 168px; }
.book-cover {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 124px;
  height: 166px;
  padding: 13px 12px 12px 17px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  border-radius: 3px 9px 9px 3px;
  color: #f8f2e1;
  box-shadow: inset 4px 0 5px #00000026, inset -3px 0 0 #ffffff26, 4px 5px 0 #dcdccf, 7px 9px 15px #26372724;
  transform: rotate(-2deg);
  transition: transform .25s ease, box-shadow .25s ease;
}
.book-card:hover .book-cover { transform: translateY(-3px) rotate(0); box-shadow: inset 4px 0 5px #00000026, inset -3px 0 0 #ffffff26, 5px 7px 0 #dcdccf, 10px 15px 19px #2637272c; }
.book-cover::before { content: ''; position: absolute; inset: 0 auto 0 9px; border-left: 1px solid #ffffff4d; border-right: 1px solid #00000018; width: 3px; }
.book-cover::after { content: ''; position: absolute; inset: 19px 12px 19px 18px; width: auto; height: auto; border: 1px solid #ffffff5e; border-radius: 1px 5px 5px 1px; pointer-events: none; }
.cover-imprint, .cover-foot { z-index: 1; text-align: center; font: 600 7px/1.3 Georgia, serif; letter-spacing: .13em; white-space: nowrap; }
.cover-art { z-index: 1; align-self: center; width: 61px; height: 61px; opacity: .94; }
.book-summary { align-self: stretch; display: flex; flex-direction: column; min-width: 0; padding: 5px 0; }
.book-kind { color: #748272; font-size: 11px; letter-spacing: .08em; font-weight: 700; }
.book-kind span { padding: 0 4px; color: #b6bba9; }
.book-summary h3 { margin: 15px 0 7px; color: #263d2d; font: 600 clamp(19px, 2.1vw, 24px)/1.3 Georgia, 'Songti SC', serif; letter-spacing: -.02em; overflow-wrap: anywhere; }
.book-description { margin: 0; color: #788276; font-size: 12px; line-height: 1.55; }
.book-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; margin-top: auto; padding-top: 15px; color: #718072; font-size: 11px; }
.book-meta strong { color: #2c4432; font: 600 22px/1 Georgia, serif; }
.meta-divider { align-self: center; width: 1px; height: 11px; margin: 0 6px; background: #d6ded1; }
.plan-indicator { color: #879184; }
.plan-indicator.active { color: #39704b; }
.plan-indicator::before { content: ''; display: inline-block; width: 5px; height: 5px; margin: 0 5px 2px 0; border-radius: 50%; background: currentColor; }
.book-progress { margin-top: 22px; padding-top: 15px; border-top: 1px solid #e9e9e0; }
.progress-label { align-items: baseline; gap: 10px; margin: 0 0 10px; color: #415744; font-size: 12px; font-weight: 700; }
.progress-label small { margin-left: 8px; color: #879187; font-size: 11px; font-weight: 400; }
.progress-label strong { color: #315b40; font: 600 18px/1 Georgia, serif; }
.progress-track { height: 5px; background: #e8ece5; }
.progress-track span { background: #638b68; }
.book-actions { align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 19px; }
.book-actions button { min-height: 35px; border-radius: 7px; box-shadow: none !important; font-size: 11px; font-weight: 700; }
.open-book, .open-book:not(.quiet) { flex: 0 0 auto; gap: 15px; border: 1px solid #315b40; background: #315b40; color: #fffefa; padding: 0 12px; }
.open-book:hover, .open-book:not(.quiet):hover { background: #254b34; transform: translateY(-1px); }
.plan-toggle, .plan-toggle:not(.enabled), .plan-toggle.enabled { order: 0; flex: 0 0 auto; border: 1px solid #c7d7c8; background: #f4f8f1; color: #42684b; padding: 0 11px; }
.plan-toggle:hover, .plan-toggle:not(.enabled):hover, .plan-toggle.enabled:hover { background: #e9f0e6; transform: translateY(-1px); box-shadow: none; }
.plan-toggle.enabled { border-color: #e0e6d9; background: #f7f8f3; color: #55735b; }
.start-study-link { margin: 0 0 0 auto; gap: 6px; color: #315b40; font-size: 11px; white-space: nowrap; }
.icon-item { padding: 9px; color: #365942; background: #edf1e9; border: 1px solid #d9e3d8; }
.icon-item .book-emblem { width: 100%; height: 100%; }
.icon-item:hover { background: #e2ebdf; }
.color-circle { border-radius: 6px; }
@keyframes card-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 900px) { .book-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) {
  .book-card { padding: 18px 17px 16px; }
  .book-card-top { grid-template-columns: 99px minmax(0, 1fr); gap: 17px; min-height: 138px; }
  .book-cover { width: 99px; height: 134px; padding: 11px 9px 10px 14px; }
  .book-cover::after { inset: 16px 9px 16px 15px; }
  .cover-imprint, .cover-foot { font-size: 5.5px; }
  .cover-art { width: 49px; height: 49px; }
  .book-summary h3 { margin-top: 9px; font-size: 19px; }
  .book-description { font-size: 11px; }
  .book-meta { padding-top: 9px; }
  .book-meta strong { font-size: 19px; }
  .progress-label small { display: block; margin: 4px 0 0; }
  .start-study-link { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) { .book-card { animation: none; }.book-cover { transition: none; } }
</style>
