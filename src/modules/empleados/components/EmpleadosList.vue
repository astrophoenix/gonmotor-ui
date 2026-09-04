<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { useEmpleados } from '../composables/useEmpleados';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const {
  empleados,
  isLoading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchEmpleados,
  removeEmpleado,
} = useEmpleados();

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
const empleadoToDelete = ref(null);
let searchTimer;

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function editEmpleado(id) {
  window.location.assign(`/crud/empleados/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(empleado) {
  empleadoToDelete.value = empleado;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!empleadoToDelete.value) return;

  try {
    const response = await removeEmpleado(empleadoToDelete.value.id, empleadoToDelete.value.user?.first_name || 'empleado');
    showAlert('success', '', response.message);

    const page = empleados.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchEmpleados(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el empleado.');
  } finally {
    empleadoToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchEmpleados(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => {
  fetchEmpleados();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
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
            <li class="text-gray-400" aria-current="page">/ Empleados</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <svg class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path clip-rule="evenodd" fill-rule="evenodd" d="M6 2c-1.10457 0-2 .89543-2 2v4c0 .55228.44772 1 1 1s1-.44772 1-1V4h12v7h-2c-.5523 0-1 .4477-1 1v2h-1c-.5523 0-1 .4477-1 1s.4477 1 1 1h5c.5523 0 1-.4477 1-1V3.85714C20 2.98529 19.3667 2 18.268 2H6Z"/>
            <path clip-rule="evenodd" fill-rule="evenodd" d="M6 11.5C6 9.567 7.567 8 9.5 8S13 9.567 13 11.5 11.433 15 9.5 15 6 13.433 6 11.5ZM4 20c0-2.2091 1.79086-4 4-4h3c2.2091 0 4 1.7909 4 4 0 1.1046-.8954 2-2 2H6c-1.10457 0-2-.8954-2-2Z"/>
          </svg>
          Empleados
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
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="fetchEmpleados(1)">
            <label for="empleados-search" class="sr-only">Buscar empleados</label>
            <input id="empleados-search" v-model="search" type="search" placeholder="Buscar empleados" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <EntityActionButtons 
            entity="empleados" 
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Empleado', 'Correo', 'Rol', 'Talleres', 'Estado', 'Acciones']"
    :items="empleados"
    :loading="isLoading"
    loading-text="Cargando empleados..."
    empty-text="No se encontraron empleados."
    :empty-colspan="7"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => fetchEmpleados(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.user?.first_name }} {{ item.user?.last_name }}
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-gray-400">
          {{ item.user?.email || 'Sin correo' }}
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.rol_display || item.rol }}
        </td>
        <td class="p-4 text-gray-800 dark:text-gray-400">
          <div v-if="!item.talleres || !item.talleres.length" class="text-gray-500 dark:text-gray-400">
            Sin talleres
          </div>
          <div v-else>
            {{ item.talleres.map(t => t.nombre).join(', ') }}
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span v-if="item.is_active" class="bg-green-100 text-green-800 font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
            Activo
          </span>
          <span v-else class="bg-red-100 text-red-800 font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
            Inactivo
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <button type="button" title="Editar empleado" aria-label="Editar empleado" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="editEmpleado(item.id)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
          </button>
          <button type="button" title="Eliminar empleado" aria-label="Eliminar empleado" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="empleado"
    :item-name="empleadoToDelete?.user?.first_name || ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="empleadoToDelete = null"
  />
</template>
