<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'frappe-ui'
import { loginWithCredentials } from '../data/auth'
import { brand } from '../data/brand'
import { isParentRole } from '../data/permissions'
import { safeInternalPath } from '../lib/security'
import SchoolLogo from '../components/SchoolLogo.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const user = await loginWithCredentials({
      email: email.value,
      password: password.value,
      remember: remember.value,
    })
    toast.success('Welcome back')
    const fallback = isParentRole(user.role) ? '/parent-portal' : '/dashboard'
    const redirect = safeInternalPath(route.query.redirect, fallback)
    await router.replace(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not sign in'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function forgotPassword() {
  toast.info('Ask your school admin to reset your password')
}

function askAdmin() {
  toast.info('Contact your school admin for a desk invite')
}
</script>

<template>
  <div class="login-page">
    <div class="login-left">
      <header class="login-brand">
        <SchoolLogo size="md" />
        <div>
          <p class="login-brand-title">{{ brand.shortName }}</p>
          <p class="login-brand-sub">Kindergarten & Primary desk</p>
        </div>
      </header>

      <div class="login-form-wrap">
        <div class="login-form-head">
          <h1>Welcome Back</h1>
          <p>Enter your email and password to access your school account.</p>
        </div>

        <form class="login-form" @submit.prevent="submit">
          <label class="login-field">
            <span>Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="you@school.edu"
              required
            />
          </label>

          <label class="login-field">
            <span>Password</span>
            <div class="login-password">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                class="login-eye"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <span
                  :class="showPassword ? 'lucide-eye-off' : 'lucide-eye'"
                  aria-hidden="true"
                />
              </button>
            </div>
          </label>

          <div class="login-row">
            <label class="login-check">
              <input v-model="remember" type="checkbox" />
              <span>Remember Me</span>
            </label>
            <button type="button" class="login-link" @click="forgotPassword">
              Forgot Your Password?
            </button>
          </div>

          <p v-if="error" class="login-error">{{ error }}</p>

          <button type="submit" class="login-submit" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Log In' }}
          </button>
        </form>

        <p class="login-help">
          Need an account?
          <button type="button" class="login-link-strong" @click="askAdmin">
            Ask your school admin.
          </button>
        </p>
      </div>

      <footer class="login-footer">
        Copyright © {{ new Date().getFullYear() }} Little Royals Kindergarten
        and Primary School.
      </footer>
    </div>

    <aside class="login-right" aria-hidden="true">
      <div class="login-panel">
        <div class="login-panel-copy">
          <h2>Nursery &amp; primary desk for Baby Class through P.7.</h2>
          <p>
            Attendance, admissions, NCDC assessments, UNEB PLE prep, fees, and
            parent SMS — built for Little Royals Kindergarten and Primary.
          </p>
        </div>

        <div class="login-widgets">
          <div class="login-card">
            <p class="login-card-label">Enrollment</p>
            <p class="login-card-value">248</p>
            <p class="login-card-up">+12 this term</p>
          </div>
          <div class="login-card">
            <p class="login-card-label">Attendance today</p>
            <p class="login-card-value">96%</p>
            <p class="login-card-up">On track</p>
          </div>
          <div class="login-card">
            <p class="login-card-label">Fee collections</p>
            <div class="login-bars" aria-hidden="true">
              <span style="height: 38%" />
              <span style="height: 58%" />
              <span style="height: 46%" />
              <span style="height: 72%" />
              <span style="height: 64%" />
              <span style="height: 88%" />
              <span style="height: 76%" />
            </div>
          </div>
          <div class="login-card login-card-donut">
            <p class="login-card-label">Class capacity</p>
            <div class="login-donut-wrap">
              <div class="login-donut" />
              <p class="login-donut-value">84%</p>
            </div>
          </div>
          <div class="login-card login-card-wide">
            <p class="login-card-label">Recent activity</p>
            <ul>
              <li>
                <span class="dot blue" />
                Admissions
                <strong>3 new applications</strong>
              </li>
              <li>
                <span class="dot green" />
                Finance
                <strong>UGX 1.2M collected</strong>
              </li>
              <li>
                <span class="dot amber" />
                Parents
                <strong>SMS broadcast sent</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.login-page {
  --login-blue: #4353ff;
  --login-blue-deep: #2e3192;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
  color: #111827;
  font-family:
    'Inter',
    'Segoe UI',
    system-ui,
    -apple-system,
    sans-serif;
  box-sizing: border-box;
  overflow-x: clip;
}

.login-left {
  display: flex;
  flex-direction: column;
  padding: clamp(1.25rem, 2.5vw, 1.75rem) clamp(1.25rem, 3vw, 2.5rem)
    1.25rem;
  min-height: 100vh;
  min-height: 100dvh;
  min-width: 0;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.login-brand-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.login-brand-sub {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 500;
}

.login-form-wrap {
  width: 100%;
  max-width: 24rem;
  margin: auto;
  padding: 1rem 0 2rem;
}

.login-form-head {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-form-head h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.login-form-head p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #6b7280;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.login-field > span {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.login-field input,
.login-password input {
  width: 100%;
  height: 2.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.7rem;
  padding: 0 0.9rem;
  font-size: 0.95rem;
  background: #fff;
  color: #0f172a;
  outline: none;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.login-field input:focus,
.login-password input:focus {
  border-color: var(--login-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--login-blue) 18%, white);
}

.login-password {
  position: relative;
}

.login-password input {
  padding-right: 2.75rem;
}

.login-eye {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #9ca3af;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 0.4rem;
}

.login-eye:hover {
  color: #4b5563;
  background: #f3f4f6;
}

.login-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.15rem;
}

.login-check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--login-blue);
  cursor: pointer;
  user-select: none;
}

.login-check input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--login-blue);
}

.login-link,
.login-link-strong {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: var(--login-blue);
}

.login-link {
  font-size: 0.875rem;
  font-weight: 600;
}

.login-link:hover,
.login-link-strong:hover {
  text-decoration: underline;
}

.login-link-strong {
  font-weight: 700;
}

.login-error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.6rem;
  background: #fde8e9;
  color: #c41218;
  font-size: 0.85rem;
}

.login-submit {
  margin-top: 0.35rem;
  height: 2.9rem;
  border: 0;
  border-radius: 0.8rem;
  background: var(--login-blue);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--login-blue) 35%, transparent);
  transition:
    background 140ms ease,
    transform 140ms ease;
}

.login-submit:hover:not(:disabled) {
  background: var(--login-blue-deep);
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: wait;
}

.login-help {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}

.login-footer {
  margin-top: auto;
  font-size: 0.78rem;
  color: #9ca3af;
}

.login-right {
  padding: 1.25rem 1.25rem 1.25rem 0.5rem;
  min-height: 100vh;
  min-height: 100dvh;
  min-width: 0;
}

.login-panel {
  height: 100%;
  min-height: calc(100vh - 2.5rem);
  border-radius: 1.75rem;
  background: linear-gradient(160deg, #4b58ff 0%, #4353ff 45%, #2e3192 100%);
  color: #fff;
  padding: 2.5rem 2.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.login-panel-copy h2 {
  margin: 0 0 0.85rem;
  max-width: 18ch;
  font-size: clamp(1.85rem, 2.8vw, 2.55rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.login-panel-copy p {
  margin: 0;
  max-width: 36ch;
  font-size: 1rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.88);
}

.login-widgets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  margin-top: auto;
}

.login-card {
  background: #fff;
  color: #0f172a;
  border-radius: 1rem;
  padding: 1rem 1.05rem;
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12);
}

.login-card-wide {
  grid-column: 1 / -1;
}

.login-card-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

.login-card-value {
  margin: 0.45rem 0 0.2rem;
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.login-card-up {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #16a34a;
}

.login-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  height: 4.5rem;
  margin-top: 0.75rem;
}

.login-bars span {
  flex: 1;
  border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
  background: linear-gradient(180deg, #6b78ff, #4353ff);
}

.login-card-donut {
  display: flex;
  flex-direction: column;
}

.login-donut-wrap {
  position: relative;
  width: 4.75rem;
  height: 4.75rem;
  margin: 0.65rem auto 0;
}

.login-donut {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(#4353ff 0 84%, #e5e7eb 84% 100%);
  mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0);
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 10px),
    #000 0
  );
}

.login-donut-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.login-card-wide ul {
  list-style: none;
  margin: 0.7rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.login-card-wide li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.84rem;
  color: #475569;
}

.login-card-wide strong {
  margin-left: auto;
  color: #0f172a;
  font-weight: 600;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.dot.blue {
  background: #4353ff;
}
.dot.green {
  background: #16a34a;
}
.dot.amber {
  background: #f59e0b;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-right {
    display: none;
  }

  .login-left {
    min-height: 100vh;
    min-height: 100dvh;
    padding-inline: max(1.25rem, env(safe-area-inset-left))
      max(1.25rem, env(safe-area-inset-right));
  }
}

@media (max-width: 420px) {
  .login-form-head h1 {
    font-size: 1.65rem;
  }

  .login-form-wrap {
    max-width: 100%;
  }
}
</style>
