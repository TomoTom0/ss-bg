<template>
  <TransitionGroup name="toast" tag="div" class="toast-container" aria-live="polite">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast--${toast.type}`]"
      :role="toast.type === 'error' ? 'alert' : 'status'"
    >
      <span class="toast__message">{{ toast.message }}</span>
      <button class="toast__close" aria-label="閉じる" @click="$emit('remove', toast.id)">×</button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { Toast } from './toast';

defineProps<{ toasts: Toast[] }>();
defineEmits<{ (e: 'remove', id: number): void }>();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 240px;
  max-width: 480px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
}

.toast__message {
  flex: 1;
}

.toast__close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
  opacity: 0.7;
}

.toast__close:hover {
  opacity: 1;
}

.toast--success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.toast--error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.toast--info {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.toast--warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

/* 入場: フェード + 上からスライドイン */
.toast-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

/* 退場: フェード + 右へスライドアウト */
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* 複数トーストの整列移動 */
.toast-move {
  transition: transform 0.25s ease;
}

/* アニメーションを抑える設定への配慮 */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: opacity 0.15s ease;
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
