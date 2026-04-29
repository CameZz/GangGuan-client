// Vue application entry point

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia, storesManager } from './stores'
import './style.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

// Initialize stores with mock data
storesManager.init()

app.mount('#app')
