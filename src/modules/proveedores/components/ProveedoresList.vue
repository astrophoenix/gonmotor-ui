<script setup>
import { onMounted, ref, watch, onUnmounted, computed } from 'vue';
import { Truck, Phone, Mail, Pencil, Trash2, IdCard, Search, RotateCcw, Filter, UserRound } from 'lucide-vue-next';
import { useProveedores } from '../composables/useProveedores';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ProveedorModal from './ProveedorModal.vue';

const TIPOS_IDENTIFICACION = {
  C: 'Cédula',
  R: 'RUC',
  P: 'Pasaporte',
};

function tipoIdentificacionLabel(proveedor) {
  return TIPOS_IDENTIFICACION[proveedor?.tipo_identificacion] || '—';
}

const {
  proveedores,
  isLoading,
  isDeleting,
  isReactivating,
  search,
  estado,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  fetchProveedores,
  removeProveedor,
  reactivateProveedor,
} = useProveedores();

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
const proveedorToDelete = ref(null);
const showReactivateModal = ref(false);
const proveedorToReactivate = ref(null);
let searchTimer;

const showProveedorModal = ref(false);
const proveedorModalId = ref(null);

// --- PANEL DE FILTROS AVANZADOS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  tipoIdentificacion: '',
});

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  tipo_identificacion: appliedFilters.value.tipoIdentificacion,
}));

function applyAdvancedFilters() {
  if (isLoading.value) return;
  estado.value = draftFilters.value.estado;
  appliedFilters.value = { ...draftFilters.value };
  loadProveedores(1);
}

function clearAdvancedFilters() {
  if (isLoading.value) return;
  search.value = '';
  estado.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  loadProveedores(1);
}

function openCreateModal() {
  proveedorModalId.value = null;
  showProveedorModal.value = true;
}

function openEditModal(id) {
  proveedorModalId.value = id;
  showProveedorModal.value = true;
}

async function onProveedorSaved(message, payload = null) {
  if (payload && payload.id) {
    const index = proveedores.value.findIndex((p) => p.id === payload.id);
    if (index !== -1) {
      proveedores.value.splice(index, 1, { ...proveedores.value[index], ...payload });
    }
  }
  showProveedorModal.value = false;
  showAlert('success', '', message);
  await loadProveedores(currentPage.value);
}

function onProveedorCreated(proveedor) {
  onProveedorSaved('Proveedor creado correctamente.', proveedor);
}

function onProveedorUpdated(response) {
  onProveedorSaved('Proveedor actualizado correctamente.', response);
}

function onProveedorReactivated(response) {
  onProveedorSaved('Proveedor reactivado correctamente.', response);
}

async function loadProveedores(page = 1) {
  try {
    await fetchProveedores(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los proveedores.');
  }
}

function editProveedor(id) {
  openEditModal(id);
}

function openDeleteModal(proveedor) {
  proveedorToDelete.value = proveedor;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!proveedorToDelete.value) return;

  try {
    const response = await removeProveedor(proveedorToDelete.value.id, proveedorToDelete.value.nombre);
    showAlert('success', '', response.message);

    const page = proveedores.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchProveedores(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el proveedor.');
  } finally {
    proveedorToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function onReactivateProveedor(proveedor) {
  proveedorToReactivate.value = proveedor;
  showReactivateModal.value = true;
}

async function confirmReactivate() {
  if (!proveedorToReactivate.value) return;

  try {
    const response = await reactivateProveedor(proveedorToReactivate.value.id);
    showAlert('success', '', response.message || 'Proveedor reactivado correctamente.');
    await fetchProveedores(currentPage.value, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo reactivar el proveedor.');
  } finally {
    proveedorToReactivate.value = null;
    showReactivateModal.value = false;
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProveedores(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
onMounted(() => {
  loadProveedores();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

<template>
  <div class="px-4 py-3 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full">
      <div>
        <nav class="flex mb-1.5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Proveedores</li>
          </ol>
        </nav>
        <h1 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">
          <Truck class="w-5 h-5 text-gray-900 dark:text-gray-400" />
          Proveedores
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
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h3>

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
            <label for="proveedores-search" class="block mb-1 text-sm font-medium text-heading">Buscar proveedor</label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="proveedores-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Identificación, nombre, correo electrónico, teléfono o contacto" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-tipo-id" class="block mb-1 text-sm font-medium text-heading">Tipo de identificación</label>
            <select
              id="filtro-tipo-id"
              v-model="draftFilters.tipoIdentificacion"
              class="block w-full sm:w-56 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option value="C">Cédula</option>
              <option value="R">RUC</option>
              <option value="P">Pasaporte</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Proveedores</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="proveedores"
            :export-params="exportParams"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
      <EntityTable
        :columns="['Identificación', 'Proveedor', 'Contacto', 'Persona de contacto', 'Estado', 'Acciones']"
        :items="proveedores"
        :loading="isLoading"
        loading-text="Cargando proveedores..."
        empty-text="No se encontraron proveedores."
        :empty-colspan="6"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a :href="`/crud/proveedores/ver/?id=${encodeURIComponent(item.id)}`"
            class="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400">
          {{ item.identificacion }}
          </a>
          <span class="mt-1 flex items-center gap-1 text-sm font-normal text-body text-gray-900">
            <IdCard class="w-3.5 h-3.5" />
            {{ tipoIdentificacionLabel(item) }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-gray-400">
          <ul class="space-y-1">
            <li class="flex items-center gap-2">
              <Phone class="w-4 h-4 text-gray-800 dark:text-gray-400" />
              <span class="text-sm">{{ item.telefono || 'Sin teléfono' }}</span>
            </li>
            <li class="flex items-center gap-2">
              <Mail class="w-4 h-4 text-gray-800 dark:text-gray-400" />
              <span class="text-sm">{{ item.email || 'Sin correo' }}</span>
            </li>
          </ul>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-gray-400">
          <span class="inline-flex items-center gap-2 text-sm">
            <UserRound class="w-4 h-4 text-gray-400" />
            {{ item.contacto || '—' }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span v-if="item.is_active" class="inline-flex items-center bg-success-soft border border-success-subtle text-fg-success-strong text-xs font-medium px-1 py-0.5 rounded">
            <span class="h-1.5 w-1.5 bg-fg-success-strong rounded-full me-0.5"></span> Activo
          </span>
          <span v-else class="inline-flex items-center bg-danger-soft border border-danger-subtle text-fg-danger-strong text-xs font-medium px-1 py-0.5 rounded">
            <span class="h-1.5 w-1.5 bg-fg-danger-strong rounded-full me-0.5"></span> Inactivo
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button v-if="!item.is_active" type="button" title="Reactivar proveedor" aria-label="Reactivar proveedor" :disabled="isReactivating" class="px-1.5 py-1.5 inline-flex items-center p-2 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-gray-700" @click="onReactivateProveedor(item)">
              <RotateCcw class="w-5 h-5" />
            </button>
            <button type="button" title="Editar proveedor" aria-label="Editar proveedor" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="editProveedor(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.is_active" type="button" title="Eliminar proveedor" aria-label="Eliminar proveedor" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
        item-word="proveedor"
        empty-text="No se encontraron proveedores."
        @page="loadProveedores"
      />
    </template>
    </EntityTable>
    </div>
  </div>


  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="proveedor"
    :icon="Trash2"
    :item-name="proveedorToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="proveedorToDelete = null"
  />

  <ConfirmModal
    v-model="showReactivateModal"
    entity-name="proveedor"
    :icon="RotateCcw"
    :item-name="proveedorToReactivate?.nombre"
    title="Reactivar proveedor"
    :message="`¿Deseas reactivar a ${proveedorToReactivate?.nombre || 'este proveedor'}? Volverá a aparecer como activo en el listado.`"
    variant="success"
    confirm-text="Sí, reactivar"
    confirming-text="Reactivando..."
    :is-deleting="isReactivating"
    @confirm="confirmReactivate"
    @cancel="proveedorToReactivate = null"
  />

  <ProveedorModal
    v-model="showProveedorModal"
    :proveedor-id="proveedorModalId"
    @created="onProveedorCreated"
    @updated="onProveedorUpdated"
    @reactivated="onProveedorReactivated"
  />
</template>
