<script setup>
import { onMounted, ref, watch } from 'vue';
import { Building2, Search, Pencil, Trash2 } from 'lucide-vue-next';
import { talleresService } from '../services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import TallerModal from './TallerModal.vue';

const talleres = ref([]);
const isLoading = ref(true);
const isDeleting = ref(false);
const search = ref('');
const currentPage = ref(1);
const total = ref(0);
const nextUrl = ref(null);
const previousUrl = ref(null);
let searchTimer;

const columns = ['Nombre', 'Código', 'Ciudad', 'Dirección', 'Teléfono', 'Estado', 'Acciones'];

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showTallerModal = ref(false);
const tallerModalId = ref(null);

function openCreateModal() {
  tallerModalId.value = null;
  showTallerModal.value = true;
}

function openEditModal(taller) {
  tallerModalId.value = taller.id;
  showTallerModal.value = true;
}

function onTallerSaved(message) {
  showTallerModal.value = false;
  tallerModalId.value = null;
  showAlert('success', '', message);
  loadTalleres(currentPage.value);
}

function onTallerCreated() {
  onTallerSaved('El taller ha sido creado exitosamente.');
}

function onTallerUpdated() {
  onTallerSaved('El taller ha sido actualizado exitosamente.');
}

function onTallerExportError(message) {
  showAlert('error', '', message || 'Ocurrió un error al generar el archivo.');
}

async function loadTalleres(page = 1) {
  isLoading.value = true;
  try {
    const data = await talleresService.listTalleres({ page, search: search.value.trim() });
    talleres.value = Array.isArray(data) ? data : data?.results || [];
    total.value = Array.isArray(data) ? data.length : data?.count || 0;
    nextUrl.value = Array.isArray(data) ? null : data?.next || null;
    previousUrl.value = Array.isArray(data) ? null : data?.previous || null;
    currentPage.value = page;
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los talleres.');
  } finally {
    isLoading.value = false;
  }
}

const showDeleteModal = ref(false);
const tallerToDelete = ref(null);

function openDeleteModal(taller) {
  tallerToDelete.value = taller;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!tallerToDelete.value) return;

  isDeleting.value = true;
  try {
    await talleresService.deleteTaller(tallerToDelete.value.id);
    showAlert('success', '', 'Taller eliminado correctamente.');

    const page = talleres.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadTalleres(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el taller.');
  } finally {
    tallerToDelete.value = null;
    showDeleteModal.value = false;
    isDeleting.value = false;
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadTalleres(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => loadTalleres());
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
            <li class="text-gray-400" aria-current="page">/ Talleres</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <Building2 class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Talleres
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
          <form class="relative" @submit.prevent="loadTalleres(1)">
            <label for="talleres-search" class="sr-only">Buscar talleres</label>
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <Search class="w-4 h-4 text-body" />
            </div>
            <input id="talleres-search" v-model="search" type="search" placeholder="Buscar taller" class="block w-full sm:w-80 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand">
          </form>
        </div>
        <div class="flex items-center gap-2">
          <EntityActionButtons
            entity="talleres"
            entity-api-path="configuracion/sucursales"
            @add="openCreateModal"
            @pdfExportError="onTallerExportError"
            @excelExportError="onTallerExportError" />
        </div>
      </div>
      <EntityTable
        :columns="columns"
        :items="talleres"
        :loading="isLoading"
        loading-text="Cargando talleres..."
        empty-text="No se encontraron talleres."
        :empty-colspan="7"
        :wrapper-class="'w-full'"
      >
        <template #row="{ item }">
          <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.codigo_sucursal }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.ciudad || '—' }}</td>
            <td class="p-4 text-gray-800 dark:text-white">{{ item.direccion }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.telefono || '—' }}</td>
            <td class="p-4 whitespace-nowrap">
              <span v-if="item.is_active" class="inline-flex items-center bg-success-soft border border-success-subtle text-fg-success-strong text-xs font-medium px-1.5 py-0.5 rounded">
                <span class="h-1.5 w-1.5 bg-fg-success-strong rounded-full me-0.5"></span>
                Activo
              </span>
              <span v-else class="inline-flex items-center bg-danger-soft border border-danger-subtle text-fg-danger-strong text-xs font-medium px-1.5 py-0.5 rounded">
                <span class="h-1.5 w-1.5 bg-fg-danger-strong rounded-full me-0.5"></span>
                Inactivo
              </span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <button type="button" title="Editar taller" aria-label="Editar taller" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="openEditModal(item)">
                  <Pencil class="w-5 h-5" />
                </button>
                <button type="button" title="Eliminar taller" aria-label="Eliminar taller" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
            item-word="taller"
            empty-text="No se encontraron talleres."
            @page="loadTalleres"
          />
        </template>
      </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="taller"
    :item-name="tallerToDelete?.nombre"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="tallerToDelete = null"
  />

  <TallerModal
    v-model="showTallerModal"
    :taller-id="tallerModalId"
    @created="onTallerCreated"
    @updated="onTallerUpdated"
  />
</template>