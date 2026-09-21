<script setup>
import { onMounted, ref, watch } from 'vue';
import { Car, MessageCircle, Pencil, Trash2, Search } from 'lucide-vue-next';
import { useVehicles } from '../composables/useVehicles';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import VehicleModal from './VehicleModal.vue';
import EnviarRecordatorioModal from '../../notificaciones/components/EnviarRecordatorioModal.vue';
import { useToast } from '../../../shared/composables/useToast';
import { formatPlate } from '../../../shared/utils/formatPlate';

const { showSuccess } = useToast();
const {
  vehicles,
  isLoading,
  isDeleting,
  search,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  fetchVehicles,
  removeVehicle,
} = useVehicles();

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
const vehicleToDelete = ref(null);
const showVehicleModal = ref(false);
const vehicleModalId = ref(null);
const showEnviarRecordatorio = ref(false);
const enviarRecordatorioVehicle = ref(null);
let searchTimer;

async function loadVehicles(page = 1) {
  try {
    await fetchVehicles(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los vehículos.');
  }
}

function openCreateModal() {
  vehicleModalId.value = null;
  showVehicleModal.value = true;
}

function openEditModal(id) {
  vehicleModalId.value = id;
  showVehicleModal.value = true;
}

function onVehicleSaved(message) {
  showVehicleModal.value = false;
  vehicleModalId.value = null;
  showAlert('success', '', message);
  loadVehicles(currentPage.value);
}

function onVehicleCreated() {
  onVehicleSaved('Vehículo creado correctamente.');
}

function onVehicleUpdated() {
  onVehicleSaved('Vehículo actualizado correctamente.');
}

function onVehicleReactivated() {
  onVehicleSaved('Vehículo reactivado correctamente.');
}

function openDeleteModal(vehicle) {
  vehicleToDelete.value = vehicle;
  showDeleteModal.value = true;
}

function openEnviarRecordatorio(vehicle) {
  enviarRecordatorioVehicle.value = vehicle;
  showEnviarRecordatorio.value = true;
}

function onRecordatorioSent(resultado) {
  showEnviarRecordatorio.value = false;
  enviarRecordatorioVehicle.value = null;
  if (resultado?.ok) {
    showAlert('success', '', resultado.descripcion || 'Recordatorio enviado correctamente.');
    showSuccess(resultado.descripcion || 'Recordatorio enviado correctamente.');
  } else if (resultado?.omitido) {
    showAlert('info', '', resultado.detail || 'El vehículo ya fue notificado recientemente.');
  } else {
    showAlert('error', '', resultado?.descripcion || resultado?.error || 'No se pudo enviar el recordatorio.');
  }
}

async function confirmDelete() {
  if (!vehicleToDelete.value) return;

  try {
    const response = await removeVehicle(vehicleToDelete.value.id, vehicleToDelete.value.placa);
    showAlert('success', '', response.message);

    const page = vehicles.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchVehicles(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el vehículo.');
  } finally {
    vehicleToDelete.value = null;
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
  searchTimer = setTimeout(() => loadVehicles(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => loadVehicles());
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
            <li class="text-gray-400" aria-current="page">/ Vehículos</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <Car class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Vehículos
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
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-default-medium">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <form class="relative" @submit.prevent="loadVehicles(1)">
            <label for="vehicles-search" class="sr-only">Buscar vehículos</label>
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <Search class="w-4 h-4 text-body" />
            </div>
            <input id="vehicles-search" v-model="search" type="search" placeholder="Buscar vehículos" class="block w-full sm:w-64 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand">
          </form>
        </div>
        <div class="flex items-center gap-2">
          <EntityActionButtons
          entity="vehiculos"
          @add="openCreateModal"
          @pdfExportError="handlePdfError"
          @excelExportError="handleExcelError" />
        </div>
      </div>
      <EntityTable
        :columns="['Placa', 'Marca', 'Modelo', 'Año', 'Dueño', 'Acciones']"
        :items="vehicles"
        :loading="isLoading"
        loading-text="Cargando vehículos..."
        empty-text="No se encontraron vehículos."
        :empty-colspan="6"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatPlate(item.placa) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.marca }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.modelo }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.anio || '—' }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente_nombre || 'Sin dueño' }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Enviar recordatorio de mantenimiento por WhatsApp" aria-label="Enviar recordatorio por WhatsApp" class="px-1.5 py-1.5 inline-flex items-center p-2 text-green-600 rounded border border-green-200 hover:bg-green-100 dark:text-green-400 dark:border-green-500 dark:hover:bg-gray-700" @click="openEnviarRecordatorio(item)">
              <MessageCircle class="w-5 h-5" />
            </button>
            <button type="button" title="Editar vehículo" aria-label="Editar vehículo" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar vehículo" aria-label="Eliminar vehículo" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
        item-word="vehículo"
        empty-text="No se encontraron vehículos."
        @page="loadVehicles"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="vehículo"
    :item-name="vehicleToDelete?.placa"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="vehicleToDelete = null"
  />

  <VehicleModal
    v-model="showVehicleModal"
    :vehicle-id="vehicleModalId"
    @created="onVehicleCreated"
    @updated="onVehicleUpdated"
    @reactivated="onVehicleReactivated"
  />

  <EnviarRecordatorioModal
    v-model="showEnviarRecordatorio"
    :vehicle="enviarRecordatorioVehicle"
    @sent="onRecordatorioSent"
  />
</template>
