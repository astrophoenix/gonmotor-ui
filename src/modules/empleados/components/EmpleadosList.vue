<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { useEmpleados } from '../composables/useEmpleados';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';

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
          <svg class="w-6 h-6 inline-block text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18a7 7 0 0114 0H3z" clip-rule="evenodd" fill-rule="evenodd"></path></svg>          
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

  <div class="flex flex-col">
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full align-middle">
        <div class="overflow-hidden shadow">
          <table class="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
            <thead class="bg-gray-200 dark:bg-gray-900">
              <tr>
                <th v-for="heading in ['Empleado', 'Correo', 'Rol', 'Talleres Asignados', 'Estado', 'Acciones']" :key="heading" scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">{{ heading }}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              <tr v-if="isLoading"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">Cargando empleados...</td></tr>
              <tr v-else-if="!empleados.length"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">No se encontraron empleados.</td></tr>
              <template v-else>
                <tr v-for="empleado in empleados" :key="empleado.id" class="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
                    {{ empleado.user?.first_name }} {{ empleado.user?.last_name }}
                  </td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-gray-400">
                    {{ empleado.user?.email || 'Sin correo' }}
                  </td>
                  <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
                    <span class="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-primary-900 dark:text-primary-300">
                      {{ empleado.get_rol_display }}
                    </span>
                  </td>
                  <td class="p-4 text-gray-800 dark:text-gray-400">
                    <div v-if="!empleado.talleres || !empleado.talleres.length" class="text-sm text-gray-500 dark:text-gray-400">
                      Sin talleres asignados
                    </div>
                    <div v-else class="text-sm">
                      {{ empleado.talleres.map(t => t.nombre).join(', ') }}
                    </div>
                  </td>
                  <td class="p-4 whitespace-nowrap">
                    <span v-if="empleado.is_active" class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                      Activo
                    </span>
                    <span v-else class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                      Inactivo
                    </span>
                  </td>
                  <td class="p-4 whitespace-nowrap">
                    <button type="button" title="Editar empleado" aria-label="Editar empleado" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="editEmpleado(empleado.id)">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button type="button" title="Eliminar empleado" aria-label="Eliminar empleado" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(empleado)">
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
      <button type="button" :disabled="!previousUrl || isLoading" class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 disabled:opacity-50" @click="fetchEmpleados(currentPage - 1)">Anterior</button>
      <button type="button" :disabled="!nextUrl || isLoading" class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 disabled:opacity-50" @click="fetchEmpleados(currentPage + 1)">Siguiente</button>
    </div>
  </div>

  <ConfirmDeleteModal
    v-model="showDeleteModal"
    entity-name="empleado"
    :item-name="empleadoToDelete?.user?.first_name || ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="empleadoToDelete = null"
  />
</template>
