<script setup>
import { computed, onMounted, ref } from 'vue';
import { Wrench, Search, Filter } from 'lucide-vue-next';
import { useServicios } from '../composables/useServicios';
import ConfirmModal from '../../../../shared/components/ConfirmModal.vue';
import Alert from '../../../../shared/components/Alert.vue';
import EntityHeader from '../../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../../shared/components/FilterActions.vue';
import EntityTable from '../../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../../shared/components/Pagination.vue';
import ServicioModal from './ServicioModal.vue';
import { formatCurrency } from '../../../../shared/utils/format';
import { vSanitizeSearch } from '../../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../../shared/composables/useFiltrosReactivos';
import ModoConsultaChip from '../../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
// Repuestos y servicios comparten el recurso `inventario`.
const puedeModificar = computed(() => puede('inventario', 'modificar'));

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

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  categoria.value = draftFilters.value.categoria;
  appliedFilters.value = { ...draftFilters.value };
  loadServicios(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  categoria.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadServicios(1);
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


onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('inventario')) loadServicios();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('inventario')" seccion="Inventario" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="Wrench"
    entity="Servicios"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Inventario / Servicios' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('inventario')" objeto="los servicios" />
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
            <label for="servicios-search" class="block mb-1 text-sm font-medium text-heading">Buscar servicio</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="servicios-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Código o nombre del servicio" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
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
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Servicios</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="servicios"
            :show-add="puedeModificar"
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
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <button type="button" :title="puedeModificar ? 'Editar servicio' : 'Ver servicio'" class="font-medium text-gray-800 cursor-pointer hover:text-brand-coral dark:text-white" @click="openEditModal(item.id)">{{ item.codigo }}</button>
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ categoriaLabel(item.categoria) }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ formatTiempo(item.tiempo_estimado_minutos) }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ formatCurrency(item.precio_referencial) }}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <EntityRowActions entity="servicio" :show-view="!puedeModificar" :show-edit="puedeModificar" :show-delete="puedeModificar" @view="openEditModal(item.id)" :delete-disabled="isDeleting" @edit="openEditModal(item.id)" @delete="openDeleteModal(item)" />
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
    :solo-lectura="!puedeModificar"
    @created="onCreated"
    @updated="onUpdated"
    @reactivated="onReactivated"
  />
  </template>
</template>
