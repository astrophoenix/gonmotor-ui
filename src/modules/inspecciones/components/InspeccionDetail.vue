<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  Car,
  Camera,
  ClipboardList,
  FilePen,
  ShieldCheck,
  IdCardIcon,
  Mail,
  PaintBucket,
  Phone,
  Shapes,
  TagIcon,
  TriangleAlert,
  Workflow,
  X,
  Toolbox,
  Receipt,
  Package,
  Loader2,
  ScanSearch,
  Stethoscope,
  CalendarClock,
  ListChecks,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  History,
  Wrench,
  Lightbulb,
  Check,
  Minus,
  Store,
} from 'lucide-vue-next';
import { IconAutomaticGearbox, IconEngine, IconGasStation, IconLockOpen2, IconManualGearbox } from '@tabler/icons-vue';
import { API_BASE_URL } from '../../../shared/config/env';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeInspeccion } from '../../../shared/utils/relacionesFlujo';
import { formatDateTime, formatDuration, minutesBetween } from '../../../shared/utils/datetime';
import EstadoInspeccionBadge from './EstadoInspeccionBadge.vue';
import { referenciaCorta } from '../../../shared/utils/format';

const inspeccion = ref(null);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const showReabrirModal = ref(false);
const showGenerarCotizacionModal = ref(false);
const isReopening = ref(false);
const isGeneratingCotizacion = ref(false);
const isSyncingCotizacion = ref(false);

const params = new URLSearchParams(window.location.search);
const inspeccionId = params.get('id') || '';

// --- Estilos compartidos con InspeccionEdit (misma línea gráfica del flujo) ---
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const ETIQUETA = 'text-xs font-medium text-gray-500 dark:text-gray-400';
const VALOR = 'mt-0.5 text-sm font-semibold text-gray-900 dark:text-white';
const CONTADOR = 'px-2 py-0.5 text-xs font-medium rounded-sm tabular-nums';
const CONTADOR_NEUTRO = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
const ENLACE = 'hover:text-accent-500 dark:hover:text-accent-400';
const BLOQUE_TEXTO = 'p-3 text-sm leading-relaxed whitespace-pre-line text-gray-900 border-s-4 rounded-e-lg dark:text-white';

const PASOS = [
  { key: 'informacion', label: 'Diagnóstico', icon: Stethoscope },
  { key: 'testigos', label: 'Testigos', icon: TriangleAlert },
  { key: 'fotos', label: 'Evidencia', icon: Camera },
  { key: 'servicios', label: 'Plan de trabajo', icon: Toolbox },
];

const activeTab = ref('informacion');
const activeTabIndex = computed(() => PASOS.findIndex((p) => p.key === activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < PASOS.length) activeTab.value = PASOS[next].key;
}

const PRIORIDADES = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
const PRIORIDAD_BADGE = {
  ALTA: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  MEDIA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  BAJA: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

const recepcion = computed(() => inspeccion.value?.recepcion || null);

const clienteInfo = computed(() => {
  const r = recepcion.value;
  if (!r) return inspeccion.value?.cliente || null;
  return r.cliente || (r.cliente_nombre ? { nombre: r.cliente_nombre, identificacion: '', telefono: '', email: '' } : null);
});

const vehiculoInfo = computed(() => {
  const r = recepcion.value;
  if (!r) return inspeccion.value?.vehiculo || null;
  return r.vehiculo || { placa: r.placa, marca: r.marca, modelo: r.modelo, color: r.color };
});

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

const placaDisplay = computed(() => formatPlaca(vehiculoInfo.value?.placa));
const clienteUrl = computed(() => (clienteInfo.value?.id ? `/crud/clientes/ver/?id=${encodeURIComponent(clienteInfo.value.id)}` : null));
const vehiculoUrl = computed(() => (vehiculoInfo.value?.id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(vehiculoInfo.value.id)}` : null));
const recepcionHref = computed(() => (recepcion.value?.id ? `/crud/recepciones/ver/?id=${encodeURIComponent(recepcion.value.id)}` : ''));
const tallerNombre = computed(() => inspeccion.value?.sucursal_nombre || recepcion.value?.sucursal_nombre || '');

const responsableNombre = computed(() => inspeccion.value?.responsable_nombre || '—');
const responsableIdentificacion = computed(() => inspeccion.value?.responsable_identificacion || '—');
const responsableTelefono = computed(() => inspeccion.value?.responsable_telefono || '—');
const responsableRol = computed(() => inspeccion.value?.responsable_rol_display || inspeccion.value?.responsable_rol || '—');

const fechaInspeccionDisplay = computed(() => formatDateTime(inspeccion.value?.fecha_inspeccion || inspeccion.value?.created_at));
const fechaFinalizacionDisplay = computed(() => (
  inspeccion.value?.fecha_finalizacion ? formatDateTime(inspeccion.value.fecha_finalizacion) : ''
));
const duracionInspeccionDisplay = computed(() => {
  const minutos = inspeccion.value?.duracion_inspeccion_minutos
    ?? minutesBetween(inspeccion.value?.fecha_inspeccion, inspeccion.value?.fecha_finalizacion);
  return minutos == null ? '' : formatDuration(minutos);
});

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

// La lectura propia del diagnóstico manda; si falta, se muestra el odómetro del vehículo.
const kilometraje = computed(() => {
  const propio = inspeccion.value?.kilometraje_diagnostico;
  if (propio != null && propio !== '') return { valor: formatNumber(propio), referencia: false };
  const actual = vehiculoInfo.value?.kilometraje_actual;
  if (actual != null && actual !== '') return { valor: formatNumber(actual), referencia: true };
  return null;
});

const dtcLista = computed(() => (inspeccion.value?.codigos_dtc || '')
  .split(/[\s,;]+/)
  .map((codigo) => codigo.trim().toUpperCase())
  .filter(Boolean));

// --- Testigos ---
const testigosActivos = computed(() => TESTIGOS.filter((t) => Boolean(inspeccion.value?.[t.key])));

function testigoCardClass(testigo) {
  const base = 'flex flex-col items-center justify-center p-3 rounded-xl border-2';
  if (!inspeccion.value?.[testigo.key]) return `${base} bg-gray-50 border-gray-200 opacity-60 dark:bg-gray-700 dark:border-gray-600`;
  if (testigo.color === 'red') return `${base} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500`;
  if (testigo.color === 'green') return `${base} bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-500`;
  return `${base} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500`;
}

function testigoIconClass(testigo) {
  const base = 'w-8 h-8';
  if (!inspeccion.value?.[testigo.key]) return `${base} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${base} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
  if (testigo.color === 'green') return `${base} text-green-500 dark:text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`;
  return `${base} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

// --- Evidencia y plan de trabajo ---
const fotos = computed(() => (inspeccion.value?.fotos || []).filter((f) => f.url || f.imagen));
const servicios = computed(() => inspeccion.value?.servicios_detectados || []);
const repuestos = computed(() => inspeccion.value?.repuestos_sugeridos || []);
const totalItems = computed(() => servicios.value.length + repuestos.value.length);
const totalHoras = computed(() => servicios.value.reduce((n, s) => n + (Number(s.horas_estimadas) || 0), 0));

const GRUPOS_PLAN = computed(() => [
  { key: 'svc', titulo: 'Servicios', singular: 'Servicio', icon: Toolbox, filas: servicios.value, columna: 'Horas', valor: (f) => (f.horas_estimadas == null || f.horas_estimadas === '' ? '—' : `${formatNumber(f.horas_estimadas)} h`), vacio: 'No se registraron servicios.' },
  { key: 'rpt', titulo: 'Repuestos', singular: 'Repuesto', icon: Package, filas: repuestos.value, columna: 'Cant.', valor: (f) => formatNumber(f.cantidad), vacio: 'No se registraron repuestos.' },
]);

const resumenPaso = computed(() => ({
  informacion: dtcLista.value.length ? plural(dtcLista.value.length, 'código DTC', 'códigos DTC') : 'Motivo y hallazgos',
  testigos: testigosActivos.value.length ? plural(testigosActivos.value.length, 'encendido', 'encendidos') : 'Ninguno encendido',
  fotos: plural(fotos.value.length, 'foto', 'fotos'),
  servicios: totalItems.value ? plural(totalItems.value, 'ítem', 'ítems') : 'Sin ítems',
}));

const hallazgos = computed(() => [
  { key: 'dtc', label: 'Códigos DTC', valor: dtcLista.value.length, paso: 'informacion' },
  { key: 'testigos', label: 'Testigos', valor: testigosActivos.value.length, paso: 'testigos' },
  { key: 'fotos', label: 'Fotos', valor: fotos.value.length, paso: 'fotos' },
  { key: 'items', label: 'Ítems del plan', valor: totalItems.value, paso: 'servicios' },
]);

function pasoCirculoClass(key) {
  return activeTab.value === key
    ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

// Historial (timeline del aside).
const historial = computed(() => {
  const i = inspeccion.value;
  if (!i) return [];
  const eventos = [];
  if (recepcion.value) {
    eventos.push({ key: 'recepcion', titulo: 'Recepción del vehículo', fecha: recepcion.value.fecha_ingreso || recepcion.value.created_at, detalle: recepcion.value.numero_recepcion || '' });
  }
  eventos.push({ key: 'inicio', titulo: 'Inicio del diagnóstico', fecha: i.fecha_inspeccion || i.created_at, detalle: i.responsable_nombre ? `Responsable: ${i.responsable_nombre}` : '' });
  if (i.fecha_finalizacion) {
    eventos.push({ key: 'fin', titulo: 'Diagnóstico finalizado', fecha: i.fecha_finalizacion, detalle: duracionInspeccionDisplay.value ? `Duración: ${duracionInspeccionDisplay.value}` : '' });
  } else {
    eventos.push({ key: 'curso', titulo: 'Diagnóstico en curso', fecha: null, detalle: 'Aún no se finaliza' });
  }
  return eventos;
});

// --- Vehículo (aside) ---
const transmisionLabel = computed(() => {
  const map = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };
  const value = vehiculoInfo.value?.transmision || '';
  return map[value] || value || '';
});
const transmisionIcon = computed(() => (vehiculoInfo.value?.transmision === 'M' ? IconManualGearbox : IconAutomaticGearbox));
const combustibleLabel = computed(() => {
  const map = { GAS: 'Gasolina', DIE: 'Diésel', HIB: 'Híbrido', ELE: 'Eléctrico', GNV: 'Gas Natural Vehicular (GNV)' };
  const value = vehiculoInfo.value?.combustible || '';
  return map[value] || value || '';
});

function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() => resolveMediaUrl(vehiculoInfo.value?.imagen));

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

// --- Estado y acciones ---
const tieneOrdenTrabajo = computed(() => Boolean(inspeccion.value?.tiene_orden_trabajo));
const tieneCotizacionActiva = computed(() => Boolean(inspeccion.value?.tiene_cotizacion_activa));
const cotizacionActivaAceptada = computed(() => inspeccion.value?.cotizacion_activa_estado === 'ACEPTADA');
const puedeActualizarCotizacion = computed(() => tieneCotizacionActiva.value && !cotizacionActivaAceptada.value);
const estaFinalizada = computed(() => inspeccion.value?.estado === 'FINALIZADA');
const MENSAJE_SIN_ITEMS = 'La inspección no tiene servicios ni repuestos. Reábrela y agrega al menos un ítem antes de generar la cotización.';

// Reapertura: solo si el trabajo no avanzó. Se bloquea cuando la inspección ya
// generó una orden de trabajo o tiene una cotización enviada/aceptada.
const tieneCotizacionBloqueante = computed(() => Boolean(inspeccion.value?.tiene_cotizacion_bloqueante));
const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('inspecciones'));
const puedeCotizar = computed(() => puede('cotizaciones'));
const puedeReabrir = computed(() => estaFinalizada.value && !tieneOrdenTrabajo.value && !tieneCotizacionBloqueante.value);
const motivoNoReabrir = computed(() => {
  if (!estaFinalizada.value || puedeReabrir.value) return '';
  if (tieneOrdenTrabajo.value) return 'La inspección ya generó una orden de trabajo; no puede reabrirse.';
  return 'La inspección tiene una cotización enviada o aceptada; no puede reabrirse.';
});

// Solo un mensaje visible a la vez: al mostrar uno se limpia el otro.
function mostrarError(mensaje) {
  successMessage.value = '';
  error.value = mensaje;
}

function mostrarExito(mensaje) {
  error.value = '';
  successMessage.value = mensaje;
}

function scrollAlInicio() {
  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function avisarSinItems() {
  mostrarError(MENSAJE_SIN_ITEMS);
  scrollAlInicio();
}

const relacionesInspeccion = computed(() => relacionesDeInspeccion(inspeccion.value));
const numeroInspeccion = computed(() => inspeccion.value?.numero_inspeccion || referenciaCorta(inspeccion.value?.id));

function irAEditar() {
  if (!inspeccion.value?.id) return;
  window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.value.id)}`);
}

// El informe PDF se genera en el backend y está disponible en cualquier estado.
function descargarPdf() {
  return inspeccionesService.exportarPdf(inspeccionId);
}

function solicitarCrearCotizacion() {
  if (isSyncingCotizacion.value || isGeneratingCotizacion.value) return;
  if (!totalItems.value) {
    avisarSinItems();
    return;
  }
  showGenerarCotizacionModal.value = true;
}

const textoConfirmacionCotizacion = computed(() => (
  puedeActualizarCotizacion.value
    ? 'Se actualizará la cotización con los detalles actuales de servicios y repuestos necesarios para realizar la orden de trabajo.'
    : 'Se creará una cotización con los detalles de servicios y repuestos necesarios para realizar la orden de trabajo.'
));
const textoAccionCotizacion = computed(() => (puedeActualizarCotizacion.value ? 'Actualizar cotización' : 'Crear cotización'));

async function crearCotizacion() {
  if (isSyncingCotizacion.value || isGeneratingCotizacion.value) return;
  if (!totalItems.value) {
    showGenerarCotizacionModal.value = false;
    avisarSinItems();
    return;
  }
  isGeneratingCotizacion.value = true;
  const cotizacionId = puedeActualizarCotizacion.value ? inspeccion.value?.cotizacion_activa_id : null;
  if (!cotizacionId) {
    showGenerarCotizacionModal.value = false;
    isGeneratingCotizacion.value = false;
    window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(inspeccionId)}`);
    return;
  }
  isSyncingCotizacion.value = true;
  try {
    await request(`/api/cotizaciones/${encodeURIComponent(cotizacionId)}/sincronizar_inspeccion/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } catch (syncError) {
    mostrarError(syncError.message || 'No se pudo actualizar la cotización con los cambios de la inspección.');
    isSyncingCotizacion.value = false;
    isGeneratingCotizacion.value = false;
    scrollAlInicio();
    return;
  }
  showGenerarCotizacionModal.value = false;
  isGeneratingCotizacion.value = false;
  window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(cotizacionId)}`);
}

function solicitarReabrir() {
  if (isReopening.value) return;
  if (!puedeReabrir.value) {
    if (motivoNoReabrir.value) mostrarError(motivoNoReabrir.value);
    return;
  }
  showReabrirModal.value = true;
}

async function confirmarReabrir() {
  if (isReopening.value) return;
  isReopening.value = true;
  try {
    await inspeccionesService.update(inspeccionId, { estado: 'EN_PROCESO' });
    // Reabrir lleva directo a la edición para retomar el diagnóstico.
    window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccionId)}`);
  } catch (fetchError) {
    mostrarError(fetchError.message || 'No se pudo reabrir la inspección.');
    isReopening.value = false;
  }
}

async function cargarInspeccion() {
  const data = await inspeccionesService.getById(inspeccionId);
  inspeccion.value = data;
  if (!data.recepcion && data.recepcion_id) {
    try {
      const recep = await request(`/api/recepciones/${data.recepcion_id}/`);
      inspeccion.value = { ...data, recepcion: recep };
    } catch (ignore) {
      /* la recepción es opcional para la vista */
    }
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('inspecciones')) {
    loading.value = false;
    return;
  }
  if (params.get('finalizada')) {
    mostrarExito('Inspección finalizada correctamente.');
    params.delete('finalizada');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);
  }
  if (!inspeccionId) {
    mostrarError('Falta el identificador de la inspección.');
    loading.value = false;
    return;
  }
  try {
    await cargarInspeccion();
  } catch (fetchError) {
    mostrarError(fetchError.message || 'No se pudo cargar la inspección.');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('inspecciones')" seccion="Inspecciones" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Inspección"
    :record-number="inspeccion ? numeroInspeccion : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Inspecciones', href: '/crud/inspecciones/' },
      { label: 'Inspección' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="inspeccion && soloConsulta('inspecciones')" objeto="esta inspección" acciones="editarla o reabrirla" />
    </template>
    <template #badges>
      <EstadoInspeccionBadge
        v-if="inspeccion"
        :estado="inspeccion.estado"
        :estado-display="inspeccion.estado_display"
        size="md"
      />
      <!-- Marca de etapa: distingue esta pantalla de la recepción, que se ve parecida. -->
      <span
        class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/30 dark:text-brand-200 dark:ring-brand-500/50"
        title="La inspección es la etapa de diagnóstico, posterior a la recepción del vehículo">
        <Stethoscope class="w-3.5 h-3.5" />
        Etapa de diagnóstico
      </span>
    </template>

    <template #actions>
      <button
        v-if="puedeReabrir && puedeCotizar"
        type="button"
        :disabled="isSyncingCotizacion"
        :title="puedeActualizarCotizacion ? 'Actualizar la cotización existente con los cambios de la inspección' : 'Generar una cotización desde este diagnóstico'"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="solicitarCrearCotizacion">
        <Loader2 v-if="isSyncingCotizacion" class="w-4 h-4 animate-spin" aria-hidden="true" />
        <Receipt v-else class="w-5 h-5 -ms-1" aria-hidden="true" />
        {{ isSyncingCotizacion ? 'Sincronizando...' : textoAccionCotizacion }}
      </button>
      <button
        v-if="puedeReabrir && puedeModificar"
        type="button"
        :disabled="isReopening"
        title="Reabrir la inspección para editarla"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
        @click="solicitarReabrir">
        <IconLockOpen2 class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Reabrir
      </button>
      <button
        v-if="inspeccion && !estaFinalizada && puedeModificar"
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="irAEditar">
        <FilePen class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Editar
      </button>
      <PdfExportButton
        v-if="inspeccion"
        :descargador="descargarPdf"
        title="Exportar inspección en PDF"
        @error="mostrarError"
      />
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-6">
    <div class="space-y-4">
      <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''" />
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="!loading && inspeccion && motivoNoReabrir && puedeModificar" type="info" title="Solo lectura" :message="motivoNoReabrir" />
    </div>

    <div v-if="loading" :class="[SECCION, 'mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
      <Loader2 class="w-4 h-4 animate-spin" />
      Cargando inspección...
    </div>

    <div v-else-if="!inspeccion" :class="[SECCION, 'mt-4 text-center text-sm text-gray-500 dark:text-gray-400']">
      Inspección no encontrada.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-4">
      <div class="space-y-4 lg:col-span-3">
        <!-- Vehículo en diagnóstico -->
        <section :class="SECCION">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 :class="TITULO_SECCION">
              <ScanSearch class="w-4 h-4" />
              Vehículo en diagnóstico
            </h4>
            <a
              v-if="recepcionHref"
              :href="recepcionHref"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-accent-500 dark:hover:text-accent-400 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              title="Abrir la recepción de la que viene esta inspección">
              <ClipboardList class="w-3.5 h-3.5" />
              Viene de la recepción
              <span class="font-mono font-semibold">{{ recepcion.numero_recepcion }}</span>
            </a>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div class="min-w-0">
              <p :class="ETIQUETA">Cliente</p>
              <a v-if="clienteUrl" :href="clienteUrl" :class="[VALOR, ENLACE, 'block truncate text-base']" :title="clienteInfo?.nombre">{{ clienteInfo?.nombre }}</a>
              <p v-else :class="[VALOR, 'truncate text-base']">{{ clienteInfo?.nombre || '—' }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.identificacion || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.telefono || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" />
                  <dt>Correo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.email || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
              <p :class="ETIQUETA">Vehículo</p>
              <a v-if="vehiculoUrl" :href="vehiculoUrl" :class="[VALOR, ENLACE, 'block font-mono text-base tracking-widest']">{{ placaDisplay }}</a>
              <p v-else :class="[VALOR, 'font-mono text-base tracking-widest']">{{ placaDisplay || '—' }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TagIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Marca:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.marca || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  <dt>Modelo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.modelo || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  <dt>Color:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.color || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
              <p :class="ETIQUETA">Responsable</p>
              <p :class="[VALOR, 'truncate text-base']">{{ responsableNombre }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ responsableIdentificacion }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ responsableTelefono }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
                  <dt>Rol:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ responsableRol }}</dd>
                </div>
                <div v-if="tallerNombre" class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Store class="w-3.5 h-3.5 shrink-0" />
                  <dt>Taller:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ tallerNombre }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <!-- Pasos (pestañas) -->
          <nav aria-label="Secciones de la inspección" class="border-b border-gray-200 dark:border-gray-700">
            <ol class="grid grid-cols-4" role="tablist">
              <li v-for="(paso, index) in PASOS" :key="paso.key">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === paso.key"
                  class="flex w-full h-full flex-col items-center gap-1.5 px-2 py-3 -mb-px text-center border-b-2 transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
                  :class="activeTab === paso.key
                    ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'"
                  @click="activeTab = paso.key"
                >
                  <span class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-sm font-semibold" :class="pasoCirculoClass(paso.key)">
                    <component :is="paso.icon" class="w-4 h-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-xs font-semibold sm:text-sm" :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'">
                      {{ index + 1 }}. {{ paso.label }}
                    </span>
                    <span class="hidden text-xs truncate text-gray-500 sm:block dark:text-gray-400">{{ resumenPaso[paso.key] }}</span>
                  </span>
                </button>
              </li>
            </ol>
          </nav>

          <div class="p-4 sm:p-5 bg-gray-50/60 dark:bg-gray-900/30">
            <!-- 1. Diagnóstico -->
            <div v-show="activeTab === 'informacion'" class="space-y-4">
              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <CalendarClock class="w-4 h-4" />
                  Datos de la inspección
                </h4>
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <dt :class="ETIQUETA">Tipo de inspección</dt>
                    <dd class="mt-1"><TipoTrabajoBadge :tipo="inspeccion.tipo_inspeccion" size="md" /></dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Inicio</dt>
                    <dd :class="[VALOR, 'tabular-nums']">{{ fechaInspeccionDisplay || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Cierre</dt>
                    <dd :class="[VALOR, 'tabular-nums']">
                      <template v-if="fechaFinalizacionDisplay">{{ fechaFinalizacionDisplay }}</template>
                      <span v-else class="font-normal text-gray-400 dark:text-gray-500">En curso</span>
                    </dd>
                    <dd v-if="duracionInspeccionDisplay" class="text-xs text-gray-500 dark:text-gray-400">Duración: {{ duracionInspeccionDisplay }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Kilometraje</dt>
                    <dd class="mt-0.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                      <template v-if="kilometraje">{{ kilometraje.valor }} <span class="text-sm font-medium text-gray-500 dark:text-gray-400">km</span></template>
                      <span v-else class="text-sm font-normal text-gray-400 dark:text-gray-500">Sin registro</span>
                    </dd>
                    <dd v-if="kilometraje?.referencia" class="text-xs text-gray-500 dark:text-gray-400">Odómetro actual del vehículo</dd>
                  </div>
                </dl>
              </section>

              <section :class="SECCION">
                <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <h4 :class="[TITULO_SECCION, 'mb-3']">
                      <Wrench class="w-4 h-4" />
                      Motivo
                    </h4>
                    <p v-if="inspeccion.motivo_ingreso" :class="[BLOQUE_TEXTO, 'border-brand-500 bg-brand-50/60 dark:bg-gray-700/50 dark:border-brand-300']">{{ inspeccion.motivo_ingreso }}</p>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin motivo registrado.</p>
                  </div>
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <h4 :class="TITULO_SECCION">
                        <ScanSearch class="w-4 h-4" />
                        Códigos de falla (DTC)
                      </h4>
                      <span :class="[CONTADOR, dtcLista.length ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : CONTADOR_NEUTRO]">
                        {{ dtcLista.length || 'Sin' }} código{{ dtcLista.length === 1 ? '' : 's' }}
                      </span>
                    </div>
                    <div v-if="dtcLista.length" class="flex flex-wrap gap-1.5" aria-label="Códigos leídos">
                      <span
                        v-for="codigo in dtcLista"
                        :key="codigo"
                        class="px-2 py-0.5 font-mono text-sm font-semibold rounded bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/60">
                        {{ codigo }}
                      </span>
                    </div>
                    <p v-else class="text-sm text-gray-500 dark:text-gray-400">El escáner no reportó fallas.</p>
                  </div>
                </div>
              </section>

              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <Stethoscope class="w-4 h-4" />
                  Diagnóstico técnico
                </h4>
                <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Diagnóstico</p>
                    <p v-if="inspeccion.diagnostico_tecnico" :class="[BLOQUE_TEXTO, 'border-brand-500 bg-brand-50/60 dark:bg-gray-700/50 dark:border-brand-300']">{{ inspeccion.diagnostico_tecnico }}</p>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin diagnóstico registrado.</p>
                  </div>
                  <div>
                    <p class="flex items-center gap-1.5 mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      <Lightbulb class="w-4 h-4 text-amber-500" />
                      Recomendaciones
                    </p>
                    <p v-if="inspeccion.recomendaciones" :class="[BLOQUE_TEXTO, 'border-amber-400 bg-amber-50/70 dark:bg-amber-900/20 dark:border-amber-500']">{{ inspeccion.recomendaciones }}</p>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin recomendaciones registradas.</p>
                  </div>
                </div>
              </section>
            </div>

            <!-- 2. Testigos -->
            <section v-show="activeTab === 'testigos'" :class="SECCION">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h4 :class="TITULO_SECCION">
                  <TriangleAlert class="w-4 h-4" />
                  Testigos del tablero
                </h4>
                <span :class="[CONTADOR, testigosActivos.length ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : CONTADOR_NEUTRO]">
                  {{ testigosActivos.length ? plural(testigosActivos.length, 'encendido', 'encendidos') : 'Ninguno encendido' }}
                </span>
              </div>
              <div class="grid grid-cols-5 gap-2 lg:grid-cols-10 lg:gap-3">
                <div v-for="testigo in TESTIGOS" :key="testigo.key" :class="testigoCardClass(testigo)" :title="testigo.label">
                  <MdiIcon :path="testigo.path" :class="testigoIconClass(testigo)" />
                  <span class="mt-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300">{{ testigo.label }}</span>
                </div>
              </div>
              <p v-if="inspeccion.otros_testigos_observaciones" class="mt-4 text-sm text-gray-700 dark:text-gray-300">
                <span class="font-medium text-gray-900 dark:text-white">Observaciones:</span>
                {{ inspeccion.otros_testigos_observaciones }}
              </p>
            </section>

            <!-- 3. Evidencia -->
            <section v-show="activeTab === 'fotos'" :class="SECCION">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h4 :class="TITULO_SECCION">
                  <Camera class="w-4 h-4" />
                  Evidencia del diagnóstico
                </h4>
                <span :class="[CONTADOR, CONTADOR_NEUTRO]">{{ plural(fotos.length, 'foto', 'fotos') }}</span>
              </div>
              <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Fotos de los hallazgos. Toca una para ampliarla.</p>
              <div
                v-if="!fotos.length"
                class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-600"
              >
                <Camera class="w-7 h-7 text-gray-400" />
                <p class="text-sm font-medium text-gray-900 dark:text-white">Sin fotos de evidencia</p>
                <p class="max-w-xs text-xs text-gray-500 dark:text-gray-400">Las fotos del diagnóstico son opcionales.</p>
              </div>
              <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <figure v-for="(foto, index) in fotos" :key="foto.id || foto.url || index">
                  <button
                    type="button"
                    :title="foto.descripcion || `Ampliar foto ${index + 1}`"
                    class="group relative block w-full overflow-hidden rounded-lg aspect-square bg-gray-100 cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-brand-200 dark:bg-gray-700 dark:focus:ring-brand-700"
                    @click="abrirFoto(foto.url || foto.imagen)"
                  >
                    <img :src="foto.miniatura || foto.url || foto.imagen" :alt="foto.descripcion || `Foto ${index + 1}`" loading="lazy" class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    <span class="absolute inset-0 flex items-center justify-center bg-brand-900/0 transition-colors group-hover:bg-brand-900/40">
                      <ZoomIn class="w-6 h-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </button>
                  <figcaption class="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">{{ foto.descripcion || `Foto ${index + 1}` }}</figcaption>
                </figure>
              </div>
            </section>

            <!-- 4. Plan de trabajo -->
            <div v-show="activeTab === 'servicios'" class="space-y-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Lo que el técnico propone hacer. Se copia a la cotización; lo marcado como opcional el cliente puede postergarlo.
              </p>
              <section v-for="grupo in GRUPOS_PLAN" :key="grupo.key" :class="SECCION">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <h4 :class="TITULO_SECCION">
                    <component :is="grupo.icon" class="w-4 h-4" />
                    {{ grupo.titulo }}
                    <span class="px-1.5 text-xs font-medium normal-case tracking-normal rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums">{{ grupo.filas.length }}</span>
                  </h4>
                  <span v-if="grupo.key === 'svc' && totalHoras" class="text-xs text-gray-500 dark:text-gray-400">
                    Total estimado: <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ formatNumber(totalHoras) }} h</span>
                  </span>
                </div>
                <div class="relative overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                      <tr>
                        <th scope="col" class="px-4 py-2.5 font-medium">{{ grupo.singular }}</th>
                        <th scope="col" class="w-24 px-4 py-2.5 font-medium text-right">{{ grupo.columna }}</th>
                        <th scope="col" class="w-28 px-4 py-2.5 font-medium">Prioridad</th>
                        <th scope="col" class="w-24 px-4 py-2.5 font-medium text-center">Opcional</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr v-if="!grupo.filas.length">
                        <td colspan="4" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{{ grupo.vacio }}</td>
                      </tr>
                      <tr v-for="(fila, index) in grupo.filas" :key="fila.id || index" class="bg-white dark:bg-gray-800">
                        <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ fila.descripcion || '—' }}</td>
                        <td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{{ grupo.valor(fila) }}</td>
                        <td class="px-4 py-3">
                          <span v-if="fila.prioridad" :class="[CONTADOR, PRIORIDAD_BADGE[fila.prioridad] || CONTADOR_NEUTRO]">
                            {{ PRIORIDADES[fila.prioridad] || fila.prioridad }}
                          </span>
                          <span v-else class="text-gray-400">—</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span
                            class="inline-flex items-center justify-center w-5 h-5 rounded"
                            :class="fila.es_sugerido ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'"
                            :title="fila.es_sugerido ? 'Opcional' : 'Necesario'"
                          >
                            <component :is="fila.es_sugerido ? Check : Minus" class="w-3 h-3" />
                          </span>
                          <span class="sr-only">{{ fila.es_sugerido ? 'Opcional' : 'Necesario' }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          <!-- Navegación entre secciones -->
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 sm:px-5 dark:border-gray-700">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              :class="activeTabIndex <= 0 ? 'invisible' : ''"
              @click="goToTab(-1)">
              <ArrowLeft class="w-4 h-4" />
              {{ PASOS[activeTabIndex - 1]?.label || 'Anterior' }}
            </button>
            <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Sección {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
              :class="activeTabIndex >= PASOS.length - 1 ? 'invisible' : ''"
              @click="goToTab(1)">
              {{ PASOS[activeTabIndex + 1]?.label || 'Siguiente' }}
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:col-span-1">
        <!-- Registrado -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <ListChecks class="w-4 h-4" />
            Registrado
          </h4>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="h in hallazgos"
              :key="h.key"
              type="button"
              class="flex flex-col items-start px-3 py-2 text-left border rounded-lg transition-colors"
              :class="activeTab === h.paso
                ? 'border-brand-500 bg-brand-50 dark:border-brand-300 dark:bg-brand-700/30'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'"
              @click="activeTab = h.paso">
              <span class="text-lg font-semibold leading-tight tabular-nums" :class="h.valor ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ h.valor }}</span>
              <span class="max-w-full text-xs truncate text-gray-500 dark:text-gray-400">{{ h.label }}</span>
            </button>
          </div>
        </section>

        <!-- Vehículo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <Car class="w-4 h-4" />
            Vehículo
          </h4>
          <button
            v-if="vehiculoImagenSrc"
            type="button"
            title="Ampliar foto del vehículo"
            class="block w-full h-36 mb-3 overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in dark:bg-gray-700"
            @click="abrirFoto(vehiculoImagenSrc)"
          >
            <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
          </button>
          <div
            v-else
            class="flex flex-col items-center justify-center gap-1.5 h-24 mb-3 text-xs text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg dark:bg-gray-700/40 dark:border-gray-600"
          >
            <Camera class="w-5 h-5" />
            Sin foto del vehículo
          </div>
          <p class="mb-3 font-mono text-base font-semibold tracking-widest text-gray-900 dark:text-white">{{ placaDisplay || '—' }}</p>
          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconEngine class="w-4 h-4 shrink-0" stroke-width="1.8" />
                N° motor
              </dt>
              <dd class="font-medium truncate text-gray-900 dark:text-white">{{ vehiculoInfo?.numero_motor || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <component :is="transmisionIcon" class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Transmisión
              </dt>
              <dd class="font-medium text-right text-gray-900 dark:text-white">{{ transmisionLabel || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconGasStation class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Combustible
              </dt>
              <dd class="font-medium truncate text-gray-900 dark:text-white">{{ combustibleLabel || '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- Historial (timeline de Flowbite) -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-4']">
            <History class="w-4 h-4" />
            Historial
          </h4>
          <ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
            <li v-for="evento in historial" :key="evento.key" class="mb-5 ms-5 last:mb-0">
              <span
                class="absolute -start-1.5 mt-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-800"
                :class="evento.key === 'fin' ? 'bg-green-600' : evento.key === 'curso' ? 'bg-amber-500' : 'bg-brand-900 dark:bg-brand-300'"
              ></span>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ evento.titulo }}</p>
              <time v-if="evento.fecha" class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatDateTime(evento.fecha) }}</time>
              <p v-if="evento.detalle" class="text-xs text-gray-500 dark:text-gray-400">{{ evento.detalle }}</p>
            </li>
          </ol>
        </section>

        <!-- Relaciones del flujo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-1']">
            <Workflow class="w-4 h-4" />
            Relaciones del flujo
          </h4>
          <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">Recepción de origen, cotización y orden de trabajo.</p>
          <RelacionesFlujo :pasos="relacionesInspeccion" />
        </section>
      </aside>
    </div>
  </div>

  <!-- Foto ampliada -->
  <div v-if="showImageModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" @click="cerrarFoto">
    <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800" @click.stop>
      <button
        type="button"
        aria-label="Cerrar"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        @click="cerrarFoto">
        <X class="w-5 h-5" />
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Imagen ampliada" />
    </div>
  </div>

  <ConfirmModal
    v-model="showReabrirModal"
    title="Reabrir inspección"
    message="Podrás reabrirla mientras no tenga una cotización enviada o aceptada ni una orden de trabajo. ¿Deseas continuar?"
    :icon="IconLockOpen2"
    icon-class="text-brand-700 dark:text-brand-200"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    variant="primary"
    :is-deleting="isReopening"
    @confirm="confirmarReabrir"
  />

  <ConfirmModal
    v-model="showGenerarCotizacionModal"
    :title="textoAccionCotizacion"
    :message="textoConfirmacionCotizacion"
    :icon="Receipt"
    icon-class="text-brand-700 dark:text-brand-200"
    :confirm-text="textoAccionCotizacion"
    confirming-text="Procesando..."
    variant="primary"
    :is-deleting="isGeneratingCotizacion"
    @confirm="crearCotizacion"
  />
  </template>
</template>
