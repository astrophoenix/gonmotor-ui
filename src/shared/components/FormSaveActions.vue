<script setup>
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
      class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
    >
      <svg class="w-6 h-6 mr-1 -ml-1 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 0 1 1-1h11.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z"/>
        <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M8 4h8v4H8V4Zm7 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
      </svg>
      {{ isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Guardar') }}
    </button>
  </div>
</template>
