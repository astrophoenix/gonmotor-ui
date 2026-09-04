<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { useInspecciones } from '../composables/useInspecciones';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const {
  inspecciones,
  loading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  loadInspecciones,
  removeInspeccion,
} = useInspecciones();

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

const showDeleteModal = ref(false);
const inspeccionToDelete = ref(null);
let searchTimer;

function handleEditar(id) {
  window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(id)}`);
}

function handleNueva() {
  window.location.assign('/crud/inspecciones/agregar/');
}

function openDeleteModal(inspeccion) {
  inspeccionToDelete.value = inspeccion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!inspeccionToDelete.value) return;

  try {
    await removeInspeccion(inspeccionToDelete.value.id);
    showAlert('success', '', 'Inspección eliminada correctamente.');

    const page = inspecciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadInspecciones(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la inspección.');
  } finally {
    inspeccionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tipoBadge(tipo) {
  const map = {
    PREVENTIVO: { label: 'Preventivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    CORRECTIVO: { label: 'Correctivo', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    DIAGNOSTICO: { label: 'Diagnóstico / Escaneo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    ESTETICA: { label: 'Estética', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
    GARANTIA: { label: 'Garantía', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  };
  return map[tipo] || { label: tipo || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function estadoBadge(estado) {
  const map = {
    PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    EN_PROCESO: { label: 'En proceso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    FINALIZADA: { label: 'Finalizada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  };
  return map[estado] || { label: estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadInspecciones(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => {
  loadInspecciones();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
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
            <li class="text-gray-400" aria-current="page">/ Inspecciones</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <svg class="w-6 h-6 inline-block text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 2v6M15 2v6M5 12h14M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/>
          </svg>
          Inspecciones
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
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadInspecciones(1)">
            <label for="inspecciones-search" class="sr-only">Buscar inspecciones</label>
            <input id="inspecciones-search" v-model="search" type="search" placeholder="Buscar por placa o cliente" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <button type="button" class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700" @click="handleNueva">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"></path></svg>
            Nueva
          </button>
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['#', 'Vehículo', 'Cliente', 'Tipo', 'Estado', 'Fecha', 'Acciones']"
    :items="inspecciones"
    :loading="loading"
    loading-text="Cargando inspecciones..."
    empty-text="No se encontraron inspecciones."
    :empty-colspan="7"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="loading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadInspecciones(currentPage + delta)"
  >
    <template #row="{ item, index }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ index + 1 }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <span class="font-medium">{{ item.recepcion?.placa || '-' }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.recepcion?.marca || '' }} {{ item.recepcion?.modelo || '' }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.recepcion?.cliente_nombre || '-' }}</td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', tipoBadge(item.tipo_inspeccion).color]">
            {{ tipoBadge(item.tipo_inspeccion).label }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', estadoBadge(item.estado).color]">
            {{ estadoBadge(item.estado).label }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar inspección" aria-label="Editar inspección" class="inline-flex items-center p-2 text-yellow-600 rounded-lg hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
            </button>
            <button type="button" title="Eliminar inspección" aria-label="Eliminar inspección" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="inspección"
    :item-name="`#${inspeccionToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="inspeccionToDelete = null"
  />
</template>
