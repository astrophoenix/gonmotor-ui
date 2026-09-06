<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { Users, Download, Phone, Mail, Car, Pencil, Trash2 } from 'lucide-vue-next';
import { useClients } from '../composables/useClients';
// import { useToast } from '../../../shared/composables/useToast';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
// import ToastContainer from '../../../shared/components/ToastContainer.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import ImportExcelModal from './ImportExcelModal.vue';
import ClientModal from './ClientModal.vue';
import { formatPlate } from '../../../shared/utils/formatPlate';

const {
  clients,
  isLoading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchClients,
  removeClient,
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
let searchTimer;
const openPopoverId = ref(null);

const showImportModal = ref(false);

const showClientModal = ref(false);
const clientModalId = ref(null);

function openCreateModal() {
  clientModalId.value = null;
  showClientModal.value = true;
}

function openEditModal(id) {
  clientModalId.value = id;
  showClientModal.value = true;
}

async function onClientSaved(message) {
  showClientModal.value = false;
  showAlert('success', '', message);
  await loadClients(currentPage.value);
}

function onClientCreated(client) {
  onClientSaved('Cliente creado correctamente.');
}

function onClientUpdated() {
  onClientSaved('Cliente actualizado correctamente.');
}

function onClientReactivated() {
  onClientSaved('Cliente reactivado correctamente.');
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
    await fetchClients(page);
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
    await fetchClients(page);
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

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadClients(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => {
  loadClients();
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
});
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
            <li class="text-gray-400" aria-current="page">/ Clientes</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <Users class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Clientes
        </h1>
      </div>
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
      <div class="sm:flex">
        <div class="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadClients(1)">
          <label for="clients-search" class="sr-only">Buscar clientes</label>
          <input id="clients-search" v-model="search" type="search" placeholder="Buscar clientes" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 dark:focus:ring-emerald-800"
            @click="openImportModal"
          >
            <Download class="w-5 h-5 mr-1" />
            Importar
          </button>
          <EntityActionButtons 
            entity="clientes" 
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Identificación', 'Nombre / Razón Social', 'Contacto', 'Vehículos', 'Acciones']"
    :items="clients"
    :loading="isLoading"
    loading-text="Cargando clientes..."
    empty-text="No se encontraron clientes."
    :empty-colspan="7"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadClients(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/clientes/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {{ item.identificacion }}
          </a>
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
              class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-100 active:bg-primary-200 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
            >
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
          <button type="button" title="Editar cliente" aria-label="Editar cliente" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="editClient(item.id)">
            <Pencil class="w-5 h-5" />
          </button>
          <button type="button" title="Eliminar cliente" aria-label="Eliminar cliente" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <Trash2 class="w-5 h-5" />
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>


  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="cliente"
    :item-name="clientToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="clientToDelete = null"
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
