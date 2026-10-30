<template>
  <div class="review-page">
    <!-- 装饰背景圆 -->
    <div class="background-shape shape-1"></div>
    <div class="background-shape shape-2"></div>

    <!-- 左侧脑图区域 -->
    <div class="mind-map-panel" v-if="currentWordFamily">
        <WordFamilyTree :data="currentWordFamily" @node-click="handleMindMapClick" />
    </div>

    <!-- 顶部导航与进度 -->
    <div class="review-header glass-panel">
      <div class="header-top">
        <el-page-header @back="router.back()">
          <template #content>
            <span class="header-title">{{ currentBookName }}</span>
          </template>
        </el-page-header>
        <div class="progress-badge">
          <span class="current">{{ Math.min(currentIndex + 1, cards.length) }}</span>
          <span class="separator">/</span>
          <span class="total">{{ cards.length }}</span>
        </div>
      </div>
      <el-progress 
        :percentage="progressPercentage" 
        :format="format"
        :stroke-width="8" 
        color="#4facfe"
        track-color="#ffffff"
        class="review-progress"
      />
    </div>

    <!-- 卡片区域 -->
    <div v-if="isLoading" class="review-state glass-panel" role="status">正在准备练习卡片…</div>
    <div v-else-if="loadError" class="review-state glass-panel" role="alert">
      <h2>暂时无法开始练习</h2>
      <p>{{ loadError }}</p>
      <el-button type="primary" @click="loadData">重新加载</el-button>
      <el-button @click="router.push('/english/vocab/book/' + route.params.id)">返回词书</el-button>
    </div>
    <div class="card-container" v-else-if="currentCard">
      <div class="card-wrapper">
        <div 
          class="flashcard" 
          :class="{ flipped: isFlipped }" 
          @click="flipCard"
          @keydown.enter.space.prevent="handleCardKeydown"
          role="button"
          tabindex="0"
          :aria-label="isFlipped ? '查看 ' + currentCard.word + ' 的单词正面' : '揭晓 ' + currentCard.word + ' 的中文释义'"
          :aria-pressed="isFlipped"
        >
          <!-- 正面 -->
          <div class="card-face card-front" :aria-hidden="isFlipped">
            <button type="button" class="voice-icon-wrapper" :tabindex="isFlipped ? -1 : 0" :aria-label="'播放 ' + currentCard.word + ' 的读音'" @click.stop="playAudio(currentCard.word)">
                 <el-icon><Microphone /></el-icon>
            </button>
            
            <div class="card-image-box" v-if="currentCard.imageUrl">
               <img :src="currentCard.imageUrl" :alt="currentCard.word" />
            </div>

            <div class="card-content-center">
              <span class="word">{{ currentCard.word }}</span>
              <span class="phonetic">
                /{{ currentCard.phonetic }}/
              </span>
            </div>
            <div class="card-hint">
              <span>点击卡片或按回车，先回忆再看答案</span>
            </div>
          </div>

          <!-- 背面 -->
          <div class="card-face card-back" :aria-hidden="!isFlipped">
            <div class="card-content-scroll">
              <div class="meaning-wrapper">
                 <h3 class="meaning">{{ currentCard.meaning }}</h3>
              </div>
              <div v-if="currentCard.exampleEn || currentCard.exampleCn" class="example-box">
                <div class="example-item">
                    <p class="example-en">{{ currentCard.exampleEn }}</p>
                    <p class="example-cn">{{ currentCard.exampleCn }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="actions" v-if="isFlipped">
        <button class="action-btn forget" type="button" :disabled="advancing" @click.stop="handleResult('forget')">
            <div class="btn-content">
                <el-icon><Close /></el-icon>
                <span>不认识</span>
            </div>
        </button>
        
        <button class="action-btn remember" type="button" :disabled="advancing" @click.stop="handleResult('remember')">
            <div class="btn-content">
                <el-icon><Check /></el-icon>
                <span>认识</span>
            </div>
        </button>
      </div>
      <p v-else class="reveal-guidance">先试着回忆释义，翻面后再判断是否认识。</p>
    </div>

    <!-- 完成状态 -->
    <div v-else class="completion-stage">
        <!-- 1. Simple Completion Card -->
        <div v-if="!showConsolidation" class="completion-container glass-panel">
            <div class="success-icon-wrapper">
                <el-icon class="success-icon"><Trophy /></el-icon>
            </div>
            <h2>自由练习完成</h2>
            <p>本次练习不会改变今日计划或下次复习时间</p>
            <p class="result-summary">认识 {{ rememberedCount }} 词 · 还需巩固 {{ forgottenCount }} 词</p>
            
            <div class="completion-actions">
                <el-button size="large" round class="back-btn" @click="router.back()">
                    <el-icon><Back /></el-icon> 返回列表
                </el-button>
                <el-button 
                    color="#626aef" 
                    size="large" 
                    round 
                    class="consolidate-btn" 
                    @click="startConsolidation"
                >
                    <el-icon><MagicStick /></el-icon> 回顾这组单词
                </el-button>
            </div>
        </div>

        <!-- 2. Full Screen Immersive Consolidation -->
        <transition name="fade-slide">
        <div v-if="showConsolidation" class="consolidation-overlay">
            <!-- Top Bar -->
            <div class="overlay-header">
                <div class="header-left">
                    <div class="logo-text">⚡ 词汇回顾</div>
                </div>
                <div class="header-center">
                    <h2 class="story-title-mini">本组 {{ cards.length }} 词 · 自由练习</h2>
                </div>
                <div class="header-right">
                    <el-button circle aria-label="关闭词汇回顾" @click="showConsolidation = false">
                        <el-icon><Close /></el-icon>
                    </el-button>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="cons-content-wrapper">
                <!-- Review every selected word without interpreting dictionary content as HTML. -->
                <div class="cons-left-panel">
                    <div class="story-scroll-container">
                        <div class="word-recap-intro">
                          <h3>{{ isMasked ? '看释义，试着拼出单词' : '逐词回顾' }}</h3>
                          <p>{{ isMasked ? '选择任意词条开始拼写。拼写练习不会改变今日学习计划。' : '这组单词都在下面。听读音、看释义后，可开启拼写练习。' }}</p>
                        </div>
                        <ol class="recap-list">
                          <li v-for="card in cards" :key="card.id" class="recap-item">
                            <button type="button" class="recap-word" :aria-label="isMasked ? `拼写释义为 ${card.meaning} 的单词` : `播放 ${card.word} 的读音`" @click="selectRecapWord(card)">
                              <span class="recap-index" aria-hidden="true">{{ String(cards.indexOf(card) + 1).padStart(2, '0') }}</span>
                              <span>{{ isMasked ? '点击拼写' : card.word }}</span>
                              <span v-if="wordStatusMap[card.word]?.mastered" aria-label="本轮拼写正确">✓</span>
                            </button>
                            <p>{{ card.meaning || '暂无释义' }}</p>
                          </li>
                        </ol>
                    </div>
                </div>

                <!-- Right: Interactive Tools -->
                <div class="cons-right-panel glass-panel">
                    <div class="tools-tabs">
                        <div class="tool-card">
                            <div class="tool-header">
                                <h3><el-icon><Monitor /></el-icon> 本轮拼写结果</h3>
                            </div>
                            <!-- Spelling results in this session -->
                            <div class="word-checklist">
                                <div 
                                    v-for="card in cards" 
                                    :key="card.id" 
                                    class="check-item glass-effect-sm"
                                    :class="{ 'is-mastered': wordStatusMap[card.word]?.mastered }"
                                >
                                    <div class="status-icon">
                                        <el-icon v-if="wordStatusMap[card.word]?.mastered" color="#67C23A"><Check /></el-icon>
                                        <div class="check-dot" v-else></div>
                                    </div>
                                    <span class="check-word">{{ isMasked && !wordStatusMap[card.word]?.mastered ? `待拼写 · 第 ${cards.indexOf(card) + 1} 词` : card.word }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Spelling Challenge Box -->
                        <transition name="fade">
                        <div class="tool-card highlight-card" v-if="isMasked">
                            <div class="tool-header">
                                <h3><el-icon><EditPen /></el-icon> 拼写挑战</h3>
                            </div>
                            <div v-if="currentSpellingWord" class="spelling-box">
                                <div class="spelling-hint">
                                    <span class="hint-label">释义:</span>
                                    {{ currentSpellingMeaning }}
                                </div>
                                <el-input 
                                    v-model="spellingInput" 
                                    placeholder="输入单词..." 
                                    aria-label="输入当前单词的英文拼写"
                                    @keyup.enter="checkSpelling"
                                    size="large"
                                    ref="spellingInputRef"
                                    class="spelling-input"
                                >
                                    <template #append>
                                        <el-button @click="checkSpelling">确认</el-button>
                                    </template>
                                </el-input>
                                <div class="feedback-msg" :class="feedbackType" v-if="feedbackMsg" role="status" aria-live="polite">
                                    {{ feedbackMsg }}
                                </div>
                            </div>
                            <div v-else class="empty-spelling">
                                <p>选择左侧任意词条开始拼写。</p>
                            </div>
                        </div>
                        </transition>

                        <div class="tool-actions">
                             <el-button 
                                type="primary" 
                                plain 
                                size="large" 
                                class="action-toggle"
                                @click="toggleMaskMode"
                            >
                                <el-icon v-if="isMasked"><View /></el-icon>
                                <span>{{ isMasked ? '退出拼写练习' : '开始拼写练习' }}</span>
                            </el-button>
                             <div class="bottom-btns">
                                <el-button size="default" @click="resetSpelling" round>
                                    <el-icon><RefreshRight /></el-icon> 重新练习
                                </el-button>
                                <el-button type="primary" size="default" @click="router.back()" round>完成</el-button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Check, Close, Microphone, Trophy, MagicStick, Back, RefreshRight, View, EditPen, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import WordFamilyTree from '@/features/vocab/WordFamilyTree.vue'
import { getWordBookDetail, getWordsByIds, getWordFamily } from '@/features/vocab/api'
import type { WordFamilyNodeVO } from '@/features/vocab/types'
import { useReviewStore } from '@/features/vocab/reviewStore'
import { useUserStore } from '@/stores/user'
import { cancelEnglishWord, preloadEnglishWord, speakEnglishWord } from '@/utils/wordSpeech'

const router = useRouter()
const route = useRoute()
const reviewStore = useReviewStore()
const userStore = useUserStore()
reviewStore.restoreReviewData(userStore.userInfo?.id)

const currentBookName = ref(reviewStore.bookName || 'CET-4 核心词')
const isFlipped = ref(false)
const currentIndex = ref(0) // 当前索引，从 0 开始
const isLoading = ref(false)
const loadError = ref('')
const advancing = ref(false)
const rememberedCount = ref(0)
const forgottenCount = ref(0)
let advanceTimer: ReturnType<typeof setTimeout> | undefined

const showConsolidation = ref(false)
const isMasked = ref(false)

// 新增交互状态
const spellingInput = ref('')
const currentSpellingWord = ref('')
const currentSpellingMeaning = ref('')
const spellingInputRef = ref<any>(null)
const feedbackMsg = ref('')
const feedbackType = ref('')
// This session's spelling result, separate from scheduled review progress.
const wordStatusMap = ref<Record<string, { mastered: boolean }>>({})

function startConsolidation() {
  showConsolidation.value = true
  isMasked.value = false
  resetSpelling()
}

function resetSpelling() {
  currentSpellingWord.value = ''
  currentSpellingMeaning.value = ''
  spellingInput.value = ''
  feedbackMsg.value = ''
  wordStatusMap.value = {}
  cancelAudio()
}

function toggleMaskMode() {
  isMasked.value = !isMasked.value
  currentSpellingWord.value = ''
  currentSpellingMeaning.value = ''
  spellingInput.value = ''
  feedbackMsg.value = ''
}

function selectRecapWord(card: ReviewCard) {
  if (!isMasked.value) {
    playAudio(card.word)
    return
  }
  currentSpellingWord.value = card.word
  currentSpellingMeaning.value = card.meaning
  spellingInput.value = ''
  feedbackMsg.value = ''
  void nextTick(() => spellingInputRef.value?.focus())
}

function checkSpelling() {
  if (!currentSpellingWord.value) return
  const correct = spellingInput.value.trim().toLocaleLowerCase() === currentSpellingWord.value.toLocaleLowerCase()
  feedbackType.value = correct ? 'success' : 'error'
  feedbackMsg.value = correct ? '本轮拼写正确。' : '还没拼对，可以再试一次。'
  if (correct) wordStatusMap.value[currentSpellingWord.value] = { mastered: true }
}

function cancelAudio() {
  cancelEnglishWord()
}

onUnmounted(() => {
    cancelAudio()
    if (advanceTimer) clearTimeout(advanceTimer)
})

interface ReviewCard {
  id: string
  word: string
  phonetic: string
  meaning: string
  exampleEn: string
  exampleCn: string
  imageUrl?: string
}

const cards = ref<ReviewCard[]>([])
const wordFamilies = ref<Record<string, WordFamilyNodeVO>>({})

const fetchMindMapData = async () => {
    if (cards.value.length === 0) return
    
    // 串行请求所有单词的脑图数据：前一个响应后再请求下一个
    for (const card of cards.value) {
        // 避免重复请求
        if (wordFamilies.value[card.word]) continue;

        try {
            const res = await getWordFamily(card.word)
            if (res.code === 0 && res.data) {
                wordFamilies.value[card.word] = res.data
            }
        } catch (e) {
            console.error(`Failed to fetch family for ${card.word}`, e)
        }
    }
}

const loadData = async () => {
  loadError.value = ''
  cards.value = []
  currentIndex.value = 0
  isFlipped.value = false
  rememberedCount.value = 0
  forgottenCount.value = 0
  // 优先从 store 获取 IDs，兼容旧的 URL query 方式（可选）
  const ids = reviewStore.reviewIds.length > 0 ? reviewStore.reviewIds.join(',') : (route.query.ids as string)
  
  if (ids) {
    isLoading.value = true
    try {
      const requestedIds = ids.split(',').filter(Boolean)
      const bookResponse = await getWordBookDetail(String(route.params.id))
      if (bookResponse.code !== 0 || !bookResponse.data) throw new Error('当前词书无法访问，请返回词书重新选择。')
      currentBookName.value = bookResponse.data.name || currentBookName.value
      const availableIds = new Set((bookResponse.data.wordList || []).map(word => word.id))
      if (requestedIds.length < 5 || requestedIds.length > 10 || requestedIds.some(id => !availableIds.has(id))) {
        throw new Error('所选单词已不在当前词书中，请返回词书重新选择。')
      }
      const res = await getWordsByIds(ids)
      if (res.code === 0 && res.data?.length === requestedIds.length
        && res.data.every(item => requestedIds.includes(item.id))) {
        cards.value = res.data.map(item => ({
            id: item.id,
            word: item.word,
            phonetic: item.phonetic,
            meaning: item.meaning,
            exampleEn: item.example || '',
            exampleCn: item.exampleTranslation || '',
            imageUrl: item.imageUrl || undefined
        }))
        
        // 自动获取脑图数据
        fetchMindMapData()
      } else {
        loadError.value = res.msg || '没有读取到练习单词，请重试。'
      }
    } catch (error: any) {
       console.error(error)
       loadError.value = error?.message || '网络请求失败，请检查连接后重试。'
    } finally {
       isLoading.value = false
    }
  } else {
    loadError.value = '还没有选择练习单词，请返回词书选择 5–10 个单词。'
  }
}

onMounted(() => {
  loadData()
})

// 2. 样式映射配置
const posColorMap: Record<string, string> = {
  'n': '#67C23A',    // 名词 - 绿色
  'v': '#F56C6C',    // 动词 - 红色
  'adj': '#E6A23C',  // 形容词 - 橙色
  'adv': '#409EFF',  // 副词 - 蓝色
  'prep': '#909399', // 介词 - 灰色
  'conj': '#8E44AD'  // 连词 - 紫色
}

// 3. 数据转换函数：后端 VO -> ECharts Option Data
const transformToChartData = (node: WordFamilyNodeVO, parentColor?: string): any => {
  const chartNode: any = { 
    name: node.name || '',
    children: []
  }

  // 根据节点类型配置样式
  if (node.type === 'root') {
    chartNode.itemStyle = { color: '#409EFF', borderColor: '#409EFF' }
    chartNode.label = { backgroundColor: '#ecf5ff', color: '#409EFF', borderColor: '#d9ecff' }
  } else if (node.type === 'pos') {
    // 词性节点
    const color = (node.posCode && posColorMap[node.posCode]) || '#909399'
    chartNode.itemStyle = { color: color, borderColor: color }
    chartNode.lineStyle = { color: color }
    parentColor = color 
  } else if (node.type === 'word') {
     // 单词节点
     const color = parentColor || '#606266'
     chartNode.itemStyle = { color: '#fff', borderColor: color, borderWidth: 2 }
     chartNode.label = { color: '#303133', borderColor: '#DCDFE6', backgroundColor: '#fff' }
     // Pos -> Word 连线：使用词性颜色，强调派生
     chartNode.lineStyle = { color: color }
  } else if (node.type === 'meaning') {
      // 释义节点
      chartNode.itemStyle = { color: 'transparent', borderColor: 'transparent' } 
      chartNode.label = { color: '#909399', backgroundColor: 'transparent', borderColor: 'transparent', padding: 0 }
      // Word -> Meaning 连线：回归浅灰色，弱化辅助信息，构建视觉层级
      chartNode.lineStyle = { color: '#DCDFE6' }
  }

  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    let children = node.children

    // 特殊处理：如果当前是根节点，合并相同名称的词性节点
    // 解决相同词性下多个单词被分散在不同分支的问题
    if (node.type === 'root') {
        const mergedMap = new Map<string, WordFamilyNodeVO>()
        const others: WordFamilyNodeVO[] = []

        children.forEach(child => {
            if (child.type === 'pos') {
                const key = child.name
                if (mergedMap.has(key)) {
                    const existing = mergedMap.get(key)!
                    if (child.children) {
                        existing.children = (existing.children || []).concat(child.children)
                    }
                } else {
                    // 浅拷贝节点并初始化 children 副本
                    mergedMap.set(key, { ...child, children: [...(child.children || [])] })
                }
            } else {
                others.push(child)
            }
        })
        children = [...mergedMap.values(), ...others]
    }

    chartNode.children = children.map(child => transformToChartData(child, parentColor))
  }

  return chartNode
}

const currentCard = computed(() => {
    if (currentIndex.value >= cards.value.length) return null;
    return cards.value[currentIndex.value];
})
watch(() => currentCard.value?.word, word => {
    if (word) preloadEnglishWord(word)
}, { immediate: true })

// 根据当前卡片自动切换数据
const currentWordFamily = computed(() => {
    if (!currentCard.value) return null;
    
    const familyData = wordFamilies.value[currentCard.value.word]
    if (!familyData) {
        // 如果数据未加载完成，显示一个带状态的根节点
        return {
             name: currentCard.value.word,
             itemStyle: { color: '#909399', borderColor: '#909399', opacity: 0.6 },
             label: { backgroundColor: '#f4f4f5', color: '#909399', borderColor: '#e9e9eb' },
             children: [],
             isLoading: true // 自定义标记
        }
    }
    
    // 转换为前端图表数据
    return transformToChartData(familyData);
})

const handleMindMapClick = (params: any) => {
    if (params.data && params.data.isLoading) {
        ElMessage.info('正在深入挖掘单词族谱，请稍候...')
    }
}

const progressPercentage = computed(() => {
    if (cards.value.length === 0) return 0;
    return Math.floor(((currentIndex.value) / cards.value.length) * 100);
})

const format = (percentage: number) => (percentage === 100 ? 'Finished' : `${percentage}%`)

const playAudio = (text: string) => {
  cancelAudio()
  if (!speakEnglishWord(text, message => ElMessage.warning(message))) {
    ElMessage.warning('当前浏览器不支持网页语音，请尝试系统浏览器')
  }
}

const handleResult = (result: 'forget' | 'remember') => {
    if (!isFlipped.value || advancing.value) return
    advancing.value = true
    if (result === 'remember') rememberedCount.value++
    else forgottenCount.value++
    // 自动翻回正面
    if (isFlipped.value) {
        isFlipped.value = false;
        // 等待翻转动画一半时间后切换数据，体验更顺滑
        advanceTimer = setTimeout(() => {
            if (currentIndex.value < cards.value.length) {
              currentIndex.value++;
            }
            advancing.value = false
        }, 300)
    } else {
        if (currentIndex.value < cards.value.length) {
          currentIndex.value++;
        }
    }
}

function flipCard() {
  if (!advancing.value) isFlipped.value = !isFlipped.value
}

function handleCardKeydown(event: KeyboardEvent) {
  if (event.target === event.currentTarget) flipCard()
}
</script>

<style scoped>
.review-page {
  width: 100%;
  height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #f4f3ea;
  box-sizing: border-box;
}
.review-state { margin: auto; text-align: center; color: #244332; line-height: 1.7; }
.review-state h2 { margin-bottom: 10px; }.review-state p { margin-bottom: 20px; }
.reveal-guidance { color: #5d715f; font-size: 13px; padding: 12px; text-align: center; }
.result-summary { color: #315b40; font-weight: 700; margin-top: 8px; }
.flashcard:focus-visible, .voice-icon-wrapper:focus-visible, .action-btn:focus-visible { outline: 3px solid #d5a44e; outline-offset: 4px; }
.action-btn:disabled { opacity: .55; cursor: wait; }

/* 装饰背景 */
.background-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
}
.shape-1 {
  width: 60vw;
  height: 60vw;
  max-width: 600px;
  max-height: 600px;
  background: rgba(79, 172, 254, 0.15);
  top: -200px;
  left: -200px;
}
.shape-2 {
  width: 50vw;
  height: 50vw;
  max-width: 500px;
  max-height: 500px;
  background: rgba(161, 140, 209, 0.15);
  bottom: -150px;
  right: -150px;
}

/* 新增样式：左侧脑图定位 */
.mind-map-panel {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 500px; /* 增加宽度，展示更完整的脑图 */
  height: 600px;
  z-index: 2; /* 确保不被背景圆遮挡，但在 header 下面 */
  /* 可以加个半透明背景方便看清文字 */
  /* background: rgba(255,255,255,0.3); */
  /* backdrop-filter: blur(5px); */
  /* border-radius: 12px; */
}

/* 如果屏幕太小，隐藏脑图，避免遮挡卡片 */
@media (max-width: 1200px) {
  .mind-map-panel {
    display: none;
  }
}

/* 顶部 Header */
.glass-panel {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-title {
  font-weight: 700;
  color: #2c3e50;
  font-size: 1.1rem;
}

.progress-badge {
    background: rgba(255, 255, 255, 0.5);
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
    color: #555;
    font-family: monospace;
}

/* 卡片容器 */
.card-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  perspective: 1200px;
  z-index: 1;
  width: 100%;
  max-width: 600px;
}

.card-wrapper {
  width: 100%;
  height: 520px;
  margin-bottom: 40px;
}

.flashcard {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 30px;
  box-shadow: 
    0 10px 30px -10px rgba(50, 50, 93, 0.25),
    0 5px 15px -10px rgba(0, 0, 0, 0.3),
    inset 0 0 0 2px white; /* 内发光效果 */
  box-sizing: border-box;
  padding: 30px;
  overflow: hidden;
}

/* 卡片 - 正面设计 */
.card-front {
   background: radial-gradient(circle at 10% 20%, rgb(255, 252, 252) 0%, rgb(250, 250, 255) 90.2%);
}

.voice-icon-wrapper {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f0f2f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4facfe;
    cursor: pointer;
    transition: all 0.3s;
}
.voice-icon-wrapper:hover {
    background: #e6eefb;
    transform: scale(1.1);
}

.card-image-box {
  width: 100%;
  max-width: 340px;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 25px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  border: 6px solid #fff;
  background: #f0f2f5;
}
.card-image-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s;
}
.card-front:hover .card-image-box img {
    transform: scale(1.1);
}

.card-content-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.word {
  font-size: 3.5rem;
  font-weight: 800;
  background: -webkit-linear-gradient(315deg, #1e3c72 0%, #2a5298 74%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0px; 
  letter-spacing: -1.5px;
}

.phonetic {
  color: #9aa8b9;
  font-family: 'Times New Roman', serif;
  font-size: 1.4rem;
  margin-top: 10px;
}

.card-hint {
   position: absolute;
   bottom: 30px;
   font-size: 12px;
   color: #ccc;
   text-transform: uppercase;
   letter-spacing: 2px;
}

/* 卡片 - 背面设计 */
.card-back {
  transform: rotateY(180deg);
  background: #fff;
  justify-content: flex-start;
  padding-top: 50px;
}

.meaning-wrapper {
    margin-bottom: 30px;
    position: relative;
}
.meaning-wrapper::after {
    content: '';
    display: block;
    width: 40px;
    height: 4px;
    background: #4facfe;
    margin: 15px auto 0;
    border-radius: 2px;
}

.meaning {
  font-size: 1.6rem;
  color: #333;
  margin: 0;
  text-align: center;
  font-weight: 700;
}

.example-box {
    width: 100%;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    margin-top: 10px;
}
.example-en {
  font-size: 1.15rem;
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-weight: 500;
  line-height: 1.4;
}
.example-cn {
  color: #7f8c8d;
  margin: 0;
}

/* 按钮区域 */
.actions {
  display: flex;
  gap: 20px;
  width: 100%;
  padding: 0 10px;
  justify-content: space-between;
}

.action-btn {
  flex: 1;
  height: 60px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.btn-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-btn.forget {
    background: #fff0f0;
    color: #ff5252;
}
.action-btn.forget:hover {
    background: #ffdede;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255, 82, 82, 0.15);
}

.action-btn.remember {
    background: #e8f5e9;
    color: #4caf50;
}
.action-btn.remember:hover {
    background: #c8e6c9;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(76, 175, 80, 0.15);
}
.action-btn:active {
    transform: scale(0.98);
}

.completion-container {
    width: 100%;
    max-width: 600px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.completion-actions {
    display: flex;
    gap: 20px;
    margin-top: 30px;
    width: 100%;
    justify-content: center;
}

.back-btn, .consolidate-btn {
    min-width: 140px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.consolidate-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
}
.consolidate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(118, 75, 162, 0.3);
}

/* 巩固面板样式 - 全屏 Overlay */
.consolidation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #f0f7ff 0%, #dbeafe 100%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
}

.overlay-header {
    height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 30px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.05);
}

.logo-text {
    font-weight: 800;
    font-size: 1.2rem;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.story-title-mini {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2c3e50;
    margin: 0;
}

.cons-content-wrapper {
    flex: 1;
    display: flex;
    overflow: hidden;
    padding: 30px;
    gap: 30px;
}

/* 左侧：本组单词回顾 */
.cons-left-panel {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    display: flex;
    justify-content: center;
}

.story-scroll-container {
    height: 100%;
    overflow-y: auto;
    padding-right: 15px;
    width: 100%;
    max-width: 700px;
}
.word-recap-intro { padding: 22px 26px; border-radius: 16px; background: #fff; color: #2d4435; }
.word-recap-intro h3 { margin: 0 0 7px; font-size: 23px; }
.word-recap-intro p { margin: 0; color: #607364; line-height: 1.6; }
.recap-list { display: grid; gap: 12px; margin: 18px 0 0; padding: 0; list-style: none; }
.recap-item { padding: 16px 20px; border: 1px solid #dce5da; border-radius: 14px; background: #fff; }
.recap-word { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 44px; padding: 5px 0; border: 0; background: transparent; color: #315c44; font: 700 23px Georgia, serif; text-align: left; cursor: pointer; }
.recap-word:hover { color: #244a35; text-decoration: underline; }
.recap-word:focus-visible { outline: 3px solid #d5a44e; outline-offset: 3px; border-radius: 6px; }
.recap-index { color: #7d9581; font: 700 12px 'Noto Sans SC', sans-serif; }
.recap-item p { margin: 6px 0 0 29px; color: #4b5d50; line-height: 1.6; overflow-wrap: anywhere; }


/* 右侧：交互工具区 */
.cons-right-panel {
    width: 380px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.6);
}

.tools-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
}

.tool-card {
    background: rgba(255,255,255,0.6);
    border-radius: 12px;
    padding: 15px;
}

.highlight-card {
    background: linear-gradient(135deg, #fff 0%, #f0f7ff 100%);
    border: 1px solid #c6e2ff;
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.15);
}

.tool-header h3 {
    margin: 0 0 15px 0;
    font-size: 1rem;
    color: #4a5568;
    display: flex;
    align-items: center;
    gap: 8px;
}

.word-checklist {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.check-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: white;
    border-radius: 8px;
    transition: all 0.3s;
}
.is-mastered {
    background: #f0f9eb;
    color: #67C23A;
    font-weight: 600;
}
.check-dot {
    width: 14px;
    height: 14px;
    border: 2px solid #dcdfe6;
    border-radius: 50%;
}
.status-icon {
    width: 20px;
    display: flex;
    justify-content: center;
}

.spelling-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.spelling-hint {
    font-size: 0.95rem;
    color: #606266;
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    border-left: 3px solid #667eea;
}
.hint-label {
    font-weight: bold;
    font-size: 0.8rem;
    color: #909399;
}
.empty-spelling {
    text-align: center;
    color: #909399;
    padding: 20px 0;
    font-size: 0.9rem;
}

.feedback-msg {
    text-align: center;
    font-weight: bold;
    padding: 5px;
    border-radius: 4px;
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.feedback-msg.success { color: #67C23A; background: #e1f3d8; }
.feedback-msg.error { color: #F56C6C; background: #fde2e2; }

@keyframes popIn {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.tool-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.action-toggle {
    width: 100%;
}
.bottom-btns {
    display: flex;
    gap: 10px;
    justify-content: space-between;
}
.bottom-btns button {
    flex: 1;
}


/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

/* 完成状态卡片 & 容器 */
.completion-stage {
    width: 100%;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.completion-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    width: 100%;
    max-width: 500px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.completion-actions {
    display: flex;
    gap: 20px;
    margin-top: 40px;
    justify-content: center;
    width: 100%;
}

.success-icon-wrapper {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 25px;
    box-shadow: 0 10px 20px rgba(253, 185, 49, 0.3);
}
.success-icon {
    font-size: 40px;
    color: white;
}
.back-btn {
    width: 150px;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
}
.consolidate-btn {
    width: 180px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 6px 15px rgba(118, 75, 162, 0.3);
    transition: transform 0.2s;
}
.consolidate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(118, 75, 162, 0.4);
}
.review-header { background: #fffefa; border: 1px solid #dce5d8; box-shadow: none; }
.review-header :deep(.el-progress-bar__inner) { background-color: #648969 !important; }
.header-title, .progress-badge { color: #294733; }
.progress-badge { background: #eaf0e7; }
.card-face { background: #fffefa; border: 1px solid #e0e6db; box-shadow: 0 16px 38px #29463112; }
.card-front { background: #fffefa; }
.word { background: none; -webkit-text-fill-color: #244b35; color: #244b35; font-family: Georgia, serif; overflow-wrap: anywhere; text-align: center; }
.voice-icon-wrapper { border: 0; background: #eaf1e8; color: #315b40; }
.action-btn.forget { background: #f8ede8; color: #a65843; }
.action-btn.remember { background: #e8f1e6; color: #315b40; }
.consolidate-btn { background: #315b40; box-shadow: none; }
.action-btn { min-height: 56px; border-radius: var(--xl-button-radius); font-weight: 800; transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease; }
.action-btn.forget { border: 1px solid #d9ae9e; background: #fff7f2; color: #9e523d; box-shadow: 0 2px 0 #ead1c7; }
.action-btn.forget:hover:not(:disabled) { background: #fbece4; transform: translateY(-2px); box-shadow: 0 4px 0 #ead1c7; }
.action-btn.remember { border: 1px solid #254c35; background: var(--xl-brand); color: white; box-shadow: var(--xl-button-shadow); }
.action-btn.remember:hover:not(:disabled) { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.action-btn:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
.back-btn { border: 1px solid #b8cbb9; background: var(--xl-surface); color: var(--xl-brand); box-shadow: var(--xl-outline-shadow); }
.consolidate-btn { border: 1px solid #254c35; background: var(--xl-brand); color: white; box-shadow: var(--xl-button-shadow); }
.consolidate-btn:hover { background: var(--xl-brand-hover); box-shadow: var(--xl-button-shadow-hover); }
@media (max-width: 680px) {
  .review-page { height: auto; min-height: 100vh; overflow: visible; padding: 14px 14px 38px; }
  .background-shape { display: none; }
  .review-header { margin-bottom: 20px; padding: 15px; }
  .header-title { font-size: 14px; }
  .card-container { flex: none; justify-content: flex-start; }
  .card-wrapper { height: min(58vh, 460px); min-height: 320px; margin-bottom: 17px; }
  .card-face { padding: 20px; border-radius: 18px; }
  .card-back { padding-top: 38px; }
  .card-image-box { height: 130px; margin-bottom: 15px; }
  .word { font-size: clamp(32px, 8vw, 52px); }
  .phonetic { font-size: 17px; }
  .actions { gap: 10px; padding: 0; }
  .action-btn { min-height: 52px; height: auto; border-radius: 10px; }
  .meaning { font-size: 21px; }
  .example-box { padding: 14px; }
  .completion-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .completion-actions .el-button { width: 100%; margin: 0; }
  .consolidation-overlay { height: 100dvh; }
  .cons-content-wrapper { flex-direction: column; overflow-y: auto; padding: 12px; gap: 12px; }
  .cons-left-panel { flex: none; padding: 0; overflow: visible; }
  .story-scroll-container { max-width: none; overflow: visible; padding: 0; }
  .word-recap-intro { padding: 17px; }
  .recap-item { padding: 12px 15px; }
  .cons-right-panel { width: 100%; padding: 15px; flex: none; }
  .overlay-header { padding: 0 12px; gap: 10px; }
  .story-title-mini { font-size: 13px; }
}
@media (min-width: 681px) and (max-height: 760px) {
  .review-page { min-height: 100vh; height: auto; overflow: visible; }
  .card-wrapper { height: 440px; margin-bottom: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .flashcard, .action-btn, .fade-slide-enter-active, .fade-slide-leave-active { transition: none; }
  .feedback-msg { animation: none; }
}
</style>
