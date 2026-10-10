<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { SquarePen, Eye, Pen, Pencil, Trash2, Filter, Search, CalendarDays, Wrench, Car, Gauge, IdCard, Phone, ChevronsDown, Equal, ChevronsUp, Siren } from 'lucide-vue-next';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { useOrdenes } from '../composables/useOrdenes';
import { talleresService } from '../../configuracion/services/talleresService';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';
import { ESTADOS_ORDEN_FILTRABLE, PRIORIDADES_ORDEN } from '../constants/estadosOrden';
import { TIPOS_TRABAJO_OPCIONES } from '../../../shared/config/tiposTrabajo';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeOrden } from '../../../shared/utils/relacionesFlujo';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityActionsMenu from '../../../shared/components/EntityActionsMenu.vue';
import EstadoOrdenBadge from './EstadoOrdenBadge.vue';

const {
  ordenes,
  loading,
  isDeleting,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  loadOrdenes,
  removeOrden,
} = useOrdenes();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const ordenToDelete = ref(null);
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
  prioridad: '',
  tipoTrabajo: '',
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
    prioridad: appliedFilters.value.prioridad,
    tipo_trabajo: appliedFilters.value.tipoTrabajo,
    sucursal: appliedFilters.value.sucursal,
    fecha_desde: appliedFilters.value.fechaDesde,
    fecha_hasta: appliedFilters.value.fechaHasta,
  };
}

async function reloadList(page = 1) {
  try {
    await loadOrdenes(page, buildQuery());
  } catch (err) {
    showAlert('error', '', err?.message || 'No se pudieron cargar las órdenes de trabajo.');
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

function handleVer(id) {
  window.location.assign(`/crud/ordenes/ver/?id=${encodeURIComponent(id)}`);
}

function handleEditar(id) {
  window.location.assign(`/crud/ordenes/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(orden) {
  ordenToDelete.value = orden;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!ordenToDelete.value) return;

  try {
    await removeOrden(ordenToDelete.value.id);
    showAlert('success', '', 'Orden de trabajo eliminada correctamente.');

    const page = ordenes.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await reloadList(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la orden de trabajo.');
  } finally {
    ordenToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatAntiguedad(date) {
  const minutos = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutos < 1) return 'recién ingresada';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

function getFechaOrden(item) {
  const valor = item.fecha_ingreso || item.created_at;
  if (!valor) return { fecha: '-', hora: '', antiguedad: '', completo: '' };
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return { fecha: '-', hora: '', antiguedad: '', completo: '' };
  return {
    fecha: date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    antiguedad: formatAntiguedad(date),
    completo: date.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' }),
  };
}

function vehiculoUrl(item) {
  return item?.vehiculo?.id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(item.vehiculo.id)}` : null;
}

function kmVehiculoDisplay(item) {
  const km = item.vehiculo?.kilometraje_actual;
  if (km === null || km === undefined || km === '') return 'Sin km registrado';
  const numero = Number(km);
  if (Number.isNaN(numero)) return 'Sin km registrado';
  return `${numero.toLocaleString('es-EC')} km`;
}

function clienteUrl(item) {
  return item?.cliente?.id ? `/crud/clientes/ver/?id=${encodeURIComponent(item.cliente.id)}` : null;
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function prioridadConfig(prioridad) {
  const map = {
    BAJA: { label: 'Baja', icon: ChevronsDown, color: 'text-gray-500 dark:text-gray-400' },
    MEDIA: { label: 'Media', icon: Equal, color: 'text-blue-600 dark:text-blue-400' },
    ALTA: { label: 'Alta', icon: ChevronsUp, color: 'text-amber-600 dark:text-amber-400' },
    URGENTE: { label: 'Urgente', icon: Siren, color: 'text-red-600 dark:text-red-400' },
  };
  return map[prioridad] || { label: prioridad || '-', icon: Minus, color: 'text-gray-500 dark:text-gray-400' };
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
    :icon="Wrench"
    entity="Órdenes de Trabajo"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Órdenes de Trabajo' },
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
            <label for="ordenes-search" class="block mb-1 text-sm font-medium text-heading">
              Buscar orden
            </label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="ordenes-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="N.º orden, placa, marca o cliente" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-48 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in ESTADOS_ORDEN_FILTRABLE" :key="item" :value="item">{{ estadoADisplay('orden', item) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-prioridad" class="block mb-1 text-sm font-medium text-heading">Prioridad</label>
            <select
              id="filtro-prioridad"
              v-model="draftFilters.prioridad"
              class="block w-full sm:w-44 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todas</option>
              <option v-for="item in PRIORIDADES_ORDEN" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-tipo-trabajo" class="block mb-1 text-sm font-medium text-heading">Tipo de trabajo</label>
            <select
              id="filtro-tipo-trabajo"
              v-model="draftFilters.tipoTrabajo"
              class="block w-full sm:w-44 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in TIPOS_TRABAJO_OPCIONES" :key="item.value" :value="item.value">{{ item.label }}</option>
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
        <h2 class="text-lg font-semibold text-heading">Listado de Órdenes de Trabajo</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="ordenes"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Nº Orden', 'Vehículo', 'Cliente', 'Tipo', 'Estado', 'Fecha', 'Relaciones', 'Acciones']"
        :items="ordenes"
        :loading="loading"
        loading-text="Cargando órdenes de trabajo..."
        empty-text="No se encontraron órdenes de trabajo."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            {{ item.numero_orden || `#${item.id}` }}
          </a>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <a v-if="vehiculoUrl(item)" :href="vehiculoUrl(item)" class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
            {{ item.vehiculo?.placa || '-' }}
          </a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.vehiculo?.placa || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span class="flex items-center gap-1.5">
              <Car class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">
                {{ [item.vehiculo?.marca, item.vehiculo?.modelo].filter(Boolean).join(' ') || '-' }}
                <span v-if="item.vehiculo?.color" class="text-gray-400 dark:text-gray-500">· {{ item.vehiculo.color }}</span>
              </span>
            </span>
            <span class="flex items-center gap-1.5">
              <Gauge class="w-3.5 h-3.5 shrink-0" />
              <span>{{ kmVehiculoDisplay(item) }}</span>
            </span>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <a v-if="clienteUrl(item)" :href="clienteUrl(item)" class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
            {{ item.cliente?.nombre || '-' }}
          </a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.cliente?.nombre || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="item.cliente?.identificacion" class="flex items-center gap-1.5">
              <IdCard class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente.identificacion }}</span>
            </span>
            <span v-if="item.cliente?.telefono" class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente.telefono }}</span>
            </span>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap">
          <TipoTrabajoBadge :tipo="item.tipo_trabajo" size="sm" />
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <EstadoOrdenBadge :estado="item.estado" :estado-display="item.estado_display" size="sm" />
          <span
            class="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300"
            :title="`Prioridad: ${prioridadConfig(item.prioridad).label}`"
          >
            <component :is="prioridadConfig(item.prioridad).icon" class="w-4 h-4 shrink-0" :class="prioridadConfig(item.prioridad).color" />
            {{ prioridadConfig(item.prioridad).label }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap align-top dark:text-white">
          <div class="flex flex-col gap-1" :title="getFechaOrden(item).completo">
            <span class="font-medium text-gray-900 dark:text-white">{{ getFechaOrden(item).fecha }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ getFechaOrden(item).hora }}
              <span v-if="getFechaOrden(item).antiguedad" class="text-gray-400 dark:text-gray-500">· {{ getFechaOrden(item).antiguedad }}</span>
            </span>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <RelacionesFlujo :pasos="relacionesDeOrden(item)" />
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" title="Editar orden" aria-label="Editar orden" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <!--Pencil class="w-5 h-5" /-->
              <!--SquarePen class="w-5 h-5" /-->
              <Pen class="w-5 h-5" />
            </button>
            <button type="button" title="Eliminar orden" aria-label="Eliminar orden" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
            <EntityActionsMenu>
              <template #default="{ cerrar }">
                <button type="button" role="menuitem" title="Descargar PDF" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft dark:hover:bg-gray-700" @click="cerrar">
                  <Icon :icon="filePdfIcon" class="w-4 h-4 shrink-0 text-accent-600 dark:text-accent-400" />
                  Descargar PDF
                </button>
              </template>
            </EntityActionsMenu>
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
        item-word="orden de trabajo"
        item-plural="órdenes de trabajo"
        empty-text="No se encontraron órdenes de trabajo."
        @page="reloadList"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="orden de trabajo"
    :item-name="`${ordenToDelete?.numero_orden || ordenToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="ordenToDelete = null"
  />
</template>