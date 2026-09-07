<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { FileText, SquarePen, Trash2 } from 'lucide-vue-next';
import { useCotizaciones } from '../composables/useCotizaciones';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const {
  cotizaciones,
  loading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  loadCotizaciones,
  removeCotizacion,
} = useCotizaciones();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const cotizacionToDelete = ref(null);
let searchTimer;

function handleEditar(id) {
  window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(cotizacion) {
  cotizacionToDelete.value = cotizacion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!cotizacionToDelete.value) return;

  try {
    await removeCotizacion(cotizacionToDelete.value.id);
    showAlert('success', '', 'Cotización eliminada correctamente.');

    const page = cotizaciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadCotizaciones(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la cotización.');
  } finally {
    cotizacionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estadoBadge(estado) {
  const map = {
    BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    ENVIADA: { label: 'Enviada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    ACEPTADA: { label: 'Aceptada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    VENCIDA: { label: 'Vencida', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    CONVERTIDA: { label: 'Convertida', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  };
  return map[estado] || { label: estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function formatMoney(value) {
  const numero = Number(value || 0);
  return numero.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCotizaciones(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => loadCotizaciones());
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
            <li class="text-gray-400" aria-current="page">/ Cotizaciones</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <FileText class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Cotizaciones
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
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadCotizaciones(1)">
            <label for="cotizaciones-search" class="sr-only">Buscar cotizaciones</label>
            <input id="cotizaciones-search" v-model="search" type="search" placeholder="Buscar por número, cliente o placa" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['#', 'Nº Cotización', 'Cliente', 'Vehículo', 'Total', 'Estado', 'Fecha', 'Acciones']"
    :items="cotizaciones"
    :loading="loading"
    loading-text="Cargando cotizaciones..."
    empty-text="No se encontraron cotizaciones."
    :empty-colspan="8"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="loading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadCotizaciones(currentPage + delta)"
  >
    <template #row="{ item, index }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ index + 1 }}</td>
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/cotizaciones/editar/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {{ item.numero_cotizacion }}
          </a>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <span class="font-medium">{{ item.cliente_nombre || '-' }}</span>
          <span v-if="item.cliente_telefono" class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.cliente_telefono }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.vehiculo_placa || '-' }}
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.vehiculo_marca || '' }} {{ item.vehiculo_modelo || '' }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white font-medium">$ {{ formatMoney(item.total) }}</td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', estadoBadge(item.estado).color]">
            {{ estadoBadge(item.estado).label }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar cotización" aria-label="Editar cotización" class="inline-flex items-center p-2 text-yellow-600 rounded-lg hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <SquarePen class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar cotización" aria-label="Eliminar cotización" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="cotización"
    :item-name="cotizacionToDelete?.numero_cotizacion || `#${cotizacionToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="cotizacionToDelete = null"
  />
</template>