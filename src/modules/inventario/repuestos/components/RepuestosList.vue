<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Package, Pencil, Search, Trash2, Filter } from 'lucide-vue-next';
import { useRepuestos } from '../composables/useRepuestos';
import ConfirmModal from '../../../../shared/components/ConfirmModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../../shared/components/FilterActions.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import RepuestoModal from './RepuestoModal.vue';
import { formatCurrency } from '../../../../shared/utils/format';
import { vSanitizeSearch } from '../../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../../shared/utils/search';

const {
  repuestos,
  isLoading,
  isDeleting,
  search,
  categoria,
  stockBajo,
  estado,
  currentPage,
  total,
  firstItem,
  lastItem,
  totalPages,
  nextUrl,
  previousUrl,
  fetchRepuestos,
  removeRepuesto,
} = useRepuestos();

const pageList = computed(() => {
  const pages = totalPages.value;
  const current = currentPage.value;
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const candidates = new Set([1, pages, current - 1, current, current + 1]);
  const sorted = Array.from(candidates)
    .filter((page) => page >= 1 && page <= pages)
    .sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const page of sorted) {
    if (page - prev === 2) result.push(prev + 1);
    else if (page - prev > 2) result.push('…');
    result.push(page);
    prev = page;
  }
  return result;
});

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

// --- PANEL DE FILTROS AVANZADOS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  categoria: '',
  stockBajo: false,
});

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value, categoria: categoria.value, stockBajo: stockBajo.value });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  categoria: appliedFilters.value.categoria,
  stockBajo: appliedFilters.value.stockBajo,
}));

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

function applyAdvancedFilters() {
  if (isLoading.value) return;
  estado.value = draftFilters.value.estado;
  categoria.value = draftFilters.value.categoria;
  stockBajo.value = draftFilters.value.stockBajo;
  appliedFilters.value = { ...draftFilters.value };
  loadRepuestos(1);
}

function clearAdvancedFilters() {
  if (isLoading.value) return;
  search.value = '';
  estado.value = '';
  categoria.value = '';
  stockBajo.value = false;
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  loadRepuestos(1);
}

async function loadRepuestos(page = 1) {
  try {
    await fetchRepuestos(page, appliedFilters.value);
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
    await loadRepuestos(page);
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
  searchTimer = setTimeout(() => loadRepuestos(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
onMounted(() => loadRepuestos());
onUnmounted(() => clearTimeout(searchTimer));
</script>

<template>
  <div class="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full mb-1">
      <div class="mb-1">
        <nav class="flex mb-2" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Inventario / Repuestos</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <Package class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
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
            <label for="repuestos-search" class="block mb-1 text-sm font-medium text-heading">Buscar repuesto</label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="repuestos-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Código, nombre, marca o parte" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
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

          <label class="inline-flex items-center gap-2 pb-2.5 text-sm font-normal text-body">
            <input v-model="draftFilters.stockBajo" type="checkbox" class="w-4 h-4 border border-default-medium rounded-xs bg-white focus:ring-2 focus:ring-brand-soft dark:bg-gray-800">
            Solo stock bajo
          </label>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Repuestos</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="repuestos"
            :export-params="exportParams"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Código', 'Nombre', 'Categoría', 'Marca', 'Stock', 'Precio', 'Acciones']"
        :items="repuestos"
        :loading="isLoading"
        loading-text="Cargando repuestos..."
        empty-text="No se encontraron repuestos."
        :empty-colspan="7"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 font-medium text-heading whitespace-nowrap">{{ item.codigo }}</td>
        <td class="p-4 text-heading whitespace-nowrap">{{ item.nombre }}</td>
        <td class="p-4 text-heading whitespace-nowrap">{{ categoriaLabel(item.categoria) }}</td>
        <td class="p-4 text-heading whitespace-nowrap">{{ item.marca || '—' }}</td>
        <td class="p-4 whitespace-nowrap">
          <span :class="item.stock_bajo ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-heading'">
            {{ item.stock_actual }} {{ item.stock_minimo ? `(mín ${item.stock_minimo})` : '' }}
          </span>
          <span v-if="item.stock_bajo" class="inline-block ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Stock bajo</span>
        </td>
        <td class="p-4 text-heading whitespace-nowrap">{{ formatCurrency(item.precio_venta) }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar repuesto" aria-label="Editar repuesto" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar repuesto" aria-label="Eliminar repuesto" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
    <template #pagination>
      <nav class="flex items-center flex-column flex-wrap md:flex-row justify-between p-4 gap-3" aria-label="Table navigation">
        <span v-if="total" class="text-sm font-normal text-body mb-4 md:mb-0 block w-full md:inline md:w-auto">
          Mostrando <span class="font-semibold text-heading">{{ firstItem }}-{{ lastItem }}</span> de <span class="font-semibold text-heading">{{ total }}</span> repuesto{{ total === 1 ? '' : 's' }}
        </span>
        <span v-else class="text-sm font-normal text-body mb-4 md:mb-0 block w-full md:inline md:w-auto">No se encontraron repuestos.</span>
        <ul class="flex -space-x-px text-sm flex-wrap">
          <li>
            <button
              type="button"
              :disabled="!previousUrl || isLoading"
              class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium rounded-s-base text-sm px-3 h-9 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="loadRepuestos(currentPage - 1)"
            >
              Previous
            </button>
          </li>
          <template v-for="item in pageList" :key="item">
            <li v-if="item === '…'">
              <span class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium font-medium text-sm px-3 h-9">…</span>
            </li>
            <li v-else>
              <button
                type="button"
                :aria-current="item === currentPage ? 'page' : null"
                class="flex items-center justify-center box-border border font-medium text-sm w-9 h-9 focus:outline-none cursor-pointer"
                :class="item === currentPage ? 'text-fg-brand bg-brand-softer border-default-medium hover:bg-brand-soft hover:text-fg-brand' : 'text-body bg-neutral-secondary-medium border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading'"
                @click="loadRepuestos(item)"
              >
                {{ item }}
              </button>
            </li>
          </template>
          <li>
            <button
              type="button"
              :disabled="!nextUrl || isLoading"
              class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium rounded-e-base text-sm px-3 h-9 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              @click="loadRepuestos(currentPage + 1)"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
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