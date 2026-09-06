<script setup>
import { onMounted, ref, watch } from 'vue';
import { useServicios } from '../composables/useServicios';
import ConfirmDeleteModal from '../../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import ServicioModal from './ServicioModal.vue';
import { formatCurrency } from '../../../../shared/utils/format';

const {
  servicios,
  isLoading,
  isDeleting,
  search,
  categoria,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchServicios,
  removeServicio,
} = useServicios();

const CATEGORIAS = [
  { value: 'MECANICA', label: 'Mecánica General' },
  { value: 'ELECTRICO', label: 'Eléctrico / Electrónica' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento Preventivo' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico / Escaneo' },
  { value: 'ENDEREZADA', label: 'Enderezada / Pintura' },
  { value: 'GARANTIA', label: 'Garantía' },
];

function categoriaLabel(value) {
  const item = CATEGORIAS.find((c) => c.value === value);
  return item ? item.label : value || '—';
}

function formatTiempo(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const servicioToDelete = ref(null);
const showServicioModal = ref(false);
const servicioModalId = ref(null);
let searchTimer;

async function loadServicios(page = 1) {
  try {
    await fetchServicios(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los servicios.');
  }
}

function openCreateModal() {
  servicioModalId.value = null;
  showServicioModal.value = true;
}

function openEditModal(id) {
  servicioModalId.value = id;
  showServicioModal.value = true;
}

function onSaved(message) {
  showServicioModal.value = false;
  servicioModalId.value = null;
  showAlert('success', '', message);
  loadServicios(currentPage.value);
}

function onCreated() { onSaved('Servicio creado correctamente.'); }
function onUpdated() { onSaved('Servicio actualizado correctamente.'); }
function onReactivated() { onSaved('Servicio reactivado correctamente.'); }

function openDeleteModal(item) {
  servicioToDelete.value = item;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!servicioToDelete.value) return;
  try {
    const response = await removeServicio(servicioToDelete.value.id, servicioToDelete.value.nombre);
    showAlert('success', '', response.message);
    const page = servicios.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchServicios(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el servicio.');
  } finally {
    servicioToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadServicios(1), 300);
}

watch(search, scheduleSearch);
watch(categoria, scheduleSearch);
onMounted(() => loadServicios());
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
            <li class="text-gray-400" aria-current="page">/ Inventario / Servicios</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <svg class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9c.889-.958 2.389-1.5 4-1.5s3.111.542 4 1.5m-8 0c-1.333 1.5-2 3.208-2 5.125 0 1.708.667 3.25 2 4.375m6-9.5c1.333 1.5 2 3.208 2 5.125 0 1.708-.667 3.25-2 4.375M9 9c1.333 1.5 1.333 3.208 0 4.375M15 9c-1.333 1.5-1.333 3.208 0 4.375M9 21v-3m6 3v-3M10 9a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm8 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/>
          </svg>
          Servicios (Mano de Obra)
        </h1>
      </div>
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
      <div class="sm:flex sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <form class="flex items-center" @submit.prevent="loadServicios(1)">
            <label for="servicios-search" class="sr-only">Buscar servicios</label>
            <input id="servicios-search" v-model="search" type="search" placeholder="Buscar servicios" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-72 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
          <select v-model="categoria" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Todas las categorías</option>
            <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
        <div class="flex items-center space-x-2 sm:space-x-3 mt-2 sm:mt-0">
          <EntityActionButtons
            entity="servicios"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Código', 'Nombre', 'Categoría', 'Tiempo est.', 'Precio ref.', 'Acciones']"
    :items="servicios"
    :loading="isLoading"
    loading-text="Cargando servicios..."
    empty-text="No se encontraron servicios."
    :empty-colspan="6"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadServicios(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{{ item.codigo }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ categoriaLabel(item.categoria) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatTiempo(item.tiempo_estimado_minutos) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatCurrency(item.precio_referencial) }}</td>
        <td class="p-4 whitespace-nowrap">
          <button type="button" title="Editar servicio" aria-label="Editar servicio" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
          </button>
          <button type="button" title="Eliminar servicio" aria-label="Eliminar servicio" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="servicio"
    :item-name="servicioToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="servicioToDelete = null"
  />

  <ServicioModal
    v-model="showServicioModal"
    :servicio-id="servicioModalId"
    @created="onCreated"
    @updated="onUpdated"
    @reactivated="onReactivated"
  />
</template>