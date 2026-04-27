<script setup lang="ts">
// App header component
</script>

<template>
  <header class="header">
    <div class="header-left">
      <h1 class="logo">GangGuan</h1>
      <nav class="nav">
        <router-link to="/" class="nav-link">仪表盘</router-link>
        <router-link to="/kanban" class="nav-link">看板</router-link>
        <router-link to="/list" class="nav-link">列表</router-link>
        <router-link to="/members" class="nav-link">成员</router-link>
      </nav>
    </div>
    <div class="header-right">
      <div class="connection-status">
        <span class="status-dot"></span>
        <span class="status-text">模拟模式</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.nav-link.router-link-active {
  background-color: var(--color-primary);
  color: white;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-success);
  border-radius: 50%;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
</style>
