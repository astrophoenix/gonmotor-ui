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
  disabled: {
    type: Boolean,
    default: false,
  },
});

function handleSubmit() {
  if (props.isLoading || props.disabled) {
    return;
  }
  props.onSubmit();
}
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <a
      :href="disabled ? undefined : cancelHref"
      :aria-disabled="disabled"
      :tabindex="disabled ? -1 : undefined"
      class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
      :class="{ 'pointer-events-none opacity-60 cursor-not-allowed': disabled }"
      >Cancelar</a
    >
    <button
      type="button"
      :disabled="isLoading || disabled"
      @click="handleSubmit"
      class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-500 hover:bg-primary-600 focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Save class="w-5 h-5 mr-1.5 -ml-1 text-white" />
      {{ isLoading ? 'Guardando...' : 'Guardar' }}
    </button>
  </div>
</template>
