<script setup>
import { computed, onMounted, ref } from 'vue';
import { History, Package, Search, Filter, TriangleAlert, Upload } from 'lucide-vue-next';
import { useRepuestos } from '../composables/useRepuestos';
import ConfirmModal from '../../../../shared/components/ConfirmModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityHeader from '../../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../../shared/components/FilterActions.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../../shared/components/Pagination.vue';
import RepuestoModal from './RepuestoModal.vue';
import RepuestoKardexModal from './RepuestoKardexModal.vue';
import { repuestosService } from '../services/repuestosService';
import { formatCurrency } from '../../../../shared/utils/format';
import { vSanitizeSearch } from '../../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../../shared/composables/useFiltrosReactivos';
import ModoConsultaChip from '../../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../../shared/composables/usePermisos';
import ImportWizardModal from '../../../../shared/components/ImportWizardModal.vue';
import { IMPORTACION_REPUESTOS, SERVICIO_IMPORTACION_REPUESTOS } from '../constants/importacionRepuestos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
// Repuestos y servicios comparten el recurso `inventario`.
const puedeModificar = computed(() => puede('inventario', 'modificar'));

const showImportModal = ref(false);

function onImported(resultado) {
  const n = resultado.exitosos;
  showAlert('success', '', `${n} ${n === 1 ? 'repuesto importado' : 'repuestos importados'} correctamente.`);
  loadRepuestos(1);
}

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
  nextUrl,
  previousUrl,
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

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  categoria.value = draftFilters.value.categoria;
  stockBajo.value = draftFilters.value.stockBajo;
  appliedFilters.value = { ...draftFilters.value };
  loadRepuestos(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  categoria.value = '';
  stockBajo.value = false;
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadRepuestos(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: draftFilters,
  busqueda: search,
  firma: () => ({
    ...draftFilters.value,
    search: search.value.trim(),
  }),
  aplicar: () => {
    applyAdvancedFilters();
  },
});

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
  cargarStockBajo();
}

// Aviso de reposición: repuestos activos en o bajo su stock mínimo.
const totalStockBajo = ref(0);

async function cargarStockBajo() {
  try {
    totalStockBajo.value = await repuestosService.contarStockBajo();
  } catch {
    totalStockBajo.value = 0;
  }
}

function verStockBajo() {
  draftFilters.value = { ...draftFilters.value, stockBajo: true };
}

// Kardex y ajuste de stock.
const repuestoKardex = ref(null);
const mostrarKardex = computed({
  get: () => Boolean(repuestoKardex.value),
  set: (valor) => { if (!valor) repuestoKardex.value = null; },
});

function onStockAjustado(actualizado) {
  showAlert('success', '', `Stock de ${actualizado.codigo} ajustado a ${actualizado.stock_actual}.`);
  loadRepuestos(currentPage.value);
  cargarStockBajo();
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


onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('inventario')) {
    loadRepuestos();
    cargarStockBajo();
  }
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('inventario')" seccion="Inventario" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="Package"
    entity="Repuestos"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Inventario / Repuestos' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('inventario')" objeto="los repuestos" />
    </template>
  </EntityHeader>

  <div v-if="alert.message" class="px-4 pt-3">
    <Alert
      :type="alert.type"
      :title="alert.title"
      :message="alert.message"
      dismissible
      @dismiss="hideAlert"
    />
  </div>
  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <button
      v-if="totalStockBajo && !appliedFilters.stockBajo"
      type="button"
      class="flex items-center w-full gap-2 px-4 py-3 mb-4 text-sm text-left border rounded-lg bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700/60 dark:text-amber-100"
      @click="verStockBajo">
      <TriangleAlert class="w-5 h-5 shrink-0" />
      <span>
        <span class="font-semibold">{{ totalStockBajo }} {{ totalStockBajo === 1 ? 'repuesto está' : 'repuestos están' }} en o bajo su stock mínimo.</span>
        Ver cuáles reponer.
      </span>
    </button>
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
            :show-search="false"
            @clear="clearAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-md">
            <label for="repuestos-search" class="block mb-1 text-sm font-medium text-heading">Buscar repuesto</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="repuestos-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Código, nombre, marca o parte" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-categoria" class="block mb-1 text-sm font-medium text-heading">Categoría</label>
            <select
              id="filtro-categoria"
              v-model="draftFilters.categoria"
              class="block w-full sm:w-56 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
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
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Repuestos</h2>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="puedeModificar"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border rounded-lg shadow-xs text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            @click="showImportModal = true"
          >
            <Upload class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Importar
          </button>
          <EntityActionButtons
            entity="repuestos"
            :show-add="puedeModificar"
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
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <button type="button" :title="puedeModificar ? 'Editar repuesto' : 'Ver repuesto'" class="font-medium text-heading cursor-pointer hover:text-accent-500 dark:hover:text-accent-400" @click="openEditModal(item.id)">{{ item.codigo }}</button>
        </td>
        <td class="px-4 py-3 text-heading whitespace-nowrap">{{ item.nombre }}</td>
        <td class="px-4 py-3 text-heading whitespace-nowrap">{{ categoriaLabel(item.categoria) }}</td>
        <td class="px-4 py-3 text-heading whitespace-nowrap">{{ item.marca || '—' }}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <span :class="item.stock_bajo ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-heading'">
            {{ item.stock_actual }} {{ item.stock_minimo ? `(mín ${item.stock_minimo})` : '' }}
          </span>
          <span v-if="item.stock_bajo" class="inline-block ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Stock bajo</span>
        </td>
        <td class="px-4 py-3 text-heading whitespace-nowrap">{{ formatCurrency(item.precio_venta) }}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-brand-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              :title="puedeModificar ? 'Kardex y ajuste de stock' : 'Kardex del repuesto'"
              :aria-label="puedeModificar ? 'Kardex y ajuste de stock' : 'Kardex del repuesto'"
              @click="repuestoKardex = item">
              <History class="w-4 h-4" />
            </button>
            <EntityRowActions entity="repuesto" :show-view="!puedeModificar" :show-edit="puedeModificar" :show-delete="puedeModificar" @view="openEditModal(item.id)" :delete-disabled="isDeleting" @edit="openEditModal(item.id)" @delete="openDeleteModal(item)" />
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
        item-word="repuesto"
        empty-text="No se encontraron repuestos."
        @page="loadRepuestos"
      />
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
    :solo-lectura="!puedeModificar"
    @created="onCreated"
    @updated="onUpdated"
    @reactivated="onReactivated"
  />

  <RepuestoKardexModal
    v-model="mostrarKardex"
    :repuesto="repuestoKardex"
    :puede-ajustar="puedeModificar"
    @ajustado="onStockAjustado"
  />

  <ImportWizardModal
    v-model="showImportModal"
    :config="IMPORTACION_REPUESTOS"
    :servicio="SERVICIO_IMPORTACION_REPUESTOS"
    @imported="onImported"
  />
  </template>
</template>
