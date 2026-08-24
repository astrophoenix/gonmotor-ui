<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

const typeClasses = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const icon = {
  success: 'M9 12l2 2 4-4m5.619 8.483c.171-.756.298-1.529.38-2.314m-6.282 3.975A9 9 0 0112 19c.628 0 1.242-.044 1.83-.128m-6.282 3.975A9 9 0 013 12c0-.836.1-1.653.282-2.444',
  error: 'M9.172 16.172L9 15.5V11h.071l.76.405a.75.a.75 0 00-.136-1.03l.02-.02a.75.a75 0 111.06 1.06l-.02.02v.01a.75.a75 0 001.03-.135A2.25 2.25 0 119.172 16z',
  info: 'M11.25 10.5A2.25 2.25 0 116 10.5a2.25 2.25 0 015.25 0z',
};
</script>

<template>
  <transition-group
    tag="div"
    class="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-80"
    name="toast-list"
  >
    <Transition
      v-for="toast in toasts"
      :key="toast.id"
      name="toast"
      appear
    >
      <div
        :class="[
          'flex items-start p-4 rounded-lg border shadow-lg',
          typeClasses[toast.type] || typeClasses.info,
        ]"
      >
        <svg
          class="w-5 h-5 shrink-0 mt-0.5 mr-3"
          fill="currentColor"
          :aria-hidden="icon[toast.type] ? 'true' : 'false'"
          viewBox="0 0 20 20"
        >
          <path
            v-if="toast.type === 'success'"
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
          <path
            v-else-if="toast.type === 'error'"
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
          <circle
            v-else
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
        </svg>
        <p class="text-sm flex-1">{{ toast.message }}</p>
        <button
          type="button"
          class="ml-3 text-gray-400 hover:text-gray-600"
          @click="removeToast(toast.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span class="sr-only">Cerrar notificación</span>
        </button>
      </div>
    </Transition>
  </transition-group>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
