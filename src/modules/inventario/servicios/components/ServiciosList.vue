<script setup>
import { onMounted, ref, watch } from 'vue';
import { Wrench, Pencil, Trash2 } from 'lucide-vue-next';
import { useServicios } from '../composables/useServicios';
import ConfirmModal from '../../../../shared/components/ConfirmModal.vue';
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
          <Wrench class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
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
            <Pencil class="w-5 h-5" />
          </button>
          <button type="button" title="Eliminar servicio" aria-label="Eliminar servicio" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <Trash2 class="w-5 h-5" />
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmModal
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