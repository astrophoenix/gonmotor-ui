<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Car, Clock, User } from 'lucide-vue-next';
import { useCitas } from '../composables/useCitas';
import EntityTable from '../../../shared/components/EntityTable.vue';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import CitaAccionesMenu from './CitaAccionesMenu.vue';

/**
 * Panel de listado de la pantalla unificada de citas.
 * La cabecera, los filtros, el menú de acciones y los modales viven en CitasView;
 * este componente solo renderiza la tabla y notifica las acciones elegidas.
 */
const props = defineProps({
  recargarToken: { type: Number, default: 0 },
});

const emit = defineEmits(['accion', 'alert']);

const search = defineModel('search', { type: String, default: '' });
const estadoFiltro = defineModel('estadoFiltro', { type: String, default: '' });
const fechaFiltro = defineModel('fechaFiltro', { type: String, default: '' });

const {
  citas,
  isLoading,
  isDeleting,
  isConverting,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  fetchCitas,
} = useCitas({ search, estadoFiltro, fechaFiltro });

const ESTADO_BADGES = {
  PROGRAMADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONFIRMADA: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  EN_PROGRESO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NO_ASISTIO: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const activeCount = computed(() =>
  citas.value.filter((cita) => ['PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO'].includes(cita.estado)).length
);

let searchTimer;

async function loadCitas(page = 1) {
  try {
    await fetchCitas(page);
  } catch (error) {
    emit('alert', { type: 'error', title: '', message: error.message || 'No se pudieron cargar las citas.' });
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCitas(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
watch(estadoFiltro, () => loadCitas(1));
watch(fechaFiltro, () => loadCitas(1));
watch(() => props.recargarToken, (valor) => {
  if (valor > 0) loadCitas(currentPage.value);
});

function onAccion(cita, tipo) {
  emit('accion', { cita, tipo });
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

onUnmounted(() => clearTimeout(searchTimer));
</script>

<template>
  <div class="px-4 pt-4 text-sm text-gray-500 dark:text-gray-400">
    {{ activeCount }} activa{{ activeCount === 1 ? '' : 's' }}
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
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.vehiculo?.placa || '—' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ item.vehiculo?.marca }} {{ item.vehiculo?.modelo }} {{ item.vehiculo?.color || '' }}
              </p>
            </div>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.motivo_display }}</p>
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
          <CitaAccionesMenu
            :cita="item"
            :disabled="isDeleting || isConverting"
            @accion="(tipo) => onAccion(item, tipo)"
          />
        </td>
      </tr>
    </template>
  </EntityTable>
</template>
