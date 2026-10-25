<template>
  <main class="book-page">
    <div class="page-shell xl-page-shell">
      <PageBreadcrumb :items="[
        { label: '首页', to: '/' },
        { label: '英语学习', to: '/english' },
        { label: '我的词书', to: '/english/vocab' },
        { label: bookName }
      ]" />

      <section class="book-hero" aria-labelledby="book-title">
        <div class="cover" aria-hidden="true">
          <span class="cover-top">XUELING / VOCABULARY</span>
          <span class="cover-letter">{{ bookName.charAt(0).toUpperCase() || 'W' }}</span>
          <span class="cover-bottom">WORDS & MEMORY</span>
        </div>
        <div class="hero-content">
          <div class="hero-meta">
            <span class="eyebrow">{{ bookType === 'SYSTEM' ? 'SYSTEM COLLECTION' : 'PERSONAL COLLECTION' }}</span>
            <span class="type-label">{{ bookType === 'SYSTEM' ? '系统词书' : '个人词书' }}</span>
          </div>
          <h1 id="book-title">{{ bookName }}</h1>
          <p class="hero-description">
            {{ studyEnabled ? '已加入每日学习计划。先完成到期复习，再认识新单词。' : learnedCount > 0 ? '本书独有单词已暂停计划复习，学习记录仍会保留。' : '将这本词书加入计划，每天循序渐进地学习。' }}
          </p>
          <div class="hero-stats" aria-label="词书学习数据">
            <div><strong>{{ totalWordCount }}</strong><span>收录单词</span></div>
            <div><strong>{{ learnedCount }}</strong><span>已学习</span></div>
            <div><strong>{{ Math.max(0, totalWordCount - learnedCount) }}</strong><span>未学习</span></div>
          </div>
          <div class="coverage-heading">
            <span>学习覆盖率 · 已学习 {{ learnedCount }} / {{ totalWordCount }}</span>
            <strong>{{ learningCoverage }}%</strong>
          </div>
          <div class="coverage-track" role="progressbar" :aria-valuenow="learningCoverage" aria-valuemin="0" aria-valuemax="100" aria-label="学习覆盖率">
            <span :style="{ width: learningCoverage + '%' }"></span>
          </div>
          <p class="coverage-note">学习覆盖率表示接触过的词，不代表已经掌握。</p>
          <div class="hero-actions">
            <button v-if="studyEnabled" class="primary-action" type="button" @click="router.push('/english/vocab/study')">
              进入今日学习 <span aria-hidden="true">↗</span>
            </button>
            <button v-else class="primary-action" type="button" :disabled="updatingPlan || loadingDetail || !!detailError" @click="togglePlan">
              {{ updatingPlan ? '正在加入…' : '＋ 加入学习计划' }}
            </button>
            <button v-if="studyEnabled" class="quiet-action" type="button" :disabled="updatingPlan" @click="togglePlan">
              {{ updatingPlan ? '正在更新…' : '移出学习计划' }}
            </button>
          </div>
        </div>
      </section>

      <section class="word-section" aria-labelledby="word-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">EXPLORE THE WORDS</p>
            <h2 id="word-title">词汇列表 <span>{{ totalWordCount }}</span></h2>
            <p>查找单词、听读音，也可以选取 5–10 词进行自由练习。</p>
          </div>
          <button v-if="bookType !== 'SYSTEM' && !loadingDetail && !detailError" class="add-button" type="button" @click="dialogVisible = true">＋ 添加单词</button>
        </div>

        <div class="list-panel">
          <div class="list-toolbar">
            <label class="search-field">
              <span class="sr-only">搜索单词或中文释义</span>
              <span aria-hidden="true">⌕</span>
              <input v-model="searchQuery" type="search" placeholder="搜索单词或中文释义" />
            </label>
            <span class="result-count" role="status">{{ searchQuery.trim() ? '找到 ' + filteredWords.length + ' 词' : '共 ' + words.length + ' 词' }}</span>
          </div>

          <div v-if="loadingDetail" class="content-state" role="status">
            <span class="state-symbol" aria-hidden="true">···</span>
            <h3>正在打开词书</h3>
            <p>单词列表加载中。</p>
          </div>
          <div v-else-if="detailError" class="content-state" role="alert">
            <span class="state-symbol" aria-hidden="true">↻</span>
            <h3>词书暂时没有加载出来</h3>
            <p>{{ detailError }}</p>
            <button type="button" @click="loadData">重新加载</button>
          </div>
          <div v-else-if="filteredWords.length === 0" class="content-state">
            <span class="state-symbol" aria-hidden="true">{{ searchQuery.trim() ? '⌕' : '＋' }}</span>
            <h3>{{ searchQuery.trim() ? '没有找到匹配的单词' : '这本词书还没有单词' }}</h3>
            <p>{{ searchQuery.trim() ? '试试其他拼写或中文释义。' : bookType === 'SYSTEM' ? '这本词书目前没有可展示的单词。' : '添加想记住的单词，建立自己的词库。' }}</p>
            <button v-if="searchQuery.trim()" type="button" @click="searchQuery = ''">清除搜索</button>
            <button v-else-if="bookType !== 'SYSTEM'" type="button" @click="dialogVisible = true">添加单词</button>
          </div>
          <template v-else>
            <div class="word-table-heading" aria-hidden="true">
              <span>选择 / 单词</span><span>音标</span><span>释义</span><span>操作</span>
            </div>
            <ul class="word-list" aria-label="单词列表">
              <li v-for="word in pagedWords" :key="word.id" class="word-row">
                <label class="word-select">
                  <input type="checkbox" :checked="selectedIds.has(word.id)" :disabled="selectedIds.size >= 10 && !selectedIds.has(word.id)" :aria-label="'选择 ' + word.word + ' 进行自由练习'" @change="toggleSelection(word.id)" />
                  <strong>{{ word.word }}</strong>
                </label>
                <span class="phonetic">{{ word.phonetic ? '/' + word.phonetic + '/' : '—' }}</span>
                <span class="meaning">{{ word.meaning }}</span>
                <div class="word-actions">
                  <button type="button" class="audio-button" :aria-label="'播放 ' + word.word + ' 的读音'" @click="playWordAudio(word.word)">♫</button>
                  <button v-if="bookType !== 'SYSTEM'" type="button" class="remove-button" :aria-label="'从词书移除 ' + word.word" @click="deleteWord(word)">移除</button>
                </div>
              </li>
            </ul>
            <div v-if="pageCount > 1" class="pagination">
              <span>第 {{ currentPage }} / {{ pageCount }} 页</span>
              <label class="page-jump">跳转到 <input type="number" min="1" :max="pageCount" :value="currentPage" @change="jumpToPage" /> 页</label>
              <div>
                <button type="button" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
                <button type="button" :disabled="currentPage === pageCount" @click="changePage(currentPage + 1)">下一页</button>
              </div>
            </div>
          </template>
        </div>

        <div class="practice-note">
          <div>
            <strong>想自主巩固一组词？</strong>
            <p>勾选列表中的 5–10 词，或按词书顺序选择一组。自由练习不计入每日计划。</p>
          </div>
          <button type="button" :disabled="words.length < 5 || loadingDetail || !!detailError" @click="reviewDialogVisible = true">按顺序选组 ↗</button>
        </div>
      </section>
    </div>

    <div v-if="selectedIds.size > 0" class="selection-bar">
      <div>
        <strong>已选 {{ selectedIds.size }} / 10 词</strong>
        <span aria-live="polite">{{ selectedIds.size < 5 ? '还需 ' + (5 - selectedIds.size) + ' 词即可练习' : '可以开始自由练习' }}</span>
      </div>
      <div class="selection-actions">
        <button type="button" class="clear-selection" @click="clearSelection">清空</button>
        <button type="button" class="begin-practice" :disabled="selectedIds.size < 5" @click="startSelectedReview">开始自由练习 ↗</button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="批量添加单词" width="min(92vw, 600px)" align-center :close-on-click-modal="false" @closed="resetDialog">
      <div v-if="!isAnalyzed" class="batch-step">
        <p>输入要添加的英文单词，使用逗号、中文逗号或换行分隔。一次最多 20 词。</p>
        <el-input v-model="batchInput" type="textarea" :rows="7" placeholder="例如：apple, banana, orange" resize="vertical" />
        <span class="input-count">{{ inputWords.length }} / 20 词</span>
        <p v-if="inputWords.length > 20" class="input-error" role="alert">超过 20 词，请删减后再匹配。</p>
      </div>
      <div v-else class="batch-step">
        <div class="match-header">
          <strong>匹配到 {{ batchList.length }} 词</strong>
          <button type="button" @click="isAnalyzed = false">返回修改</button>
        </div>
        <p v-if="unmatchedWords.length" class="match-warning">未匹配：{{ unmatchedWords.join('、') }}</p>
        <ul v-if="batchList.length" class="match-list">
          <li v-for="item in batchList" :key="item.id">
            <div><strong>{{ item.word }}</strong><span>{{ item.meaning }}</span></div>
            <button type="button" :aria-label="'移除 ' + item.word" @click="removeBatchItem(item.id)">移除</button>
          </li>
        </ul>
        <p v-else class="no-match">没有可添加的匹配单词，请返回修改输入。</p>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="!isAnalyzed" type="primary" :loading="isAnalyzing" :disabled="inputWords.length === 0 || inputWords.length > 20" @click="analyzeWords">匹配单词</el-button>
        <el-button v-else type="primary" :loading="isSaving" :disabled="batchList.length === 0" @click="saveWords">确认添加 {{ batchList.length }} 词</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewDialogVisible" title="选择自由练习组别" width="min(92vw, 560px)" align-center>
      <p class="group-intro">每组最多 10 词，至少 5 词可练习。自由练习不计入每日计划。</p>
      <div class="group-list">
        <button v-for="group in reviewGroups" :key="group.index" type="button" :disabled="!group.isValid" @click="startReviewWithWords(group.list)">
          <span><strong>{{ group.label }}</strong><small>词书序号 {{ group.range }}</small></span>
          <span>{{ group.isValid ? group.count + ' 词 ↗' : '词数不足' }}</span>
        </button>
      </div>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { matchWords, getWordBookDetail, addWordsToBook, removeWordsFromBook, setStudyBookEnabled } from '@/features/vocab/api'
import type { WordDictionary, WordVO } from '@/features/vocab/types'
import { useReviewStore } from '@/features/vocab/reviewStore'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import { cancelEnglishWord, speakEnglishWord } from '@/utils/wordSpeech'

const route = useRoute()
const router = useRouter()
const reviewStore = useReviewStore()
const bookId = computed(() => String(route.params.id || ''))
const bookName = ref('词书详情')
const bookType = ref<'SYSTEM' | 'USER'>('USER')
const totalWordCount = ref(0)
const learnedCount = ref(0)
const coverageValue = ref(0)
const learningCoverage = computed(() => Math.min(100, Math.max(0, coverageValue.value)))
const studyEnabled = ref(false)
const words = ref<WordVO[]>([])
const loadingDetail = ref(true)
const detailError = ref('')
const updatingPlan = ref(false)
const searchQuery = ref('')
const selectedIds = ref(new Set<string>())
const currentPage = ref(1)
const pageSize = 50
let loadSequence = 0

const filteredWords = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return words.value
  return words.value.filter(item =>
    item.word.toLocaleLowerCase().includes(query) ||
    (item.meaning || '').toLocaleLowerCase().includes(query)
  )
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredWords.value.length / pageSize)))
const pagedWords = computed(() => filteredWords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const selectedWords = computed(() => words.value.filter(word => selectedIds.value.has(word.id)))

watch(searchQuery, () => { currentPage.value = 1 })
watch(() => route.params.id, () => {
  bookName.value = '词书详情'
  bookType.value = 'USER'
  totalWordCount.value = 0
  learnedCount.value = 0
  coverageValue.value = 0
  studyEnabled.value = false
  words.value = []
  searchQuery.value = ''
  selectedIds.value = new Set()
  currentPage.value = 1
  void loadData()
}, { immediate: true })

async function loadData() {
  if (!bookId.value) return
  const sequence = ++loadSequence
  loadingDetail.value = true
  detailError.value = ''
  try {
    const response = await getWordBookDetail(bookId.value)
    if (sequence !== loadSequence) return
    if (response.code !== 0 || !response.data) throw new Error(response.msg || '请稍后重试。')
    const detail = response.data
    bookName.value = detail.name
    bookType.value = detail.bookType || 'USER'
    words.value = detail.wordList || []
    totalWordCount.value = detail.wordCount ?? words.value.length
    learnedCount.value = detail.learnedCount ?? 0
    coverageValue.value = detail.learningCoverage ?? detail.mastery ?? 0
    studyEnabled.value = !!detail.studyEnabled
    selectedIds.value = new Set([...selectedIds.value].filter(id => words.value.some(word => word.id === id)))
    currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(filteredWords.value.length / pageSize)))
  } catch (error: any) {
    if (sequence !== loadSequence) return
    detailError.value = error?.msg || error?.message || '请检查网络后重试。'
  } finally {
    if (sequence === loadSequence) loadingDetail.value = false
  }
}

async function togglePlan() {
  if (updatingPlan.value || !bookId.value) return
  updatingPlan.value = true
  const nextEnabled = !studyEnabled.value
  try {
    const response = await setStudyBookEnabled(bookId.value, nextEnabled)
    if (response.code !== 0) throw new Error(response.msg || '更新学习计划失败')
    studyEnabled.value = nextEnabled
    ElMessage.success(nextEnabled ? '已加入学习计划' : '已移出学习计划，历史记录保留')
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.message || '更新学习计划失败')
  } finally {
    updatingPlan.value = false
  }
}

function toggleSelection(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else if (next.size < 10) next.add(id)
  selectedIds.value = next
}
function clearSelection() { selectedIds.value = new Set() }
function changePage(page: number) {
  currentPage.value = Math.min(pageCount.value, Math.max(1, page))
  document.querySelector('#word-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function jumpToPage(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) changePage(Math.trunc(value))
}
function playWordAudio(word: string) {
  if (!speakEnglishWord(word, message => ElMessage.warning(message))) {
    ElMessage.warning('当前浏览器不支持网页语音，请尝试系统浏览器')
  }
}
onUnmounted(cancelEnglishWord)

function startReviewWithWords(list: WordVO[]) {
  if (list.length < 5 || list.length > 10) return
  reviewStore.setReviewData(list.map(word => word.id), bookName.value)
  reviewDialogVisible.value = false
  void router.push('/english/vocab/review/' + bookId.value)
}
function startSelectedReview() { startReviewWithWords(selectedWords.value) }

const reviewDialogVisible = ref(false)
const reviewGroups = computed(() => {
  const groups = []
  for (let index = 0; index < words.value.length; index += 10) {
    const list = words.value.slice(index, index + 10)
    groups.push({
      index,
      label: '第 ' + (Math.floor(index / 10) + 1) + ' 组',
      range: (index + 1) + '–' + (index + list.length),
      count: list.length,
      list,
      isValid: list.length >= 5
    })
  }
  return groups
})

const dialogVisible = ref(false)
const batchInput = ref('')
const batchList = ref<WordDictionary[]>([])
const isAnalyzed = ref(false)
const isAnalyzing = ref(false)
const isSaving = ref(false)
const inputWords = computed(() => {
  const unique = new Map<string, string>()
  batchInput.value.split(/[,，\n]+/).map(word => word.trim()).filter(Boolean).forEach(word => {
    const key = word.toLocaleLowerCase()
    if (!unique.has(key)) unique.set(key, word)
  })
  return [...unique.values()]
})
const matchedWords = ref<string[]>([])
const unmatchedWords = computed(() => {
  const matched = new Set(matchedWords.value)
  return inputWords.value.filter(word => !matched.has(word.toLocaleLowerCase()))
})

async function analyzeWords() {
  if (isAnalyzing.value) return
  if (inputWords.value.length > 20) {
    ElMessage.warning('一次最多添加 20 个单词')
    return
  }
  if (!inputWords.value.length) return
  isAnalyzing.value = true
  try {
    const response = await matchWords(inputWords.value.join(','))
    if (response.code !== 0) throw new Error(response.msg || '匹配失败')
    batchList.value = response.data || []
    matchedWords.value = batchList.value.map(item => item.word.toLocaleLowerCase())
    isAnalyzed.value = true
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.message || '匹配失败，请稍后重试')
  } finally {
    isAnalyzing.value = false
  }
}
function removeBatchItem(id: string) { batchList.value = batchList.value.filter(item => item.id !== id) }
async function saveWords() {
  if (isSaving.value || !batchList.value.length || !bookId.value) return
  isSaving.value = true
  try {
    const response = await addWordsToBook({ wordBookId: bookId.value, wordIds: batchList.value.map(item => String(item.id)) })
    if (response.code !== 0) throw new Error(response.msg || '添加失败')
    dialogVisible.value = false
    await loadData()
    ElMessage.success('已添加单词')
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.message || '添加失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}
function resetDialog() {
  batchInput.value = ''
  batchList.value = []
  matchedWords.value = []
  isAnalyzed.value = false
  isAnalyzing.value = false
}
async function deleteWord(word: WordVO) {
  try {
    await ElMessageBox.confirm('确定从这本词书移除 “' + word.word + '” 吗？', '移除单词', {
      confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  try {
    const response = await removeWordsFromBook({ wordBookId: bookId.value, wordIds: [word.id] })
    if (response.code !== 0) throw new Error(response.msg || '移除失败')
    await loadData()
    ElMessage.success('已从词书移除')
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.message || '移除失败，请稍后重试')
  }
}
</script>

<style scoped>
.book-page { --ink: #243b2d; --muted: #667469; --line: #dce2d7; --green: #244b35; min-height: 100vh; background: #f5f5ee; color: var(--ink); font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; }
.page-shell { padding-bottom: 128px; }
button { font: inherit; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .5; }
button:focus-visible, input:focus-visible { outline: 3px solid #bd914d; outline-offset: 3px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.book-hero { display: grid; grid-template-columns: minmax(230px, 310px) minmax(0, 1fr); gap: clamp(28px, 6vw, 84px); align-items: stretch; padding: 36px 0 60px; }
.cover { min-height: 350px; padding: 23px; box-sizing: border-box; border-radius: 8px 17px 17px 8px; color: #f6f0df; background: linear-gradient(145deg, #315e43, #244b35 64%, #163a2a); box-shadow: 9px 15px 0 #d6ddce, 20px 25px 35px #244b3524; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
.cover::after { content: ''; position: absolute; width: 290px; height: 290px; border: 1px solid #ffffff32; border-radius: 50%; right: -95px; top: 23px; }
.cover::before { content: ''; position: absolute; inset: 0 auto 0 9px; border-left: 1px solid #f6f0df40; }
.cover-top, .cover-bottom { font: 700 10px Georgia, serif; letter-spacing: .2em; z-index: 1; }
.cover-letter { font: italic clamp(115px, 14vw, 180px)/1 Georgia, 'Songti SC', serif; text-align: center; color: #ebd39b; z-index: 1; }
.hero-content { align-self: center; padding: 10px 0; }
.hero-meta { display: flex; align-items: center; gap: 13px; }
.eyebrow { margin: 0; font-size: 11px; letter-spacing: .18em; font-weight: 800; color: #6f8c70; }
.type-label { border: 1px solid #cbd9c8; border-radius: 99px; padding: 4px 10px; color: #45684b; background: #eaf1e7; font-size: 12px; }
.hero-content h1 { font: 600 clamp(36px, 4.8vw, 62px)/1.14 Georgia, 'Songti SC', serif; letter-spacing: -.04em; margin: 18px 0 14px; overflow-wrap: anywhere; }
.hero-description { color: var(--muted); line-height: 1.7; margin: 0; }
.hero-stats { display: flex; gap: clamp(22px, 4vw, 56px); padding: 27px 0 25px; margin-top: 20px; border-top: 1px solid var(--line); }
.hero-stats div { display: flex; flex-direction: column; gap: 6px; }
.hero-stats strong { font: 500 clamp(28px, 3vw, 38px)/1 Georgia, serif; }
.hero-stats span { color: var(--muted); font-size: 12px; }
.coverage-heading { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: #516554; }
.coverage-heading strong { color: var(--green); }
.coverage-track { height: 8px; border-radius: 99px; background: #dce6d8; overflow: hidden; margin-top: 10px; }
.coverage-track span { display: block; height: 100%; background: #557d58; border-radius: inherit; transition: width .3s; }
.coverage-note { font-size: 12px; color: #7b887c; margin: 9px 0 0; }
.hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 18px; margin-top: 26px; }
.primary-action { background: #edc982; color: #26402c; border: 0; border-radius: 9px; padding: 14px 20px; min-height: 48px; font-weight: 800; }
.primary-action:hover:not(:disabled) { background: #f3d69e; }
.primary-action span { margin-left: 24px; }
.quiet-action { color: #4d6c51; background: transparent; border: 0; padding: 12px 2px; font-weight: 650; }
.quiet-action:hover { text-decoration: underline; }
.word-section { border-top: 1px solid var(--line); padding-top: 48px; }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 24px; }
.section-heading h2 { font: 600 32px/1.2 Georgia, 'Songti SC', serif; margin: 8px 0 9px; }
.section-heading h2 span { color: #9bad98; font: 500 18px Georgia, serif; margin-left: 7px; vertical-align: top; }
.section-heading p:last-child { color: var(--muted); font-size: 13px; margin: 0; line-height: 1.6; }
.add-button { border: 1px solid #315b3f; color: #315b3f; background: transparent; border-radius: 9px; padding: 11px 16px; font-weight: 700; white-space: nowrap; }
.add-button:hover { background: #e8efe6; }
.list-panel { background: #fffefa; border: 1px solid #e4e8dc; border-radius: 14px; }
.list-toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; border-bottom: 1px solid #e7ebdf; border-radius: 14px 14px 0 0; background: #fffefa; }
.search-field { display: flex; align-items: center; gap: 8px; width: min(100%, 390px); height: 42px; box-sizing: border-box; padding: 0 13px; border: 1px solid #d9e2d5; border-radius: 8px; background: #f8f9f3; }
.search-field:focus-within { border-color: #587a5c; }
.search-field span:not(.sr-only) { font-size: 25px; color: #78917b; line-height: 1; }
.search-field input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 14px; }
.result-count { color: var(--muted); font-size: 13px; white-space: nowrap; }
.word-table-heading, .word-row { display: grid; grid-template-columns: minmax(170px, 1.2fr) minmax(125px, .8fr) minmax(180px, 2fr) 116px; gap: 18px; align-items: center; }
.word-table-heading { padding: 12px 22px; font-size: 11px; font-weight: 800; letter-spacing: .06em; color: #859387; background: #f7f8f2; }
.word-table-heading span:last-child { text-align: right; }
.word-list, .match-list { list-style: none; margin: 0; padding: 0; }
.word-row { padding: 14px 22px; min-height: 56px; border-top: 1px solid #eef0e8; }
.word-row:hover { background: #f9faf5; }
.word-select { display: flex; align-items: center; gap: 13px; min-width: 0; cursor: pointer; }
.word-select input { width: 18px; height: 18px; flex: none; accent-color: #315b40; cursor: pointer; }
.word-select strong { font: 600 18px Georgia, serif; color: #254330; overflow-wrap: anywhere; }
.phonetic { color: #718175; font-size: 13px; overflow-wrap: anywhere; }
.meaning { color: #3c5140; font-size: 14px; line-height: 1.55; white-space: pre-line; overflow-wrap: anywhere; }
.word-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.audio-button { width: 44px; height: 44px; border: 1px solid #cbdacb; color: #315b40; background: #f0f6ef; border-radius: 50%; font-size: 17px; }
.audio-button:hover { background: #dcebdc; }
.remove-button { border: 0; background: transparent; color: #9c5f53; padding: 8px; font-size: 12px; }
.remove-button:hover { text-decoration: underline; }
.pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 22px; border-top: 1px solid #e7ebdf; color: var(--muted); font-size: 13px; }
.pagination div { display: flex; gap: 8px; }
.page-jump { display: flex; align-items: center; gap: 6px; }
.page-jump input { width: 52px; height: 34px; box-sizing: border-box; border: 1px solid #d9e2d5; border-radius: 7px; background: #fff; color: var(--ink); text-align: center; font: inherit; }
.pagination button { min-height: 36px; padding: 6px 12px; background: #f7f9f2; border: 1px solid #d9e2d5; border-radius: 7px; color: #315b40; }
.pagination button:hover:not(:disabled) { background: #e7efe4; }
.content-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 70px 20px; }
.state-symbol { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: #eaf1e8; color: #315b40; font-size: 29px; }
.content-state h3 { font: 600 23px Georgia, 'Songti SC', serif; margin: 18px 0 6px; }
.content-state p { max-width: 440px; margin: 0; color: var(--muted); line-height: 1.6; }
.content-state button { margin-top: 18px; padding: 9px 16px; background: transparent; border: 1px solid #315b40; border-radius: 8px; color: #315b40; font-weight: 700; }
.practice-note { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 4px; }
.practice-note strong { font-size: 15px; }
.practice-note p { color: var(--muted); font-size: 13px; margin: 6px 0 0; line-height: 1.6; }
.practice-note button { border: 0; background: transparent; color: #315b40; font-weight: 750; white-space: nowrap; padding: 12px; }
.practice-note button:hover:not(:disabled) { text-decoration: underline; }
.selection-bar { position: fixed; z-index: 20; left: 50%; bottom: 24px; transform: translateX(-50%); width: min(720px, calc(100vw - 32px)); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 15px 13px 22px; border: 1px solid #42634b; border-radius: 12px; background: #244b35; color: #fffdf3; box-shadow: 0 16px 38px #1f362b35; }
.selection-bar > div:first-child { display: flex; flex-direction: column; gap: 3px; }
.selection-bar span { color: #c7d9c6; font-size: 12px; }
.selection-actions { display: flex; align-items: center; gap: 10px; }
.clear-selection { color: #e6f0e3; background: transparent; border: 0; padding: 10px; }
.begin-practice { color: #26402c; background: #edc982; border: 0; border-radius: 8px; padding: 11px 15px; font-weight: 800; white-space: nowrap; }
.begin-practice:hover:not(:disabled) { background: #f4d99e; }
.primary-action, .add-button, .content-state button, .pagination button, .begin-practice { min-height: var(--xl-button-height); border-radius: var(--xl-button-radius); font-weight: 800; transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease; }
.primary-action { border: 1px solid #254c35; background: var(--xl-brand); color: white; box-shadow: var(--xl-button-shadow); }
.primary-action:hover:not(:disabled) { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.add-button, .content-state button, .pagination button { background: var(--xl-surface); border: 1px solid #b8cbb9; color: var(--xl-brand); box-shadow: var(--xl-outline-shadow); }
.add-button:hover, .content-state button:hover, .pagination button:hover:not(:disabled) { background: #edf3e9; border-color: #8eae93; transform: translateY(-2px); box-shadow: 0 4px 0 #d7e2d5; }
.begin-practice { border: 1px solid #d7ae68; box-shadow: var(--xl-gold-shadow); }
.begin-practice:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 0 #b48543, 0 12px 20px rgba(20, 38, 27, .2); }
.primary-action:active:not(:disabled), .add-button:active, .content-state button:active, .pagination button:active:not(:disabled), .begin-practice:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
.primary-action:disabled, .pagination button:disabled, .begin-practice:disabled { box-shadow: none; transform: none; }
.batch-step > p { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0 0 14px; }
.input-count { display: block; text-align: right; margin-top: 8px; font-size: 12px; color: var(--muted); }
.batch-step .input-error { margin: 8px 0 0; color: #a34e43; }
.match-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.match-header button, .match-list button { border: 0; background: transparent; color: #315b40; font-size: 13px; }
.batch-step .match-warning { color: #9c5f53; background: #fbf0ea; border-radius: 7px; padding: 10px 12px; }
.match-list { max-height: 340px; overflow: auto; }
.match-list li { display: flex; justify-content: space-between; align-items: center; gap: 15px; border-bottom: 1px solid #edf0e8; padding: 12px 2px; }
.match-list li div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.match-list li span { color: var(--muted); font-size: 12px; }
.no-match { padding: 25px 0; }
.group-intro { margin: 0 0 15px; color: var(--muted); font-size: 13px; line-height: 1.6; }
.group-list { display: grid; gap: 8px; max-height: 430px; overflow: auto; }
.group-list button { display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; border: 1px solid #dce7da; border-radius: 9px; background: #f8faf5; color: #315b40; padding: 13px 15px; }
.group-list button:hover:not(:disabled) { background: #e9f1e7; }
.group-list button span:first-child { display: flex; flex-direction: column; gap: 4px; }
.group-list small { color: var(--muted); }
@media (max-width: 800px) {
  .book-hero { grid-template-columns: 190px minmax(0, 1fr); gap: 36px; }
  .cover { min-height: 275px; }
  .word-table-heading, .word-row { grid-template-columns: minmax(145px, 1fr) minmax(105px, .8fr) minmax(160px, 1.5fr) 105px; gap: 10px; }
}
@media (max-width: 640px) {
  .page-shell { padding-bottom: 146px; }
  .book-hero { display: block; padding: 20px 0 36px; }
  .cover { display: none; }
  .hero-content h1 { font-size: 40px; margin-top: 16px; }
  .hero-stats { margin-top: 12px; gap: 30px; }
  .hero-actions { gap: 12px; }
  .word-section { padding-top: 32px; }
  .section-heading { align-items: start; }
  .section-heading h2 { font-size: 28px; }
  .section-heading p:last-child { max-width: 245px; }
  .add-button { padding: 9px 10px; font-size: 12px; }
  .list-toolbar { padding: 14px; }
  .word-table-heading { display: none; }
  .word-row { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 15px 14px; }
  .word-select { grid-column: 1; }
  .phonetic { grid-column: 1; padding-left: 31px; }
  .meaning { grid-column: 1 / -1; padding-left: 31px; grid-row: 3; }
  .word-actions { grid-column: 2; grid-row: 1 / 3; }
  .remove-button { display: block; }
  .pagination { flex-wrap: wrap; }
  .practice-note { align-items: start; flex-direction: column; gap: 8px; }
  .practice-note button { padding-left: 0; }
  .selection-bar { bottom: 0; left: 0; transform: none; width: 100%; border-radius: 12px 12px 0 0; padding: 12px 16px max(12px, env(safe-area-inset-bottom)); }
  .selection-bar span { max-width: 150px; }
  .begin-practice { padding: 10px; font-size: 12px; }
}
@media (max-width: 390px) {
  .section-heading { flex-direction: column; gap: 12px; }
  .selection-bar { align-items: stretch; }
  .selection-actions { gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .coverage-track span { transition: none; }
  *, *::before, *::after { scroll-behavior: auto !important; }
}
</style>
