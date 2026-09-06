<script setup>
import { computed } from 'vue';
import { Info, CheckCircle, TriangleAlert, XCircle, X } from 'lucide-vue-next';

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

const typeIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: TriangleAlert,
  error: XCircle,
};

const alertIcon = computed(() => typeIcons[props.type] || typeIcons.default);

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
    <component :is="alertIcon" class="shrink-0 w-4 h-4 me-3" aria-hidden="true" />
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
      <X class="w-3 h-3" />
    </button>
  </div>
</template>
