<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getStudyStats } from '@/features/vocab/api'
import type { StudyStats } from '@/features/vocab/types'
import type { UserDTO, UserVO } from '@/types/auth'
import PageHeading from '@/components/PageHeading.vue'

const router = useRouter()
const userStore = useUserStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const settingsRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const statsLoading = ref(true)
const statsError = ref(false)
const studyStats = ref<StudyStats | null>(null)

const form = reactive({
  username: '',
  email: '',
  phone: '',
  gender: 0,
  birthday: '',
  bio: ''
})
const original = ref({ ...form })

function loadUserProfile() {
  const saved: Partial<UserVO> = userStore.userVO || {}
  form.username = saved.username || userStore.username || ''
  form.email = saved.email || userStore.userInfo?.email || ''
  form.phone = saved.phone || ''
  form.gender = saved.gender ?? 0
  form.birthday = saved.birthday || ''
  form.bio = saved.bio || ''
  original.value = { ...form }
}

async function startEditing() {
  isEditing.value = true
  await nextTick()
  settingsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function cancelEditing() {
  Object.assign(form, original.value)
  isEditing.value = false
}

async function saveProfile() {
  if (isSaving.value) return
  if (!form.username.trim()) {
    ElMessage.warning('请填写用户名')
    return
  }
  const update: UserDTO = {}
  if (form.username.trim() !== original.value.username) update.username = form.username.trim()
  if (form.phone !== original.value.phone) update.phone = form.phone
  if (form.gender !== original.value.gender) update.gender = form.gender
  if (form.birthday !== original.value.birthday) update.birthday = form.birthday
  if (form.bio !== original.value.bio) update.bio = form.bio
  if (Object.keys(update).length === 0) {
    isEditing.value = false
    return
  }
  isSaving.value = true
  try {
    await userStore.updateProfile(update)
    loadUserProfile()
    isEditing.value = false
    ElMessage.success('个人资料已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5 MB')
    input.value = ''
    return
  }
  isUploading.value = true
  try {
    await userStore.updateAvatar(file)
    ElMessage.success('头像已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '头像上传失败，请重试')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出登录', {
      confirmButtonText: '退出登录', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  await userStore.logout()
  ElMessage.success('已退出登录')
  await router.push('/login')
}

onMounted(async () => {
  loadUserProfile()
  try {
    const response = await getStudyStats()
    if (response.code !== 0) throw new Error(response.msg || '读取失败')
    studyStats.value = response.data
  } catch {
    statsError.value = true
  } finally {
    statsLoading.value = false
  }
})
</script>

<template>
  <main class="profile-page">
    <div class="page-shell xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '个人中心' }]"
        title="个人中心"
        description="管理个人资料，查看今天的学习进展。"
      />

      <div class="profile-layout">
        <aside class="identity-card" aria-label="账户信息">
          <div class="avatar-area">
            <el-avatar :size="86" :src="userStore.avatar" class="user-avatar">{{ userStore.username?.charAt(0)?.toUpperCase() || 'U' }}</el-avatar>
            <button type="button" class="avatar-change" :disabled="isUploading" @click="fileInputRef?.click()">
              {{ isUploading ? '上传中…' : '更换头像' }}
            </button>
            <input ref="fileInputRef" type="file" accept="image/*" class="sr-only" aria-label="选择新头像" @change="handleAvatarChange" />
          </div>
          <h2>{{ userStore.username || '未设置昵称' }}</h2>
          <p class="account-email">{{ userStore.userInfo?.email }}</p>
          <button type="button" class="profile-edit" @click="startEditing">编辑个人资料</button>
          <router-link class="profile-settings" to="/settings">设置 <span aria-hidden="true">→</span></router-link>
          <button type="button" class="logout-link" @click="handleLogout">退出登录</button>
        </aside>

        <div class="profile-main">
          <section class="overview-card" aria-labelledby="overview-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">TODAY'S LEARNING</p>
                <h2 id="overview-title">今日学习概览</h2>
              </div>
              <router-link to="/english/vocab/insights">查看学习进度 →</router-link>
            </div>
            <p v-if="statsLoading" class="overview-state" role="status">正在读取学习数据…</p>
            <p v-else-if="statsError" class="overview-state" role="status">暂时无法读取学习数据，仍可继续学习。</p>
            <div v-else class="overview-stats">
              <div><span>当前待复习</span><strong>{{ studyStats?.dueCount ?? 0 }}</strong><small>张卡片</small></div>
              <div><span>今日已完成</span><strong>{{ studyStats?.todayReviewed ?? 0 }}</strong><small>次回忆</small></div>
              <div><span>今日新词</span><strong>{{ studyStats?.todayNew ?? 0 }}</strong><small>个单词</small></div>
            </div>
            <router-link class="study-link" to="/english/vocab/study">进入今日学习 <span aria-hidden="true">→</span></router-link>
          </section>

          <section ref="settingsRef" class="settings-card" aria-labelledby="settings-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">ACCOUNT DETAILS</p>
                <h2 id="settings-title">基本资料</h2>
              </div>
              <span class="settings-hint">邮箱暂不支持修改</span>
            </div>
            <el-form label-position="top" class="profile-form" @submit.prevent="saveProfile">
              <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!isEditing" maxlength="30" /></el-form-item>
              <el-form-item label="邮箱"><el-input v-model="form.email" disabled /></el-form-item>
              <el-form-item label="手机号"><el-input v-model="form.phone" :disabled="!isEditing" /></el-form-item>
              <el-form-item label="性别">
                <el-select v-model="form.gender" :disabled="!isEditing" style="width: 100%">
                  <el-option label="未设置" :value="0" /><el-option label="男" :value="1" /><el-option label="女" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item label="生日"><el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" :disabled="!isEditing" style="width: 100%" /></el-form-item>
              <el-form-item label="个人简介" class="wide-field"><el-input v-model="form.bio" type="textarea" :rows="3" :disabled="!isEditing" /></el-form-item>
              <div v-if="isEditing" class="form-actions">
                <el-button type="primary" native-type="submit" :loading="isSaving">保存修改</el-button>
                <el-button @click="cancelEditing">取消</el-button>
              </div>
            </el-form>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.profile-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.section-heading a:hover, .logout-link:hover { text-decoration: underline; }
.eyebrow { color: #66816a; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
.profile-layout { display: grid; grid-template-columns: minmax(230px, .72fr) minmax(0, 1.8fr); gap: 22px; align-items: start; }
.identity-card, .overview-card, .settings-card { background: var(--xl-surface); border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); }
.identity-card { padding: 30px 24px; text-align: center; }
.avatar-area { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.user-avatar { background: var(--xl-brand); color: white; font: 600 38px var(--xl-font-display); }
.avatar-change, .logout-link { border: 0; background: transparent; color: var(--xl-brand); font-size: 12px; font-weight: 700; cursor: pointer; }
.avatar-change:disabled { opacity: .6; cursor: wait; }
.identity-card h2 { margin: 20px 0 6px; font: 650 27px/1.25 var(--xl-font-display); overflow-wrap: anywhere; }
.account-email { color: var(--xl-ink-soft); font-size: 13px; overflow-wrap: anywhere; }
.profile-edit { width: 100%; display: flex; justify-content: center; margin-top: 30px; padding: 13px 16px; background: var(--xl-brand); border: 0; border-radius: var(--xl-radius-sm); color: white; font-weight: 750; cursor: pointer; }
.profile-edit:hover, .study-link:hover { background: var(--xl-brand-hover); }
.profile-settings { display: flex; align-items: center; justify-content: space-between; min-height: 42px; margin-top: 10px; padding: 0 18px; border: 1px solid #b8cbb9; border-radius: var(--xl-button-radius); color: var(--xl-brand); font-size: 14px; font-weight: 750; text-decoration: none; box-shadow: var(--xl-outline-shadow); }
.profile-settings:hover { background: #edf3e9; }
.logout-link { margin-top: 20px; color: #7a5646; }
.profile-main { display: grid; gap: 22px; }
.overview-card, .settings-card { padding: 28px 30px; }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 14px; margin-bottom: 22px; }
.section-heading h2 { margin-top: 7px; font: 650 29px/1.2 var(--xl-font-display); }
.section-heading a { color: var(--xl-brand); font-size: 13px; font-weight: 750; text-decoration: none; }
.overview-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--xl-border); border-bottom: 1px solid var(--xl-border); }
.overview-stats > div { display: flex; flex-direction: column; gap: 7px; padding: 20px 16px; border-right: 1px solid var(--xl-border); }
.overview-stats > div:first-child { padding-left: 0; }
.overview-stats > div:last-child { border-right: 0; }
.overview-stats span, .overview-stats small { color: var(--xl-ink-soft); font-size: 12px; }
.overview-stats strong { color: var(--xl-brand); font: 600 35px/1 var(--xl-font-display); }
.overview-state { padding: 24px 0; color: var(--xl-ink-soft); border-top: 1px solid var(--xl-border); }
.study-link { display: inline-flex; gap: 24px; justify-content: space-between; margin-top: 22px; padding: 12px 16px; border-radius: var(--xl-radius-sm); background: var(--xl-brand); color: white; font-size: 13px; font-weight: 750; text-decoration: none; }
.settings-hint { color: var(--xl-ink-soft); font-size: 12px; }
.profile-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 20px; }
.wide-field, .form-actions { grid-column: 1 / -1; }
.form-actions { display: flex; gap: 10px; }
.profile-edit, .study-link { min-height: var(--xl-button-height); align-items: center; padding: 0 18px; border: 1px solid #254c35; border-radius: var(--xl-button-radius); box-shadow: var(--xl-button-shadow); font-size: 14px; font-weight: 800; transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease; }
.profile-edit:hover, .study-link:hover { transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.profile-edit:active, .study-link:active { transform: translateY(1px); box-shadow: var(--xl-button-shadow-pressed); }
.avatar-change { min-height: 34px; padding: 0 12px; border: 1px solid #b8cbb9; border-radius: 8px; background: var(--xl-surface); box-shadow: var(--xl-outline-shadow); }
.avatar-change:hover:not(:disabled) { background: #edf3e9; }
.logout-link { min-height: 38px; padding: 0 12px; border: 1px solid transparent; border-radius: 8px; }
.logout-link:hover { background: #f8eee8; text-decoration: none; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
button:focus-visible, a:focus-visible { outline: 3px solid var(--xl-accent); outline-offset: 3px; }
@media (max-width: 760px) { .profile-layout { grid-template-columns: 1fr; }.identity-card { text-align: left; }.avatar-area { align-items: start; }.profile-edit { max-width: 260px; }.section-heading { align-items: start; flex-direction: column; }.overview-card, .settings-card { padding: 24px 20px; } }
@media (max-width: 480px) { .profile-form { grid-template-columns: 1fr; }.overview-stats > div { padding: 16px 8px; }.overview-stats strong { font-size: 27px; }.overview-stats span, .overview-stats small { font-size: 11px; } }
@media (prefers-reduced-motion: reduce) { .profile-edit, .study-link { transition: none; }.profile-edit:hover, .study-link:hover, .profile-edit:active, .study-link:active { transform: none; } }
</style>
