<script setup>
import { Save } from 'lucide-vue-next';

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  cancelHref: {
    type: String,
    required: true,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
});

function handleSubmit() {
  if (props.isLoading) {
    return;
  }
  props.onSubmit();
}
</script>

<template>
  <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
    <a
      :href="cancelHref"
      class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
      >Cancelar</a
    >
    <button
      type="button"
      :disabled="isLoading"
      @click="handleSubmit"
      class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
    >
      <Save class="w-5 h-5 mr-1.5 -ml-1 text-white" />
      {{ isLoading ? 'Guardando...' : 'Guardar' }}
    </button>
  </div>
</template>
