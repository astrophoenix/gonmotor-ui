<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'default',
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  dismissible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['dismiss']);

const typeClasses = {
  default: 'text-gray-800 bg-gray-50 dark:bg-gray-800 dark:text-gray-300',
  info: 'text-blue-800 bg-blue-50 dark:bg-gray-800 dark:text-blue-400',
  success: 'text-green-800 bg-green-50 dark:bg-gray-800 dark:text-green-400',
  warning: 'text-yellow-800 bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300',
  error: 'text-red-800 bg-red-50 dark:bg-gray-800 dark:text-red-400',
};

const iconPaths = {
  default: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z',
  info: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z',
  success: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
  warning: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM12 14a1 1 0 100-2 1 1 0 000 2zm-1 5a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 11-2 0v-1z',
  error: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z',
};

function dismiss() {
  emit('dismiss');
}
</script>

<template>
  <div
    v-if="message"
    :class="[
      'flex items-center p-4 mb-4 text-sm rounded-lg',
      typeClasses[type] || typeClasses.default,
    ]"
    role="alert"
  >
    <svg
      class="shrink-0 w-4 h-4 me-3"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path :d="iconPaths[type] || iconPaths.default"/>
    </svg>
    <span class="sr-only">{{ type }}</span>
    <div>
      <span v-if="title" class="font-medium mr-1">{{ title }} </span>
      <span v-if="title && message"> </span>
      <span>{{ message }}</span>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="ms-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8"
      :class="[
        type === 'default' ? 'text-gray-500 bg-gray-50 hover:bg-gray-200 focus:ring-gray-400' : '',
        type === 'info' ? 'text-blue-500 bg-blue-50 hover:bg-blue-200 focus:ring-blue-400' : '',
        type === 'success' ? 'text-green-500 bg-green-50 hover:bg-green-200 focus:ring-green-400' : '',
        type === 'warning' ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-200 focus:ring-yellow-400' : '',
        type === 'error' ? 'text-red-500 bg-red-50 hover:bg-red-200 focus:ring-red-400' : '',
      ]"
      @click="dismiss"
      aria-label="Close"
    >
      <span class="sr-only">Cerrar notificación</span>
      <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
      </svg>
    </button>
  </div>
</template>
