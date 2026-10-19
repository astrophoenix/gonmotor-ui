<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Warehouse, Search, Filter } from 'lucide-vue-next';
import { talleresService } from '../services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';
import TallerModal from './TallerModal.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('talleres'));

const talleres = ref([]);
const isLoading = ref(true);
const isDeleting = ref(false);
const search = ref('');
const currentPage = ref(1);
const total = ref(0);
const nextUrl = ref(null);
const previousUrl = ref(null);

const emptyAdvancedFilters = () => ({
  estado: '',
  ciudad: '',
});

const draftFilters = ref({ ...emptyAdvancedFilters() });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  ciudad: appliedFilters.value.ciudad,
}));

const columns = ['Nombre', 'Código', 'Ciudad', 'Dirección', 'Teléfono', 'Estado', { key: 'acciones', label: 'Acciones', thClass: '!text-right' }];

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

const listRequest = createLatestRequest();

async function loadTalleres(page = 1) {
  const { signal, id } = listRequest.begin();
  isLoading.value = true;
  try {
    const data = await talleresService.listTalleres({
      page,
      search: search.value.trim(),
      estado: appliedFilters.value.estado,
      ciudad: appliedFilters.value.ciudad,
      signal,
    });
    if (!listRequest.isCurrent(id)) return;
    talleres.value = Array.isArray(data) ? data : data?.results || [];
    total.value = Array.isArray(data) ? data.length : data?.count || 0;
    nextUrl.value = Array.isArray(data) ? null : data?.next || null;
    previousUrl.value = Array.isArray(data) ? null : data?.previous || null;
    currentPage.value = page;
  } catch (error) {
    if (!listRequest.isCurrent(id) || isAbortError(error)) return;
    showAlert('error', '', error.message || 'No se pudieron cargar los talleres.');
  } finally {
    if (listRequest.isCurrent(id)) isLoading.value = false;
  }
}

function applyAdvancedFilters() {
  appliedFilters.value = { ...draftFilters.value };
  loadTalleres(1);
}

function clearAdvancedFilters() {
  search.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadTalleres(1);
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


onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('talleres')) loadTalleres();
});
onUnmounted(() => {
  listRequest.cancel();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('talleres')" seccion="Talleres" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="Warehouse"
    entity="Talleres"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Talleres' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('talleres')" objeto="los talleres" />
    </template>
  </EntityHeader>

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
    <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-default-medium">
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
            <label for="talleres-search" class="block mb-1 text-sm font-medium text-heading">Buscar taller</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="talleres-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Nombre, código, ciudad o dirección" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-ciudad" class="block mb-1 text-sm font-medium text-heading">Ciudad</label>
            <input
              id="filtro-ciudad"
              v-model="draftFilters.ciudad"
              type="text"
              v-sanitize-search
              maxlength="100"
              placeholder="Ej. Quito"
              class="block w-full sm:w-40 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"/>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Talleres</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="talleres"
            entity-api-path="configuracion/sucursales"
            :show-add="puedeModificar"
            :export-params="exportParams"
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
          <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
            <td class="px-4 py-3 whitespace-nowrap">
              <button type="button" :title="puedeModificar ? 'Editar taller' : 'Ver taller'" class="font-medium cursor-pointer text-slate-900 hover:text-brand-coral dark:text-white" @click="openEditModal(item)">{{ item.nombre }}</button>
            </td>
            <td class="px-4 py-3 whitespace-nowrap"><span class="px-1.5 py-0.5 font-mono text-xs border rounded text-slate-700 bg-slate-50 border-slate-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">{{ item.codigo_sucursal }}</span></td>
            <td class="px-4 py-3 text-slate-600 whitespace-nowrap dark:text-gray-300">{{ item.ciudad || '—' }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-gray-300">{{ item.direccion }}</td>
            <td class="px-4 py-3 text-slate-600 whitespace-nowrap tabular-nums dark:text-gray-300">{{ item.telefono || '—' }}</td>
            <td class="px-4 py-3 whitespace-nowrap">
              <EstadoActivoBadge :activo="item.is_active" />
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center justify-end gap-1">
                <EntityRowActions entity="taller" :show-view="!puedeModificar" :show-edit="puedeModificar" :show-delete="puedeModificar" @view="openEditModal(item)" :delete-disabled="isDeleting" @edit="openEditModal(item)" @delete="openDeleteModal(item)" />
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
    :itemPlural="'talleres'"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="tallerToDelete = null"
  />

  <TallerModal
    v-model="showTallerModal"
    :taller-id="tallerModalId"
    :solo-lectura="!puedeModificar"
    @created="onTallerCreated"
    @updated="onTallerUpdated"
  />
  </template>
</template>
