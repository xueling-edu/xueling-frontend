<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { createRequestId } from '@/utils/requestId'

export type CorrectionTarget = {
  wordId: string
  word: string
  meaning?: string
  phonetic?: string
  example?: string
  exampleTranslation?: string
}

const props = defineProps<{ target: CorrectionTarget }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()
const busy = ref(false)
const form = reactive({ type: 'meaning', content: '', suggestion: '', requestId: createRequestId() })

async function submit() {
  if (form.content.trim().length < 5) return ElMessage.warning('请至少写 5 个字的问题描述')
  if (busy.value) return
  busy.value = true
  try {
    const { createFeedback } = await import('./api')
    const observed = form.type === 'meaning' ? props.target.meaning
      : form.type === 'sound' ? props.target.phonetic
        : `${props.target.example || ''}\n${props.target.exampleTranslation || ''}`.trim()
    const result = await createFeedback({
      requestId: form.requestId, category: 'TRANSLATION', subcategory: form.type,
      content: form.content.trim(), sourcePage: route.path,
      contextWord: props.target.word, wordId: props.target.wordId,
      observedContent: observed?.slice(0, 2000) || undefined, suggestedContent: form.suggestion.trim() || undefined,
    })
    ElMessage.success(`反馈已收到，编号 #${result.data.id}`)
    emit('close')
  } catch (error: any) {
    ElMessage.error(error?.msg || error?.response?.data?.msg || '反馈未送达，请重试')
  } finally { busy.value = false }
}
</script>

<template>
  <el-dialog :model-value="true" :title="`反馈 ${target.word} 的内容问题`" width="min(92vw, 460px)"
    :close-on-click-modal="false" @close="emit('close')">
    <div style="display:grid;gap:14px">
      <label>问题类型
        <select v-model="form.type" style="display:block;width:100%;padding:9px;margin-top:5px">
          <option value="meaning">释义错误</option><option value="sound">发音或音标问题</option>
          <option value="example">例句问题</option><option value="other">其他内容问题</option>
        </select>
      </label>
      <label>问题描述 <el-input v-model="form.content" type="textarea" :rows="4" maxlength="2000" show-word-limit /></label>
      <label>建议的正确内容（可选） <el-input v-model="form.suggestion" type="textarea" :rows="2" maxlength="2000" /></label>
    </div>
    <template #footer><el-button @click="emit('close')">取消</el-button><el-button type="primary" :loading="busy" @click="submit">提交反馈</el-button></template>
  </el-dialog>
</template>
