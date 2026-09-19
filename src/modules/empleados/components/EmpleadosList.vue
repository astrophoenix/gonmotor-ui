<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { IdCard, Pencil, Trash2, Users, Search } from 'lucide-vue-next';
import { useEmpleados } from '../composables/useEmpleados';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import EmpleadoModal from './EmpleadoModal.vue';

const {
  empleados,
  isLoading,
  isDeleting,
  search,
  currentPage,
  total,
  nextUrl,
  previousUrl,
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
  openEditModal(id);
}

const showEmpleadoModal = ref(false);
const empleadoModalId = ref(null);

function openCreateModal() {
  empleadoModalId.value = null;
  showEmpleadoModal.value = true;
}

function openEditModal(id) {
  empleadoModalId.value = id;
  showEmpleadoModal.value = true;
}

async function onEmpleadoSaved(message) {
  showEmpleadoModal.value = false;
  showAlert('success', '', message);
  await fetchEmpleados(currentPage.value);
}

function onEmpleadoCreated() {
  onEmpleadoSaved('Empleado creado correctamente.');
}

function onEmpleadoUpdated() {
  onEmpleadoSaved('Empleado actualizado correctamente.');
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
          <Users class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
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
    </div>
  </div>

  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-default-medium">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <form class="relative" @submit.prevent="fetchEmpleados(1)">
            <label for="empleados-search" class="sr-only">Buscar empleados</label>
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <Search class="w-4 h-4 text-body" />
            </div>
            <input id="empleados-search" v-model="search" type="search" placeholder="Buscar empleados" class="block w-full sm:w-64 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand">
          </form>
        </div>
        <div class="flex items-center gap-2">
          <EntityActionButtons
            entity="empleados"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
      <EntityTable
        :columns="['Identificación', 'Empleado', 'Correo', 'Rol', 'Talleres', 'Estado', 'Acciones']"
        :items="empleados"
        :loading="isLoading"
        loading-text="Cargando empleados..."
        empty-text="No se encontraron empleados."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/empleados/ver/?id=${encodeURIComponent(item.id)}`"
            class="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400"
          >
            <IdCard class="w-4 h-4 shrink-0" />
            {{ item.user?.identificacion || '—' }}
          </a>
        </td>
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
          <div class="flex items-center gap-2">
            <button type="button" title="Editar empleado" aria-label="Editar empleado" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="editEmpleado(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar empleado" aria-label="Eliminar empleado" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
        item-word="empleado"
        empty-text="No se encontraron empleados."
        @page="fetchEmpleados"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="empleado"
    :item-name="empleadoToDelete?.user?.first_name || ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="empleadoToDelete = null"
  />

  <EmpleadoModal
    v-model="showEmpleadoModal"
    :empleado-id="empleadoModalId"
    @created="onEmpleadoCreated"
    @updated="onEmpleadoUpdated"
  />
</template>
