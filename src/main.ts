// Vue application entry point

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia, storesManager } from './stores'
import './style.css'

const app = createApp(App)

app.use(pinia)

// Initialize stores with mock data
storesManager.init()

app.use(router)
app.mount('#app')
