<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Wrench, Pencil, Trash2, Search, Filter } from 'lucide-vue-next';
import { useServicios } from '../composables/useServicios';
import ConfirmModal from '../../../../shared/components/ConfirmModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../../shared/components/FilterActions.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import Pagination from '../../../../shared/components/Pagination.vue';
import ServicioModal from './ServicioModal.vue';
import { formatCurrency } from '../../../../shared/utils/format';
import { vSanitizeSearch } from '../../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../../shared/utils/search';

const {
  servicios,
  isLoading,
  isDeleting,
  search,
  categoria,
  estado,
  currentPage,
  total,
  nextUrl,
  previousUrl,
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

// --- PANEL DE FILTROS AVANZADOS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  categoria: '',
});

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value, categoria: categoria.value });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  categoria: appliedFilters.value.categoria,
}));

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

function applyAdvancedFilters() {
  if (isLoading.value) return;
  estado.value = draftFilters.value.estado;
  categoria.value = draftFilters.value.categoria;
  appliedFilters.value = { ...draftFilters.value };
  loadServicios(1);
}

function clearAdvancedFilters() {
  if (isLoading.value) return;
  search.value = '';
  estado.value = '';
  categoria.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  loadServicios(1);
}

async function loadServicios(page = 1) {
  try {
    await fetchServicios(page, appliedFilters.value);
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
    await loadServicios(page);
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
  searchTimer = setTimeout(() => loadServicios(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
onMounted(() => loadServicios());
onUnmounted(() => clearTimeout(searchTimer));
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
          Servicios
        </h1>
      </div>
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
    </div>
  </div>

  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <!-- PANEL DE FILTROS -->
    <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <FilterActions
            :loading="isLoading"
            @clear="clearAdvancedFilters"
            @search="applyAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-md">
            <label for="servicios-search" class="block mb-1 text-sm font-medium text-heading">Buscar servicio</label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="servicios-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Código o nombre del servicio" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="shrink-0">
            <label for="filtro-categoria" class="block mb-1 text-sm font-medium text-heading">Categoría</label>
            <select
              id="filtro-categoria"
              v-model="draftFilters.categoria"
              class="block w-56 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todas las categorías</option>
              <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Servicios</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="servicios"
            :export-params="exportParams"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Código', 'Nombre', 'Categoría', 'Tiempo est.', 'Precio ref.', 'Acciones']"
        :items="servicios"
        :loading="isLoading"
        loading-text="Cargando servicios..."
        empty-text="No se encontraron servicios."
        :empty-colspan="6"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{{ item.codigo }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ categoriaLabel(item.categoria) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatTiempo(item.tiempo_estimado_minutos) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatCurrency(item.precio_referencial) }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar servicio" aria-label="Editar servicio" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar servicio" aria-label="Eliminar servicio" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
    <template #pagination>
      <Pagination
        :total="total"
        :current-page="currentPage"
        :next-url="nextUrl"
        :previous-url="previousUrl"
        :disabled="isLoading"
        item-word="servicio"
        empty-text="No se encontraron servicios."
        @page="loadServicios"
      />
    </template>
    </EntityTable>
    </div>
  </div>

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