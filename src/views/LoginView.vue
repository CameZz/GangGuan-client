<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { getToken, getSavedUser, type SavedUser } from '@/api'

const router = useRouter()
const userStore = useUserStore()

const SAVED_EMPLOYEE_ID_KEY = 'gangguan:saved-employee-id'

const employeeId = ref('')
const password = ref('')
const rememberLogin = ref(false)
const error = ref('')
const isLoggingIn = ref(false)

const savedUser = ref<SavedUser | null>(null)
const savedToken = ref<string | null>(null)

const hasSavedToken = computed(() => !!savedToken.value && !!savedUser.value)

onMounted(() => {
  const savedEmployeeId = localStorage.getItem(SAVED_EMPLOYEE_ID_KEY)

  if (savedEmployeeId) {
    employeeId.value = savedEmployeeId
  }

  savedUser.value = getSavedUser()
  savedToken.value = getToken()
})

function persistEmployeeId(remember: boolean) {
  if (remember) {
    localStorage.setItem(SAVED_EMPLOYEE_ID_KEY, employeeId.value)
  } else {
    localStorage.removeItem(SAVED_EMPLOYEE_ID_KEY)
  }
}

async function afterLogin() {
  const { storesManager } = await import('@/stores')
  await storesManager.initDataAndWebSocket()
  router.push('/projects')
}

async function handleOneClickLogin() {
  error.value = ''
  isLoggingIn.value = true

  try {
    const success = await userStore.autoLogin()
    if (success) {
      await afterLogin()
    } else {
      savedUser.value = null
      savedToken.value = null
      error.value = '登录已过期，请重新登录'
    }
  } finally {
    isLoggingIn.value = false
  }
}

async function handleLogin() {
  error.value = ''

  if (!employeeId.value || !password.value) {
    error.value = '请输入工号和密码'
    return
  }

  isLoggingIn.value = true
  try {
    const success = await userStore.login(employeeId.value, password.value, rememberLogin.value)
    if (success) {
      persistEmployeeId(rememberLogin.value)
      await afterLogin()
    } else {
      error.value = '工号或密码错误'
    }
  } finally {
    isLoggingIn.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">钢管系统</h1>
        <p class="login-subtitle">项目管理平台</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="label">工号</label>
          <input
            v-model="employeeId"
            type="text"
            class="input"
            placeholder="请输入工号"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label class="label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <label class="save-login-option">
          <input
            v-model="rememberLogin"
            type="checkbox"
            class="save-login-checkbox"
          />
          <span>记住登录</span>
        </label>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="isLoggingIn">
          {{ isLoggingIn ? '登录中...' : '登录' }}
        </button>

        <button
          v-if="hasSavedToken"
          type="button"
          class="btn btn-secondary btn-block"
          :disabled="isLoggingIn"
          @click="handleOneClickLogin"
        >
          一键登录&nbsp;&nbsp;({{ savedUser?.name }})
        </button>
      </form>

      <div class="login-footer">
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.input {
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.save-login-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.save-login-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.demo-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>