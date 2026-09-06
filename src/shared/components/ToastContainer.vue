<script setup>
import { CheckCircle, XCircle, Info, X } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

const typeClasses = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const icon = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
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
        <component
          :is="icon[toast.type] || icon.info"
          class="w-5 h-5 shrink-0 mt-0.5 mr-3"
        />
        <p class="text-sm flex-1">{{ toast.message }}</p>
        <button
          type="button"
          class="ml-3 text-gray-400 hover:text-gray-600"
          @click="removeToast(toast.id)"
        >
          <X class="w-4 h-4" />
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
