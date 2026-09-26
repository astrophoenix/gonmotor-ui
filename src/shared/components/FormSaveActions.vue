<script setup>
import { Save } from 'lucide-vue-next';
import { IconX } from '@tabler/icons-vue';


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
      class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-300"
      :class="{ 'pointer-events-none opacity-60 cursor-not-allowed': disabled }"
      >
      <IconX class="w-5 h-5 text-gray-900" />
      Cancelar</a
    >
    <button
      type="button"
      :disabled="isLoading || disabled"
      @click="handleSubmit"
      class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded bg-primary-500 border border-primary-500 hover:bg-primary-600 focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Save class="w-5 h-5 text-white" />
      {{ isLoading ? 'Guardando...' : 'Guardar' }}
    </button>
  </div>
</template>
