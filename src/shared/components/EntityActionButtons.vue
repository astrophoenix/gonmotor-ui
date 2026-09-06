<script setup>
import { ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { IconFileTypePdf, IconFileTypeXls } from '@tabler/icons-vue';
import { API_BASE_URL } from '../config/env';
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
  }
});

const emit = defineEmits(['add', 'pdfExportError', 'excelExportError']);

const { showSuccess } = useToast();

function apiPath() {
  const base = props.entityApiPath || props.entity;
  return base.replace(/^\/+|\/+$/g, '');
}

function getAccessToken() {
  return localStorage.getItem('gonmotor_access_token')
    || sessionStorage.getItem('gonmotor_access_token');
}

function getEmpresaId() {
  return localStorage.getItem('gonmotor_empresa_id')
    || sessionStorage.getItem('gonmotor_empresa_id');
}

function goToAdd() {
  if (getEntityAddMode(props.entity) === ADD_MODE.modal) {
    emit('add');
    return;
  }
  window.location.assign(`/crud/${props.entity}/agregar/`);
}

const isExportingPdf = ref(false);

async function downloadFile(path, filename) {
  const token = getAccessToken();
  const empresaId = getEmpresaId();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(empresaId ? { 'X-Empresa-ID': empresaId } : {})
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.detail || data?.non_field_errors?.[0] || 'No se pudo generar el archivo.';
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

async function exportPdf() {
  isExportingPdf.value = true;
  try {
    const token = getAccessToken();
    const empresaId = getEmpresaId();
    const url = `${API_BASE_URL.replace(/\/$/, '')}/api/${apiPath()}/exportar-pdf/`;

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(empresaId ? { 'X-Empresa-ID': empresaId } : {})
      }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = data?.detail || `Error en la descarga (status ${response.status}).`;
      throw new Error(message);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `listado_${props.entity}.pdf`;
    document.body.appendChild(a);
    a.click();

    showSuccess(`PDF generado: listado_${props.entity}.pdf`);

    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

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
    await downloadFile(`/api/${apiPath()}/export-excel/`, `${props.entity}_reporte.xlsx`);
    showSuccess(`Excel generado: ${props.entity}_reporte.xlsx`);
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
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
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
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg border border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-gray-800"
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
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-600 rounded-lg border border-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
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
