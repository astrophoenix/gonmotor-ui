<script setup>
import { ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { IconFileTypeXls, IconFileTypePdf } from '@tabler/icons-vue';
import { request } from '../services/httpClient';
import { descargarBlob, filenameDesdeContentDisposition } from '../utils/download';
import { useToast } from '../composables/useToast';
import ToastContainer from './ToastContainer.vue';
import { ADD_MODE, getEntityAddMode } from '../config/entityConfig';

const props = defineProps({
  entity: {
    type: String,
    required: true
  },
  showAdd: {
    type: Boolean,
    default: true
  },
  showExportPdf: {
    type: Boolean,
    default: true
  },
  showExportExcel: {
    type: Boolean,
    default: true
  },
  entityApiPath: {
    type: String,
    default: ''
  },
  exportParams: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['add', 'pdfExportError', 'excelExportError']);

const { showSuccess } = useToast();

function apiPath() {
  const base = props.entityApiPath || props.entity;
  return base.replace(/^\/+|\/+$/g, '');
}

function exportUrlPath(action) {
  let path = `/api/${apiPath()}/${action}`;
  const params = new URLSearchParams();
  if (props.exportParams) {
    Object.entries(props.exportParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) {
        return;
      }
      params.set(key, value);
    });
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function goToAdd() {
  if (getEntityAddMode(props.entity) === ADD_MODE.modal) {
    emit('add');
    return;
  }
  window.location.assign(`/crud/${props.entity}/agregar/`);
}

const isExportingPdf = ref(false);

// Vía httpClient para enviar también X-Taller-ID (el PDF respeta el taller
// activo igual que el listado) y refrescar el JWT si expiró.
async function downloadFile(path, fallbackFilename) {
  const { blob, contentDisposition } = await request(path, { responseType: 'blob' });
  const filename = filenameDesdeContentDisposition(contentDisposition, fallbackFilename);
  descargarBlob(blob, filename);
  return filename;
}

async function exportPdf() {
  if (isExportingPdf.value) return;
  isExportingPdf.value = true;
  try {
    const filename = await downloadFile(exportUrlPath('exportar-pdf/'), `listado_${props.entity}.pdf`);
    showSuccess(`PDF generado: ${filename}`);
  } catch (error) {
    emit('pdfExportError', error.message || 'Ocurrió un error al generar el PDF.');
  } finally {
    isExportingPdf.value = false;
  }
}

const isExportingExcel = ref(false);

async function exportExcel() {
  if (isExportingExcel.value) return;
  isExportingExcel.value = true;
  try {
    const filename = await downloadFile(exportUrlPath('export-excel/'), `${props.entity}_reporte.xlsx`);
    showSuccess(`Excel generado: ${filename}`);
  } catch (error) {
    emit('excelExportError', error.message || 'Ocurrió un error al generar el Excel.');
  } finally {
    isExportingExcel.value = false;
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      v-if="showExportPdf || showExportExcel"
      class="inline-flex overflow-hidden bg-white border rounded-lg shadow-xs border-slate-200 divide-x divide-slate-200 dark:bg-gray-800 dark:border-gray-600 dark:divide-gray-600"
      role="group"
      aria-label="Exportar listado"
    >
      <button
        v-if="showExportPdf"
        type="button"
        title="Exportar a PDF"
        :disabled="isExportingPdf"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
        @click="exportPdf"
      >
        <IconFileTypePdf v-if="!isExportingPdf" class="w-4 h-4 text-red-600 dark:text-red-400" />
        <svg v-else class="w-4 h-4 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        PDF
      </button>
      <button
        v-if="showExportExcel"
        type="button"
        title="Exportar a Excel"
        :disabled="isExportingExcel"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
        @click="exportExcel"
      >
        <IconFileTypeXls v-if="!isExportingExcel" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <svg v-else class="w-4 h-4 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Excel
      </button>
    </div>
    <button
      v-if="showAdd"
      type="button"
      class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-lg shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-200 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus:ring-brand-800"
      @click="goToAdd"
    >
      <Plus class="w-4 h-4 -ml-0.5" />
      Agregar
    </button>
  </div>

  <ToastContainer />
</template>
