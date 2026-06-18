// Vue application entry point

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia, storesManager } from './stores'
import { configureApiBaseUrl } from './api'
import { loadAppConfig } from './utils/config'
import './style.css'

async function bootstrap() {
  const app = createApp(App)

  app.use(pinia)

  await loadAppConfig()
  configureApiBaseUrl()

  await storesManager.init()

  app.use(router)
  app.mount('#app')
}

bootstrap()
