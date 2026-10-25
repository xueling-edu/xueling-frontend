<template>
  <div class="auth-page">
    <header class="site-header">
      <router-link class="brand" to="/welcome" aria-label="学灵首页">
        <img src="/logo.svg" alt="" />
        <span>学灵</span>
      </router-link>
      <router-link class="site-link" to="/welcome">了解学灵 <span aria-hidden="true">↗</span></router-link>
    </header>

    <main class="auth-main">
      <section class="auth-layout" aria-label="登录学灵">
        <div class="story-panel">
          <div class="story-top">
            <span>THE LEARNING SPACE</span>
            <span class="story-star" aria-hidden="true">✦</span>
          </div>

          <div class="story-copy">
            <p class="eyebrow">A PAGE A DAY · 学习日常</p>
            <h2>下一页，<br /><em>等你翻开。</em></h2>
            <p>你的词书、学习进度与复习安排，<br />都在这里，等你接着写。</p>
          </div>

          <div class="word-scene">
            <p class="scene-caption"><span>01 / A LITTLE DISCOVERY</span><span>轻点卡片</span></p>
            <button
              class="word-card"
              :class="{ 'is-revealed': wordRevealed }"
              type="button"
              :aria-pressed="wordRevealed"
              :aria-label="wordRevealed ? 'curious：好奇的，求知欲强的。点击收起释义' : 'curious。点击查看释义'"
              @click="wordRevealed = !wordRevealed"
            >
              <span class="word-card-top"><span>WORD / 001</span><span aria-hidden="true">✳</span></span>
              <span class="word">curious<span class="word-period">.</span></span>
              <span class="word-card-bottom">
                <span>{{ wordRevealed ? '好奇的 · 求知欲强的' : '保持一点好奇' }}</span>
                <span class="word-arrow" aria-hidden="true">↗</span>
              </span>
            </button>
            <p class="scene-footnote">一点好奇，常常是新一页的开始。</p>
          </div>

          <div class="story-bottom"><span>LEARN WITH CURIOSITY</span><span>© 学灵</span></div>
        </div>

        <div class="form-panel">
          <div class="form-inner">
            <div class="form-heading">
              <p class="form-eyebrow"><span></span> 欢迎回到学灵</p>
              <h1>欢迎回来<span class="heading-dot">.</span></h1>
              <p>登录后，继续你的学习。</p>
            </div>

            <button
              class="mobile-word"
              type="button"
              :aria-pressed="wordRevealed"
              :aria-label="wordRevealed ? 'curious：好奇的，求知欲强的。点击收起释义' : 'curious。点击查看释义'"
              @click="wordRevealed = !wordRevealed"
            >
              <span>✦ 今日一词</span>
              <strong>curious</strong>
              <small>{{ wordRevealed ? '好奇的 · 求知欲强的' : '轻点揭晓 ↗' }}</small>
            </button>

            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-position="top"
              class="login-form"
              @submit.prevent="handleLogin"
            >
              <el-form-item label="邮箱地址" prop="email">
                <el-input
                  id="login-email"
                  v-model="loginForm.email"
                  type="email"
                  inputmode="email"
                  autocomplete="username"
                  placeholder="name@example.com"
                  size="large"
                  @blur="loginForm.email = loginForm.email.trim()"
                  @input="submitError = ''"
                />
              </el-form-item>

              <el-form-item label="密码" prop="password">
                <el-input
                  id="login-password"
                  v-model="loginForm.password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="输入你的密码"
                  size="large"
                  show-password
                  @input="submitError = ''"
                />
              </el-form-item>

              <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>

              <el-form-item class="submit-item">
                <el-button
                  class="login-button"
                  type="primary"
                  native-type="submit"
                  size="large"
                  :loading="loading"
                  :disabled="loading"
                >登录</el-button>
              </el-form-item>
            </el-form>

            <div class="form-bottom">
              <p>还没有账号？<router-link to="/register">创建账号 <span aria-hidden="true">↗</span></router-link></p>
            </div>
          </div>
          <p class="panel-note">A thoughtful way to keep learning.</p>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span>学灵 · 让学习有迹可循</span>
      <span>© {{ new Date().getFullYear() }} 学灵</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type FormInstance, type FormRules } from 'element-plus'
import { login } from '@/api/auth'
import { useTokenStore } from '@/stores/token'
import { useUserStore } from '@/stores/user'
import { validateEmail } from '@/utils/validators'
import type { LoginDTO } from '@/types/auth'

const route = useRoute()
const router = useRouter()
const tokenStore = useTokenStore()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loginForm = reactive({ email: '', password: '' })
const loading = ref(false)
const submitError = ref('')
const wordRevealed = ref(false)

const loginRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        callback(validateEmail(value?.trim()) ? undefined : new Error('请输入有效的邮箱地址'))
      },
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少为 8 个字符', trigger: 'blur' }
  ]
}

function destinationAfterLogin(): string {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/'
  }

  try {
    const destination = router.resolve(redirect)
    return destination.matched.some((record) => record.meta.requiresAuth) ? destination.fullPath : '/'
  } catch {
    return '/'
  }
}

async function handleLogin() {
  if (loading.value || !loginFormRef.value) return

  loading.value = true
  submitError.value = ''

  try {
    const isValid = await loginFormRef.value.validate().catch(() => false)
    if (!isValid) return

    const loginData: LoginDTO = {
      email: loginForm.email.trim(),
      password: loginForm.password
    }
    const response = await login(loginData)

    if (response.code !== 0) {
      submitError.value = response.msg || '登录失败，请检查邮箱和密码'
      return
    }

    tokenStore.setToken(response.data)
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }

    await router.push(destinationAfterLogin())
  } catch (error: unknown) {
    console.error('登录失败:', error)
    const requestError = error as { response?: { data?: { msg?: string } } }
    submitError.value = requestError.response?.data?.msg || '登录暂时失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  background: #f5f5ee;
  color: var(--xl-ink);
}

.site-header,
.site-footer {
  width: min(100% - 64px, 1180px);
  margin-inline: auto;
}

.site-header {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--xl-ink);
  text-decoration: none;
  font: 700 23px/1 var(--xl-font-display);
}

.brand img { width: 36px; height: 36px; }

.site-link {
  color: var(--xl-ink-soft);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: color .2s ease;
}

.site-link span { margin-left: 5px; font-size: 16px; }
.site-link:hover { color: var(--xl-brand); }

.auth-main {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 10px 0 16px;
}

.auth-layout {
  width: min(100% - 64px, 1180px);
  min-height: min(680px, calc(100svh - 143px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #d9e0d4;
  border-radius: 22px;
  background: var(--xl-surface);
  box-shadow: 0 28px 65px rgba(30, 58, 39, .075), 0 2px 8px rgba(30, 58, 39, .035);
}

.story-panel {
  position: relative;
  min-height: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 36px 44px 28px;
  background: #254735;
  color: #f8f8ef;
  isolation: isolate;
}

.story-panel::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: -210px;
  right: -240px;
  width: 700px;
  height: 700px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 50%;
  box-shadow: 0 0 0 120px rgba(255, 255, 255, .025), 0 0 0 240px rgba(255, 255, 255, .02);
}

.story-panel::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: .15;
  background-image: repeating-linear-gradient(0deg, transparent 0 23px, rgba(255, 255, 255, .09) 24px);
  pointer-events: none;
}

.story-top,
.story-bottom,
.scene-caption,
.word-card-top,
.word-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.story-top,
.story-bottom,
.scene-caption,
.word-card-top {
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .16em;
}

.story-top { color: #d0ddca; }
.story-star { color: var(--xl-accent); font-size: 26px; line-height: 1; }

.story-copy { margin-top: clamp(34px, 6vh, 66px); }

.eyebrow {
  margin: 0 0 22px;
  color: #d5b982;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .12em;
}

.story-copy h2 {
  margin: 0;
  font: 600 clamp(41px, 3.8vw, 56px)/1.18 var(--xl-font-display);
  letter-spacing: -.04em;
}

.story-copy h2 em {
  color: #e4cfaa;
  font-style: normal;
}

.story-copy > p:last-child {
  margin: 22px 0 0;
  color: #d5e0d4;
  font-size: 14px;
  line-height: 1.9;
}

.word-scene {
  width: min(100%, 362px);
  margin: auto auto 20px;
}

.scene-caption {
  margin-bottom: 11px;
  color: #d3dfd1;
  letter-spacing: .11em;
}

.scene-caption span:last-child { letter-spacing: .04em; }

.word-card {
  width: 100%;
  min-height: 184px;
  display: flex;
  flex-direction: column;
  padding: 22px 25px 20px;
  border: 1px solid #e7e5d5;
  border-radius: 12px;
  background: #f9f7ec;
  box-shadow: 7px 8px 0 rgba(12, 37, 22, .26), 0 12px 24px rgba(9, 27, 17, .17);
  color: var(--xl-ink);
  text-align: left;
  cursor: pointer;
  transform: rotate(-2deg);
  transition: transform .35s cubic-bezier(.2, .8, .2, 1), box-shadow .35s ease, background-color .3s ease;
}

.word-card:hover,
.word-card:focus-visible {
  transform: rotate(0deg) translateY(-5px);
  box-shadow: 3px 13px 0 rgba(12, 37, 22, .2), 0 18px 26px rgba(9, 27, 17, .18);
}

.word-card.is-revealed { background: #fffdf5; }
.word-card-top { color: #6d7d6b; }
.word-card-top span:last-child { color: #c49445; font-size: 20px; line-height: 1; }

.word {
  margin: auto 0;
  font: italic 600 48px/1 var(--xl-font-display);
  letter-spacing: -.045em;
}

.word-period { color: #c99952; }

.word-card-bottom {
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #dbe3d6;
  font-size: 12px;
  font-weight: 700;
}

.word-arrow { color: var(--xl-brand); font-size: 18px; line-height: 1; }
.word-card.is-revealed .word-arrow { transform: rotate(135deg); }

.scene-footnote {
  margin: 16px 0 0;
  color: #cfdbca;
  font-size: 11px;
  text-align: center;
  letter-spacing: .04em;
}

.story-bottom {
  color: #bbd0ba;
  font-size: 9px;
}

.form-panel {
  position: relative;
  display: grid;
  place-items: center;
  padding: 42px 50px 50px;
  background: #fffefa;
}

.form-inner { width: min(100%, 390px); }

.form-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6c826d;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .14em;
}

.form-eyebrow span { width: 23px; height: 2px; background: var(--xl-accent); }

.form-heading h1 {
  margin: 16px 0 12px;
  font: 650 clamp(34px, 3vw, 43px)/1.2 var(--xl-font-display);
  letter-spacing: -.04em;
}

.heading-dot { color: #c89a50; }

.form-heading > p:last-child {
  color: var(--xl-ink-soft);
  font-size: 14px;
  line-height: 1.7;
}

.login-form { margin-top: 32px; }

.login-form :deep(.el-form-item) { margin-bottom: 21px; }

.login-form :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 9px;
  color: var(--xl-ink);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 52px;
  padding-inline: 15px;
  border-radius: 10px;
  background: #fffefa;
  box-shadow: 0 0 0 1px #ccd7cb inset;
  transition: box-shadow .2s ease, background-color .2s ease;
}

.login-form :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #8fa891 inset; }
.login-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px var(--xl-brand) inset; }
.login-form :deep(.el-input__inner) { color: var(--xl-ink); font-size: 15px; }
.login-form :deep(.el-input__inner::placeholder) { color: #97a398; }
.login-form :deep(.el-form-item__error) { position: static; margin-top: 6px; font-size: 12px; }
.login-form :deep(.el-form-item.is-error .el-input__wrapper) { box-shadow: 0 0 0 1px #b66358 inset; }

.submit-error {
  margin: -3px 0 18px;
  padding: 11px 13px;
  border: 1px solid #ead0c9;
  border-radius: 8px;
  background: #fbf1ed;
  color: #8c3e37;
  font-size: 13px;
  line-height: 1.55;
}

.login-form :deep(.submit-item) { margin: 25px 0 0; }

.login-button {
  position: relative;
  width: 100%;
  min-height: 52px;
  overflow: hidden;
  border: 1px solid #254c35;
  border-radius: 10px;
  background: var(--xl-brand);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: .12em;
  box-shadow: var(--xl-button-shadow);
  transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
}

.login-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .18) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform .65s ease;
}

.login-button:hover:not(.is-disabled) { background: var(--xl-brand-hover); }
.login-button:hover:not(.is-disabled)::before { transform: translateX(120%); }
.login-button:active:not(.is-disabled) { transform: translateY(1px); }
.login-button:focus-visible { outline: 3px solid var(--xl-accent); outline-offset: 3px; }

.form-bottom {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--xl-border);
  color: var(--xl-ink-soft);
  font-size: 13px;
  text-align: center;
}

.form-bottom a {
  margin-left: 5px;
  color: var(--xl-brand);
  font-weight: 800;
  text-decoration: none;
}

.form-bottom a:hover { text-decoration: underline; }
.form-bottom a span { font-size: 15px; }

.panel-note {
  position: absolute;
  right: 45px;
  bottom: 19px;
  color: #a1ada0;
  font: italic 12px var(--xl-font-display);
}

.mobile-word { display: none; }

.site-footer {
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: #7c8a7e;
  font-size: 11px;
}

@media (max-height: 760px) and (min-width: 721px) {
  .story-panel { padding-block: 28px 22px; }
  .story-copy { margin-top: 28px; }
  .eyebrow { margin-bottom: 16px; }
  .story-copy h2 { font-size: 45px; }
  .story-copy > p:last-child { margin-top: 16px; }
  .word-scene { margin-bottom: 12px; }
  .word-card { min-height: 158px; }
  .scene-footnote { margin-top: 10px; }
}

@media (max-width: 900px) {
  .auth-layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .story-panel { padding-inline: 30px; }
  .story-copy h2 { font-size: 39px; }
  .form-panel { padding-inline: 34px; }
}

@media (max-width: 720px) {
  .site-header,
  .site-footer,
  .auth-layout { width: min(100% - 36px, 520px); }

  .site-header { min-height: 72px; }
  .auth-main { padding: 10px 0 26px; align-items: start; }
  .auth-layout { min-height: 0; display: block; border-radius: 18px; }
  .story-panel { display: none; }
  .form-panel { min-height: 0; padding: 50px 36px 38px; }
  .panel-note { display: none; }
  .login-form { margin-top: 32px; }
  .mobile-word {
    width: 100%;
    min-height: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 30px;
    padding: 11px 13px;
    border: 1px solid #d9e3d4;
    border-radius: 10px;
    background: #f5f8f0;
    color: var(--xl-brand);
    text-align: left;
    cursor: pointer;
  }
  .mobile-word span { font-size: 11px; font-weight: 750; }
  .mobile-word strong { margin-left: auto; font: italic 600 19px var(--xl-font-display); }
  .mobile-word small { color: #6a7c6a; font-size: 11px; }
}

@media (max-width: 430px) {
  .site-header,
  .site-footer,
  .auth-layout { width: calc(100% - 30px); }
  .site-header { min-height: 66px; }
  .brand { font-size: 21px; }
  .brand img { width: 32px; height: 32px; }
  .form-panel { padding: 38px 24px 34px; }
  .form-heading h1 { font-size: 34px; }
  .mobile-word { flex-wrap: wrap; column-gap: 9px; }
  .mobile-word small { width: 100%; }
  .site-footer { min-height: 52px; }
}

@media (max-width: 350px) {
  .form-panel { padding-inline: 18px; }
  .site-link { font-size: 12px; }
  .site-footer span:last-child { display: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .story-copy { animation: rise-in .7s .08s both; }
  .word-scene { animation: rise-in .75s .2s both; }
  .form-inner { animation: rise-in .7s .16s both; }
  @keyframes rise-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
</style>
