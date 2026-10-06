<script setup>
import { Loader2 } from 'lucide-vue-next';
import { IconFileDownload } from '@tabler/icons-vue';
import { usePdfExport } from '../composables/usePdfExport';

const props = defineProps({
  descargador: {
    type: Function,
    required: true,
  },
  label: {
    type: String,
    default: 'Exportar PDF',
  },
  title: {
    type: String,
    default: 'Descargar la cotización en PDF',
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
    class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-brand-600 border border-brand-500/40 bg-white hover:bg-brand-500/10 focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:text-brand-100 dark:bg-gray-800 dark:hover:bg-gray-700"
    @click="handleClick"
  >
    <Loader2 v-if="isExportingPdf" class="w-4 h-4 animate-spin" />
    <IconFileDownload v-else class="w-4 h-4" />
    {{ isExportingPdf ? 'Generando...' : label }}
  </button>
</template>