<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { Eye, SquarePen, Trash2, Wrench } from 'lucide-vue-next';
import { useOrdenes } from '../composables/useOrdenes';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const {
  ordenes,
  loading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  loadOrdenes,
  removeOrden,
} = useOrdenes();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const ordenToDelete = ref(null);
let searchTimer;

function handleVer(id) {
  window.location.assign(`/crud/ordenes/ver/?id=${encodeURIComponent(id)}`);
}

function handleEditar(id) {
  window.location.assign(`/crud/ordenes/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(orden) {
  ordenToDelete.value = orden;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!ordenToDelete.value) return;

  try {
    await removeOrden(ordenToDelete.value.id);
    showAlert('success', '', 'Orden de trabajo eliminada correctamente.');

    const page = ordenes.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadOrdenes(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la orden de trabajo.');
  } finally {
    ordenToDelete.value = null;
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

function prioridadBadge(prioridad) {
  const map = {
    BAJA: { label: 'Baja', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    MEDIA: { label: 'Media', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    ALTA: { label: 'Alta', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    URGENTE: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };
  return map[prioridad] || { label: prioridad || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function estadoBadge(estado) {
  const map = {
    INGRESADO: { label: 'En Recepción / Diagnóstico', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    EN_PROCESO: { label: 'En Trabajo / Ejecución', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    COMPLETADO: { label: 'Trabajo Listo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    ENTREGADO: { label: 'Entregado y Cerrado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    CANCELADO: { label: 'Anulado / Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };
  return map[estado] || { label: estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadOrdenes(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => {
  loadOrdenes();
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
            <li class="text-gray-400" aria-current="page">/ Órdenes de Trabajo</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <Wrench class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Órdenes de Trabajo
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
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadOrdenes(1)">
            <label for="ordenes-search" class="sr-only">Buscar órdenes</label>
            <input id="ordenes-search" v-model="search" type="search" placeholder="Buscar por placa, cliente u orden" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['#', 'Nº Orden', 'Vehículo', 'Cliente', 'Tipo', 'Prioridad', 'Estado', 'Fecha', 'Acciones']"
    :items="ordenes"
    :loading="loading"
    loading-text="Cargando órdenes de trabajo..."
    empty-text="No se encontraron órdenes de trabajo."
    :empty-colspan="9"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="loading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadOrdenes(currentPage + delta)"
  >
    <template #row="{ item, index }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ index + 1 }}</td>
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {{ item.numero_orden || `#${item.id}` }}
          </a>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <span class="font-medium">{{ item.vehiculo?.placa || '-' }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.vehiculo?.marca || '' }} {{ item.vehiculo?.modelo || '' }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente?.nombre || '-' }}</td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', tipoBadge(item.tipo_trabajo).color]">
            {{ tipoBadge(item.tipo_trabajo).label }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', prioridadBadge(item.prioridad).color]">
            {{ prioridadBadge(item.prioridad).label }}
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
            <button type="button" title="Ver orden" aria-label="Ver orden" class="inline-flex items-center p-2 text-blue-600 rounded-lg hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700" @click="handleVer(item.id)">
              <Eye class="w-5 h-5" />
            </button>
            <button type="button" title="Editar orden" aria-label="Editar orden" class="inline-flex items-center p-2 text-yellow-600 rounded-lg hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <SquarePen class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar orden" aria-label="Eliminar orden" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="orden de trabajo"
    :item-name="`${ordenToDelete?.numero_orden || ordenToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="ordenToDelete = null"
  />
</template>