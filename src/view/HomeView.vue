<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown, User, Setting, ChatLineSquare, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

async function handleCommand(command: string) {
  if (command === 'profile') {
    await router.push('/user/profile')
    return
  }
  if (command === 'settings') {
    await router.push('/settings')
    return
  }
  if (command === 'feedback') {
    await router.push({ path: '/feedback', query: { from: '/' } })
    return
  }
  if (command !== 'logout') return
  try {
    await userStore.logout()
    ElMessage.success('已退出登录')
    await router.push('/login')
  } catch (error) {
    console.error('退出登录失败:', error)
    ElMessage.error('退出登录失败，请重试')
  }
}
</script>

<template>
  <div class="home-page">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="brand" aria-label="学灵首页">
          <img src="/logo.svg" alt="" class="logo" />
          <span>学灵</span>
        </router-link>
        <el-dropdown trigger="click" @command="handleCommand">
          <button class="avatar-wrapper" type="button" aria-label="打开账户菜单">
            <el-avatar :size="34" :src="userStore.avatar" class="user-avatar">
              {{ userStore.username?.charAt(0)?.toUpperCase() || 'U' }}
            </el-avatar>
            <span class="username">{{ userStore.username || '学员' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile"><el-icon><User /></el-icon>个人中心</el-dropdown-item>
              <el-dropdown-item command="settings"><el-icon><Setting /></el-icon>设置</el-dropdown-item>
              <el-dropdown-item command="feedback"><el-icon><ChatLineSquare /></el-icon>意见反馈</el-dropdown-item>
              <el-dropdown-item command="logout" divided><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="home-main">
      <header class="home-intro">
        <h1>今天学什么？</h1>
        <p>从一个方向开始，保持每天的学习节奏。</p>
      </header>
      <section class="subjects" aria-label="学习方向">
        <h2 class="section-heading">学习方向</h2>
        <router-link to="/english" class="subject-card">
          <span class="subject-content">
            <span class="subject-symbol" aria-hidden="true">Aa</span>
            <span class="subject-copy">
              <strong>英语学习</strong>
              <small>记住新词，在阅读中持续积累。</small>
              <span class="subject-topics">单词记忆 <i aria-hidden="true"></i> 文章阅读</span>
            </span>
          </span>
          <span class="subject-side" aria-hidden="true">
            <span class="subject-art"><span class="art-card art-card-back"></span><span class="art-card art-card-front"><b>word</b><i></i><i></i></span></span>
            <span class="subject-cta">进入英语学习 <span>→</span></span>
          </span>
        </router-link>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-page { min-height: 100vh; background: var(--xl-bg); }
.site-header { background: var(--xl-surface); border-bottom: 1px solid var(--xl-border); }
.header-inner { width: min(100% - 48px, var(--xl-content-width)); min-height: 70px; margin: auto; display: flex; align-items: center; gap: 24px; }
.brand { display: inline-flex; align-items: center; gap: 10px; color: var(--xl-ink); text-decoration: none; font: 700 23px var(--xl-font-display); white-space: nowrap; }
.logo { width: 36px; height: 36px; object-fit: contain; }
.brand { margin-right: auto; }
.avatar-wrapper { display: flex; align-items: center; gap: 10px; border: 0; background: none; color: var(--xl-ink); cursor: pointer; padding: 6px; border-radius: var(--xl-radius-sm); }
.avatar-wrapper:hover { background: var(--xl-surface-muted); }
.user-avatar { background: var(--xl-brand); color: white; }
.username { font-size: 13px; font-weight: 700; }
.home-main { width: min(100% - 48px, var(--xl-content-width)); margin: auto; padding: 48px 0 88px; }
.home-intro { margin-bottom: 42px; }
.home-intro h1 { font: 700 clamp(34px, 4vw, 46px)/1.18 var(--xl-font-display); letter-spacing: -.035em; }
.home-intro p { margin-top: 12px; color: var(--xl-ink-soft); font-size: 15px; line-height: 1.7; }
.section-heading { margin-bottom: 16px; color: var(--xl-ink-soft); font-size: 13px; font-weight: 700; letter-spacing: .04em; }
.subject-card { position: relative; isolation: isolate; width: 100%; min-height: 238px; display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 34px 40px; overflow: hidden; border: 1px solid #cbd9c9; border-radius: var(--xl-radius-lg); background: #eaf1e7; color: var(--xl-ink); text-decoration: none; transition: border-color .18s, background-color .18s, box-shadow .18s, transform .18s; }
.subject-card:hover { border-color: #95b096; background: #e5eee2; box-shadow: var(--xl-shadow-card); transform: translateY(-2px); }
.subject-content { display: flex; align-items: center; gap: 26px; min-width: 0; }
.subject-symbol { flex: none; width: 92px; height: 92px; display: grid; place-items: center; border: 1px solid #e2e9dd; border-radius: 18px; background: var(--xl-surface); color: var(--xl-brand); font: italic 47px/1 var(--xl-font-display); }
.subject-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; min-width: 0; }
.subject-copy strong { font: 700 clamp(25px, 3vw, 31px)/1.2 var(--xl-font-display); letter-spacing: -.025em; }
.subject-copy small { color: var(--xl-ink-soft); font-size: 14px; line-height: 1.5; }
.subject-topics { margin-top: 4px; color: #54745a; font-size: 12px; font-weight: 700; }
.subject-topics i { display: inline-block; width: 3px; height: 3px; margin: 0 7px 3px; border-radius: 50%; background: currentColor; }
.subject-side { position: relative; align-self: stretch; flex: 0 0 236px; display: flex; align-items: flex-end; justify-content: flex-end; }
.subject-art { position: absolute; top: -22px; right: 12px; width: 190px; height: 170px; opacity: .9; }
.art-card { position: absolute; width: 105px; height: 132px; border-radius: 12px; }
.art-card-back { top: 21px; left: 68px; transform: rotate(14deg); background: #b5ceb0; }
.art-card-front { top: 17px; left: 43px; display: flex; flex-direction: column; gap: 12px; padding: 23px 14px; transform: rotate(-8deg); border: 1px solid #dce6d7; background: #fffefa; box-shadow: 0 12px 22px #315b401c; }
.art-card-front b { color: var(--xl-brand); font: italic 23px/1 var(--xl-font-display); }
.art-card-front i { width: 68px; height: 5px; border-radius: 4px; background: #d6e0d1; }
.art-card-front i:last-child { width: 48px; }
.subject-cta { z-index: 1; display: inline-flex; align-items: center; gap: 18px; color: var(--xl-brand); font-size: 14px; font-weight: 800; }
.subject-cta span { font-size: 21px; transition: transform .18s; }
.subject-card:hover .subject-cta span { transform: translate(2px, -2px); }
@media (max-width: 760px) {
  .header-inner { width: min(100% - 32px, var(--xl-content-width)); min-height: 62px; }
  .username { display: none; }
  .home-main { width: min(100% - 32px, var(--xl-content-width)); padding: 36px 0 60px; }
  .home-intro { margin-bottom: 34px; }
  .home-intro p { font-size: 14px; }
  .subject-card { min-height: 206px; padding: 25px; }
  .subject-content { gap: 18px; }
  .subject-symbol { width: 68px; height: 68px; border-radius: 14px; font-size: 35px; }
  .subject-side { flex-basis: 140px; }
  .subject-art { display: none; }
}
@media (max-width: 520px) {
  .subject-card { min-height: 220px; flex-direction: column; align-items: stretch; gap: 28px; padding: 24px; }
  .subject-content { align-items: flex-start; gap: 16px; }
  .subject-symbol { width: 58px; height: 58px; font-size: 30px; }
  .subject-copy { gap: 7px; }
  .subject-copy strong { font-size: 24px; }
  .subject-copy small { font-size: 13px; }
  .subject-side { flex: none; align-self: flex-start; }
}
@media (prefers-reduced-motion: reduce) { .subject-card, .subject-cta span { transition: none; }.subject-card:hover, .subject-card:hover .subject-cta span { transform: none; } }
</style>
