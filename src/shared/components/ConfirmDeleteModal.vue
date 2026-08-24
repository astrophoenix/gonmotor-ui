<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  entityName: {
    type: String,
    default: 'registro'
  },
  itemName: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  isDeleting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const title = computed(() => `Eliminar ${props.entityName}`);

const displayMessage = computed(() => {
  if (props.message) return props.message;
  if (props.itemName) {
    return `Estás seguro de eliminar ${props.itemName} del sistema?`;
  }
  return `Estás seguro de eliminar este ${props.entityName} del sistema?`;
});

function close() {
  emit('update:modelValue', false);
}

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
  close();
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="onCancel"></div>
    <div class="relative w-full max-w-md p-4 mx-auto">
      <div class="relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
        <button
          type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-9 h-9 inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
          @click="onCancel"
        >
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
          </svg>
          <span class="sr-only">Cerrar modal</span>
        </button>

        <div class="p-4 md:p-5 text-center">
          <svg class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
          <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">{{ displayMessage }}</p>
          <div class="flex items-center space-x-4 justify-center">
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isDeleting"
              @click="onConfirm"
            >
              {{ isDeleting ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              @click="onCancel"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
