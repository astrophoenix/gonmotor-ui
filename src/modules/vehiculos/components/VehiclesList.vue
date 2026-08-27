<script setup>
import { onMounted, ref, watch } from 'vue';
import { useVehicles } from '../composables/useVehicles';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
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
let searchTimer;

async function loadVehicles(page = 1) {
  try {
    await fetchVehicles(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los vehículos.');
  }
}

function editVehicle(id) {
  window.location.assign(`/crud/vehiculos/editar/?id=${encodeURIComponent(id)}`);
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
          <svg class="w-6 h-6 inline-block mr-2 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8L5.72187 10.2682C5.90158 10.418 6.12811 10.5 6.36205 10.5H17.6379C17.8719 10.5 18.0984 10.418 18.2781 10.2682L21 8M6.5 14H6.51M17.5 14H17.51M8.16065 4.5H15.8394C16.5571 4.5 17.2198 4.88457 17.5758 5.50772L20.473 10.5777C20.8183 11.1821 21 11.8661 21 12.5623V18.5C21 19.0523 20.5523 19.5 20 19.5H19C18.4477 19.5 18 19.0523 18 18.5V17.5H6V18.5C6 19.0523 5.55228 19.5 5 19.5H4C3.44772 19.5 3 19.0523 3 18.5V12.5623C3 11.8661 3.18166 11.1821 3.52703 10.5777L6.42416 5.50772C6.78024 4.88457 7.44293 4.5 8.16065 4.5ZM7 14C7 14.2761 6.77614 14.5 6.5 14.5C6.22386 14.5 6 14.2761 6 14C6 13.7239 6.22386 13.5 6.5 13.5C6.77614 13.5 7 14ZM18 14C18 14.2761 17.7761 14.5 17.5 14.5C17.2239 14.5 17 14.2761 17 14C17 13.7239 17.2239 13.5 17.5 13.5C17.7761 13.5 18 14Z"></path></svg>
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
          <EntityActionButtons entity="vehiculos" />
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col">
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full align-middle">
        <div class="overflow-hidden shadow">
          <table class="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
            <thead class="bg-gray-200 dark:bg-gray-900">
              <tr>
                <th v-for="heading in ['Placa', 'Marca', 'Modelo', 'Año', 'Dueño', 'Acciones']" :key="heading" scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">{{ heading }}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              <tr v-if="isLoading"><td colspan="6" class="p-4 text-center text-gray-500 dark:text-gray-400">Cargando vehículos...</td></tr>
              <tr v-else-if="!vehicles.length"><td colspan="6" class="p-4 text-center text-gray-500 dark:text-gray-400">No se encontraron vehículos.</td></tr>
              <template v-else>
                <tr v-for="vehicle in vehicles" :key="vehicle.id" class="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatPlate(vehicle.placa) }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ vehicle.marca }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ vehicle.modelo }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ vehicle.anio || '—' }}</td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ vehicle.cliente_nombre || 'Sin dueño' }}</td>
                  <td class="p-4 whitespace-nowrap">
                    <button type="button" title="Editar vehículo" aria-label="Editar vehículo" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="editVehicle(vehicle.id)">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button type="button" title="Eliminar vehículo" aria-label="Eliminar vehículo" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(vehicle)">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="sticky bottom-0 right-0 items-center w-full p-4 bg-white border-t border-gray-200 sm:flex sm:justify-between dark:bg-gray-800 dark:border-gray-700">
    <span class="mb-4 text-sm text-gray-500 sm:mb-0 dark:text-gray-400">{{ rangeLabel }}</span>
    <div class="flex items-center space-x-3">
      <button type="button" :disabled="!previousUrl || isLoading" class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 disabled:opacity-50" @click="loadVehicles(currentPage - 1)">Anterior</button>
      <button type="button" :disabled="!nextUrl || isLoading" class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 disabled:opacity-50" @click="loadVehicles(currentPage + 1)">Siguiente</button>
    </div>
  </div>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="vehículo"
    :item-name="vehicleToDelete?.placa"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="vehicleToDelete = null"
  />
</template>
