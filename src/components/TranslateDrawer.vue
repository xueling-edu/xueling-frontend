<template>
  <div class="translate-drawer-container" v-if="tokenStore.accessToken">
    <!-- 悬浮按钮 -->
    <button
      class="translate-fab" 
      type="button"
      @click="toggleDrawer"
      :class="{ 'is-open': isOpen }"
      v-show="!isOpen"
      aria-label="打开翻译助手"
    >
      <el-icon :size="24"><Document /></el-icon>
      <span class="fab-text">翻译</span>
    </button>

    <!-- 侧边抽屉 -->
    <transition name="drawer-slide">
      <div v-if="isOpen" class="translate-drawer">
        <!-- 头部 -->
        <div class="drawer-header">
          <div class="header-title">
            <el-icon :size="20"><Document /></el-icon>
            <span>翻译助手</span>
          </div>
          <el-button 
            circle 
            size="small" 
            @click="toggleDrawer"
            :icon="Close"
          />
        </div>

        <!-- 输入区域 -->
        <div class="input-section">
          <div class="input-wrapper">
            <el-input
              v-model="inputText"
              placeholder="输入要查询的单词"
              clearable
              @keydown.enter="handleTranslate"
              :disabled="isTranslating"
              class="translate-input"
            />
            <el-button
              type="primary"
              :loading="isTranslating"
              @click="handleTranslate"
              :disabled="!inputText.trim()"
              class="translate-btn"
            >
              翻译
            </el-button>
          </div>
        </div>

        <!-- 结果区域 -->
        <div class="result-section" v-loading="isTranslating">
          <!-- 错误提示 -->
          <el-alert
            v-if="error"
            :title="error"
            type="error"
            :closable="false"
            show-icon
            class="error-alert"
          />

          <!-- 翻译结果 -->
          <div v-else-if="currentResult" class="result-content">
            <div class="result-card">
              <!-- 单词卡片头部 -->
              <div class="card-header">
                <div class="word-title-row">
                  <h2 class="word-text">{{ currentResult.word }}</h2>
                  <span v-if="currentResult.source && currentResult.source !== 'ECDICT'" class="dictionary-source">
                    AI 释义
                  </span>
                  <div class="header-actions">
                    <el-button 
                      circle 
                      text
                      @click="toggleFavorite"
                      class="action-btn favorite-btn"
                      :class="{ 'is-collected': currentResult.inWordBook }"
                      :title="currentResult.inWordBook ? '取消收藏' : '添加到单词本'"
                    >
                      <el-icon :size="22">
                        <StarFilled v-if="currentResult.inWordBook" />
                        <Star v-else />
                      </el-icon>
                    </el-button>
                    <el-button 
                      circle 
                      text
                      @click="copyResult"
                      class="action-btn"
                      title="复制"
                    >
                      <el-icon :size="18"><CopyDocument /></el-icon>
                    </el-button>
                  </div>
                </div>

                <!-- 音标部分 -->
                <div class="phonetic-row">
                  <div class="phonetic-tag">US</div>
                  <span v-if="currentResult.phonetic" class="phonetic-text">
                    /{{ currentResult.phonetic.replace(/^\/|\/$/g, '') }}/
                  </span>
                  <el-icon 
                    class="speaker-icon"
                    :size="18"
                    @click="playPronunciation"
                  >
                      <Microphone />
                  </el-icon>
                </div>
              </div>

              <!-- 释义列表 -->
              <div class="meanings-list">
                <div 
                  v-for="(trans, index) in currentResult.translations" 
                  :key="index"
                  class="meaning-item"
                >
                  <div class="pos-tag-wrapper">
                    <span class="pos-badge">{{ trans.pos }}</span>
                  </div>
                  <div class="meaning-content">
                    {{ trans.meanings.join('；') }}
                  </div>
                </div>
              </div>

              <!-- 例句 -->
              <div v-if="currentResult.examples && currentResult.examples.length > 0" class="examples-section">
                <!-- <div class="section-divider"></div> -->
                <div class="section-title">
                  <el-icon><ChatLineSquare /></el-icon>
                  <span>例句</span>
                </div>
                <div 
                  v-for="(example, index) in currentResult.examples" 
                  :key="index"
                  class="example-card-item"
                >
                  <p class="example-en">{{ example.en }}</p>
                  <p class="example-zh">{{ example.zh }}</p>
                </div>
              </div>

              <!-- 错误反馈 -->
              <div class="feedback-section">
                <el-button link type="info" size="small" @click="handleFeedback">
                   <el-icon style="margin-right: 4px"><Warning /></el-icon>
                   <span>内容有误？点击反馈</span>
                </el-button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <Vue3Lottie
              animationLink="https://assets2.lottiefiles.com/packages/lf20_uu0x8lqv.json"
              :height="180"
              :width="180"
            />
            <p class="empty-text">输入单词开始翻译</p>
          </div>
        </div>

        <!-- 翻译历史 (紧凑版) -->
        <div class="history-section" v-if="recentHistory.length > 0">
          <div class="history-header">
            <div class="header-left">
              <el-icon><Clock /></el-icon>
              <span>最近搜索</span>
            </div>
            <el-button
              link
              size="small"
              @click="clearHistory"
              class="clear-btn"
            >
              清空
            </el-button>
          </div>
          <div class="history-list-compact">
            <div
              v-for="item in recentHistory"
              :key="item.id"
              class="history-tag"
              @click="retranslate(item.word)"
              :title="`搜索时间: ${formatTime(item.timestamp)}`"
            >
              <span class="tag-text">{{ item.word }}</span>
              <el-icon 
                class="tag-close"
                @click.stop="removeFromHistory(item.id)"
              >
                <Close />
              </el-icon>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 添加到单词本对话框 -->
    <el-dialog
      v-model="addToBookVisible"
      title="添加到单词本"
      width="360px"
      align-center
      class="add-book-dialog"
    >
      <div class="add-word-header" v-if="currentResult">
        <div class="preview-word">{{ currentResult.word }}</div>
        <div class="preview-phonetic" v-if="currentResult.phonetic">
          /{{ currentResult.phonetic.replace(/^\/|\/$/g, '') }}/
        </div>
      </div>
      
      <el-form label-position="top">
        <el-form-item label="选择目标单词本">
          <el-select
            v-model="selectedBookId"
            placeholder="请选择一个单词本"
            style="width: 100%"
            :loading="loadingBooks"
            :teleported="false"
            class="book-select"
            size="large"
          >
            <el-option
              v-for="book in wordBooks"
              :key="book.id"
              :label="book.name"
              :value="book.id"
            >
              <div class="book-option-item">
                <span class="book-icon">{{ book.icon }}</span>
                <span class="book-name">{{ book.name }}</span>
                <span class="book-count">{{ book.wordCount }} 词</span>
              </div>
            </el-option>
            <template #empty>
               <div class="empty-books">
                  <p>暂无单词本可用</p>
               </div>
            </template>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addToBookVisible = false" size="large">取消</el-button>
          <el-button
            type="primary"
            @click="handleAddToBook"
            :loading="addingToBook"
            :disabled="!selectedBookId"
            size="large"
            color="#626aef"
          >
            确认收藏
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 反馈对话框 -->
    <el-dialog
      v-model="feedbackVisible"
      title="错误反馈"
      width="420px"
      align-center
    >
      <el-form label-position="top">
        <el-form-item label="问题类型 (必选)">
          <div class="feedback-tags">
            <el-tag
              v-for="type in feedbackTypes"
              :key="type.value"
              :effect="feedbackForm.type === type.value ? 'dark' : 'plain'"
              class="feedback-tag"
              @click="feedbackForm.type = type.value"
              :type="feedbackForm.type === type.value ? 'primary' : 'info'"
              size="large"
            >
              {{ type.label }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="详情描述（至少 5 字）">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="4"
            :maxlength="2000"
            show-word-limit
            placeholder="请描述具体问题，帮助我们要改进..."
            resize="none"
          />
        </el-form-item>
        <el-form-item label="建议的正确内容（可选）">
          <el-input v-model="feedbackForm.suggestion" type="textarea" :rows="2" :maxlength="2000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="submitFeedback"
          :loading="submittingFeedback"
            :disabled="!feedbackForm.type || feedbackForm.content.trim().length < 5"
        >
          提交反馈
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import { 
  Document, 
  Close, 
  Microphone, 
  Reading, 
  ChatLineSquare,
  Plus,
  CopyDocument,
  Clock,
  Delete,
  Star,
  StarFilled,
  Warning
} from '@element-plus/icons-vue'
import { Vue3Lottie } from 'vue3-lottie'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTranslate } from '@/composables/useTranslate'
import { getWordBooks } from '@/features/vocab/api'
import { matchWords, addWordsToBook, removeWordsFromBook } from '@/features/vocab/api'
import type { WordBookVo } from '@/features/vocab/types'
import { useTokenStore } from '@/stores/token'
import { useRoute } from 'vue-router'
import { createFeedback } from '@/features/feedback/api'
import { createRequestId } from '@/utils/requestId'
import { cancelEnglishWord, preloadEnglishWord, speakEnglishWord } from '@/utils/wordSpeech'

const tokenStore = useTokenStore()
const route = useRoute()
const isOpen = ref(false)
const inputText = ref('')

// 反馈相关
const feedbackVisible = ref(false)
const submittingFeedback = ref(false)
const feedbackForm = reactive({
  requestId: createRequestId(),
  type: '',
  content: '',
  suggestion: ''
})

const feedbackTypes = [
  { label: '释义错误', value: 'meaning' },
  { label: '发音问题', value: 'sound' },
  { label: '例句问题', value: 'example' },
  { label: '其他', value: 'other' }
]

// 使用翻译 composable
const {
  isTranslating,
  currentResult,
  error,
  recentHistory,
  translate,
  removeFromHistory,
  clearHistory: clearHistoryFn,
  retranslate: retranslateFn
} = useTranslate()
watch(() => isOpen.value ? currentResult.value?.word : undefined, word => {
  if (word) preloadEnglishWord(word)
}, { immediate: true })

// 单词本相关
const addToBookVisible = ref(false)
const wordBooks = ref<WordBookVo[]>([])
const selectedBookId = ref<string | null>(null)
const loadingBooks = ref(false)
const addingToBook = ref(false)

// 切换抽屉
const toggleDrawer = () => {
  isOpen.value = !isOpen.value
  if (!isOpen.value) cancelEnglishWord()
}

// 执行翻译
const handleTranslate = async () => {
  if (!inputText.value.trim()) return
  await translate(inputText.value)
}

// 播放发音
const playPronunciation = () => {
  if (!currentResult.value?.word) return
  if (!speakEnglishWord(currentResult.value.word, message => ElMessage.warning(message))) {
    ElMessage.warning('当前浏览器不支持网页语音，请尝试系统浏览器')
  }
}

// 错误反馈
const handleFeedback = () => {
  feedbackForm.requestId = createRequestId()
  feedbackForm.type = ''
  feedbackForm.content = ''
  feedbackForm.suggestion = ''
  feedbackVisible.value = true
}

// 提交反馈
const submitFeedback = async () => {
  if (!feedbackForm.type) {
    ElMessage.warning('请选择反馈类型')
    return
  }
  
  if (feedbackForm.content.trim().length < 5) {
    ElMessage.warning('请至少填写 5 个字的问题描述')
    return
  }
  if (submittingFeedback.value) return
  submittingFeedback.value = true
  try {
    const result = await createFeedback({
      requestId: feedbackForm.requestId,
      category: 'TRANSLATION',
      subcategory: feedbackForm.type,
      content: feedbackForm.content.trim(),
      sourcePage: route.path,
      contextWord: currentResult.value?.word,
      wordId: currentResult.value?.id,
      observedContent: (feedbackForm.type === 'meaning'
        ? currentResult.value?.translations.map(item => `${item.pos} ${item.meanings.join('；')}`).join('\n')
        : feedbackForm.type === 'sound' ? currentResult.value?.phonetic
          : currentResult.value?.examples?.map(item => `${item.en}\n${item.zh}`).join('\n'))?.slice(0, 2000),
      suggestedContent: feedbackForm.suggestion.trim() || undefined,
    })
    submittingFeedback.value = false
    feedbackVisible.value = false
    ElMessage.success(`反馈已收到，编号 #${result.data.id}`)
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.response?.data?.msg || '反馈未送达，请稍后重试')
  } finally {
    submittingFeedback.value = false
  }
}

// 复制结果
const copyResult = () => {
  if (!currentResult.value) return
  
  const text = `${currentResult.value.word} ${currentResult.value.phonetic || ''}\n${
    currentResult.value.translations
      .map(t => `${t.pos} ${t.meanings.join('；')}`)
      .join('\n')
  }`
  
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 切换收藏状态（收藏/取消收藏）
const toggleFavorite = async () => {
  if (!currentResult.value) return
  
  // 1. 如果已收藏，则执行取消收藏
  if (currentResult.value.inWordBook) {
    await handleRemoveFromBook()
  } else {
    // 2. 如果未收藏，则打开收藏弹窗
    showAddToBookDialog()
  }
}

// 取消收藏逻辑
const handleRemoveFromBook = async () => {
  if (!currentResult.value || !currentResult.value.wordBookId) {
    ElMessage.warning('无法获取收藏信息，请重试')
    return
  }

  try {
    ElMessage.info('正在取消收藏...')
    
    // 1. 先匹配单词获取 ID（为了获取 wordId）
    const matchResponse = await matchWords(currentResult.value.word)
    
    if (matchResponse.code === 0 && matchResponse.data && matchResponse.data.length > 0) {
      const wordId = matchResponse.data[0]?.id
      
      if (!wordId) {
         ElMessage.error('获取单词ID失败')
         return
      }

      // 2. 调用后端接口移除单词
      const removeResponse = await removeWordsFromBook({
        wordBookId: currentResult.value.wordBookId,
        wordIds: [String(wordId)]
      })
      
      if (removeResponse.code === 0) {
        ElMessage.success({
          message: '已取消收藏',
          type: 'success',
          plain: true,
        })
        
        // 更新前端状态
        currentResult.value.inWordBook = false
        currentResult.value.wordBookId = undefined
        
        // 尝试减少对应单词本的计数（非必须，为了数据一致性）
        // 这里不知道刚才取消的是哪个本子，如果需要更新计数，可能需要重新拉取单词本列表或牺牲一点准确性
        // 简单处理：如果当前 wordBooks 中有匹配的，就减1
        // 注意：removeWordsFromBook 入参里有 wordBookId
        const targetBook = wordBooks.value.find(b => b.id === removeResponse.data || currentResult.value?.wordBookId) 
        // 备注：后端接口返回的 data 可能是 String，但不一定是 ID，这里最好用入参 ID 匹配
        // 但由于是在取消收藏函数里，我们其实无法直接访问到 “刚才点击那个按钮上下文里的 bookId”，
        // 幸好 currentResult 里存了 wordBookId
      } else {
        ElMessage.error(removeResponse.msg || '取消收藏失败')
      }
    } else {
      ElMessage.error('无法找到该单词信息')
    }
  } catch (error: any) {
    console.error('取消收藏失败:', error)
    ElMessage.error('取消收藏操作失败')
  }
}

// 显示添加到单词本对话框
const showAddToBookDialog = async () => {
  addToBookVisible.value = true
  await loadWordBooks()
}

// 加载单词本列表
const loadWordBooks = async () => {
  try {
    loadingBooks.value = true
    console.log('开始加载单词本...')
    const response = await getWordBooks()
    console.log('加载单词本响应:', response)
    
    if (response.code === 0) {
      if (response.data && response.data.length > 0) {
        wordBooks.value = response.data.map((book, index) => ({
          ...book,
          // 如果后端没有返回图标和颜色，则使用默认的
          icon: book.icon || ['📘', '📖', '📚', '📕', '📗', '📙'][index % 6],
          color: book.color || ''
        }))
        console.log('单词本列表已更新:', wordBooks.value)
      } else {
        wordBooks.value = []
        ElMessage.info('您还没有创建单词本，请先去创建')
      }
    } else {
      console.error('业务状态码错误:', response)
      ElMessage.error(response.msg || '加载单词本失败')
    }
  } catch (error: any) {
    console.error('加载单词本网络或未知错误:', error)
    // 尝试提取错误信息
    const msg = error.msg || error.message || '加载出错'
    ElMessage.error(`无法获取单词本: ${msg}`)
  } finally {
    loadingBooks.value = false
  }
}

// 添加到单词本
const handleAddToBook = async () => {
  if (!selectedBookId.value || !currentResult.value) return
  
  try {
    addingToBook.value = true
    const targetWord = currentResult.value.word
    console.log('准备添加单词:', targetWord, '到单词本:', selectedBookId.value)
    
    // 1. 先匹配单词获取 ID
    const matchResponse = await matchWords(targetWord)
    console.log('单词匹配结果:', matchResponse)
    
    if (matchResponse.code === 0 && matchResponse.data && matchResponse.data.length > 0) {
      const wordId = matchResponse.data[0]?.id
      
      if (!wordId) {
          console.error('未找到单词ID')
          return
      }

      console.log('获取到单词ID:', wordId)
      
      // 2. 调用后端接口添加到单词本
      const addResponse = await addWordsToBook({
        wordBookId: String(selectedBookId.value),
        wordIds: [String(wordId)]
      })
      console.log('添加单词结果:', addResponse)
      
      if (addResponse.code === 0) {
        ElMessage.success({
          message: '添加成功',
          type: 'success',
          plain: true,
        })

        // 手动更新本地显示的单词数量，提升体验
        const targetBook = wordBooks.value.find(book => book.id === selectedBookId.value)
        if (targetBook) {
          targetBook.wordCount = (targetBook.wordCount || 0) + 1
        }
        
        // 更新当前单词状态为已收藏
        if (currentResult.value) {
          currentResult.value.inWordBook = true
          currentResult.value.wordBookId = String(selectedBookId.value)
        }

        addToBookVisible.value = false
        selectedBookId.value = null
      } else {
        ElMessage.error(addResponse.msg || '添加失败')
      }
    } else {
      console.warn('词库中未找到该单词:', targetWord)
      ElMessage.warning({
        message: '该单词暂未收录到词库，无法添加',
        duration: 3000
      })
    }
  } catch (error: any) {
    console.error('添加到单词本操作失败:', error)
    ElMessage.error(error.message || '添加失败，请稍后重试')
  } finally {
    addingToBook.value = false
  }
}

// 重新翻译
const retranslate = async (word: string) => {
  inputText.value = word
  await retranslateFn(word)
}

// 清空历史
const clearHistory = () => {
  ElMessageBox.confirm('确定要清空所有翻译历史吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    clearHistoryFn()
    ElMessage.success('已清空历史记录')
  }).catch(() => {})
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// 监听全局快捷键
const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl/Cmd + Shift + T
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
    e.preventDefault()
    toggleDrawer()
  }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  cancelEnglishWord()
})
</script>

<style scoped>
.translate-drawer-container {
  position: fixed;
  z-index: 9998;
}

/* 悬浮按钮 */
.translate-fab {
  position: fixed;
  bottom: 22px;
  right: 82px;
  width: 52px;
  height: 52px;
  border: 1px solid var(--xl-border);
  border-radius: 50%;
  background: var(--xl-surface);
  color: var(--xl-brand);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 5px 16px rgba(36, 59, 45, 0.12);
  user-select: none;
}

.translate-drawer-container.is-solo .translate-fab {
  right: 22px;
}

.translate-fab:hover {
  transform: translateY(-2px);
  background: var(--xl-surface-muted);
  box-shadow: 0 8px 22px rgba(36, 59, 45, 0.18);
}

.fab-text {
  font-size: 11px;
  font-weight: 600;
  margin-top: 2px;
  letter-spacing: 0.5px;
}

/* 抽屉 */
.translate-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 9999;
}

/* 头部 */
.drawer-header {
  padding: 20px;
  background: var(--xl-brand);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

/* 输入区域 */
.input-section {
  padding: 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.input-wrapper {
  display: flex;
  gap: 10px;
}

.translate-input {
  flex: 1;
}

.translate-btn {
  height: 40px;
  padding: 0 24px;
}

/* 结果区域 */
.result-section {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.error-alert {
  margin-bottom: 16px;
}

.result-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 单词头部 */
.card-header {
  margin-bottom: 24px;
}

.word-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.word-text {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
  letter-spacing: -0.5px;
}

.dictionary-source {
  align-self: center;
  margin-left: 10px;
  padding: 3px 8px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  color: #9ca3af;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #f3f4f6;
  color: #4b5563;
}

.favorite-btn:hover {
  color: #fbbf24;
}

.is-collected {
  color: #fbbf24 !important;
}

.phonetic-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.phonetic-tag {
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
}

.phonetic-text {
  font-family: 'Lucida Sans Unicode', sans-serif;
  color: #4b5563;
  font-size: 15px;
}

.speaker-icon {
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.speaker-icon:hover {
  color: #84fab0;
}

/* 释义列表 */
.meanings-list {
  margin-bottom: 32px;
}

.meaning-item {
  display: flex;
  margin-bottom: 16px;
  line-height: 1.6;
}

.pos-tag-wrapper {
  min-width: 48px;
  flex-shrink: 0;
  padding-top: 1px;
  margin-right: 12px;
}

.pos-badge {
  display: inline-block;
  background: #f3e8ff; /* Lavender */
  color: #7e22ce; /* Purple */
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.meaning-content {
  flex: 1;
  color: #374151;
  font-size: 15px;
  font-weight: 500;
}

/* 例句 */
.examples-section {
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 16px;
}

.example-card-item {
  margin-bottom: 16px;
  padding: 0 4px;
}

.example-en {
  color: #374151;
  font-size: 15px;
  margin: 0 0 4px 0;
  font-weight: 500;
  font-style: normal;
}

.example-zh {
  color: #9ca3af;
  font-size: 13px;
  margin: 0;
}

/* 错误反馈 */
.feedback-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px dashed #f3f4f6;
}

.feedback-section .el-button {
  color: #9ca3af;
  font-size: 12px;
}

.feedback-section .el-button:hover {
  color: #ef4444;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-text {
  color: #9ca3af;
  font-size: 15px;
  margin-top: 16px;
}

/* 历史记录 */
.history-section {
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  background: #f8fafc;
  flex-shrink: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #64748b;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.clear-btn {
  color: #94a3b8;
  font-size: 12px;
  padding: 0;
  height: auto;
}

.clear-btn:hover {
  color: #ef4444;
}

.history-list-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  /* 隐藏滚动条但保留功能 */
  scrollbar-width: thin;
}

.history-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.history-tag:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
  transform: translateY(-1px);
}

.tag-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-close {
  margin-left: 6px;
  font-size: 12px;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.2s;
  opacity: 0.6;
}

.history-tag:hover .tag-close {
  opacity: 1;
}

.tag-close:hover {
  background: #fee2e2;
  color: #ef4444;
}


/* 反馈标签 */
.feedback-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feedback-tag {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.feedback-tag:hover {
  transform: translateY(-1px);
}
.history-item:hover .delete-btn {
  opacity: 1;
}

/* 抽屉动画 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

/* 响应式 */
@media (max-width: 768px) {
  .translate-drawer {
    width: 100%;
  }
  
  .translate-fab {
    bottom: 22px;
    right: 82px;
    width: 52px;
    height: 52px;
  }

}

/* 滚动条样式 */
.result-section::-webkit-scrollbar {
  width: 6px;
}

.result-section::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.result-section::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.result-section::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 添加到单词本弹窗样式 */
.add-word-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.preview-word {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.preview-phonetic {
  font-family: 'Lucida Sans Unicode', sans-serif;
  color: #6b7280;
  margin-top: 4px;
  font-size: 13px;
}

.book-select :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

.book-option-item {
  display: flex;
  align-items: center;
  width: 100%;
}

.book-icon {
  margin-right: 10px;
  font-size: 18px;
}

.book-name {
  flex: 1;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-count {
  font-size: 12px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.empty-books {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.dialog-footer .el-button {
  flex: 1;
}

:deep(.add-book-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.add-book-dialog .el-dialog__header) {
  padding: 20px 24px 10px;
  margin-right: 0;
}

:deep(.add-book-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
}

:deep(.add-book-dialog .el-dialog__body) {
  padding: 10px 24px 20px;
}

:deep(.add-book-dialog .el-dialog__footer) {
  padding: 10px 24px 24px;
  border-top: none;
}
</style>
