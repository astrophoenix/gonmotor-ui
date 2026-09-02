<script setup>
import { onMounted, ref } from 'vue';
import { useRecepciones } from '../composables/useRecepciones';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import Alert from '../../../shared/components/Alert.vue';

const { recepciones, loading, error, loadRecepciones } = useRecepciones();

const alert = ref({
  type: 'default',
  title: '',
  message: '',
});

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getEstadoBadge(recepcion) {
  if (recepcion.inspecciones?.length > 0) {
    if (recepcion.cotizaciones_generadas?.length > 0) {
      return { label: 'Con cotización', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    }
    if (recepcion.orden_trabajo_id) {
      return { label: 'Convertida a OT', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    }
    return { label: 'Con diagnóstico', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
  }
  return { label: 'Sin diagnóstico', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
}

function handleVerDetalle(id) {
  window.location.assign(`/crud/recepciones/ver/?id=${encodeURIComponent(id)}`);
}

function handleEditar(id) {
  window.location.assign(`/crud/recepciones/editar/?id=${encodeURIComponent(id)}`);
}

function handleCrearDiagnostico(id) {
  window.location.assign(`/crud/inspecciones/nuevo/?recepcion=${id}`);
}

function handleVerDiagnostico(recepcion) {
  if (recepcion.inspecciones?.length > 0) {
    const diagnosticoId = recepcion.inspecciones[0].id;
    window.location.assign(`/crud/inspecciones/editar/?id=${diagnosticoId}`);
  } else {
    handleCrearDiagnostico(recepcion.id);
  }
}

function handleVerCotizacion(cotizacionId) {
  if (!cotizacionId) return;
  window.location.assign(`/crud/cotizaciones/ver/${cotizacionId}/`);
}

function handleVerOrden(ordenId) {
  if (!ordenId) return;
  window.location.assign(`/crud/ordenes/ver/${ordenId}/`);
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

onMounted(async () => {
  try {
    await loadRecepciones();
  } catch (err) {
    showAlert('error', '', err.message || 'No se pudieron cargar las recepciones.');
  }
});
</script>

<template>
  <div class="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full mb-1">
      <div class="mb-4">
        <nav class="flex mb-5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Recepciones</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <svg class="w-6 h-6 inline-block text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 5h6m-6 4h6M10 3v4h4V3h-4Z"/>
          </svg> 
          Recepciones
        </h1>
      </div>

      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />

      <div class="sm:flex">
        <div class="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadRecepciones">
            <label for="recepciones-search" class="sr-only">Buscar recepciones</label>
            <input id="recepciones-search" type="search" placeholder="Buscar por placa, cliente u orden" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" disabled />
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <EntityActionButtons
            entity="recepciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col">
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full align-middle">
        <div class="overflow-hidden shadow">
          <table class="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
            <thead class="bg-gray-200 dark:bg-gray-900">
              <tr>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">#</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Vehículo</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Cliente</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Fecha ingreso</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Grúa</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Estado</th>
                <th scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              <tr v-if="loading"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">Cargando recepciones...</td></tr>
              <tr v-else-if="!recepciones.length"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">No hay recepciones registradas.</td></tr>
              <template v-else>
                <tr v-for="(item, index) in recepciones" :key="item.id" class="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ index + 1 }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
                    <span class="font-medium">{{ item.vehiculo?.placa || '-' }}</span>
                    <span class="block text-xs text-gray-500 dark:text-gray-400">
                      {{ item.vehiculo?.marca }} {{ item.vehiculo?.modelo }}
                    </span>
                  </td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente?.nombre || '-' }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.ingreso_en_grua ? 'Sí' : 'No' }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
                    <span :class="['px-2 py-1 rounded-full text-xs font-medium', getEstadoBadge(item).color]">
                      {{ getEstadoBadge(item).label }}
                    </span>
                  </td>
                  <td class="p-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button type="button" title="Ver detalle" aria-label="Ver detalle" class="inline-flex items-center p-2 text-blue-600 rounded-lg hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700" @click="handleVerDetalle(item.id)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path></svg>
                      </button>
                      <button type="button" title="Editar" aria-label="Editar" class="inline-flex items-center p-2 text-yellow-600 rounded-lg hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                      </button>
                      <button type="button" :title="item.inspecciones?.length > 0 ? 'Ver Diagnóstico' : 'Crear Diagnóstico'" :aria-label="item.inspecciones?.length > 0 ? 'Ver Diagnóstico' : 'Crear Diagnóstico'" class="inline-flex items-center p-2 text-purple-600 rounded-lg hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-gray-700" @click="handleVerDiagnostico(item)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M4 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2 0v12h8V2H6zm3 8h2v2H9v-2zm0-4h2v2H9V6z" clip-rule="evenodd"></path></svg>
                      </button>
                      <button v-if="item.cotizaciones_generadas?.length" type="button" title="Ver Cotización" aria-label="Ver Cotización" class="inline-flex items-center p-2 text-emerald-600 rounded-lg hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-gray-700" @click="handleVerCotizacion(item.cotizaciones_generadas[0]?.id)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V3zm2 0v10h8V3H6z"></path><path d="M10 13l3 3 3-3"></path></svg>
                      </button>
                      <button v-if="item.orden_trabajo_id" type="button" title="Ver Orden" aria-label="Ver Orden" class="inline-flex items-center p-2 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-gray-700" @click="handleVerOrden(item.orden_trabajo_id)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a6 6 0 016 6v2H4V8a6 6 0 016-6z"></path><path d="M4 14v-2h12v2a2 2 0 01-2 2H6a2 2 0 01-2-2z"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
