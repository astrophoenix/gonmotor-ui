<script setup>
import { Loader2 } from 'lucide-vue-next';
import { IconFileTypePdf } from '@tabler/icons-vue';
import { usePdfExport } from '../composables/usePdfExport';

const props = defineProps({
  descargador: {
    type: Function,
    required: true,
  },
  label: {
    type: String,
    default: 'Exportar',
  },
  title: {
    type: String,
    default: 'Exportar cotización en PDF',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['success', 'error']);

const { isExportingPdf, exportarPdf } = usePdfExport({
  onSuccess: (message) => emit('success', message),
  onError: (message) => emit('error', message),
});

function handleClick() {
  if (props.disabled || isExportingPdf.value) return;
  exportarPdf(props.descargador);
}
</script>

<template>
  <button
    type="button"
    :title="title"
    :aria-label="title"
    :aria-busy="isExportingPdf"
    :disabled="disabled || isExportingPdf"
    class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
    @click="handleClick"
  >
    <Loader2 v-if="isExportingPdf" class="w-4 h-4 animate-spin" />
    <IconFileTypePdf v-else class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
    {{ isExportingPdf ? 'Exportando...' : label }}
  </button>
</template>