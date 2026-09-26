<script setup>
import { onMounted, ref, watch, onUnmounted, computed, h } from 'vue';
import { Car, UsersRound, Upload, Phone, Mail, Pencil, Trash2, IdCard, Search, RotateCcw, Filter } from 'lucide-vue-next';
import { useClients } from '../composables/useClients';
// import { useToast } from '../../../shared/composables/useToast';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
// import ToastContainer from '../../../shared/components/ToastContainer.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ImportExcelModal from './ImportExcelModal.vue';
import ClientModal from './ClientModal.vue';
import { formatPlate } from '../../../shared/utils/formatPlate';

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
let searchTimer;
const openPopoverId = ref(null);

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
  if (isLoading.value) return;
  estado.value = draftFilters.value.estado;
  appliedFilters.value = { ...draftFilters.value };
  loadClients(1);
}

function clearAdvancedFilters() {
  if (isLoading.value) return;
  search.value = '';
  estado.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  loadClients(1);
}

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

function togglePopover(clientId) {
  openPopoverId.value = openPopoverId.value === clientId ? null : clientId;
}

function closePopover() {
  openPopoverId.value = null;
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closePopover();
  }
}

function handleClickOutside(event) {
  if (openPopoverId.value && !event.target.closest('[data-popover-container]')) {
    closePopover();
  }
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

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadClients(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
onMounted(() => {
  loadClients();
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  clearTimeout(searchTimer);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
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
            <li class="text-gray-400" aria-current="page">/ Clientes</li>
          </ol>
        </nav>
        <h1 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">
          <UsersRound class="w-5 h-5 text-gray-900 dark:text-gray-400" />
          Clientes
        </h1>
        <!--h5 class="text-sm text-gray-500 sm:text-base dark:text-gray-400">
          Administra los clientes de tu concesionario y sus vehículos asociados.
        </h5-->
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
            <label for="clients-search" class="block mb-1 text-sm font-medium text-heading">Buscar cliente</label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="clients-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Identificación, nombre, correo electrónico o teléfono" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="shrink-0">
            <label for="filtro-tipo-id" class="block mb-1 text-sm font-medium text-heading">Tipo de identificación</label>
            <select
              id="filtro-tipo-id"
              v-model="draftFilters.tipoIdentificacion"
              class="block w-56 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option value="C">Cédula</option>
              <option value="R">RUC</option>
              <option value="P">Pasaporte</option>
            </select>
          </div>

          <div class="shrink-0">
            <label for="filtro-min-vehiculos" class="block mb-1 text-sm font-medium text-heading">N.º vehículos</label>
            <input
              id="filtro-min-vehiculos"
              v-model="draftFilters.minVehiculos"
              type="number"
              min="0"
              max="5000"
              class="block w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"/>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Clientes</h2>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 dark:focus:ring-emerald-800"
            @click="openImportModal"
          >
            <Upload class="w-5 h-5 mr-1.5 -ml-1 text-white" />
            Importar
          </button>
          <EntityActionButtons
            entity="clientes"
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
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a :href="`/crud/clientes/ver/?id=${encodeURIComponent(item.id)}`"
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
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <div v-if="!item.vehiculos || !item.vehiculos.length" class="text-sm text-gray-500 dark:text-gray-400">
            Sin vehículos
          </div>
          <div v-else-if="item.vehiculos.length === 1" class="flex items-center gap-2">
            <Car class="w-4 h-4 text-gray-800 dark:text-gray-400" />

            <span class="text-sm">{{ formatPlate(item.vehiculos[0].placa) }} → {{ item.vehiculos[0].marca }} {{ item.vehiculos[0].color || '—' }}</span>
          </div>
          <div v-else-if="item.vehiculos.length === 2" class="space-y-1">
            <div v-for="veh in item.vehiculos" :key="veh.id" class="flex items-center gap-2">
              <Car class="w-4 h-4 text-gray-800 dark:text-gray-400" />

              <span class="text-sm">{{ formatPlate(veh.placa) }} → {{ veh.marca }} {{ veh.color || '—' }}</span>
            </div>
          </div>
          <div v-else class="relative" data-popover-container>
            <button
              type="button"
              @click="togglePopover(item.id)"
              class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-100 active:bg-primary-200 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:active:bg-gray-700">
              <Car class="w-4 h-4 text-gray-800 dark:text-gray-400" />
              mostrar +
              <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">
                {{ item.vehiculos_count }}
              </span>
            </button>
            <div
              v-if="openPopoverId === item.id"
              class="absolute z-20 mt-2 w-80 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-lg dark:text-gray-400 dark:border-gray-600 dark:bg-gray-800"
            >
              <div class="px-3 py-2 bg-gray-100 border-b border-gray-200 rounded-t-lg dark:border-gray-600 dark:bg-gray-700">
                <h3 class="font-semibold text-gray-800 dark:text-white">Vehículos del cliente</h3>
              </div>
              <div class="px-3 py-2 max-h-60 overflow-y-auto">
                <ul class="space-y-2">
                  <li v-for="veh in item.vehiculos" :key="veh.id" class="flex items-center gap-2">
                    <Car class="w-4 h-4 text-gray-800 dark:text-gray-400" />
                    <span class="text-sm">{{ formatPlate(veh.placa) }} → {{ veh.marca }} {{ veh.color || '—' }}</span>
                  </li>
                </ul>
              </div>
              <div data-popper-arrow></div>
            </div>
          </div>
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
            <button v-if="!item.is_active" type="button" title="Reactivar cliente" aria-label="Reactivar cliente" :disabled="isReactivating" class="px-1.5 py-1.5 inline-flex items-center p-2 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-gray-700" @click="onReactivateClient(item)">
              <RotateCcw class="w-5 h-5" />
            </button>
            <button type="button" title="Editar cliente" aria-label="Editar cliente" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="editClient(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.is_active" type="button" title="Eliminar cliente" aria-label="Eliminar cliente" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
