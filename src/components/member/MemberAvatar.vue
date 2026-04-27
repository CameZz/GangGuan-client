<script setup lang="ts">
import { computed } from 'vue'
import type { Member } from '@/types'

const props = defineProps<{
  member?: Member | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}>()

const sizeClass = computed(() => `size-${props.size || 'md'}`)

const initials = computed(() => {
  if (!props.member?.name) return '?'
  return props.member.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <div class="member-avatar-wrapper" :class="{ 'with-name': showName }">
    <div class="member-avatar" :class="sizeClass">
      <img
        v-if="member?.avatar"
        :src="member.avatar"
        :alt="member.name"
        class="avatar-img"
      />
      <span v-else class="avatar-initials">{{ initials }}</span>
    </div>
    <span v-if="showName && member" class="member-name">{{ member.name }}</span>
    <span v-else-if="showName" class="member-name unassigned">未分配</span>
  </div>
</template>

<style scoped>
.member-avatar-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.member-avatar-wrapper.with-name {
  padding: 4px 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-tertiary);
}

.member-avatar {
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.size-sm {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.size-md {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.size-lg {
  width: 48px;
  height: 48px;
  font-size: 16px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.member-name.unassigned {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
