<script setup>
import { onMounted, ref, watch, onUnmounted, computed } from 'vue';
import { CalendarDays, Pencil, Trash2, Clock, Car, User, ArrowRightLeft, Search } from 'lucide-vue-next';
import { useCitas } from '../composables/useCitas';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import CitaModal from './CitaModal.vue';

const {
  citas,
  isLoading,
  isDeleting,
  isConverting,
  search,
  estadoFiltro,
  fechaFiltro,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchCitas,
  removeCita,
  convertirARecepcion,
} = useCitas();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const citaToDelete = ref(null);

const showCitaModal = ref(false);
const citaModalId = ref(null);

const showConvertModal = ref(false);
const citaToConvert = ref(null);
const convertingError = ref('');

const ESTADO_BADGES = {
  PROGRAMADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONFIRMADA: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  EN_PROGRESO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NO_ASISTIO: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'PROGRAMADA', label: 'Programadas' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'NO_ASISTIO', label: 'No Asistió' },
];

const activeCount = computed(() =>
  citas.value.filter((cita) => ['PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO'].includes(cita.estado)).length
);

let searchTimer;

function openCreateModal() {
  citaModalId.value = null;
  showCitaModal.value = true;
}

function openEditModal(id) {
  citaModalId.value = id;
  showCitaModal.value = true;
}

async function onCitaSaved(message) {
  showCitaModal.value = false;
  showAlert('success', '', message);
  await loadCitas(currentPage.value);
}

function onCitaCreated() {
  onCitaSaved('Cita creada correctamente.');
}

function onCitaUpdated() {
  onCitaSaved('Cita actualizada correctamente.');
}

async function loadCitas(page = 1) {
  try {
    await fetchCitas(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar las citas.');
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCitas(1), 300);
}

watch(search, scheduleSearch);
watch(estadoFiltro, () => loadCitas(1));
watch(fechaFiltro, () => loadCitas(1));

function openDeleteModal(cita) {
  citaToDelete.value = cita;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!citaToDelete.value) return;
  try {
    const response = await removeCita(citaToDelete.value.id, `${citaToDelete.value.fecha_cita} ${citaToDelete.value.hora_cita}`);
    showAlert('success', '', response.message);
    const page = citas.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchCitas(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la cita.');
  } finally {
    citaToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function openConvertModal(cita) {
  citaToConvert.value = cita;
  convertingError.value = '';
  showConvertModal.value = true;
}

async function confirmConvert() {
  if (!citaToConvert.value) return;
  convertingError.value = '';
  try {
    const response = await convertirARecepcion(citaToConvert.value.id);
    showConvertModal.value = false;
    showAlert(
      'success',
      '',
      `Cita convertida. Recepción ${response.numero_recepcion || `#${response.recepcion_id}`} generada correctamente.`
    );
    await loadCitas(currentPage.value);
  } catch (error) {
    convertingError.value = error.message || 'No se pudo convertir la cita.';
  } finally {
    citaToConvert.value = null;
  }
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

function formatHour(value) {
  if (!value) return '';
  const parts = String(value).split(':');
  const hours = Number(parts[0]);
  const minutes = parts[1] || '00';
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

onMounted(() => {
  loadCitas();
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
            <li class="text-gray-400" aria-current="page">/ Citas</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <CalendarDays class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Citas
        </h1>
      </div>
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
      <div class="sm:flex sm:items-center sm:justify-between">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-2">
            <div class="relative">
              <Search class="absolute w-4 h-4 text-gray-400 left-3 top-3" />
              <input
                v-model="search"
                type="search"
                placeholder="Buscar citas (cliente, placa...)"
                class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-72 p-2.5 pl-9 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
            <select
              v-model="estadoFiltro"
              class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            >
              <option v-for="e in ESTADOS_FILTRO" :key="e.value" :value="e.value">{{ e.label }}</option>
            </select>
            <input
              v-model="fechaFiltro"
              type="date"
              title="Filtrar por fecha"
              class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ activeCount }} activa{{ activeCount === 1 ? '' : 's' }}
          </span>
        </div>
        <div class="flex items-center mt-3 sm:mt-0">
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300"
            @click="openCreateModal"
          >
            <CalendarDays class="w-5 h-5 mr-1.5 -ml-1 text-white" />
            Agendar cita
          </button>
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Cita', 'Cliente', 'Vehículo', 'Motivo', 'Estado', 'Acciones']"
    :items="citas"
    :loading="isLoading"
    loading-text="Cargando citas..."
    empty-text="No se encontraron citas."
    :empty-colspan="7"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="isLoading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadCitas(currentPage + delta)"
  >
    <template #row="{ item }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatDate(item.fecha_cita) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatHour(item.hora_cita) }}</p>
            </div>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <User class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <div>
              <p class="text-sm text-gray-800 dark:text-white">{{ item.cliente?.nombre || '—' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.cliente?.telefono || 'Sin teléfono' }}</p>
            </div>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <Car class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-white">{{ item.vehiculo?.placa || '—' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ item.vehiculo?.marca }} {{ item.vehiculo?.modelo }} {{ item.vehiculo?.color || '' }}
              </p>
            </div>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <p class="text-sm font-medium text-gray-800 dark:text-white">{{ item.motivo_display }}</p>
          <p v-if="item.motivo_descripcion" class="text-xs text-gray-500 truncate max-w-[220px] dark:text-gray-400">{{ item.motivo_descripcion }}</p>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="ESTADO_BADGES[item.estado] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'">
            {{ item.estado_display }}
          </span>
          <p
            v-if="item.recepcion_generada"
            class="mt-1 text-xs text-green-600 dark:text-green-400"
            :title="item.recepcion_generada_numero || ''"
          >
            Recepción: {{ item.recepcion_generada_numero || `#${item.recepcion_generada}` }}
          </p>
        </td>
        <td class="p-4 whitespace-nowrap">
          <button
            type="button"
            title="Convertir a recepción"
            aria-label="Convertir a recepción"
            :disabled="!item.es_convertible || isConverting"
            class="inline-flex items-center p-2 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-gray-700"
            @click="openConvertModal(item)"
          >
            <ArrowRightLeft class="w-5 h-5" />
          </button>
          <button
            type="button"
            title="Editar cita"
            aria-label="Editar cita"
            :disabled="!item.es_convertible"
            class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-primary-400 dark:hover:bg-gray-700"
            @click="openEditModal(item.id)"
          >
            <Pencil class="w-5 h-5" />
          </button>
          <button
            type="button"
            title="Eliminar cita"
            aria-label="Eliminar cita"
            :disabled="isDeleting"
            class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700"
            @click="openDeleteModal(item)"
          >
            <Trash2 class="w-5 h-5" />
          </button>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="cita"
    :item-name="citaToDelete ? `${citaToDelete.fecha_cita} ${citaToDelete.hora_cita}` : ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="citaToDelete = null"
  />

  <CitaModal
    v-model="showCitaModal"
    :cita-id="citaModalId"
    @created="onCitaCreated"
    @updated="onCitaUpdated"
  />

  <div
    v-if="showConvertModal && citaToConvert"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
  >
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Convertir cita a recepción</h3>
      </div>
      <div class="px-6 py-4">
        <Alert v-if="convertingError" type="error" :message="convertingError" dismissible @dismiss="convertingError = ''" />
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Se creará una recepción de vehículo con los datos de la cita
          <span class="font-semibold">{{ formatDate(citaToConvert.fecha_cita) }} {{ formatHour(citaToConvert.hora_cita) }}</span>
          para el vehículo <span class="font-semibold">{{ citaToConvert.vehiculo?.placa }}</span>
          y el cliente <span class="font-semibold">{{ citaToConvert.cliente?.nombre }}</span>.
          La cita quedará marcada como completada.
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
          @click="showConvertModal = false; citaToConvert = null"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isConverting"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmConvert"
        >
          {{ isConverting ? 'Convirtiendo...' : 'Convertir' }}
        </button>
      </div>
    </div>
  </div>
</template>