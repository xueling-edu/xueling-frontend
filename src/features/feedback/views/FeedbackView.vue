<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import { useUserStore } from '@/stores/user'
import { createRequestId } from '@/utils/requestId'
import { createFeedback, getMyFeedback } from '../api'
import { categoryLabels, statusLabels } from '../types'
import type { CreateFeedback, Feedback, FeedbackCategory } from '../types'

type Tab = 'write' | 'mine'
const userStore = useUserStore()
const route = useRoute()
const tab = ref<Tab>('write')
const categories: { value: FeedbackCategory; hint: string; mark: string }[] = [
  { value: 'FUNCTION_ISSUE', hint: '哪里没按预期工作？', mark: '01' },
  { value: 'FEATURE_IDEA', hint: '想让学灵多做什么？', mark: '02' },
  { value: 'EXPERIENCE', hint: '哪些地方可以更顺手？', mark: '03' },
  { value: 'OTHER', hint: '也欢迎聊聊其他想法', mark: '04' },
]
const placeholders: Record<FeedbackCategory, string> = {
  FUNCTION_ISSUE: '例如：在单词复习页点击“认识”后，页面没有进入下一张卡片……',
  FEATURE_IDEA: '例如：希望每天学习结束后，可以回顾今天最难记住的单词……',
  EXPERIENCE: '例如：阅读页面的字号如果可以再大一些，会更容易专注……',
  OTHER: '把你的想法写在这里，我们会认真看。',
  TRANSLATION: '请描述翻译问题。',
}
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const userId = computed(() => userStore.userInfo?.id)
const draftKey = computed(() => userId.value ? `xueling-feedback-draft:${userId.value}` : null)
const form = reactive<CreateFeedback>({
  requestId: createRequestId(),
  category: 'FEATURE_IDEA',
  content: '',
  contact: '',
  sourcePage: '',
})
const submitting = ref(false)
const receipt = ref<Feedback | null>(null)
const mine = ref<Feedback[]>([])
const minePage = ref(1)
const mineHasMore = ref(false)
const mineLoading = ref(false)
const mineLoaded = ref(false)

watch(form, () => {
  if (submitting.value || receipt.value || !draftKey.value) return
  if (!form.content.trim() && !(form.contact ?? '').trim()) {
    removeDraft()
    return
  }
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({ savedAt: Date.now(), form }))
  } catch { /* Keep the unsent draft in memory when storage is unavailable. */ }
}, { deep: true })

function removeDraft() {
  if (!draftKey.value) return
  try { localStorage.removeItem(draftKey.value) } catch { /* The form remains usable. */ }
}

watch(userId, () => {
  form.requestId = createRequestId()
  form.category = 'FEATURE_IDEA'
  form.content = ''
  form.contact = ''
  form.sourcePage = ''
  receipt.value = null
  mine.value = []
  mineLoaded.value = false
  if (!draftKey.value) return
  try {
    const raw = localStorage.getItem(draftKey.value)
    if (raw) {
      const entry = JSON.parse(raw) as { savedAt?: number; form?: Partial<CreateFeedback> } & Partial<CreateFeedback>
      // 旧版草稿已有用户专属键，首次读取时迁移并从此开始计算保留期。
      const legacy = !('form' in entry)
      const saved = legacy ? entry : entry.form
      const savedAt = legacy ? Date.now() : entry.savedAt
      if (!Number.isFinite(savedAt) || savedAt! > Date.now()
        || Date.now() - savedAt! > DRAFT_MAX_AGE_MS || !saved
        || typeof saved.requestId !== 'string'
        || !categories.some(item => item.value === saved.category)) {
        removeDraft()
        return
      }
      if (saved) {
        form.requestId = saved.requestId
        form.category = saved.category!
        form.content = saved.content ?? ''
        form.contact = saved.contact ?? ''
        form.sourcePage = saved.sourcePage ?? ''
        if (legacy) localStorage.setItem(draftKey.value, JSON.stringify({ savedAt, form }))
      }
    }
  } catch {
    removeDraft()
  }
}, { immediate: true })

onMounted(() => {
  const from = route.query.from
  if (!form.sourcePage && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) form.sourcePage = from
})

async function changeTab(next: Tab) {
  tab.value = next
  if (next === 'mine' && !mineLoaded.value) await loadMine(true)
}

async function submit() {
  const content = form.content.trim()
  if (content.length < 5) return ElMessage.warning('请至少写 5 个字，方便我们了解你的想法')
  if (content.length > 2000) return ElMessage.warning('反馈内容不能超过 2000 字')
  if ((form.contact ?? '').trim().length > 100) return ElMessage.warning('联系方式不能超过 100 字')
  if (submitting.value) return
  submitting.value = true
  try {
    const response = await createFeedback({
      requestId: form.requestId,
      category: form.category,
      content,
      contact: form.contact?.trim() || undefined,
      sourcePage: form.sourcePage || undefined,
    })
    receipt.value = response.data
    removeDraft()
    form.requestId = createRequestId()
    form.content = ''
    form.contact = ''
    form.sourcePage = ''
    mineLoaded.value = false
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.response?.data?.msg || '暂时没有送达，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function loadMine(reset = false) {
  if (mineLoading.value) return
  mineLoading.value = true
  const page = reset ? 1 : minePage.value
  try {
    const items = (await getMyFeedback(page)).data
    mine.value = reset ? items : [...mine.value, ...items]
    minePage.value = page + 1
    mineHasMore.value = items.length === 20
    mineLoaded.value = true
  } catch (error: any) {
    ElMessage.error(error?.msg || '反馈记录加载失败')
  } finally {
    mineLoading.value = false
  }
}

function newFeedback() {
  receipt.value = null
  tab.value = 'write'
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }) : ''
}
</script>

<template>
  <main class="feedback-page">
    <div class="xl-page-shell">
      <PageHeading :items="[{ label: '首页', to: '/' }, { label: '意见反馈' }]" title="意见反馈" description="你遇到的问题和想到的点子，都能让学灵变得更好。">
        <template #mark>✎</template>
      </PageHeading>

      <div class="feedback-layout">
        <aside class="intro-card">
          <p class="eyebrow">A NOTE TO XUELING</p>
          <h2>把想法<br />留在这里<span>。</span></h2>
          <p class="intro-copy">一条具体的反馈，可能就是下一次改进的起点。你写的每一条，我们都会认真看。</p>
          <div class="paper-lines" aria-hidden="true"><i></i><i></i><i></i></div>
          <p class="intro-foot">学灵 · 与你一起把学习变得顺手</p>
        </aside>

        <section class="workspace-card" aria-label="反馈工作区">
          <div class="tabs" role="tablist" aria-label="反馈分类">
            <button type="button" role="tab" :aria-selected="tab === 'write'" :class="{ active: tab === 'write' }" @click="changeTab('write')">写反馈</button>
            <button type="button" role="tab" :aria-selected="tab === 'mine'" :class="{ active: tab === 'mine' }" @click="changeTab('mine')">我的反馈</button>
          </div>

          <div v-if="tab === 'write'" class="panel">
            <div v-if="receipt" class="receipt" role="status">
              <span class="receipt-stamp" aria-hidden="true">✓</span>
              <p class="eyebrow">FEEDBACK RECEIVED</p>
              <h2>收到啦，谢谢你。</h2>
              <p>你的反馈已送达，编号 <strong>#{{ receipt.id }}</strong>。处理进展会出现在“我的反馈”里。</p>
              <div class="receipt-actions">
                <el-button type="primary" @click="changeTab('mine')">查看进度</el-button>
                <el-button @click="newFeedback">再写一条</el-button>
              </div>
            </div>
            <template v-else>
              <div class="panel-heading"><span class="step">01 / 选择类型</span><h2>这次想告诉我们什么？</h2></div>
              <div class="category-grid" role="group" aria-label="反馈类型">
                <button v-for="item in categories" :key="item.value" type="button" class="category-card" :class="{ selected: form.category === item.value }" :aria-pressed="form.category === item.value" @click="form.category = item.value">
                  <span class="category-mark">{{ item.mark }}</span><strong>{{ categoryLabels[item.value] }}</strong><small>{{ item.hint }}</small>
                </button>
              </div>
              <div class="form-block"><label for="feedback-content"><span class="step">02 / 写下细节</span><strong>具体发生了什么，或希望有什么变化？</strong></label>
                <textarea id="feedback-content" v-model="form.content" :placeholder="placeholders[form.category]" maxlength="2000" rows="6" />
                <span class="character-count">{{ form.content.length }} / 2000</span>
              </div>
              <div class="form-block contact-block"><label for="feedback-contact"><span class="step">03 / 保持联系 · 可选</span><strong>联系方式</strong></label>
                <input id="feedback-contact" v-model="form.contact" type="text" maxlength="100" placeholder="邮箱或其他方便联系你的方式" />
                <small>只用于这条反馈的后续沟通。</small>
              </div>
              <div class="form-footer"><p>正在写的内容会自动保存在这台设备上。</p><el-button type="primary" :loading="submitting" @click="submit">提交反馈 <span aria-hidden="true">↗</span></el-button></div>
            </template>
          </div>

          <div v-else-if="tab === 'mine'" class="panel list-panel">
            <div class="panel-heading"><span class="step">YOUR NOTES</span><h2>我的反馈</h2></div>
            <p v-if="mineLoading && !mine.length" class="empty-note">正在取回反馈记录…</p>
            <p v-else-if="!mine.length" class="empty-note">你还没有提交反馈。一个小建议也很欢迎。</p>
            <article v-for="item in mine" :key="item.id" class="feedback-item">
              <div class="item-meta"><span>{{ categoryLabels[item.category] }}</span><time>{{ formatDate(item.createTime) }}</time></div>
              <p>{{ item.content }}</p>
              <div class="item-bottom"><span class="status" :class="item.status.toLowerCase()">{{ item.resolution === 'FIXED' ? '词条已修正' : item.resolution === 'NO_CHANGE' ? '核实后无需修改' : statusLabels[item.status] }}</span><small>#{{ item.id }}</small></div>
              <div v-if="item.adminReply" class="reply"><strong>学灵的回复</strong><p>{{ item.adminReply }}</p></div>
            </article>
            <el-button v-if="mineHasMore" :loading="mineLoading" @click="loadMine()">加载更多</el-button>
          </div>

        </section>
      </div>
    </div>

  </main>
</template>

<style scoped>
.feedback-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.feedback-layout { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1.7fr); align-items: start; gap: 22px; }
.intro-card, .workspace-card { border: 1px solid var(--xl-border); border-radius: var(--xl-radius-lg); background: var(--xl-surface); box-shadow: var(--xl-shadow-card); }
.intro-card { position: relative; overflow: hidden; min-height: 415px; padding: 32px; background: #e9efe5; }
.intro-card::after { content: ''; position: absolute; width: 220px; height: 220px; right: -125px; top: -105px; border: 1px solid #c5d5c0; border-radius: 50%; box-shadow: 0 0 0 38px #ffffff25, 0 0 0 75px #ffffff24; }
.eyebrow, .step { color: #65826c; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.intro-card h2 { margin-top: 35px; font: 650 clamp(34px, 4vw, 48px)/1.25 var(--xl-font-display); letter-spacing: -.035em; }
.intro-card h2 span { color: #c68f3e; }
.intro-copy { max-width: 240px; margin-top: 22px; color: var(--xl-ink-soft); font-size: 14px; line-height: 1.9; }
.paper-lines { display: grid; gap: 14px; margin-top: 42px; }.paper-lines i { height: 1px; background: #c9d8c5; }.paper-lines i:nth-child(2) { width: 85%; }.paper-lines i:nth-child(3) { width: 62%; }
.intro-foot { margin-top: 32px; color: #78907b; font-size: 11px; }
.workspace-card { overflow: hidden; }.tabs { display: flex; gap: 30px; padding: 0 32px; border-bottom: 1px solid var(--xl-border); }.tabs button { position: relative; min-height: 62px; padding: 0 2px; border: 0; background: none; color: var(--xl-ink-soft); font-size: 14px; font-weight: 750; cursor: pointer; }.tabs button.active { color: var(--xl-brand); }.tabs button.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--xl-brand); }
.panel { padding: 30px 32px 34px; }.panel-heading h2 { margin-top: 8px; font: 650 25px/1.3 var(--xl-font-display); }
.category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 11px; margin-top: 24px; }.category-card { display: grid; justify-items: start; gap: 7px; min-height: 113px; padding: 16px 17px; border: 1px solid var(--xl-border); border-radius: 12px; background: #fcfcf8; color: var(--xl-ink); text-align: left; cursor: pointer; transition: border-color .18s, background-color .18s, transform .18s; }.category-card:hover { transform: translateY(-2px); border-color: #a6bea8; }.category-card.selected { border-color: #6e9675; background: #e9f1e7; box-shadow: inset 0 0 0 1px #6e9675; }.category-mark { color: #a3b0a0; font: italic 13px var(--xl-font-display); }.category-card strong { font-size: 15px; }.category-card small { color: var(--xl-ink-soft); font-size: 12px; }
.form-block { position: relative; display: grid; gap: 11px; margin-top: 28px; }.form-block label { display: grid; gap: 8px; }.form-block label strong { font-size: 14px; }.form-block textarea, .form-block input, .admin-editor textarea, .admin-editor select, .filter-row select { width: 100%; border: 1px solid #d0dacd; border-radius: 10px; background: #fffefa; color: var(--xl-ink); outline: none; }.form-block textarea, .admin-editor textarea { padding: 14px; line-height: 1.7; resize: vertical; }.form-block input { height: 44px; padding: 0 14px; }.form-block textarea:focus, .form-block input:focus, .admin-editor textarea:focus, .admin-editor select:focus, .filter-row select:focus { border-color: var(--xl-brand); box-shadow: 0 0 0 3px #315b4020; }.character-count { position: absolute; right: 10px; bottom: 9px; padding: 2px 5px; background: var(--xl-surface); color: #87978a; font-size: 11px; }.contact-block small { color: var(--xl-ink-soft); font-size: 11px; }.form-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 31px; padding-top: 22px; border-top: 1px solid var(--xl-border); }.form-footer p { color: var(--xl-ink-soft); font-size: 11px; line-height: 1.5; }.form-footer :deep(.el-button) span { margin-left: 7px; }
.receipt { display: grid; justify-items: start; padding: 40px 6px; }.receipt-stamp { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 28px; border-radius: 50%; background: #e3eee0; color: var(--xl-brand); font-size: 30px; }.receipt h2 { margin-top: 12px; font: 650 32px var(--xl-font-display); }.receipt > p:not(.eyebrow) { max-width: 430px; margin-top: 16px; color: var(--xl-ink-soft); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }.receipt strong { color: var(--xl-ink); }.receipt-actions { display: flex; gap: 10px; margin-top: 28px; }
.empty-note { padding: 42px 0; color: var(--xl-ink-soft); font-size: 13px; }.feedback-item { padding: 22px 0; border-bottom: 1px solid var(--xl-border); }.feedback-item > p { margin: 12px 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.75; }.feedback-item > small { color: var(--xl-ink-soft); }.item-meta, .item-bottom { display: flex; justify-content: space-between; align-items: center; gap: 15px; }.item-meta span { color: var(--xl-brand); font-size: 12px; font-weight: 750; }.item-meta time, .item-bottom small { color: #829185; font-size: 11px; }.item-bottom { margin-top: 15px; }.status { display: inline-block; padding: 5px 9px; border-radius: 6px; background: #f3eee0; color: #946928; font-size: 11px; font-weight: 750; }.status.processing { background: #e7eef4; color: #45708b; }.status.replied { background: #e6f1e5; color: #3d7451; }.status.closed { background: #edf0eb; color: #657569; }.reply { margin-top: 17px; padding: 15px 17px; border-left: 3px solid #8baa8b; border-radius: 0 9px 9px 0; background: #f1f5ee; }.reply strong { font-size: 12px; }.reply p { margin-top: 8px; white-space: pre-wrap; font-size: 13px; line-height: 1.7; }.list-panel > .el-button { margin-top: 22px; }.text-action { border: 0; background: none; color: var(--xl-brand); font-weight: 750; cursor: pointer; }.filter-row { display: flex; align-items: center; gap: 10px; margin-top: 20px; font-size: 12px; }.filter-row select { width: 140px; height: 36px; padding: 0 10px; }.admin-editor { display: grid; gap: 10px; }.admin-editor label { margin-top: 8px; font-size: 13px; font-weight: 750; }.admin-editor select { height: 42px; padding: 0 12px; }
.context-details { display: grid; gap: 5px; color: var(--xl-ink-soft); }
@media (max-width: 830px) { .feedback-layout { grid-template-columns: 1fr; }.intro-card { min-height: 220px; }.intro-card h2 { margin-top: 15px; }.intro-copy { max-width: 500px; margin-top: 9px; }.paper-lines, .intro-foot { display: none; } }
@media (max-width: 520px) { .intro-card { padding: 25px; }.panel { padding: 24px 20px 28px; }.tabs { padding: 0 20px; gap: 21px; }.category-grid { gap: 8px; }.category-card { padding: 13px; }.category-card small { line-height: 1.4; }.form-footer { align-items: stretch; flex-direction: column; }.item-meta { align-items: flex-start; flex-direction: column; gap: 5px; } }
@media (prefers-reduced-motion: reduce) { .category-card { transition: none; }.category-card:hover { transform: none; } }
</style>
