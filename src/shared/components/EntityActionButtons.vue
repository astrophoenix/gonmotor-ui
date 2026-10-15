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
    <button
      v-if="showAdd"
      type="button"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded bg-primary-500 shadow-xs hover:bg-primary-600 focus:ring-4 focus:ring-primary-300 disabled:opacity-50"
      @click="goToAdd"
    >
      <Plus class="w-5 h-5 mr-1.5 -ml-1 text-white" />
      Agregar
    </button>
    <button
      v-if="showExportPdf"
      type="button"
      title="Exportar a PDF"
      :disabled="isExportingPdf"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded border border-red-600 shadow-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-gray-800"
      @click="exportPdf"
    >
      <IconFileTypePdf v-if="!isExportingPdf" class="w-5 h-5" />
      <svg v-else class="w-5 h-5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </button>
    <button
      v-if="showExportExcel"
      type="button"
      title="Exportar a Excel"
      :disabled="isExportingExcel"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-600 rounded border border-emerald-600 shadow-xs hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
      @click="exportExcel"
    >
      <IconFileTypeXls v-if="!isExportingExcel" class="w-5 h-5" />
      <svg v-else class="w-5 h-5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </button>
  </div>

  <ToastContainer />
</template>
