<script setup>
import { onMounted, ref, computed } from 'vue';
import { Truck, Phone, Mail, Trash2, IdCard, Search, RotateCcw, Filter, UserRound, Upload } from 'lucide-vue-next';
import { useProveedores } from '../composables/useProveedores';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ProveedorModal from './ProveedorModal.vue';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import ImportWizardModal from '../../../shared/components/ImportWizardModal.vue';
import { IMPORTACION_PROVEEDORES, SERVICIO_IMPORTACION_PROVEEDORES } from '../constants/importacionProveedores';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificarProveedores = computed(() => puede('proveedores', 'modificar'));

const showImportModal = ref(false);

function onImported(resultado) {
  const n = resultado.exitosos;
  showAlert('success', '', `${n} ${n === 1 ? 'proveedor importado' : 'proveedores importados'} correctamente.`);
  loadProveedores(1);
}

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
  estado.value = draftFilters.value.estado;
  appliedFilters.value = { ...draftFilters.value };
  loadProveedores(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadProveedores(1);
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


onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('proveedores')) loadProveedores();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('proveedores')" seccion="Proveedores" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="Truck"
    entity="Proveedores"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Proveedores' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('proveedores')" objeto="los proveedores" />
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
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h3>

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
            <label for="proveedores-search" class="block mb-1 text-sm font-medium text-heading">Buscar proveedor</label>
            <form class="relative" @submit.prevent="aplicarYa">
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
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Proveedores</h2>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="puedeModificarProveedores"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border rounded-lg shadow-xs text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            @click="showImportModal = true"
          >
            <Upload class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Importar
          </button>
          <EntityActionButtons
            entity="proveedores"
            :show-add="puedeModificarProveedores"
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
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <a :href="`/crud/proveedores/ver/?id=${encodeURIComponent(item.id)}`"
            class="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-accent-500 dark:hover:text-accent-400 dark:text-primary-400">
          {{ item.identificacion }}
          </a>
          <span class="mt-1 flex items-center gap-1 text-sm font-normal text-body text-gray-900">
            <IdCard class="w-3.5 h-3.5" />
            {{ tipoIdentificacionLabel(item) }}
          </span>
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-gray-400">
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
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-gray-400">
          <span class="inline-flex items-center gap-2 text-sm">
            <UserRound class="w-4 h-4 text-gray-400" />
            {{ item.contacto || '—' }}
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <EstadoActivoBadge :activo="item.is_active" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button v-if="puedeModificarProveedores && !item.is_active" type="button" title="Reactivar proveedor" aria-label="Reactivar proveedor" :disabled="isReactivating" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400" @click="onReactivateProveedor(item)">
              <RotateCcw class="w-4 h-4" />
            </button>
            <EntityRowActions entity="proveedor" :show-view="!puedeModificarProveedores" :view-href="`/crud/proveedores/ver/?id=${encodeURIComponent(item.id)}`" :show-edit="puedeModificarProveedores" :show-delete="puedeModificarProveedores && item.is_active" :delete-disabled="isDeleting" @edit="editProveedor(item.id)" @delete="openDeleteModal(item)" />
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
        :itemPlural="'proveedores'"
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

  <ImportWizardModal
    v-model="showImportModal"
    :config="IMPORTACION_PROVEEDORES"
    :servicio="SERVICIO_IMPORTACION_PROVEEDORES"
    @imported="onImported"
  />
  </template>
</template>
