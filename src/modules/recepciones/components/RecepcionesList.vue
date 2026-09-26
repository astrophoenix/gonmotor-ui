<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { ClipboardList, Pencil, Loader2, Trash2, Search, Clock, CircleCheck, CircleSlash, Gauge, IdCard, Phone, Stethoscope, FileText, Wrench, Plus, Filter } from 'lucide-vue-next';
import { IconReportSearch } from '@tabler/icons-vue';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { mdiTowTruck } from '@mdi/js';
import { useRecepciones } from '../composables/useRecepciones';
import { talleresService } from '../../configuracion/services/talleresService';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';
import { recepcionesService } from '../services/recepcionesService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import CarFilled from '../../../shared/components/car-filled.vue';
import TipoRecepcionBadge from './TipoRecepcionBadge.vue';
import { TIPOS_RECEPCION } from '../constants/tiposRecepcion';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';

const { recepciones, loading, error, loadRecepciones, currentPage, total, nextUrl, previousUrl } = useRecepciones();

const prefijoRecepcionBySucursal = ref({});
const talleres = ref([]);
const creandoId = ref(null);
const showDeleteModal = ref(false);
const recepcionToDelete = ref(null);
const isDeleting = ref(false);
const showCreateInspeccionModal = ref(false);
const recepcionParaInspeccion = ref(null);

async function loadPrefijosRecepcion() {
  try {
    const data = await talleresService.listTalleres();
    const list = Array.isArray(data) ? data : data?.results || [];
    talleres.value = list;
    const map = {};
    list.forEach((taller) => {
      if (taller.id && taller.prefijo_recepcion) {
        map[taller.id] = taller.prefijo_recepcion;
      }
    });
    prefijoRecepcionBySucursal.value = map;
  } catch (error) {
    talleres.value = [];
    prefijoRecepcionBySucursal.value = {};
  }
}

function tallerLabel(taller) {
  return [taller.nombre, taller.ciudad].filter(Boolean).join(' · ') || `Taller ${taller.id}`;
}

function numeroDisplay(item) {
  if (item.numero_recepcion) return item.numero_recepcion;
  const prefijo = prefijoRecepcionBySucursal.value[item.sucursal] || '';
  return `#${prefijo}${item.id}`;
}

function vehiculoUrl(item) {
  const id = item?.vehiculo?.id;
  return id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}` : null;
}

function clienteUrl(item) {
  const id = item?.cliente?.id;
  return id ? `/crud/clientes/ver/?id=${encodeURIComponent(id)}` : null;
}

function kmIngresoDisplay(item) {
  const km = item.kilometraje_ingreso ?? item.vehiculo?.kilometraje_actual;
  if (km === null || km === undefined || km === '') return 'Sin km de ingreso';
  const numero = Number(km);
  if (Number.isNaN(numero)) return 'Sin km de ingreso';
  return `${numero.toLocaleString('es-EC')} km`;
}

const alert = ref({
  type: 'default',
  title: '',
  message: '',
});

const search = ref('');
let searchTimer;

const ESTADOS_FILTRABLE = ['PENDIENTE', 'ACEPTADA', 'NO_ACEPTADA'];

// --- PANEL DE FILTROS (no reactivos hasta "Buscar") ---
const emptyAdvancedFilters = () => ({
  estado: '',
  tipoRecepcion: '',
  sucursal: '',
  fechaDesde: '',
  fechaHasta: '',
  soloGrua: false,
});

const draftFilters = ref(emptyAdvancedFilters());
const appliedFilters = ref({ ...draftFilters.value });

function buildQuery() {
  return {
    search: search.value.trim(),
    estado: appliedFilters.value.estado,
    tipo_recepcion: appliedFilters.value.tipoRecepcion,
    sucursal: appliedFilters.value.sucursal,
    fecha_desde: appliedFilters.value.fechaDesde,
    fecha_hasta: appliedFilters.value.fechaHasta,
    solo_grua: appliedFilters.value.soloGrua,
  };
}

async function reloadList(page = 1) {
  try {
    await loadRecepciones(page, buildQuery());
  } catch (err) {
    showAlert('error', '', err?.message || 'No se pudieron cargar las recepciones.');
  }
}

function applyAdvancedFilters() {
  if (loading.value) return;
  appliedFilters.value = { ...draftFilters.value };
  reloadList(1);
}

function clearAdvancedFilters() {
  if (loading.value) return;
  search.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  reloadList(1);
}

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
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

function getFechaIngreso(item) {
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

const ESTADOS_RECEPCION = {
  PENDIENTE: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  ACEPTADA: { icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  NO_ACEPTADA: { icon: CircleSlash, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
};

function getEstadoRecepcion(recepcion) {
  const estado = recepcion.estado || 'PENDIENTE';
  const config = ESTADOS_RECEPCION[estado] || ESTADOS_RECEPCION.PENDIENTE;
  return {
    ...config,
    label: recepcion.estado_display || estadoADisplay('recepcion', estado),
  };
}

const COLOR_RELACION = {
  inspeccion: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/60',
  cotizacion: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-900/60',
  orden: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/60',
};

function getRelaciones(item) {
  const inspecciones = item.inspecciones || [];
  const cotizaciones = item.cotizaciones_generadas || [];
  const inspeccion = inspecciones[0] || null;
  const cotizacion = cotizaciones[0] || null;
  return [
    {
      key: 'inspeccion',
      label: 'Inspección',
      icon: Stethoscope,
      color: COLOR_RELACION.inspeccion,
      numero: inspeccion?.numero_inspeccion || null,
      estado: inspeccion?.estado_display || null,
      url: inspeccion?.id ? `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccion.id)}` : null,
      extra: inspecciones.length - 1,
    },
    {
      key: 'cotizacion',
      label: 'Cotización',
      icon: FileText,
      color: COLOR_RELACION.cotizacion,
      numero: cotizacion?.numero_cotizacion || null,
      estado: cotizacion?.estado_display || null,
      url: cotizacion?.id ? `/crud/cotizaciones/ver/?id=${encodeURIComponent(cotizacion.id)}` : null,
      extra: cotizaciones.length - 1,
    },
    {
      key: 'orden',
      label: 'Orden',
      icon: Wrench,
      color: COLOR_RELACION.orden,
      numero: item.orden_trabajo_numero || null,
      estado: item.orden_trabajo_estado_display || null,
      url: item.orden_trabajo ? `/crud/ordenes/ver/?id=${encodeURIComponent(item.orden_trabajo)}` : null,
      extra: 0,
    },
  ];
}

function relacionTitle(relacion) {
  return `${relacion.label} ${relacion.numero}${relacion.estado ? ` · ${relacion.estado}` : ''}`;
}

function handleEditar(id) {
  window.location.assign(`/crud/recepciones/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(item) {
  recepcionToDelete.value = item;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!recepcionToDelete.value) return;
  isDeleting.value = true;
  hideAlert();
  try {
    await recepcionesService.delete(recepcionToDelete.value.id);
    showDeleteModal.value = false;
    recepcionToDelete.value = null;
    showAlert('success', '', 'Recepción eliminada correctamente.');
    await reloadList(currentPage.value);
  } catch (err) {
    showDeleteModal.value = false;
    recepcionToDelete.value = null;
    showAlert('error', '', err?.message || 'No se pudo eliminar la recepción.');
  } finally {
    isDeleting.value = false;
  }
}

function openCrearInspeccionModal(item) {
  recepcionParaInspeccion.value = item;
  showCreateInspeccionModal.value = true;
}

async function confirmCrearInspeccion() {
  if (!recepcionParaInspeccion.value) return;
  creandoId.value = recepcionParaInspeccion.value.id;
  hideAlert();
  try {
    await inspeccionesService.crearDesdeRecepcion(recepcionParaInspeccion.value.id);
    showCreateInspeccionModal.value = false;
    recepcionParaInspeccion.value = null;
    showAlert('success', '', 'Inspección generada correctamente.');
    await reloadList(currentPage.value);
  } catch (err) {
    showCreateInspeccionModal.value = false;
    recepcionParaInspeccion.value = null;
    showAlert('error', '', err?.message || 'No se pudo crear la inspección.');
  } finally {
    creandoId.value = null;
  }
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

onMounted(async () => {
  loadPrefijosRecepcion();
  await reloadList();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

<template>
  <div class="px-4 py-3 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full">
      <div>
        <nav class="flex mb-1.5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Recepciones</li>
          </ol>
        </nav>
        <h1 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">
          <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-400" />
          Recepciones
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
    <!-- PANEL DE FILTROS -->
    <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
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
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-md">
            <label for="recepciones-search" class="block mb-1 text-sm font-medium text-heading">Buscar recepción</label>
            <form class="relative" @submit.prevent="applyAdvancedFilters">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="recepciones-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="N.º de recepción, placa, cliente u orden" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in ESTADOS_FILTRABLE" :key="item" :value="item">{{ estadoADisplay('recepcion', item) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-tipo-recepcion" class="block mb-1 text-sm font-medium text-heading">Tipo de recepción</label>
            <select
              id="filtro-tipo-recepcion"
              v-model="draftFilters.tipoRecepcion"
              class="block w-full sm:w-44 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in TIPOS_RECEPCION" :key="item.value" :value="item.value">{{ item.label }}</option>
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

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-fecha-desde" class="block mb-1 text-sm font-medium text-heading">Desde</label>
            <input
              id="filtro-fecha-desde"
              v-model="draftFilters.fechaDesde"
              type="date"
              class="block w-full sm:w-40 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800" />
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-fecha-hasta" class="block mb-1 text-sm font-medium text-heading">Hasta</label>
            <input
              id="filtro-fecha-hasta"
              v-model="draftFilters.fechaHasta"
              type="date"
              class="block w-full sm:w-40 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800" />
          </div>

          <label class="inline-flex items-center gap-2 pb-2.5 text-sm font-normal text-body">
            <input v-model="draftFilters.soloGrua" type="checkbox" class="w-4 h-4 border border-default-medium rounded-xs bg-white focus:ring-2 focus:ring-brand-soft dark:bg-gray-800">
            Solo ingreso en grúa
          </label>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-lg font-semibold text-heading">Listado de Recepciones</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="recepciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Nº Recepción', 'Vehículo', 'Cliente', 'Tipo', 'Fecha ingreso', 'Estado', 'Relaciones', 'Acciones']"
        :items="recepciones"
        :loading="loading"
        loading-text="Cargando recepciones..."
        empty-text="No hay recepciones registradas."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {{ numeroDisplay(item) }}
          </a>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <span class="flex items-center gap-1.5">
            <a v-if="vehiculoUrl(item)" :href="vehiculoUrl(item)" class="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
              {{ item.vehiculo?.placa || '-' }}</a>
            <span v-else class="font-semibold text-gray-900 dark:text-white">{{ item.vehiculo?.placa || '-' }}</span>
          </span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span class="flex items-center gap-1.5">
              <CarFilled class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">
                {{ [item.vehiculo?.marca, item.vehiculo?.modelo].filter(Boolean).join(' ') || '-' }}
                <span v-if="item.vehiculo?.color" class="text-gray-400 dark:text-gray-500">· {{ item.vehiculo.color }}</span>
              </span>
            </span>
            <span class="flex items-center gap-1.5">
              <Gauge class="w-3.5 h-3.5 shrink-0" />
              <span>{{ kmIngresoDisplay(item) }}</span>
            </span>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <a v-if="clienteUrl(item)" :href="clienteUrl(item)" class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
            {{ item.cliente?.nombre || '-' }}</a>
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
        <td class="p-4 whitespace-nowrap align-top">
          <TipoRecepcionBadge :tipo="item.tipo_recepcion" />
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap align-top dark:text-white">
          <div class="flex flex-col gap-1" :title="getFechaIngreso(item).completo">
            <span class="font-medium text-gray-900 dark:text-white">{{ getFechaIngreso(item).fecha }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ getFechaIngreso(item).hora }}
              <span v-if="getFechaIngreso(item).antiguedad" class="text-gray-400 dark:text-gray-500">· {{ getFechaIngreso(item).antiguedad }}</span>
            </span>
          </div>
          <span
            class="mt-1.5 flex items-center gap-1.5 text-xs font-medium"
            :class="item.ingreso_en_grua ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'"
            :title="item.ingreso_en_grua ? (item.datos_grua || 'Ingresó en grúa') : 'No ingresó en grúa'"
          >
            <MdiIcon :path="mdiTowTruck" class="w-5 h-5 shrink-0" />
            {{ item.ingreso_en_grua ? 'Ingresó en grúa' : 'Sin grúa' }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            :class="getEstadoRecepcion(item).color"
          >
            <component :is="getEstadoRecepcion(item).icon" class="w-5 h-5 shrink-0" />
            {{ getEstadoRecepcion(item).label }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <div class="flex flex-col items-start gap-1.5">
            <template v-for="relacion in getRelaciones(item)" :key="relacion.key">
              <a
                v-if="relacion.numero"
                :href="relacion.url"
                :title="relacionTitle(relacion)"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors"
                :class="relacion.color"
              >
                <component :is="relacion.icon" class="w-3.5 h-3.5 shrink-0" />
                {{ relacion.numero }}
                <span
                  v-if="relacion.extra > 0"
                  class="inline-flex items-center gap-0.5 pl-1 border-l border-current/30 font-semibold"
                  :title="`${relacion.extra} relación(es) adicional(es)`"
                >
                  <Plus class="w-2.5 h-2.5" />{{ relacion.extra }}
                </span>
              </a>
              <span
                v-else
                class="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500"
                :title="`${relacion.label}: sin relación`"
              >
                <component :is="relacion.icon" class="w-3.5 h-3.5 shrink-0" />
                {{ relacion.label }}: No
              </span>
            </template>
          </div>
        </td>
        <td class="p-4 whitespace-nowrap align-top">
          <div class="flex items-center gap-2">
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Editar recepción" aria-label="Editar recepción" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Eliminar recepción" aria-label="Eliminar recepción" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'ACEPTADA' && !item.inspecciones?.length" type="button" title="Crear inspección" aria-label="Crear inspección" :disabled="creandoId === item.id" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded border border-gray-300 hover:bg-primary-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400" @click="openCrearInspeccionModal(item)">
              <Loader2 v-if="creandoId === item.id" class="w-5 h-5 animate-spin" />
              <IconReportSearch class="w-5.5 h-5.5" />
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
        item-word="recepción"
        item-plural="recepciones"
        empty-text="No hay recepciones registradas."
        @page="reloadList"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="recepción"
    :icon="Trash2"
    :item-name="recepcionToDelete ? numeroDisplay(recepcionToDelete) : ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="recepcionToDelete = null"
  />

  <ConfirmModal
    v-model="showCreateInspeccionModal"
    title="Crear inspección"
    :icon="IconReportSearch"
    :message="recepcionParaInspeccion ? `Se generará una inspección en estado pendiente a partir de la recepción ${numeroDisplay(recepcionParaInspeccion)}. ¿Deseas continuar?` : ''"
    variant="primary"
    confirm-text="Sí, crear"
    confirming-text="Creando inspección..."
    :is-deleting="creandoId !== null"
    @confirm="confirmCrearInspeccion"
    @cancel="recepcionParaInspeccion = null"
  />
</template>
