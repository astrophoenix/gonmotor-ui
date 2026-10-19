<script setup>
import { computed, onMounted, ref } from 'vue';
import { Car, MessageCircle, History, Search, Filter } from 'lucide-vue-next';
import { useVehicles } from '../composables/useVehicles';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import VehicleModal from './VehicleModal.vue';
import EnviarRecordatorioModal from '../../notificaciones/components/EnviarRecordatorioModal.vue';
import { useToast } from '../../../shared/composables/useToast';
import { formatPlate } from '../../../shared/utils/formatPlate';
import { sanitizeAnio } from '../../../shared/utils/sanitize';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificarVehiculos = computed(() => puede('vehiculos', 'modificar'));
// El recordatorio por WhatsApp depende del permiso de notificaciones, no del de vehículos.
const puedeEnviarRecordatorio = computed(() => puede('notificaciones', 'modificar'));

const { showSuccess } = useToast();
const {
  vehicles,
  isLoading,
  isDeleting,
  search,
  anio,
  estado,
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

// --- PANEL DE FILTROS AVANZADOS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  anio: '',
  tipo: '',
});

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value, anio: anio.value });
const appliedFilters = ref({ ...draftFilters.value });

const exportParams = computed(() => ({
  search: search.value.trim(),
  estado: appliedFilters.value.estado,
  anio: appliedFilters.value.anio,
  tipo: appliedFilters.value.tipo,
}));

const draftAnioInput = computed({
  get: () => draftFilters.value.anio,
  set: (value) => {
    draftFilters.value.anio = sanitizeAnio(value);
  },
});

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  anio.value = draftFilters.value.anio;
  appliedFilters.value = { ...draftFilters.value };
  loadVehicles(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  anio.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadVehicles(1);
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

async function loadVehicles(page = 1) {
  try {
    await fetchVehicles(page, appliedFilters.value);
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
    await fetchVehicles(page, appliedFilters.value);
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


onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('vehiculos')) loadVehicles();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('vehiculos')" seccion="Vehículos" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="Car"
    entity="Vehículos"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Vehículos' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('vehiculos')" objeto="los vehículos" />
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
            <label for="vehicles-search" class="block mb-1 text-sm font-medium text-heading">Buscar vehículo</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="vehicles-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Placa, VIN, motor, marca, modelo o dueño" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
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
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-anio" class="block mb-1 text-sm font-medium text-heading">Año</label>
            <input
              id="filtro-anio"
              v-model="draftAnioInput"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="Ej. 2020"
              class="block w-full sm:w-32 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"
            />
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-tipo" class="block mb-1 text-sm font-medium text-heading">Tipo de vehículo</label>
            <select
              id="filtro-tipo"
              v-model="draftFilters.tipo"
              class="block w-full sm:w-60 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option value="AUTO">Automóvil</option>
              <option value="JEEP">Jeep</option>
              <option value="CAMN">Camioneta</option>
              <option value="MOTO">Motocicleta</option>
              <option value="MTNA">Motoneta</option>
              <option value="TRIC">Tricimoto</option>
              <option value="CUAT">Cuatrimoto</option>
              <option value="BUS">Bus / Autobús</option>
              <option value="BUSE">Buseta</option>
              <option value="MICR">Microbús / Furgoneta</option>
              <option value="CAMI">Camión</option>
              <option value="TRAC">Tractocamión</option>
              <option value="VOLQ">Volqueta</option>
              <option value="FURG">Furgón</option>
              <option value="REMO">Remolque / Semirremolque</option>
              <option value="MAGR">Maquinaria Agrícola</option>
              <option value="MCAM">Maquinaria Caminera</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Vehículos</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="vehiculos"
            :show-add="puedeModificarVehiculos"
            :export-params="exportParams"
            @add="openCreateModal"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError" />
        </div>
      </div>
      <EntityTable
        :columns="['Placa', 'Marca', 'Modelo', 'Año', 'Kilometraje', 'Dueño', 'Estado', 'Acciones']"
        :items="vehicles"
        :loading="isLoading"
        loading-text="Cargando vehículos..."
        empty-text="No se encontraron vehículos."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <a
            :href="`/crud/vehiculos/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-medium text-gray-800 hover:text-brand-coral dark:text-white"
          >{{ formatPlate(item.placa) }}</a>
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.marca }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.modelo }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.anio || '—' }}</td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.kilometraje_actual != null ? `${item.kilometraje_actual.toLocaleString('es-EC')} km` : '—' }}
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente_nombre || 'Sin dueño' }}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <EstadoActivoBadge :activo="item.is_active" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <a :href="`/crud/vehiculos/ver/?id=${encodeURIComponent(item.id)}&tab=historial`" title="Ver historial del vehículo" aria-label="Ver historial del vehículo" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-100 hover:text-brand-900 hover:ring-1 hover:ring-inset hover:ring-brand-200 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white dark:hover:ring-gray-500">
              <History class="w-4.5 h-4.5" />
            </a>
            <button v-if="puedeEnviarRecordatorio" type="button" title="Enviar recordatorio de mantenimiento por WhatsApp" aria-label="Enviar recordatorio por WhatsApp" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400" @click="openEnviarRecordatorio(item)">
              <MessageCircle class="w-4 h-4" />
            </button>
            <EntityRowActions entity="vehículo" :show-view="!puedeModificarVehiculos" :view-href="`/crud/vehiculos/ver/?id=${encodeURIComponent(item.id)}`" :show-edit="puedeModificarVehiculos" :show-delete="puedeModificarVehiculos" :delete-disabled="isDeleting" @edit="openEditModal(item.id)" @delete="openDeleteModal(item)" />
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
</template>
