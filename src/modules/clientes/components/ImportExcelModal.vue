<script setup>
import { ref, computed, watch } from 'vue';
import { clientsService } from '../services/clientesService';
import { useToast } from '../../../shared/composables/useToast';
import ToastContainer from '../../../shared/components/ToastContainer.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'imported']);

const { showSuccess, showError } = useToast();

const selectedFile = ref(null);
const isImporting = ref(false);
const progress = ref(0);
const progressLabel = ref('');
const phase = ref('idle'); // idle | uploading | processing | done | error
const result = ref(null);
const importError = ref('');
const fileInput = ref(null);

const isOpen = computed(() => props.modelValue);

function resetState() {
  selectedFile.value = null;
  isImporting.value = false;
  progress.value = 0;
  progressLabel.value = '';
  phase.value = 'idle';
  result.value = null;
  importError.value = '';
}

function close() {
  resetState();
  emit('update:modelValue', false);
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  selectedFile.value = file || null;
  importError.value = '';
  phase.value = file ? 'idle' : 'idle';
}

function fileIsValid() {
  if (!selectedFile.value) return false;
  return selectedFile.value.name.toLowerCase().endsWith('.xlsx');
}

async function startImport() {
  if (!selectedFile.value) {
    importError.value = 'Selecciona un archivo .xlsx para importar.';
    return;
  }
  if (!fileIsValid()) {
    importError.value = 'El archivo debe tener extensión .xlsx.';
    return;
  }

  isImporting.value = true;
  importError.value = '';
  phase.value = 'uploading';
  progress.value = 0;
  progressLabel.value = 'Subiendo archivo...';

  const file = selectedFile.value;

  try {
    const data = await clientsService.importarArchivo(file, (percent) => {
      progress.value = percent;
    });

    phase.value = 'processing';
    progress.value = 100;
    progressLabel.value = 'Procesando registros...';

    // pequeño retardo para que se aprecie el procesamiento y refrescar la barra
    await new Promise((resolve) => setTimeout(resolve, 400));

    result.value = data;

    if (data.exitosos > 0) {
      emit('imported', data.exitosos);
    }

    if (data.errores && data.errores.length === 0) {
      showSuccess(`Importación completada: ${data.exitosos} cliente(s) importado(s).`);
    }

    phase.value = 'done';
  } catch (error) {
    phase.value = 'error';
    importError.value = error.message || 'Ocurrió un error durante la importación.';
    showError(importError.value);
  } finally {
    isImporting.value = false;
  }
}

function downloadErrors() {
  if (!result.value?.errores?.length) return;
  try {
    clientsService.descargarErrores(result.value.errores);
    showSuccess('Archivo de errores descargado.');
  } catch (error) {
    showError(error.message || 'No se pudo descargar el archivo de errores.');
  }
}

const isDownloadingTemplate = ref(false);

async function downloadTemplate() {
  if (isDownloadingTemplate.value) return;
  isDownloadingTemplate.value = true;
  try {
    await clientsService.descargarPlantilla();
    showSuccess('Plantilla descargada. Completa los datos y vuelve a importar.');
  } catch (error) {
    showError(error.message || 'No se pudo descargar la plantilla.');
  } finally {
    isDownloadingTemplate.value = false;
  }
}

const templateColumns = [
  'Tipo Identificación', 'Identificación', 'Nombre', 'Email', 'Teléfono', 'Dirección',
  'ID Contífico', 'Placa', 'Chasis/VIN', 'Nº Motor', 'Marca', 'Modelo', 'Año',
  'Color', 'Transmisión', 'Combustible', 'Tipo', 'País de Origen', 'Kilometraje',
];

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetState();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="!isImporting && close()"></div>
    <div class="relative w-full max-w-3xl p-4 mx-auto">
      <div class="relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">

        <button
          type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-9 h-9 inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
          :disabled="isImporting"
          @click="close"
        >
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
          </svg>
          <span class="sr-only">Cerrar modal</span>
        </button>

        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Importar Clientes (Excel)</h3>

        <!-- Banner: descarga de plantilla oficial -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 mb-4 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700">
          <div class="text-sm text-indigo-800 dark:text-indigo-200">
            <p class="font-medium">¿No tienes la estructura lista?</p>
            <p class="text-indigo-600 dark:text-indigo-300">Descarga la plantilla oficial con los encabezados exactos y una fila de ejemplo.</p>
          </div>
          <button
            type="button"
            :disabled="isDownloadingTemplate"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-600 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed dark:text-indigo-300 dark:border-indigo-500 dark:hover:bg-indigo-900/40"
            @click="downloadTemplate"
          >
            <svg v-if="!isDownloadingTemplate" class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v9m0 0 3.5-3.5M12 13l-3.5-3.5M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Descargar plantilla de ejemplo (.xlsx)
          </button>
        </div>

        <!-- Formulario / selección de archivo -->
        <div v-if="phase === 'idle' || phase === 'error'" class="space-y-4">
          <div
            class="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
            @dragover.prevent
            @drop.prevent="onFileChange({ target: { files: $event.dataTransfer.files } })"
            @click="fileInput && fileInput.click()"
          >
            <svg class="w-10 h-10 mb-3 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13V4m0 9 4-4m-4 4-4-4m8 9H8m13 3V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1Z"/>
            </svg>
            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span class="font-semibold">Haz clic para seleccionar</span> o arrastra el archivo aquí
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500">Solo archivos .xlsx</p>
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx"
              class="hidden"
              :disabled="isImporting"
              @change="onFileChange"
            >
          </div>

          <p v-if="selectedFile" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Archivo seleccionado: <span class="text-primary-700 dark:text-primary-400">{{ selectedFile.name }}</span>
          </p>

          <p v-if="importError" class="text-sm text-red-600 dark:text-red-400">{{ importError }}</p>

          <div class="text-sm text-amber-800 bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200 rounded-lg p-3">
            <p class="font-medium">Asegúrate de usar la plantilla oficial con los encabezados exactos. Si un cliente tiene varios vehículos, debes repetir sus datos personales en cada fila correspondiente agrupados por su número de identificación.</p>
          </div>

          <div class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p class="font-medium text-gray-700 dark:text-gray-300 mb-2">Estructura de columnas esperada:</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="col in templateColumns"
                :key="col"
                class="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
              >
                {{ col }}
              </span>
            </div>
            <p class="mt-3">Las filas con errores se omiten y se reportan al final sin detener la importación.</p>
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="!selectedFile || isImporting"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="startImport"
            >
              Procesar Importación
            </button>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div v-if="phase === 'uploading' || phase === 'processing'" class="space-y-4">
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ progressLabel }} {{ progress }}%</p>
          <div class="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
            <div
              class="bg-primary-600 h-4 rounded-full transition-all duration-300 text-xs font-medium text-white flex items-center justify-center min-w-[2rem]"
              :style="{ width: progress + '%' }"
            >
              {{ progress }}%
            </div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Espera mientras se procesan los registros...</p>
        </div>

        <!-- Resumen de resultados -->
        <div v-if="phase === 'done' && result" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col items-center p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-700">
              <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <span class="text-2xl font-bold">{{ result.exitosos }}</span>
              </div>
              <p class="mt-1 text-sm font-medium text-green-700 dark:text-green-400">Importados exitosamente</p>
            </div>
            <div class="flex flex-col items-center p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700">
              <div class="flex items-center gap-2 text-red-700 dark:text-red-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                <span class="text-2xl font-bold">{{ (result.errores || []).length }}</span>
              </div>
              <p class="mt-1 text-sm font-medium text-red-700 dark:text-red-400">Registros fallidos</p>
            </div>
          </div>

          <div class="sm:flex sm:items-center sm:justify-between gap-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total procesados: {{ result.total }}</p>
            <button
              v-if="result.errores && result.errores.length > 0"
              type="button"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-700 rounded-lg border border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
              @click="downloadErrors"
            >
              <svg class="w-5 h-5 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0 3.5-3.5M12 15l-3.5-3.5M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>
              </svg>
              Descargar Excel de Errores
            </button>
          </div>

          <!-- Tabla de errores -->
          <div v-if="result.errores && result.errores.length > 0">
            <h4 class="mb-2 text-base font-semibold text-gray-900 dark:text-white">Detalle de errores</h4>
            <div class="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600 text-sm">
                <thead class="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-gray-900 dark:text-white">Fila</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-900 dark:text-white">Identificación</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-900 dark:text-white">Nombre</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-900 dark:text-white">Motivo del fallo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <tr v-for="(error, index) in result.errores" :key="index" class="bg-white dark:bg-gray-800">
                    <td class="px-3 py-2 whitespace-nowrap text-gray-800 dark:text-gray-200">{{ error.fila }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-gray-800 dark:text-gray-200">{{ error.identificacion || '—' }}</td>
                    <td class="px-3 py-2 text-gray-800 dark:text-gray-200">{{ error.datos?.nombre || '—' }}</td>
                    <td class="px-3 py-2 text-red-700 dark:text-red-400">{{ error.motivo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800"
              @click="close"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ToastContainer />
</template>
