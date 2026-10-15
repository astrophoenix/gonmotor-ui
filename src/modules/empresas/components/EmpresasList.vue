<script setup>
import { onMounted, ref } from 'vue';
import { Building2, Pen, Trash2, Search, Filter } from 'lucide-vue-next';
import { useEmpresas } from '../composables/useEmpresas';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import EmpresaModal from './EmpresaModal.vue';

const {
  empresas,
  isLoading,
  isDeleting,
  search,
  estado,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  fetchEmpresas,
  removeEmpresa,
} = useEmpresas();

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

// --- PANEL DE FILTROS (se aplican al cambiar: useFiltrosReactivos) ---
const emptyAdvancedFilters = () => ({ estado: '' });

const draftFilters = ref({ estado: estado.value });
const appliedFilters = ref({ ...draftFilters.value });

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  appliedFilters.value = { ...draftFilters.value };
  loadEmpresas(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadEmpresas(1);
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

const showDeleteModal = ref(false);
const empresaToDelete = ref(null);
const showEmpresaModal = ref(false);
const empresaModalId = ref(null);

async function loadEmpresas(page = 1) {
  try {
    await fetchEmpresas(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar las empresas.');
  }
}

function openCreateModal() {
  empresaModalId.value = null;
  showEmpresaModal.value = true;
}

function openEditModal(id) {
  empresaModalId.value = id;
  showEmpresaModal.value = true;
}

function onEmpresaSaved(message) {
  showEmpresaModal.value = false;
  empresaModalId.value = null;
  showAlert('success', '', message);
  loadEmpresas(currentPage.value);
}

function onEmpresaCreated() {
  onEmpresaSaved('Empresa creada correctamente.');
}

function onEmpresaUpdated() {
  onEmpresaSaved('Empresa actualizada correctamente.');
}

function openDeleteModal(empresa) {
  empresaToDelete.value = empresa;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!empresaToDelete.value) return;

  try {
    const response = await removeEmpresa(empresaToDelete.value.id, empresaToDelete.value.nombre_comercial);
    showAlert('success', '', response.message);

    const page = empresas.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchEmpresas(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la empresa.');
  } finally {
    empresaToDelete.value = null;
    showDeleteModal.value = false;
  }
}


onMounted(() => loadEmpresas());
</script>

<template>
  <EntityHeader
    mode="list"
    :icon="Building2"
    entity="Empresas"
    :breadcrumb="[
      { label: 'Inicio', href: '/crud/empresas/' },
      { label: 'Empresas' },
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
    <div class="bg-neutral-primary-soft shadow-xs rounded border border-default mb-4">
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

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
            <label for="empresas-search" class="block mb-1 text-sm font-medium text-heading">Buscar empresa</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="empresas-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Nombre comercial, razón social, RUC o correo" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option value="activo">Activa</option>
              <option value="inactivo">Inactiva</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Empresas</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="empresas"
            :show-export-pdf="false"
            :show-export-excel="false"
            @add="openCreateModal" />
        </div>
      </div>
      <EntityTable
        :columns="['Nombre comercial', 'Razón social', 'RUC', 'Teléfono', 'Correo electrónico', 'Estado', 'Acciones']"
        :items="empresas"
        :loading="isLoading"
        loading-text="Cargando empresas..."
        empty-text="No se encontraron empresas."
        :empty-colspan="7"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre_comercial }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.razon_social || '—' }}</td>
        <td class="p-4 font-mono text-sm text-gray-800 whitespace-nowrap dark:text-white">{{ item.ruc }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.telefono || '—' }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-gray-400">{{ item.email_contacto || '—' }}</td>
        <td class="p-4 whitespace-nowrap">
          <span v-if="item.is_active" class="inline-flex items-center bg-success-soft border border-success-subtle text-fg-success-strong text-xs font-medium px-1 py-0.5 rounded">
            <span class="h-1.5 w-1.5 bg-fg-success-strong rounded-full me-0.5"></span>
            Activa
          </span>
          <span v-else class="inline-flex items-center bg-danger-soft border border-danger-subtle text-fg-danger-strong text-xs font-medium px-1 py-0.5 rounded">
            <span class="h-1.5 w-1.5 bg-fg-danger-strong rounded-full me-0.5"></span>
            Inactiva
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar empresa" aria-label="Editar empresa" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="openEditModal(item.id)">
              <Pen class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar empresa" aria-label="Eliminar empresa" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
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
        item-word="empresa"
        item-plural="empresas"
        empty-text="No se encontraron empresas."
        @page="loadEmpresas"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="empresa"
    :message="empresaToDelete ? `¿Estás seguro de eliminar la empresa ${empresaToDelete.nombre_comercial}? Sus usuarios ya no podrán ingresar a ella.` : ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="empresaToDelete = null"
  />

  <EmpresaModal
    v-model="showEmpresaModal"
    :empresa-id="empresaModalId"
    @created="onEmpresaCreated"
    @updated="onEmpresaUpdated"
  />
</template>
