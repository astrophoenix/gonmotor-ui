<script setup>
import { onMounted, ref, computed, h } from 'vue';
import { UsersRound, Upload, Phone, Mail, Pen, Trash2, IdCard, Search, RotateCcw, Filter } from 'lucide-vue-next';
import { useClients } from '../composables/useClients';
// import { useToast } from '../../../shared/composables/useToast';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
// import ToastContainer from '../../../shared/components/ToastContainer.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ImportExcelModal from './ImportExcelModal.vue';
import ClientModal from './ClientModal.vue';
import ClienteVehiculosCell from './ClienteVehiculosCell.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';

const { puede } = usePermisos();
const puedeModificarClientes = computed(() => puede('clientes', 'modificar'));

const TIPOS_IDENTIFICACION = {
  C: 'Cédula',
  R: 'RUC',
  P: 'Pasaporte',
};

function tipoIdentificacionLabel(cliente) {
  return TIPOS_IDENTIFICACION[cliente?.tipo_identificacion] || '—';
}

const {
  clients,
  isLoading,
  isDeleting,
  isReactivating,
  search,
  estado,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  fetchClients,
  removeClient,
  reactivateClient,
} = useClients();

// const { showSuccess, showError } = useToast();

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
const clientToDelete = ref(null);
const showReactivateModal = ref(false);
const clientToReactivate = ref(null);

const showImportModal = ref(false);

const showClientModal = ref(false);
const clientModalId = ref(null);

// --- PANEL DE FILTROS AVANZADOS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  tipoIdentificacion: '',
  minVehiculos: '',
});

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  tipo_identificacion: appliedFilters.value.tipoIdentificacion,
  min_vehiculos: appliedFilters.value.minVehiculos,
}));

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  appliedFilters.value = { ...draftFilters.value };
  loadClients(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadClients(1);
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
  clientModalId.value = null;
  showClientModal.value = true;
}

function openEditModal(id) {
  clientModalId.value = id;
  showClientModal.value = true;
}

async function onClientSaved(message, payload = null) {
  if (payload && payload.id) {
    const index = clients.value.findIndex((c) => c.id === payload.id);
    if (index !== -1) {
      clients.value.splice(index, 1, { ...clients.value[index], ...payload });
    }
  }
  showClientModal.value = false;
  showAlert('success', '', message);
  await loadClients(currentPage.value);
}

function onClientCreated(client) {
  onClientSaved('Cliente creado correctamente.', client);
}

function onClientUpdated(response) {
  onClientSaved('Cliente actualizado correctamente.', response);
}

function onClientReactivated(response) {
  onClientSaved('Cliente reactivado correctamente.', response);
}

function openImportModal() {
  showImportModal.value = true;
}

async function onImported(count) {
  showAlert('success', '', `${count} cliente(s) importado(s) exitosamente.`);
  loadClients(1);
}

async function loadClients(page = 1) {
  try {
    await fetchClients(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los clientes.');
  }
}

function editClient(id) {
  openEditModal(id);
}

function openDeleteModal(client) {
  clientToDelete.value = client;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!clientToDelete.value) return;

  try {
    const response = await removeClient(clientToDelete.value.id, clientToDelete.value.nombre);
    showAlert('success', '', response.message);

    const page = clients.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchClients(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el cliente.');
  } finally {
    clientToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function onReactivateClient(client) {
  clientToReactivate.value = client;
  showReactivateModal.value = true;
}

async function confirmReactivate() {
  if (!clientToReactivate.value) return;

  try {
    const response = await reactivateClient(clientToReactivate.value.id);
    showAlert('success', '', response.message || 'Cliente reactivado correctamente.');
    await fetchClients(currentPage.value, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo reactivar el cliente.');
  } finally {
    clientToReactivate.value = null;
    showReactivateModal.value = false;
  }
}


onMounted(() => {
  loadClients();
});
</script>

<template>
  <EntityHeader
    mode="list"
    :icon="UsersRound"
    entity="Clientes"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Clientes' },
    ]"
  />

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
            <label for="clients-search" class="block mb-1 text-sm font-medium text-heading">Buscar cliente</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="clients-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Identificación, nombre, correo electrónico o teléfono" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
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

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-min-vehiculos" class="block mb-1 text-sm font-medium text-heading">N.º vehículos</label>
            <input
              id="filtro-min-vehiculos"
              v-model="draftFilters.minVehiculos"
              type="number"
              min="0"
              max="5000"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"/>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Clientes</h2>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="puedeModificarClientes"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border rounded-lg shadow-xs text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            @click="openImportModal"
          >
            <Upload class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Importar
          </button>
          <EntityActionButtons
            entity="clientes"
            :show-add="puedeModificarClientes"
            :export-params="exportParams"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
      <EntityTable
        :columns="['Identificación', 'Nombre / Razón Social', 'Contacto', 'Vehículos', 'Estado', 'Acciones']"
        :items="clients"
        :loading="isLoading"
        loading-text="Cargando clientes..."
        empty-text="No se encontraron clientes."
        :empty-colspan="6"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <a :href="`/crud/clientes/ver/?id=${encodeURIComponent(item.id)}`"
            class="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-brand-coral dark:text-primary-400">
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
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <ClienteVehiculosCell :cliente="item" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <EstadoActivoBadge :activo="item.is_active" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button v-if="puedeModificarClientes && !item.is_active" type="button" title="Reactivar cliente" aria-label="Reactivar cliente" :disabled="isReactivating" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400" @click="onReactivateClient(item)">
              <RotateCcw class="w-4 h-4" />
            </button>
            <button v-if="puedeModificarClientes" type="button" title="Editar cliente" aria-label="Editar cliente" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" @click="editClient(item.id)">
              <Pen class="w-4 h-4" />
            </button>
            <button v-if="puedeModificarClientes && item.is_active" type="button" title="Eliminar cliente" aria-label="Eliminar cliente" :disabled="isDeleting" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400" @click="openDeleteModal(item)">
              <Trash2 class="w-4 h-4" />
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
        item-word="cliente"
        empty-text="No se encontraron clientes."
        @page="loadClients"
      />
    </template>
    </EntityTable>
    </div>
  </div>


  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="cliente"
    :icon="Trash2"
    :item-name="clientToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="clientToDelete = null"
  />

  <ConfirmModal
    v-model="showReactivateModal"
    entity-name="cliente"
    :icon="RotateCcw"
    :item-name="clientToReactivate?.nombre"
    title="Reactivar cliente"
    :message="`¿Deseas reactivar a ${clientToReactivate?.nombre || 'este cliente'}? Volverá a aparecer como activo en el listado.`"
    variant="success"
    confirm-text="Sí, reactivar"
    confirming-text="Reactivando..."
    :is-deleting="isReactivating"
    @confirm="confirmReactivate"
    @cancel="clientToReactivate = null"
  />

  <ImportExcelModal
    v-model="showImportModal"
    @imported="onImported"
  />

  <ClientModal
    v-model="showClientModal"
    :client-id="clientModalId"
    @created="onClientCreated"
    @updated="onClientUpdated"
    @reactivated="onClientReactivated"
  />

  <!-- <ToastContainer /> -->
</template>
