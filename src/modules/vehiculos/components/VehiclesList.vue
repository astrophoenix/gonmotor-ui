<script setup>
import { onMounted, ref, watch } from 'vue';
import { Car, Pencil, Trash2 } from 'lucide-vue-next';
import { useVehicles } from '../composables/useVehicles';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import VehicleModal from './VehicleModal.vue';
import { formatPlate } from '../../../shared/utils/formatPlate';
const {
  vehicles,
  isLoading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
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
      <div class="sm:flex">
        <div class="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadVehicles(1)">
          <label for="vehicles-search" class="sr-only">Buscar vehículos</label>
          <input id="vehicles-search" v-model="search" type="search" placeholder="Buscar vehículos" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
<div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <EntityActionButtons 
          entity="vehiculos" 
          @add="openCreateModal"
          @pdfExportError="handlePdfError"
          @excelExportError="handleExcelError" />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Placa', 'Marca', 'Modelo', 'Año', 'Dueño', 'Acciones']"
    :items="vehicles"
    :loading="isLoading"
    loading-text="Cargando vehículos..."
    empty-text="No se encontraron vehículos."
    :empty-colspan="6"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadVehicles(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatPlate(item.placa) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.marca }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.modelo }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.anio || '—' }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente_nombre || 'Sin dueño' }}</td>
        <td class="p-4 whitespace-nowrap">
          <button type="button" title="Editar vehículo" aria-label="Editar vehículo" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
            <Pencil class="w-5 h-5" />
          </button>
          <button type="button" title="Eliminar vehículo" aria-label="Eliminar vehículo" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <Trash2 class="w-5 h-5" />
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
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
</template>
