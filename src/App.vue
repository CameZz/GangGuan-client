<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useUserStore } from '@/stores'

const route = useRoute()
const userStore = useUserStore()
const hideSidebarRoutes = ['/projects', '/login', '/admin', '/messages', '/approvals', '/my-approvals']
const hideSidebarRouteNames = ['ProjectDetail']
const hideSidebarPrefixes = ['/member-schedule']
const showSidebar = computed(() => {
  return !hideSidebarRoutes.includes(route.path)
    && !hideSidebarRouteNames.includes(String(route.name))
    && !hideSidebarPrefixes.some(prefix => route.path.startsWith(prefix))
})
const showHeader = computed(() => route.path !== '/login' && route.path !== '/projects' && route.path !== '/admin' && userStore.isLoggedIn)
</script>

<template>
  <div class="app">
    <AppHeader v-if="showHeader" />
    <div class="app-body">
      <AppSidebar v-if="showSidebar" />
      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-body {
  display: flex;
  flex: 1;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg-secondary);
}
</style>
