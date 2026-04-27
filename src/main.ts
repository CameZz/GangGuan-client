// Vue application entry point

import { createApp } from 'vue'
import { pinia, initStores } from './stores'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

// Initialize stores with mock data
initStores()

app.mount('#app')
