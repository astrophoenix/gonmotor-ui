<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Pencil, Trash2, Search, Filter, CalendarDays, Car, Gauge, IdCard, Phone, CalendarPlus, Send, CheckCircle2 } from 'lucide-vue-next';
import { IconFolderDollar } from '@tabler/icons-vue';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { useCotizaciones } from '../composables/useCotizaciones';
import { talleresService } from '../../configuracion/services/talleresService';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';
import { ESTADOS_COTIZACION_FILTRABLE } from '../constants/estadosCotizacion';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeCotizacion } from '../../../shared/utils/relacionesFlujo';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';

const {
  cotizaciones,
  loading,
  isDeleting,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  loadCotizaciones,
  removeCotizacion,
} = useCotizaciones();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const cotizacionToDelete = ref(null);
let searchTimer;

const talleres = ref([]);

async function loadTalleres() {
  try {
    const data = await talleresService.listTalleres();
    talleres.value = Array.isArray(data) ? data : (data?.results || []);
  } catch (error) {
    talleres.value = [];
  }
}

function tallerLabel(taller) {
  return [taller.nombre, taller.ciudad].filter(Boolean).join(' · ') || `Taller ${taller.id}`;
}

// --- PANEL DE FILTROS (no reactivos hasta "Buscar") ---
const search = ref('');

const emptyAdvancedFilters = () => ({
  estado: '',
  sucursal: '',
  fechaDesde: '',
  fechaHasta: '',
});

const draftFilters = ref(emptyAdvancedFilters());
const appliedFilters = ref({ ...draftFilters.value });

// Flowbite escribe directamente en input.value (no emite input/change), por eso
// estos campos se leen del DOM en vez de usar v-model.
const fechaDesdeInput = ref(null);
const fechaHastaInput = ref(null);

function fechaInputAIso(elemento) {
  const valor = (elemento?.value || '').trim();
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const match = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const [, dia, mes, anio] = match;
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function limpiarCamposFecha() {
  [fechaDesdeInput, fechaHastaInput].forEach((campo) => {
    const elemento = campo.value;
    if (!elemento) return;
    elemento.value = '';
    if (typeof elemento.datepicker?.clear === 'function') elemento.datepicker.clear();
  });
}

function buildQuery() {
  return {
    search: search.value.trim(),
    estado: appliedFilters.value.estado,
    sucursal: appliedFilters.value.sucursal,
    fecha_desde: appliedFilters.value.fechaDesde,
    fecha_hasta: appliedFilters.value.fechaHasta,
  };
}

async function reloadList(page = 1) {
  try {
    await loadCotizaciones(page, buildQuery());
  } catch (err) {
    showAlert('error', '', err?.message || 'No se pudieron cargar las cotizaciones.');
  }
}

function applyAdvancedFilters() {
  if (loading.value) return;
  appliedFilters.value = {
    ...draftFilters.value,
    fechaDesde: fechaInputAIso(fechaDesdeInput.value),
    fechaHasta: fechaInputAIso(fechaHastaInput.value),
  };
  reloadList(1);
}

function clearAdvancedFilters() {
  if (loading.value) return;
  search.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  limpiarCamposFecha();
  reloadList(1);
}

function handleEditar(id) {
  window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(cotizacion) {
  cotizacionToDelete.value = cotizacion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!cotizacionToDelete.value) return;

  try {
    await removeCotizacion(cotizacionToDelete.value.id);
    showAlert('success', '', 'Cotización eliminada correctamente.');

    const page = cotizaciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await reloadList(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la cotización.');
  } finally {
    cotizacionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatMoney(value) {
  const numero = Number(value || 0);
  return numero.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kmVehiculoDisplay(item) {
  const km = item.vehiculo_kilometraje;
  if (km === null || km === undefined || km === '') return 'Sin km registrado';
  const numero = Number(km);
  if (Number.isNaN(numero)) return 'Sin km registrado';
  return `${numero.toLocaleString('es-EC')} km`;
}

function vehiculoUrl(item) {
  return item?.vehiculo ? `/crud/vehiculos/ver/?id=${encodeURIComponent(item.vehiculo)}` : null;
}

function clienteUrl(item) {
  return item?.cliente ? `/crud/clientes/ver/?id=${encodeURIComponent(item.cliente)}` : null;
}

function formatoFechaHora(valor) {
  if (!valor) return null;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function filasFechasCotizacion(item) {
  return [
    { key: 'creada', label: 'Creada', icon: CalendarPlus, valor: formatoFechaHora(item.created_at) },
    { key: 'enviada', label: 'Enviada', icon: Send, valor: formatoFechaHora(item.fecha_envio) },
    { key: 'aceptada', label: 'Aceptada', icon: CheckCircle2, valor: formatoFechaHora(item.fecha_aceptacion) },
  ];
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => reloadList(1), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});
onMounted(() => {
  loadTalleres();
  reloadList();
});
onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

<template>
  <EntityHeader
    mode="list"
    :icon="IconFolderDollar"
    entity="Cotizaciones"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Cotizaciones' },
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
    <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-md font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <FilterActions
            :loading="loading"
            @clear="clearAdvancedFilters"
            @search="applyAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-2xl">
            <label for="cotizaciones-search" class="block mb-1 text-sm font-medium text-heading">
              Buscar cotización
            </label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="cotizaciones-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="N.º cotización, placa, marca o cliente" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-40 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in ESTADOS_COTIZACION_FILTRABLE" :key="item" :value="item">{{ estadoADisplay('cotizacion', item) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-taller" class="block mb-1 text-sm font-medium text-heading">Taller</label>
            <select
              id="filtro-taller"
              v-model="draftFilters.sucursal"
              class="block w-full sm:w-48 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos los talleres</option>
              <option v-for="taller in talleres" :key="taller.id" :value="taller.id">{{ tallerLabel(taller) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-40 sm:shrink-0">
            <label for="filtro-fecha-desde" class="block mb-1 text-sm font-medium text-heading">Desde</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
              </div>
              <input
                id="filtro-fecha-desde"
                ref="fechaDesdeInput"
                datepicker
                datepicker-autohide
                datepicker-format="dd/mm/yyyy"
                type="text"
                autocomplete="off"
                placeholder="dd/mm/aaaa"
                class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
            </div>
          </div>

          <div class="w-full sm:w-40 sm:shrink-0">
            <label for="filtro-fecha-hasta" class="block mb-1 text-sm font-medium text-heading">Hasta</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
              </div>
              <input
                id="filtro-fecha-hasta"
                ref="fechaHastaInput"
                datepicker
                datepicker-autohide
                datepicker-format="dd/mm/yyyy"
                type="text"
                autocomplete="off"
                placeholder="dd/mm/aaaa"
                class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Cotizaciones</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="cotizaciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Nº Cotización', 'Vehículo', 'Cliente', 'Total', 'Estado', 'Fechas', 'Relaciones', 'Acciones']"
        :items="cotizaciones"
        :loading="loading"
        loading-text="Cargando cotizaciones..."
        empty-text="No se encontraron cotizaciones."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/cotizaciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {{ item.numero_cotizacion }}
          </a>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <a
            v-if="vehiculoUrl(item)"
            :href="vehiculoUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.vehiculo_placa || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.vehiculo_placa || '-' }}</span>
<div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <Car class="w-3.5 h-3.5 shrink-0" />
                <span class="max-w-32 truncate">
                  {{ [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ') || '-' }}
                  <span v-if="item.vehiculo_color" class="text-gray-400 dark:text-gray-500">· {{ item.vehiculo_color }}</span>
                </span>
              </span>
              <span class="flex items-center gap-1.5">
                <Gauge class="w-3.5 h-3.5 shrink-0" />
                <span>{{ kmVehiculoDisplay(item) }}</span>
              </span>
            </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <a
            v-if="clienteUrl(item)"
            :href="clienteUrl(item)"
            :title="item.cliente_nombre || '-'"
            class="block max-w-56 truncate font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.cliente_nombre || '-' }}</a>
          <span v-else :title="item.cliente_nombre || '-'" class="block max-w-56 truncate font-medium text-gray-800 dark:text-white">{{ item.cliente_nombre || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="item.cliente_identificacion" class="flex items-center gap-1.5">
              <IdCard class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente_identificacion }}</span>
            </span>
            <span v-if="item.cliente_telefono" class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente_telefono }}</span>
            </span>
          </div>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white font-medium">$ {{ formatMoney(item.total) }}</td>
        <td class="p-4 whitespace-nowrap align-top">
          <EstadoCotizacionBadge :estado="item.estado" :estado-display="item.estado_display" />
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <div class="flex flex-col gap-1 min-w-48">
            <div v-for="fila in filasFechasCotizacion(item)" :key="fila.key" class="flex items-center gap-1.5">
              <component :is="fila.icon" class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ fila.label }}:</span>
              <span class="text-sm text-gray-800 dark:text-white">{{ fila.valor || '—' }}</span>
            </div>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <RelacionesFlujo :pasos="relacionesDeCotizacion(item)" />
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar cotización" aria-label="Editar cotización" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar cotización" aria-label="Eliminar cotización" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
            <button type="button" title="Descargar PDF" aria-label="Descargar PDF" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded border border-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400">
              <Icon :icon="filePdfIcon" class="w-5 h-5" />
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
        :disabled="loading"
        item-word="cotización"
        item-plural="cotizaciones"
        empty-text="No se encontraron cotizaciones."
        @page="reloadList"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="cotización"
    :item-name="cotizacionToDelete?.numero_cotizacion || `#${cotizacionToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="cotizacionToDelete = null"
  />
</template>