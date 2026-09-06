<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRepuestos } from '../composables/useRepuestos';
import ConfirmDeleteModal from '../../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import RepuestoModal from './RepuestoModal.vue';
import { formatCurrency } from '../../../../shared/utils/format';

const {
  repuestos,
  isLoading,
  isDeleting,
  search,
  categoria,
  stockBajo,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchRepuestos,
  removeRepuesto,
} = useRepuestos();

const CATEGORIAS = [
  { value: 'FILTROS', label: 'Filtros' },
  { value: 'ACEITES', label: 'Aceites y Lubricantes' },
  { value: 'FRENOS', label: 'Sistema de Frenos' },
  { value: 'MOTOR', label: 'Motor' },
  { value: 'ELECTRICO', label: 'Sistema Eléctrico' },
  { value: 'SUSPENSION', label: 'Suspensión y Dirección' },
  { value: 'TRANSMISION', label: 'Transmisión' },
  { value: 'CARROCERIA', label: 'Carrocería' },
  { value: 'ILUMINACION', label: 'Iluminación' },
  { value: 'REFRIGERACION', label: 'Refrigeración' },
  { value: 'OTROS', label: 'Otros' },
];

function categoriaLabel(value) {
  const item = CATEGORIAS.find((c) => c.value === value);
  return item ? item.label : value || '—';
}

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const repuestoToDelete = ref(null);
const showRepuestoModal = ref(false);
const repuestoModalId = ref(null);
let searchTimer;

async function loadRepuestos(page = 1) {
  try {
    await fetchRepuestos(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los repuestos.');
  }
}

function openCreateModal() {
  repuestoModalId.value = null;
  showRepuestoModal.value = true;
}

function openEditModal(id) {
  repuestoModalId.value = id;
  showRepuestoModal.value = true;
}

function onSaved(message) {
  showRepuestoModal.value = false;
  repuestoModalId.value = null;
  showAlert('success', '', message);
  loadRepuestos(currentPage.value);
}

function onCreated() { onSaved('Repuesto creado correctamente.'); }
function onUpdated() { onSaved('Repuesto actualizado correctamente.'); }
function onReactivated() { onSaved('Repuesto reactivado correctamente.'); }

function openDeleteModal(item) {
  repuestoToDelete.value = item;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!repuestoToDelete.value) return;
  try {
    const response = await removeRepuesto(repuestoToDelete.value.id, repuestoToDelete.value.nombre);
    showAlert('success', '', response.message);
    const page = repuestos.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchRepuestos(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el repuesto.');
  } finally {
    repuestoToDelete.value = null;
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
  searchTimer = setTimeout(() => loadRepuestos(1), 300);
}

watch(search, scheduleSearch);
watch([categoria, stockBajo], scheduleSearch);
onMounted(() => loadRepuestos());
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
            <li class="text-gray-400" aria-current="page">/ Inventario / Repuestos</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <svg class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4 8m4-8a4 4 0 1 0 0-8m0 8a4 4 0 0 0 0-8m4 0H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/>
          </svg>
          Repuestos
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
          <form class="flex items-center" @submit.prevent="loadRepuestos(1)">
            <label for="repuestos-search" class="sr-only">Buscar repuestos</label>
            <input id="repuestos-search" v-model="search" type="search" placeholder="Buscar repuestos" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-72 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
          <select v-model="categoria" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Todas las categorías</option>
            <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <label class="inline-flex items-center pt-2">
            <input v-model="stockBajo" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Solo stock bajo</span>
          </label>
        </div>
        <div class="flex items-center space-x-2 sm:space-x-3 mt-2 sm:mt-0">
          <EntityActionButtons
            entity="repuestos"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Código', 'Nombre', 'Categoría', 'Marca', 'Stock', 'Precio', 'Acciones']"
    :items="repuestos"
    :loading="isLoading"
    loading-text="Cargando repuestos..."
    empty-text="No se encontraron repuestos."
    :empty-colspan="7"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadRepuestos(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{{ item.codigo }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ categoriaLabel(item.categoria) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.marca || '—' }}</td>
        <td class="p-4 whitespace-nowrap">
          <span :class="item.stock_bajo ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-800 dark:text-white'">
            {{ item.stock_actual }} {{ item.stock_minimo ? `(mín ${item.stock_minimo})` : '' }}
          </span>
          <span v-if="item.stock_bajo" class="inline-block ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Stock bajo</span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatCurrency(item.precio_venta) }}</td>
        <td class="p-4 whitespace-nowrap">
          <button type="button" title="Editar repuesto" aria-label="Editar repuesto" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
          </button>
          <button type="button" title="Eliminar repuesto" aria-label="Eliminar repuesto" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="repuesto"
    :item-name="repuestoToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="repuestoToDelete = null"
  />

  <RepuestoModal
    v-model="showRepuestoModal"
    :repuesto-id="repuestoModalId"
    @created="onCreated"
    @updated="onUpdated"
    @reactivated="onReactivated"
  />
</template>