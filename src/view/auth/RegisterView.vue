<template>
  <div class="auth-page">
    <header class="site-header">
      <router-link class="brand" to="/welcome" aria-label="学灵首页">
        <img src="/logo.svg" alt="" />
        <span>学灵</span>
      </router-link>
      <router-link class="site-link" to="/login">已有账号？登录 <span aria-hidden="true">↗</span></router-link>
    </header>

    <main class="auth-main">
      <section class="auth-layout" aria-label="注册学灵账号">
        <div class="story-panel">
          <div class="story-top"><span>THE LEARNING SPACE</span><span class="story-star" aria-hidden="true">✦</span></div>

          <div class="story-copy">
            <p class="eyebrow">A PAGE A DAY · 从这里开始</p>
            <h2>从今天起，<br /><em>每天向前一点。</em></h2>
            <p>把想学的内容放进计划，<br />让每一次记住，都有下一次的回响。</p>
          </div>

          <section class="learning-preview" aria-label="开始学习的三个步骤">
            <div class="preview-meta"><span>YOUR LEARNING PATH</span><span>01 — 03</span></div>
            <div class="preview-heading"><span class="preview-spark" aria-hidden="true">✳</span><div><strong>一段有节奏的学习</strong><small>从第一本词书开始</small></div></div>
            <ol class="preview-steps">
              <li><span class="step-number">01</span><div><strong>选一本词书</strong><small>从你感兴趣的内容开始</small></div><span class="step-mark" aria-hidden="true">↗</span></li>
              <li><span class="step-number">02</span><div><strong>每天学一点</strong><small>新词和复习，按自己的节奏来</small></div></li>
              <li><span class="step-number">03</span><div><strong>看见每次积累</strong><small>学习记录会替你记住走过的路</small></div></li>
            </ol>
            <div class="preview-footer"><span>START SMALL. KEEP GOING.</span><span aria-hidden="true">✦</span></div>
          </section>

          <div class="story-bottom"><span>LEARN WITH CURIOSITY</span><span>© 学灵</span></div>
        </div>

        <div class="form-panel">
          <div class="form-inner">
            <div class="form-heading">
              <p class="form-eyebrow"><span></span> 开启你的学习日常</p>
              <h1>创建账号<span class="heading-dot">.</span></h1>
              <p>只需一个邮箱，就能保存你的学习进度。</p>
            </div>

            <div class="mobile-note" aria-hidden="true"><span>✦ 从今天开始</span><strong>begin.</strong><small>让每一步都有迹可循</small></div>

            <el-form
              ref="registerFormRef"
              :model="registerForm"
              :rules="registerRules"
              label-position="top"
              class="register-form"
              @submit.prevent="handleRegister"
            >
              <el-form-item label="邮箱地址" prop="email">
                <el-input
                  id="register-email"
                  v-model="registerForm.email"
                  type="email"
                  inputmode="email"
                  autocomplete="username"
                  placeholder="name@example.com"
                  size="large"
                  @blur="registerForm.email = registerForm.email.trim()"
                  @input="clearErrors"
                />
              </el-form-item>

              <el-form-item label="设置密码" prop="password">
                <el-input
                  id="register-password"
                  v-model="registerForm.password"
                  type="password"
                  autocomplete="new-password"
                  placeholder="输入你的密码"
                  size="large"
                  show-password
                  @input="clearErrors"
                />
                <p class="field-hint" :class="{ 'hint-valid': passwordStrengthInfo.isValid }">
                  至少 8 位，包含大写字母、小写字母和数字<span v-if="registerForm.password && passwordStrengthInfo.isValid"> · {{ passwordStrengthInfo.message }}</span>
                </p>
              </el-form-item>

              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  id="register-confirm-password"
                  v-model="registerForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="再次输入密码"
                  size="large"
                  show-password
                  @input="clearErrors"
                />
              </el-form-item>

              <el-form-item label="邮箱验证码" prop="verificationCode">
                <div class="verification-row">
                  <el-input
                    id="register-code"
                    v-model="registerForm.verificationCode"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    placeholder="6 位数字验证码"
                    size="large"
                    class="code-input"
                    @input="clearErrors"
                  />
                  <el-button
                    class="code-button"
                    native-type="button"
                    :loading="sendingCode"
                    :disabled="sendingCode || (countdown > 0 && sentTo === registerForm.email.trim())"
                    @click="sendVerificationCode"
                  >{{ countdown > 0 && sentTo === registerForm.email.trim() ? `${countdown} 秒后重发` : '获取验证码' }}</el-button>
                </div>
                <p v-if="sentTo" class="code-note" role="status">验证码已发送至 {{ sentTo }}，请查看收件箱。</p>
              </el-form-item>

              <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>

              <el-form-item class="submit-item">
                <el-button
                  class="register-button"
                  type="primary"
                  native-type="submit"
                  size="large"
                  :loading="loading"
                  :disabled="loading || registered"
                >{{ registered ? '注册成功，正在跳转…' : '创建账号' }}</el-button>
              </el-form-item>
            </el-form>

            <div class="form-bottom"><p>已有账号？<router-link to="/login">立即登录 <span aria-hidden="true">↗</span></router-link></p></div>
          </div>
          <p class="panel-note">A thoughtful way to keep learning.</p>
        </div>
      </section>
    </main>

    <footer class="site-footer"><span>学灵 · 让学习有迹可循</span><span>© {{ new Date().getFullYear() }} 学灵</span></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { register, sendVerificationCode as sendCode } from '@/api/auth'
import { validateEmail, validatePasswordStrength, validateVerificationCode } from '@/utils/validators'
import type { RegisterDTO } from '@/types/auth'

const router = useRouter()
const registerFormRef = ref<FormInstance>()
const registerForm = reactive({ email: '', password: '', confirmPassword: '', verificationCode: '' })
const loading = ref(false)
const registered = ref(false)
const sendingCode = ref(false)
const submitError = ref('')
const sentTo = ref('')
const countdown = ref(0)
let countdownTimer: number | undefined
let redirectTimer: number | undefined

const passwordStrengthInfo = computed(() => registerForm.password
  ? validatePasswordStrength(registerForm.password)
  : { isValid: false, strength: 'weak', message: '' })

function clearErrors() {
  submitError.value = ''
}

watch(() => registerForm.password, () => {
  if (registerForm.confirmPassword) registerFormRef.value?.validateField('confirmPassword')
})

const registerRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { validator: (_rule, value: string, callback) => callback(validateEmail(value?.trim()) ? undefined : new Error('请输入有效的邮箱地址')), trigger: 'blur' }
  ],
  password: [
    { validator: (_rule, value: string, callback) => {
      const result = validatePasswordStrength(value)
      callback(result.isValid ? undefined : new Error(result.message))
    }, trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: (_rule, value: string, callback) => callback(!value ? new Error('请再次输入密码') : value === registerForm.password ? undefined : new Error('两次输入的密码不一致')), trigger: 'blur' }
  ],
  verificationCode: [
    { validator: (_rule, value: string, callback) => callback(validateVerificationCode(value) ? undefined : new Error('请输入 6 位数字验证码')), trigger: 'blur' }
  ]
}

function startCountdown() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      window.clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }, 1000)
}

async function sendVerificationCode() {
  if (sendingCode.value || (countdown.value > 0 && sentTo.value === registerForm.email.trim())) return
  const email = registerForm.email.trim()
  if (!validateEmail(email)) {
    registerFormRef.value?.validateField('email')
    submitError.value = '请先输入有效的邮箱地址，再获取验证码。'
    return
  }

  sendingCode.value = true
  submitError.value = ''
  try {
    const response = await sendCode(email)
    if (response.code !== 0) {
      submitError.value = response.msg || '验证码发送失败，请稍后重试。'
      return
    }
    sentTo.value = email
    startCountdown()
    ElMessage.success(response.msg || '验证码已发送，请查收邮箱')
  } catch (error: unknown) {
    console.error('发送验证码失败:', error)
    const requestError = error as { response?: { data?: { msg?: string } } }
    submitError.value = requestError.response?.data?.msg || '验证码发送失败，请检查网络连接。'
  } finally {
    sendingCode.value = false
  }
}

async function handleRegister() {
  if (loading.value || registered.value || !registerFormRef.value) return
  loading.value = true
  submitError.value = ''
  try {
    const isValid = await registerFormRef.value.validate().catch(() => false)
    if (!isValid) return

    const registerData: RegisterDTO = {
      email: registerForm.email.trim(),
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
      verificationCode: registerForm.verificationCode.trim()
    }
    const response = await register(registerData)
    if (response.code !== 0) {
      submitError.value = response.msg || '注册失败，请检查填写的信息。'
      return
    }

    registered.value = true
    ElMessage.success(response.msg || '注册成功，即将前往登录页')
    redirectTimer = window.setTimeout(() => { void router.push('/login') }, 1000)
  } catch (error: unknown) {
    console.error('注册失败:', error)
    const requestError = error as { response?: { data?: { msg?: string } } }
    submitError.value = requestError.response?.data?.msg || '注册暂时失败，请稍后再试。'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
  if (redirectTimer) window.clearTimeout(redirectTimer)
})
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
.story-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.story-top,
.story-bottom {
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

.learning-preview {
  position: relative;
  width: min(100%, 390px);
  margin: auto auto 22px;
  padding: 18px 25px 0;
  border: 1px solid #e5e5d6;
  border-radius: 11px;
  background: #faf8ee;
  box-shadow: 7px 8px 0 rgba(12, 37, 22, .25), 0 18px 28px rgba(9, 27, 17, .15);
  color: var(--xl-ink);
  transform: rotate(-1.5deg);
}

.learning-preview::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 8px -9px -8px 9px;
  border: 1px solid rgba(231, 229, 213, .7);
  border-radius: 11px;
  background: #e8e9d9;
}

.preview-meta,
.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #778b77;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .14em;
}

.preview-heading { display: flex; align-items: center; gap: 13px; margin: 16px 0 11px; }
.preview-spark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e6ecdd;
  color: #aa8447;
  font-size: 23px;
}
.preview-heading strong { display: block; font: 650 19px/1.4 var(--xl-font-display); }
.preview-heading small { display: block; margin-top: 2px; color: #788976; font-size: 11px; }

.preview-steps { position: relative; margin: 0; padding: 0; list-style: none; }
.preview-steps::before { content: ''; position: absolute; top: 18px; bottom: 30px; left: 17px; width: 1px; background: #cad9c8; }
.preview-steps li { position: relative; display: flex; align-items: center; gap: 15px; min-height: 58px; border-top: 1px solid #e2e7db; }
.step-number {
  width: 35px;
  height: 35px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid #cbd7c7;
  border-radius: 50%;
  background: #faf8ee;
  color: #66836a;
  font-size: 10px;
  font-weight: 800;
}
.preview-steps li:first-child .step-number { border-color: #315b40; background: #315b40; color: #fffefa; }
.preview-steps li div { min-width: 0; }
.preview-steps strong { display: block; font-size: 13px; font-weight: 800; }
.preview-steps small { display: block; margin-top: 3px; color: #728372; font-size: 10px; line-height: 1.5; }
.step-mark { margin-left: auto; align-self: flex-start; margin-top: 13px; color: #ad8547; font-size: 19px; }
.preview-footer { margin-inline: -25px; padding: 9px 25px; border-top: 1px solid #e2e7db; }
.preview-footer span:last-child { color: #b98947; font-size: 17px; line-height: 1; }

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

.register-form { margin-top: 32px; }

.register-form :deep(.el-form-item) { margin-bottom: 21px; }

.register-form :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 9px;
  color: var(--xl-ink);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
}

.register-form :deep(.el-input__wrapper) {
  min-height: 52px;
  padding-inline: 15px;
  border-radius: 10px;
  background: #fffefa;
  box-shadow: 0 0 0 1px #ccd7cb inset;
  transition: box-shadow .2s ease, background-color .2s ease;
}

.register-form :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #8fa891 inset; }
.register-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px var(--xl-brand) inset; }
.register-form :deep(.el-input__inner) { color: var(--xl-ink); font-size: 15px; }
.register-form :deep(.el-input__inner::placeholder) { color: #97a398; }
.register-form :deep(.el-form-item__error) { position: static; margin-top: 6px; font-size: 12px; }
.register-form :deep(.el-form-item.is-error .el-input__wrapper) { box-shadow: 0 0 0 1px #b66358 inset; }

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

.register-form :deep(.submit-item) { margin: 25px 0 0; }

.register-button {
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

.register-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .18) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform .65s ease;
}

.register-button:hover:not(.is-disabled) { background: var(--xl-brand-hover); }
.register-button:hover:not(.is-disabled)::before { transform: translateX(120%); }
.register-button:active:not(.is-disabled) { transform: translateY(1px); }
.register-button:focus-visible { outline: 3px solid var(--xl-accent); outline-offset: 3px; }

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
  .learning-preview { margin-bottom: 10px; }
  .preview-steps li { min-height: 56px; }
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
  .register-form { margin-top: 32px; }
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
  .site-footer { min-height: 52px; }
}

@media (max-width: 350px) {
  .form-panel { padding-inline: 18px; }
  .site-link { font-size: 12px; }
  .site-footer span:last-child { display: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .story-copy { animation: rise-in .7s .08s both; }
  .learning-preview { animation: rise-in .75s .2s both; }
  .form-inner { animation: rise-in .7s .16s both; }
  @keyframes rise-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

.auth-layout { min-height: min(744px, calc(100svh - 143px)); }
.story-copy { margin-top: clamp(34px, 5vh, 54px); }
.story-copy h2 { font-size: clamp(41px, 3.6vw, 52px); }
.story-copy > p:last-child { margin-top: 18px; line-height: 1.7; }
.form-panel { padding-block: 35px 42px; }
.form-heading h1 { margin-top: 12px; }
.form-heading > p:last-child { margin-bottom: 0; }
.register-form { margin-top: 24px; }
.register-form :deep(.el-form-item) { margin-bottom: 16px; }
.register-form :deep(.el-form-item__label) { margin-bottom: 7px; }
.register-form :deep(.el-form-item__content) { align-items: stretch; }
.field-hint,
.code-note {
  width: 100%;
  margin: 7px 0 0;
  color: #6f806f;
  font-size: 11px;
  line-height: 1.55;
}
.field-hint.hint-valid,
.code-note { color: var(--xl-brand); }
.verification-row { width: 100%; display: flex; gap: 10px; align-items: stretch; }
.code-input { min-width: 0; flex: 1; }
.code-button {
  flex: none;
  min-width: 128px;
  min-height: 52px;
  margin: 0;
  padding-inline: 12px;
  border: 1px solid #b6c9b4;
  border-radius: 10px;
  background: #edf3e9;
  color: var(--xl-brand);
  font-size: 12px;
  font-weight: 800;
}
.code-button:hover:not(.is-disabled) { border-color: var(--xl-brand); background: #e0ebdd; color: var(--xl-brand-hover); }
.code-button.is-disabled { color: #788778; background: #f1f3ed; border-color: #d7dfd4; }
.register-form :deep(.submit-item) { margin-top: 23px; }
.submit-error { margin-top: 4px; }
.form-bottom { margin-top: 20px; padding-top: 16px; }
.mobile-note { display: none; }

@media (max-width: 900px) and (min-width: 721px) {
  .story-copy h2 { font-size: 37px; }
  .learning-preview { padding-inline: 18px; }
  .preview-footer { margin-inline: -18px; padding-inline: 18px; }
}

@media (max-height: 760px) and (min-width: 721px) {
  .auth-layout { min-height: 0; }
  .story-panel { min-height: 660px; }
}

@media (max-width: 720px) {
  .form-panel { padding-block: 38px 42px; }
  .register-form { margin-top: 24px; }
  .mobile-note {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 24px;
    padding: 11px 13px;
    border: 1px solid #d9e3d4;
    border-radius: 10px;
    background: #f5f8f0;
    color: var(--xl-brand);
  }
  .mobile-note span { font-size: 11px; font-weight: 750; }
  .mobile-note strong { margin-left: auto; font: italic 600 19px var(--xl-font-display); }
  .mobile-note small { color: #6a7c6a; font-size: 11px; }
}

@media (max-width: 430px) {
  .form-panel { padding: 34px 24px 36px; }
  .mobile-note { flex-wrap: wrap; column-gap: 9px; }
  .mobile-note small { width: 100%; }
}

@media (max-width: 390px) {
  .verification-row { flex-direction: column; }
  .code-button { width: 100%; }
}
</style>
