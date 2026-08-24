<script setup>
import { API_BASE_URL } from '../config/env';

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
  }
});

function getAccessToken() {
  return localStorage.getItem('gonmotor_access_token')
    || sessionStorage.getItem('gonmotor_access_token');
}

function goToAdd() {
  window.location.assign(`/crud/${props.entity}/agregar/`);
}

async function downloadFile(path, filename) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
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

function exportPdf() {
  downloadFile(`/api/${props.entity}/export_pdf/`, `${props.entity}_reporte.pdf`);
}

function exportExcel() {
  downloadFile(`/api/${props.entity}/export_excel/`, `${props.entity}_reporte.xlsx`);
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-if="showAdd"
      type="button"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-100 active:bg-primary-200 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
      @click="goToAdd"
    >
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7.757v8.486M7.757 12h8.486M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
      </svg>
      Agregar
    </button>
    <button
      v-if="showExportPdf"
      type="button"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg border border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-gray-800"
      @click="exportPdf"
    >
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 17v-5h1.5a1.5 1.5 0 1 1 0 3H5m12 2v-5h2m-2 3h2M5 10V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1v6M5 19v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1M10 3v4a1 1 0 0 1-1 1H5m6 4v5h1.375A1.627 1.627 0 0 0 14 15.375v-1.75A1.627 1.627 0 0 0 12.375 12H11Z"/>
      </svg>
    </button>
    <button
      v-if="showExportExcel"
      type="button"
      class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-600 rounded-lg border border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
      @click="exportExcel"
    >
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m8-2h3m-3 3h3m-4 3v6m4-3H8M19 4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1ZM8 12v6h8v-6H8Z"/>
      </svg>
    </button>
  </div>
</template>
