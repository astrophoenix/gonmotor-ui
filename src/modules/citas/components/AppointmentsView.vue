<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { Car, Clock, Pen, Trash2, User } from 'lucide-vue-next';
import { useCitas } from '../composables/useCitas';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import CitaAccionesMenu from './CitaAccionesMenu.vue';

/**
 * Tabla de la pantalla unificada de citas (vista lista).
 * La cabecera, los filtros, las acciones de la tabla y los modales viven en
 * CitasView; este componente solo renderiza la tabla y notifica las acciones.
 */
const props = defineProps({
  recargarToken: { type: Number, default: 0 },
});

const emit = defineEmits(['accion', 'alert', 'cargando', 'resumen']);

const search = defineModel('search', { type: String, default: '' });
const estadoFiltro = defineModel('estadoFiltro', { type: String, default: '' });
const fechaFiltro = defineModel('fechaFiltro', { type: String, default: '' });

const {
  citas,
  isLoading,
  isDeleting,
  isConverting,
  currentPage,
  total,
  nextUrl,
  previousUrl,
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

// El panel de CitasView necesita el estado de carga (para deshabilitar
// Limpiar/Buscar) y el resumen de la página para la cabecera del listado.
watch(isLoading, (valor) => emit('cargando', valor), { immediate: true });
watch([activeCount, total], ([activas, totalCitas]) => {
  emit('resumen', { activas, total: totalCitas });
}, { immediate: true });

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
  <EntityTable
    :columns="['Cita', 'Cliente', 'Vehículo', 'Motivo', 'Estado', 'Acciones']"
    :items="citas"
    :loading="isLoading"
    loading-text="Cargando citas..."
    empty-text="No se encontraron citas."
    :empty-colspan="6"
    :wrapper-class="'w-full'"
  >
    <template #row="{ item }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
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
          <div class="flex items-center gap-2">
            <button
              type="button"
              title="Editar cita"
              aria-label="Editar cita"
              class="inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
              @click="onAccion(item, 'editar')"
            >
              <Pen class="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Eliminar cita"
              aria-label="Eliminar cita"
              :disabled="isDeleting || isConverting"
              class="inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700"
              @click="onAccion(item, 'eliminar')"
            >
              <Trash2 class="w-5 h-5" />
            </button>
            <CitaAccionesMenu
              :cita="item"
              :disabled="isDeleting || isConverting"
              @accion="(tipo) => onAccion(item, tipo)"
            />
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
        item-word="cita"
        empty-text="No se encontraron citas."
        @page="loadCitas"
      />
    </template>
  </EntityTable>
</template>
