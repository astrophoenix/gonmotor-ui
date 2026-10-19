<script setup>
import { computed, onMounted, ref, onUnmounted, nextTick, h } from 'vue';
import {
  Search, Receipt, Filter, CalendarDays, Flag,
  Car, Gauge, IdCard, Phone, MoreVertical,
} from 'lucide-vue-next';
import { IconLockOpen2 } from '@tabler/icons-vue';
import { mdiCarSearchOutline } from '@mdi/js';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import MdiIcon from '@/shared/components/MdiIcon.vue';
import { useInspecciones } from '../composables/useInspecciones';
import { inspeccionesService } from '../services/inspeccionesService';
import { useAuthStore } from '../../auth/stores/authStore';
import { talleresService } from '../../configuracion/services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import EstadoInspeccionBadge from './EstadoInspeccionBadge.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeInspeccion } from '../../../shared/utils/relacionesFlujo';
import Pagination from '../../../shared/components/Pagination.vue';
import { ESTADOS_INSPECCION_FILTRABLE } from '../constants/estadosInspeccion';
import { TIPOS_TRABAJO_OPCIONES } from '../../../shared/config/tiposTrabajo';
import { referenciaCorta } from '../../../shared/utils/format';
import { usePdfExport } from '../../../shared/composables/usePdfExport';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('inspecciones'));
const puedeCrearCotizacion = computed(() => puede('cotizaciones'));

/** Una inspección finalizada se reabre (no se edita); con orden no se elimina. */
function editable(item) {
  return puedeModificar.value && item.estado !== 'FINALIZADA';
}
function eliminable(item) {
  return puedeModificar.value && !item.tiene_orden_trabajo;
}
function motivoNoReabrir(item) {
  if (item.puede_reabrir) return '';
  return item.tiene_orden_trabajo ? 'Ya tiene una orden de trabajo' : 'Tiene una cotización enviada o aceptada';
}

// Mismo icono que el enlace de Inspecciones del sidebar.
const CarSearchIcon = { render: () => h(MdiIcon, { path: mdiCarSearchOutline }) };

const {
  inspecciones,
  loading,
  isDeleting,
  search,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  loadInspecciones,
  removeInspeccion,
} = useInspecciones();

const authStore = useAuthStore();

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

const prefijoInspeccionBySucursal = ref({});
const talleres = ref([]);

async function loadPrefijosInspeccion() {
  try {
    const data = await talleresService.listTalleres();
    const list = Array.isArray(data) ? data : data?.results || [];
    talleres.value = list;
    const map = {};
    list.forEach((taller) => {
      if (taller.id && taller.prefijo_inspeccion) {
        map[taller.id] = taller.prefijo_inspeccion;
      }
    });
    prefijoInspeccionBySucursal.value = map;
  } catch (error) {
    talleres.value = [];
    prefijoInspeccionBySucursal.value = {};
  }
}

function tallerLabel(taller) {
  return [taller.nombre, taller.ciudad].filter(Boolean).join(' · ') || `Taller ${taller.id}`;
}

function numeroDisplay(item) {
  if (item.numero_inspeccion) return item.numero_inspeccion;
  const prefijo = prefijoInspeccionBySucursal.value[item.sucursal] || '';
  return `#${prefijo}${item.id}`;
}

// La inspección guarda su propio vehículo/cliente; si viene de una recepción
// el backend los completa con los de esa recepción.
function vehiculoDe(item) {
  return item.vehiculo || item.recepcion?.vehiculo || null;
}

function clienteDe(item) {
  return item.cliente || item.recepcion?.cliente || null;
}

function vehiculoUrl(item) {
  const id = vehiculoDe(item)?.id;
  return id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}` : null;
}

function clienteUrl(item) {
  const id = clienteDe(item)?.id;
  return id ? `/crud/clientes/ver/?id=${encodeURIComponent(id)}` : null;
}

// La lectura propia del diagnóstico manda: el vehículo pudo salir a prueba de
// ruta. Se cae al odómetro del vehículo cuando la inspección aún no tiene captura.
function kmDisplay(item) {
  const km = item.kilometraje_diagnostico ?? vehiculoDe(item)?.kilometraje_actual;
  if (km === null || km === undefined || km === '') return 'Sin km registrado';
  const numero = Number(km);
  if (Number.isNaN(numero)) return 'Sin km registrado';
  return `${numero.toLocaleString('es-EC')} km`;
}

const showDeleteModal = ref(false);
const inspeccionToDelete = ref(null);

const showReabrirModal = ref(false);
const inspeccionToReabrir = ref(null);
const isReopening = ref(false);

function handleEditar(inspeccion) {
  window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`);
}

// --- MENÚ DE ACCIONES (dropdown por fila) ---
const accionesAbierta = ref(null);
const accionesPos = ref({ top: 0, left: 0 });
const accionesTriggerRef = ref(null);

async function toggleAcciones(item, event) {
  if (accionesAbierta.value === item.id) {
    cerrarAcciones();
    return;
  }
  accionesTriggerRef.value = event.currentTarget;
  accionesAbierta.value = item.id;
  await nextTick();
  posicionarAcciones();
}

function posicionarAcciones() {
  const trigger = accionesTriggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const anchoMenu = 208;
  const altoMenu = 132;
  let top = rect.bottom + 4;
  if (top + altoMenu > window.innerHeight - 8) top = rect.top - altoMenu - 4;
  let left = rect.right - anchoMenu;
  if (left < 8) left = 8;
  accionesPos.value = { top, left };
}

function cerrarAcciones() {
  accionesAbierta.value = null;
}

function onAccionesKeydown(event) {
  if (event.key === 'Escape') cerrarAcciones();
}

function ejecutarAccion(accion, item) {
  cerrarAcciones();
  if (accion === 'reabrir') solicitarReabrir(item);
  else if (accion === 'cotizacion') handleCrearCotizacion(item.id);
  else if (accion === 'pdf') descargarPdf(item);
}

const { isExportingPdf, exportarPdf } = usePdfExport({
  onError: (message) => showAlert('error', '', message),
});

function descargarPdf(inspeccion) {
  exportarPdf(() => inspeccionesService.exportarPdf(inspeccion.id));
}

function solicitarReabrir(inspeccion) {
  inspeccionToReabrir.value = inspeccion;
  showReabrirModal.value = true;
}

// --- PANEL DE FILTROS (se aplican al cambiar: useFiltrosReactivos) ---
const emptyAdvancedFilters = () => ({
  estado: '',
  tipoInspeccion: '',
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
    tipo_inspeccion: appliedFilters.value.tipoInspeccion,
    sucursal: appliedFilters.value.sucursal,
    fecha_desde: appliedFilters.value.fechaDesde,
    fecha_hasta: appliedFilters.value.fechaHasta,
  };
}

async function reloadList(page = 1) {
  try {
    await loadInspecciones(page, buildQuery());
  } catch (err) {
    showAlert('error', '', err?.message || 'No se pudieron cargar las inspecciones.');
  }
}

function applyAdvancedFilters() {
  appliedFilters.value = {
    ...draftFilters.value,
    fechaDesde: fechaInputAIso(fechaDesdeInput.value),
    fechaHasta: fechaInputAIso(fechaHastaInput.value),
  };
  reloadList(1);
}

function clearAdvancedFilters() {
  search.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  limpiarCamposFecha();
  marcarAplicado();
  reloadList(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: draftFilters,
  busqueda: search,
  camposFecha: [fechaDesdeInput, fechaHastaInput],
  firma: () => ({
    ...draftFilters.value,
    fechaDesde: fechaInputAIso(fechaDesdeInput.value),
    fechaHasta: fechaInputAIso(fechaHastaInput.value),
    search: search.value.trim(),
  }),
  aplicar: () => {
    applyAdvancedFilters();
  },
});

async function confirmarReabrir() {
  if (!inspeccionToReabrir.value || isReopening.value) return;
  isReopening.value = true;
  try {
    await inspeccionesService.update(inspeccionToReabrir.value.id, { estado: 'EN_PROCESO' });
    const id = inspeccionToReabrir.value.id;
    inspeccionToReabrir.value = null;
    showReabrirModal.value = false;
    window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(id)}`);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo reabrir la inspección.');
    showReabrirModal.value = false;
  } finally {
    isReopening.value = false;
  }
}

function handleCrearCotizacion(id) {
  window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(id)}`);
}

function handlePdfError(message) {
  showAlert('error', 'Error al exportar PDF', message);
}

function handleExcelError(message) {
  showAlert('error', 'Error al exportar Excel', message);
}

function openDeleteModal(inspeccion) {
  inspeccionToDelete.value = inspeccion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!inspeccionToDelete.value) return;

  try {
    await removeInspeccion(inspeccionToDelete.value.id);
    showAlert('success', '', 'Inspección eliminada correctamente.');

    const page = inspecciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await reloadList(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la inspección.');
  } finally {
    inspeccionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatAntiguedad(date) {
  const minutos = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

function fechaDisplay(valor) {
  if (!valor) return null;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return null;
  return {
    fecha: date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    antiguedad: formatAntiguedad(date),
    completo: date.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' }),
  };
}


onMounted(async () => {
  document.addEventListener('keydown', onAccionesKeydown);
  await cargarPermisos().catch(() => {});
  if (sinAcceso('inspecciones')) return;
  loadPrefijosInspeccion();
  reloadList();
});

onUnmounted(() => {
  document.removeEventListener('keydown', onAccionesKeydown);
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('inspecciones')" seccion="Inspecciones" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="CarSearchIcon"
    entity="Inspecciones"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Inspecciones' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('inspecciones')" objeto="las inspecciones" />
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
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="flex items-center gap-2 text-md font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <FilterActions
            :loading="loading"
            :show-search="false"
            @clear="clearAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-2xl">
            <label for="inspecciones-search" class="block mb-1 text-sm font-medium text-heading">
              Buscar inspección
            </label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="inspecciones-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="N.º inspección, placa, cliente o recepción" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in ESTADOS_INSPECCION_FILTRABLE" :key="item" :value="item">{{ estadoADisplay('inspeccion', item) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-tipo-inspeccion" class="block mb-1 text-sm font-medium text-heading">Tipo de inspección</label>
            <select
              id="filtro-tipo-inspeccion"
              v-model="draftFilters.tipoInspeccion"
              class="block w-full sm:w-44 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in TIPOS_TRABAJO_OPCIONES" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>

          <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:shrink-0">
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
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Inspecciones</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="inspecciones"
            entity-api-path="ordenes/inspecciones"
            :show-add="puedeModificar"
            :export-params="buildQuery()"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="[
          { key: 'numero', label: 'Nº Inspección', thClass: 'w-48 whitespace-nowrap' },
          { key: 'vehiculo', label: 'Vehículo', thClass: 'w-42' },
          'Cliente',
          'Tipo', { key: 'fechas', label: 'Fechas', thClass: 'w-64' },
          'Estado',
          'Relaciones',
          'Acciones',
        ]"
        :items="inspecciones"
        :loading="loading"
        loading-text="Cargando inspecciones..."
        empty-text="No se encontraron inspecciones."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <a
            :href="`/crud/inspecciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-brand-coral dark:text-primary-400"
          >
            {{ numeroDisplay(item) }}
          </a>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <a
            v-if="vehiculoUrl(item)"
            :href="vehiculoUrl(item)"
            class="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ vehiculoDe(item)?.placa || '-' }}</a>
          <span v-else class="font-semibold text-gray-900 dark:text-white">{{ vehiculoDe(item)?.placa || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span class="flex items-center gap-1.5 min-w-0">
              <Car class="w-3.5 h-3.5 shrink-0" />
              <span class="min-w-0 truncate">
                {{ [vehiculoDe(item)?.marca, vehiculoDe(item)?.modelo].filter(Boolean).join(' ') || '-' }}
                <span v-if="vehiculoDe(item)?.color" class="text-gray-400 dark:text-gray-500">· {{ vehiculoDe(item).color }}</span>
              </span>
            </span>
            <span class="flex items-center gap-1.5">
              <Gauge class="w-3.5 h-3.5 shrink-0" />
              <span>{{ kmDisplay(item) }}</span>
            </span>
          </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <a
            v-if="clienteUrl(item)"
            :href="clienteUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ clienteDe(item)?.nombre || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ clienteDe(item)?.nombre || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="clienteDe(item)?.identificacion" class="flex items-center gap-1.5">
              <IdCard class="w-3.5 h-3.5 shrink-0" />
              <span>{{ clienteDe(item).identificacion }}</span>
            </span>
            <span v-if="clienteDe(item)?.telefono" class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span>{{ clienteDe(item).telefono }}</span>
            </span>
          </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <TipoTrabajoBadge :tipo="item.tipo_inspeccion" :size=" 'sm' " />
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <div class="flex flex-col gap-1.5">
            <div class="flex flex-col gap-0.5" :title="fechaDisplay(item.fecha_inspeccion)?.completo || ''">
              <span class="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                <CalendarDays class="w-3.5 h-3.5 shrink-0" />
                Inspección
              </span>
              <span v-if="fechaDisplay(item.fecha_inspeccion)" class="flex items-baseline gap-1.5 whitespace-nowrap">
                <span class="font-medium text-gray-900 dark:text-white">{{ fechaDisplay(item.fecha_inspeccion).fecha }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ fechaDisplay(item.fecha_inspeccion).hora }}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500">· {{ fechaDisplay(item.fecha_inspeccion).antiguedad }}</span>
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">Sin fecha</span>
            </div>
            <div class="flex flex-col gap-0.5" :title="fechaDisplay(item.fecha_finalizacion)?.completo || ''">
              <span class="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                <Flag class="w-3.5 h-3.5 shrink-0" />
                Finalización
              </span>
              <span v-if="fechaDisplay(item.fecha_finalizacion)" class="flex items-baseline gap-1.5 whitespace-nowrap">
                <span class="font-medium text-gray-900 dark:text-white">{{ fechaDisplay(item.fecha_finalizacion).fecha }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ fechaDisplay(item.fecha_finalizacion).hora }}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500">· {{ fechaDisplay(item.fecha_finalizacion).antiguedad }}</span>
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">Pendiente de finalizar</span>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <EstadoInspeccionBadge :estado="item.estado" :estado-display="item.estado_display" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <RelacionesFlujo :pasos="relacionesDeInspeccion(item)" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <div class="flex items-center gap-2">
            <EntityRowActions entity="inspección" :show-view="!editable(item)" :view-href="`/crud/inspecciones/ver/?id=${encodeURIComponent(item.id)}`" :show-edit="editable(item)" :show-delete="eliminable(item)" :delete-disabled="isDeleting" @edit="handleEditar(item)" @delete="openDeleteModal(item)" />
            <button type="button" title="Más acciones" aria-label="Más acciones de la inspección" :aria-expanded="accionesAbierta === item.id" class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-100 hover:text-brand-900 hover:ring-1 hover:ring-inset hover:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white dark:hover:ring-gray-500 aria-expanded:bg-brand-100 aria-expanded:text-brand-900 aria-expanded:ring-1 aria-expanded:ring-inset aria-expanded:ring-brand-200 dark:aria-expanded:bg-gray-600 dark:aria-expanded:text-white dark:aria-expanded:ring-gray-500" @click.stop="toggleAcciones(item, $event)">
              <MoreVertical class="w-4 h-4" />
            </button>
            <Teleport to="body">
              <div v-if="accionesAbierta === item.id" class="fixed inset-0 z-40" @click="cerrarAcciones" @contextmenu.prevent="cerrarAcciones" />
              <div
                v-if="accionesAbierta === item.id"
                class="fixed z-50 w-52 overflow-hidden rounded-base border border-default bg-white py-1 shadow-md dark:bg-gray-800 dark:border-default"
                :style="{ top: `${accionesPos.top}px`, left: `${accionesPos.left}px` }"
                role="menu"
                aria-label="Acciones de la inspección"
              >
                <!-- Reabrir: por rol se oculta; por estado se muestra deshabilitado con su motivo. -->
                <button v-if="puedeModificar && item.estado === 'FINALIZADA'" type="button" role="menuitem" :disabled="!item.puede_reabrir" class="group flex w-full items-start gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft disabled:cursor-not-allowed disabled:hover:bg-transparent dark:hover:bg-gray-700" @click="ejecutarAccion('reabrir', item)">
                  <IconLockOpen2 class="w-4 h-4 mt-0.5 text-primary-600 group-disabled:opacity-40 dark:text-primary-400" />
                  <span>
                    <span class="block group-disabled:opacity-40">Reabrir</span>
                    <span v-if="motivoNoReabrir(item)" class="block text-xs text-gray-500 dark:text-gray-400">{{ motivoNoReabrir(item) }}</span>
                  </span>
                </button>
                <button v-if="puedeCrearCotizacion && item.estado === 'PENDIENTE'" type="button" role="menuitem" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft dark:hover:bg-gray-700" @click="ejecutarAccion('cotizacion', item)">
                  <Receipt class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Crear cotización
                </button>
                <button type="button" role="menuitem" title="Descargar el informe de la inspección en PDF" :disabled="isExportingPdf" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700" @click="ejecutarAccion('pdf', item)">
                  <Icon :icon="filePdfIcon" class="w-4 h-4 text-accent-600 dark:text-accent-400" />
                  Descargar PDF
                </button>
              </div>
            </Teleport>
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
        item-word="inspección"
        item-plural="inspecciones"
        empty-text="No se encontraron inspecciones."
        @page="reloadList"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="inspección"
    :item-name="inspeccionToDelete?.numero_inspeccion || referenciaCorta(inspeccionToDelete?.id)"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="inspeccionToDelete = null"
  />

  <ConfirmModal
    v-model="showReabrirModal"
    title="Reabrir inspección"
    :message="'Se reabrirá la inspección para poder modificar el diagnóstico y volver a generar la cotización. El cliente deberá aceptar nuevamente la cotización antes de modificar la orden de trabajo. ¿Deseas continuar?'"
    :icon="IconLockOpen2"
    icon-class="text-primary-600 dark:text-primary-400"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    variant="primary"
    :is-deleting="isReopening"
    @confirm="confirmarReabrir"
    @cancel="showReabrirModal = false"
  />
  </template>
</template>
