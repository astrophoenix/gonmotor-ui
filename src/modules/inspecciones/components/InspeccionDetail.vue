<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Car, Camera, CheckCircle2, ClipboardList, Clock, FolderInput, ShieldCheck, FileText, IdCardIcon, Image as ImageIcon, Mail, PaintBucket, Phone, Shapes, SquarePen, TagIcon, TriangleAlert, WrenchIcon, Workflow, X, Toolbox } from 'lucide-vue-next';
import { IconAutomaticGearbox, IconEngine, IconFileInvoice, IconGasStation, IconLockOpen2, IconManualGearbox } from '@tabler/icons-vue';
import { API_BASE_URL } from '../../../shared/config/env';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeInspeccion } from '../../../shared/utils/relacionesFlujo';
import { formatDateTime, formatDuration, minutesBetween } from '../../../shared/utils/datetime';
import EstadoInspeccionBadge from './EstadoInspeccionBadge.vue';

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

const params = new URLSearchParams(window.location.search);
const inspeccionId = Number(params.get('id'));

const activeTab = ref('informacion');
const TAB_ORDER = ['informacion', 'testigos', 'evidencias', 'servicios'];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    activeTab.value = TAB_ORDER[next];
  }
}

const PRIORIDADES = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

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

const responsableNombre = computed(() => inspeccion.value?.responsable_nombre || '—');
const responsableIdentificacion = computed(() => inspeccion.value?.responsable_identificacion || '—');
const responsableTelefono = computed(() => inspeccion.value?.responsable_telefono || '—');
const responsableRol = computed(
  () => inspeccion.value?.responsable_rol_display || inspeccion.value?.responsable_rol || '—'
);

const fechaInspeccionDisplay = computed(() => (
  formatDateTime(inspeccion.value?.fecha_inspeccion || inspeccion.value?.created_at)
));

const fechaFinalizacionDisplay = computed(() => (
  inspeccion.value?.fecha_finalizacion ? formatDateTime(inspeccion.value.fecha_finalizacion) : ''
));

const duracionInspeccionDisplay = computed(() => {
  const minutos = inspeccion.value?.duracion_inspeccion_minutos
    ?? minutesBetween(inspeccion.value?.fecha_inspeccion, inspeccion.value?.fecha_finalizacion);
  if (minutos == null) return '';
  return formatDuration(minutos);
});

const transmisionLabel = computed(() => {
  const map = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };
  const value = vehiculoInfo.value?.transmision || '';
  return map[value] || value || '';
});

const transmisionIcon = computed(() => {
  const type = vehiculoInfo.value?.transmision || '';
  if (type === 'M') return IconManualGearbox;
  return IconAutomaticGearbox;
});

const combustibleLabel = computed(() => {
  const map = {
    GAS: 'Gasolina',
    DIE: 'Diésel',
    HIB: 'Híbrido',
    ELE: 'Eléctrico',
    GNV: 'Gas Natural Vehicular (GNV)',
  };
  const value = vehiculoInfo.value?.combustible || '';
  return map[value] || value || '';
});

function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() => resolveMediaUrl(vehiculoInfo.value?.imagen));

const testigosMeta = TESTIGOS;

function testigoActivo(testigo) {
  return Boolean(inspeccion.value?.[testigo.key]);
}

function getTestigoCardClasses(testigo) {
  const base = 'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 opacity-70`;
  if (testigo.color === 'red') return `${base} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500`;
  if (testigo.color === 'green') return `${base} bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-500`;
  return `${base} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500`;
}

function getTestigoIconClasses(testigo) {
  const base = 'w-8 h-8 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${base} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
  if (testigo.color === 'green') return `${base} text-green-500 dark:text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`;
  return `${base} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

const tieneOrdenTrabajo = computed(() => Boolean(inspeccion.value?.tiene_orden_trabajo));
const tieneCotizacionActiva = computed(() => Boolean(inspeccion.value?.tiene_cotizacion_activa));
const estaFinalizada = computed(() => inspeccion.value?.estado === 'FINALIZADA');
const tieneItemsInspeccion = computed(() => (
  (inspeccion.value?.servicios_detectados?.length || 0)
  + (inspeccion.value?.repuestos_sugeridos?.length || 0)
) > 0);
const MENSAJE_SIN_ITEMS = 'La inspección no tiene servicios ni repuestos. Reábrela y agrega al menos un ítem antes de generar la cotización.';

// Solo un mensaje visible a la vez: al mostrar uno se limpia el otro.
function mostrarError(mensaje) {
  successMessage.value = '';
  error.value = mensaje;
}

function mostrarExito(mensaje) {
  error.value = '';
  successMessage.value = mensaje;
}

function limpiarMensajes() {
  error.value = '';
  successMessage.value = '';
}

function avisarSinItems() {
  mostrarError(MENSAJE_SIN_ITEMS);
  scrollAlInicio();
}

function scrollAlInicio() {
  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// Chips de recepción, cotización y orden vinculadas a esta inspección.
const relacionesInspeccion = computed(() => relacionesDeInspeccion(inspeccion.value));

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

function formatoHoras(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 })} h`;
}

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

const isSyncingCotizacion = ref(false);

// --- Decisión de cotización: el cliente puede tener cotizaciones aceptadas
// antes de esta visita, así que nunca se crea una nueva sin avisar. ---
const candidatas = ref({ aprobadas: [], enCurso: [], historicas: [] });
const candidatasCargando = ref(false);
const showDecisionModal = ref(false);
const showComparacion = ref(false);
const selectedCotizaciones = ref([]);
const vinculandoCotizaciones = ref(false);

const cotizacionesAceptadas = computed(() => candidatas.value.aprobadas || []);
const hayAceptadas = computed(() => cotizacionesAceptadas.value.length > 0);
const totalAceptadas = computed(() => cotizacionesAceptadas.value.reduce(
  (accumulado, c) => accumulado + Number(c.total || 0), 0,
));

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function formatShortDate(value) {
  if (!value) return '—';
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function cargarCandidatas() {
  if (!inspeccionId) return;
  candidatasCargando.value = true;
  try {
    const respuesta = await request(
      `/api/ordenes/inspecciones/${encodeURIComponent(inspeccionId)}/cotizaciones-candidatas/`
    );
    candidatas.value = {
      aprobadas: respuesta.aprobadas || [],
      enCurso: respuesta.enCurso || [],
      historicas: respuesta.historicas || [],
    };
  } catch (candidatasError) {
    // No bloquea el flujo: si no se pueden listar, se sigue el camino previo.
    console.warn('No se pudieron cargar las cotizaciones del vehículo', candidatasError);
  } finally {
    candidatasCargando.value = false;
  }
}

function alternarCotizacion(id) {
  selectedCotizaciones.value = selectedCotizaciones.value.includes(id)
    ? selectedCotizaciones.value.filter((otro) => otro !== id)
    : [...selectedCotizaciones.value, id];
}

const todasSeleccionadas = computed(
  () => hayAceptadas.value && selectedCotizaciones.value.length === cotizacionesAceptadas.value.length,
);

function alternarTodas() {
  selectedCotizaciones.value = todasSeleccionadas.value ? [] : cotizacionesAceptadas.value.map((c) => c.id);
}

/** Normaliza el texto para comparar un ítem de la inspección con el de la cotización. */
function claveItem(tipo, item) {
  const codigo = (item.codigo || item.codigo_repuesto || '').trim().toUpperCase();
  if (codigo) return `${tipo}:${codigo}`;
  const descripcion = (item.descripcion || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${tipo}:${descripcion}`;
}

const coberturaItems = computed(() => {
  const cotizadas = new Map();
  cotizacionesAceptadas.value.forEach((cotizacion) => {
    [...(cotizacion.servicios || []), ...(cotizacion.repuestos || [])].forEach((item) => {
      const clave = claveItem((item.cantidad && !item.horas) ? 'REP' : 'SRV', item);
      const existente = cotizadas.get(clave);
      cotizadas.set(clave, {
        cotizacion: existente?.cotizacion || cotizacion.numero,
        veces: (existente?.veces || 0) + 1,
      });
    });
  });

  const filas = [];
  const registrar = (tipo, item, descripcion, cantidad) => {
    const clave = claveItem(tipo, item);
    const coincidencia = cotizadas.get(clave);
    filas.push({
      tipo,
      descripcion,
      cantidad,
      cubierta: Boolean(coincidencia),
      cotizacion: coincidencia?.cotizacion || '',
    });
  };

  (inspeccion.value?.servicios_detectados || []).forEach((s) => {
    registrar('SRV', s, s.descripcion, formatoHoras(s.horas_estimadas));
  });
  (inspeccion.value?.repuestos_sugeridos || []).forEach((r) => {
    registrar('REP', r, r.descripcion, `x${r.cantidad ?? 1}`);
  });
  return filas;
});

const resumenCobertura = computed(() => {
  const total = coberturaItems.value.length;
  const cubiertas = coberturaItems.value.filter((f) => f.cubierta).length;
  return { total, cubiertas, nuevas: total - cubiertas };
});

function abrirDecisionModal() {
  showComparacion.value = false;
  selectedCotizaciones.value = cotizacionesAceptadas.value.map((c) => c.id);
  showDecisionModal.value = true;
}

function cerrarDecisionModal() {
  showDecisionModal.value = false;
  showComparacion.value = false;
}

function irACotizacion(cotizacionId) {
  if (!cotizacionId) return;
  window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(cotizacionId)}`);
}

function crearComplementaria() {
  if (!tieneItemsInspeccion.value) {
    avisarSinItems();
    return;
  }
  const ids = selectedCotizaciones.value.join(',');
  const query = new URLSearchParams({ inspeccion: String(inspeccionId) });
  if (ids) query.set('complementa', ids);
  window.location.assign(`/crud/cotizaciones/nuevo/?${query.toString()}`);
}

function crearNuevaCotizacion() {
  if (!tieneItemsInspeccion.value) {
    cerrarDecisionModal();
    avisarSinItems();
    return;
  }
  window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(inspeccionId)}`);
}

async function usarCotizacionesAceptadas() {
  if (vinculandoCotizaciones.value) return;
  if (selectedCotizaciones.value.length === 0) {
    mostrarError('Selecciona al menos una cotización aprobada.');
    return;
  }
  vinculandoCotizaciones.value = true;
  limpiarMensajes();
  try {
    await request(
      `/api/ordenes/inspecciones/${encodeURIComponent(inspeccionId)}/cotizaciones-candidatas/`,
      {
        method: 'POST',
        body: JSON.stringify({ cotizaciones: selectedCotizaciones.value, accion: 'vincular' }),
      }
    );
    await Promise.all([cargarInspeccion(), cargarCandidatas()]);
    cerrarDecisionModal();
    const numero = cotizacionesAceptadas.value[0]?.numero || 'la cotización';
    mostrarExito(`${numero} quedó vinculada a esta inspección. Ya puedes generar la orden de trabajo desde la cotización.`);
    scrollAlInicio();
  } catch (vinculoError) {
    mostrarError(vinculoError.message || 'No se pudieron vincular las cotizaciones aprobadas.');
    scrollAlInicio();
  } finally {
    vinculandoCotizaciones.value = false;
  }
}

function solicitarCrearCotizacion() {
  if (isSyncingCotizacion.value || isGeneratingCotizacion.value) return;
  if (hayAceptadas.value) {
    abrirDecisionModal();
    return;
  }
  if (!tieneItemsInspeccion.value) {
    avisarSinItems();
    return;
  }
  showGenerarCotizacionModal.value = true;
}

const textoConfirmacionCotizacion = computed(() => (
  tieneCotizacionActiva.value
    ? 'Se actualizará la cotización con los detalles actuales de servicios y repuestos necesarios para realizar la orden de trabajo.'
    : 'Se creará una cotización con los detalles de servicios y repuestos necesarios para realizar la orden de trabajo.'
));

const tituloConfirmacionCotizacion = computed(() => (
  tieneCotizacionActiva.value ? 'Actualizar cotización' : 'Generar cotización'
));

const textoConfirmarCotizacion = computed(() => (
  tieneCotizacionActiva.value ? 'Actualizar cotización' : 'Generar cotización'
));

async function crearCotizacion() {
  if (isSyncingCotizacion.value || isGeneratingCotizacion.value) return;
  if (!tieneItemsInspeccion.value) {
    showGenerarCotizacionModal.value = false;
    avisarSinItems();
    return;
  }
  isGeneratingCotizacion.value = true;
  const cotizacionId = inspeccion.value?.cotizacion_activa_id;
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
  showReabrirModal.value = true;
}

async function confirmarReabrir() {
  if (isReopening.value) return;
  isReopening.value = true;
  try {
    const actualizada = await inspeccionesService.update(inspeccionId, { estado: 'EN_PROCESO' });
    if (inspeccion.value) {
      // Al reabrir se limpia la fecha de cierre y la duración.
      inspeccion.value = {
        ...inspeccion.value,
        estado: 'EN_PROCESO',
        estado_display: 'En proceso',
        fecha_finalizacion: actualizada?.fecha_finalizacion ?? null,
        duracion_inspeccion_minutos: actualizada?.duracion_inspeccion_minutos ?? null,
      };
    }
    showReabrirModal.value = false;
    mostrarExito('Inspección reabierta. Ahora está en proceso.');
    scrollAlInicio();
  } catch (fetchError) {
    mostrarError(fetchError.message || 'No se pudo reabrir la inspección.');
  } finally {
    isReopening.value = false;
  }
}

const numeroInspeccion = computed(
  () => inspeccion.value?.numero_inspeccion || `#${inspeccion.value?.id}`
);

// El modal se cierra solo con la X o Cancelar, así que el fondo queda bloqueado.
watch(showDecisionModal, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : '';
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});

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
    await cargarCandidatas();
  } catch (fetchError) {
    mostrarError(fetchError.message || 'No se pudo cargar la inspección.');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
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
    <template #badges>
      <EstadoInspeccionBadge
        v-if="inspeccion"
        :estado="inspeccion.estado"
        :estado-display="inspeccion.estado_display"
        size="md"
      />
    </template>

    <template #actions>
      <a
        v-if="inspeccion && !estaFinalizada"
        :href="`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800">
        <FilePen class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
        Editar
      </a>
      <button
        v-if="estaFinalizada"
        type="button"
        :disabled="isReopening"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="solicitarReabrir">
        <IconLockOpen2 class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
        Reabrir Inspección
      </button>
      <button
        v-if="estaFinalizada"
        type="button"
        :disabled="isSyncingCotizacion"
        :title="tieneCotizacionActiva ? 'Actualizar la cotización existente para reflejar los cambios de la inspección.' : 'Generar una cotización desde este diagnóstico'"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="solicitarCrearCotizacion">
        <IconFileInvoice class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
        {{ isSyncingCotizacion ? 'Sincronizando...' : (tieneCotizacionActiva ? 'Actualizar Cotización' : 'Crear Cotización') }}
      </button>
    </template>
  </EntityHeader>

  <div class="p-4">
    <div class="relative mx-auto max-w-8xl">
      <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''"/>
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''"/>

      <div v-if="hayAceptadas && !loading" class="mb-4 p-4 border border-primary-blue-300 rounded-lg bg-primary-blue-50 dark:border-primary-blue-700 dark:bg-primary-blue-900/30">
        <div class="flex items-start gap-3">
          <IconFileInvoice class="w-5 h-5 mt-0.5 text-primary-blue-600 dark:text-primary-blue-400" />
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-primary-blue-900 dark:text-primary-blue-200">
              Este vehículo tiene {{ cotizacionesAceptadas.length }}
              {{ cotizacionesAceptadas.length === 1 ? 'cotización aceptada' : 'cotizaciones aceptadas' }}
            </h4>
            <ul class="mt-2 space-y-1 text-sm text-primary-blue-800 dark:text-primary-blue-300">
              <li v-for="cotizacion in cotizacionesAceptadas" :key="cotizacion.id" class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="font-medium underline underline-offset-2 hover:text-primary-blue-900 dark:hover:text-primary-blue-100"
                  @click="irACotizacion(cotizacion.id)">
                  {{ cotizacion.numero }}
                </button>
                <span>{{ formatMoney(cotizacion.total) }}</span>
                <span class="text-sm text-primary-blue-700 dark:text-primary-blue-400">
                  aceptada el {{ formatShortDate(cotizacion.fechaAceptacion) }}
                  <template v-if="cotizacion.vinculada"> · ya vinculada a esta visita</template>
                </span>
              </li>
            </ul>
            <p v-if="candidatasCargando" class="mt-2 text-xs text-primary-blue-700 dark:text-primary-blue-400">Verificando cotizaciones del vehículo...</p>
            <button
              v-else-if="!tieneCotizacionActiva"
              type="button"
              class="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-600 hover:bg-primary-blue-700 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-700 dark:hover:bg-primary-blue-800"
              @click="abrirDecisionModal"
            >
              <IconFileInvoice class="w-4 h-4" />
              Resolver cotización
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Cargando inspección...
      </div>

      <div v-else-if="!inspeccion" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Inspección no encontrada.
      </div>

      <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div class="lg:col-span-3 p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
          <div class="mb-4 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-4">
              <FileText class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Información General</h3>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr_1fr]">
              <div class="min-w-0">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Cliente
                </p>
                <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {{ clienteInfo?.nombre || '—' }}
                </p>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.identificacion || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.telefono || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.email || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="relative min-w-0">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Vehículo
                </p>
                <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {{ placaDisplay || '—' }}
                </p>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <TagIcon class="w-3.5 h-3.5 shrink-0" /> Marca:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.marca || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.modelo || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.color || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="min-w-0">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Inspector
                </p>
                <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {{ responsableNombre }}
                </p>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ responsableIdentificacion }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ responsableTelefono }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <ShieldCheck class="w-3.5 h-3.5 shrink-0" /> Rol:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ responsableRol }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!--div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-200 px-4 py-3 text-xs dark:border-gray-700">
              <div class="flex items-center gap-2">
                <Clock class="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-500 dark:text-gray-400">Inspección:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ fechaInspeccionDisplay }}</span>
              </div>
              <div v-if="fechaFinalizacionDisplay" class="flex items-center gap-2">
                <CheckCircle2 class="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-500 dark:text-gray-400">Finalizada:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ fechaFinalizacionDisplay }}</span>
              </div>
              <div v-else class="flex items-center gap-2">
                <Clock class="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-500 dark:text-gray-400">Finalizada:</span>
                <span class="font-semibold text-gray-500 dark:text-gray-400">En curso</span>
              </div>
              <div v-if="duracionInspeccionDisplay" class="flex items-center gap-2">
                <WrenchIcon class="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-500 dark:text-gray-400">Duración:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ duracionInspeccionDisplay }}</span>
              </div>
            </div-->
          </div>
          <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex flex-wrap -mb-px">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'informacion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'informacion'">
                  <FileText class="w-4 h-4" />
                  1. Diagnóstico
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'testigos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'testigos'">
                  <TriangleAlert class="w-4 h-4" />
                  2. Testigos
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'evidencias' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'evidencias'">
                  <ImageIcon class="w-4 h-4" />
                  3. Evidencias
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'servicios' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'servicios'">
                  <Toolbox class="w-4 h-4" />
                  4. Servicios &amp; Repuestos
                </button>
              </nav>
            </div>

            <div v-show="activeTab === 'informacion'" class="p-4 space-y-6">
              <div>
                <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de inspección</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white"><TipoTrabajoBadge :tipo="inspeccion.tipo_inspeccion" size="md" /></dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de inspección</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ fechaInspeccionDisplay }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de finalización</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                      {{ fechaFinalizacionDisplay || 'En curso' }}
                      <span v-if="duracionInspeccionDisplay" class="text-gray-500 dark:text-gray-400">({{ duracionInspeccionDisplay }})</span>
                    </dd>
                  </div>
                  <!--div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cotización</dt>
                    <dd class="mt-0.5 text-sm font-semibold">
                      <a
                        v-if="tieneCotizacionActiva && inspeccion.cotizacion_activa_id"
                        :href="`/crud/cotizaciones/ver/?id=${encodeURIComponent(inspeccion.cotizacion_activa_id)}`"
                        class="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {{ inspeccion.numero_cotizacion || `#${inspeccion.cotizacion_activa_id}` }}
                      </a>
                      <span v-else>—</span>
                    </dd>
                  </div-->
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                      {{ inspeccion.kilometraje_diagnostico != null
                        ? `${formatNumber(inspeccion.kilometraje_diagnostico)} km`
                        : (vehiculoInfo?.kilometraje_actual != null
                            ? `${formatNumber(vehiculoInfo.kilometraje_actual)} km (actual del vehículo)`
                            : '—' ) }}
                    </dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-4">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Códigos de falla (DTC)</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.codigos_dtc || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-4">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Motivo de ingreso</dt>
                    <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.motivo_ingreso || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-4">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnóstico</dt>
                    <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.diagnostico_tecnico || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-4">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recomendaciones</dt>
                    <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.recomendaciones || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <!--hr class="border-gray-200 dark:border-gray-700" />

              <div v-if="recepcion || tieneOrdenTrabajo">
                <h4 class="mb-3 text-lg font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <FolderInput class="w-5 h-5 text-gray-800 dark:text-white" />
                    Flujo de atención
                  </span>
                </h4>
                <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div v-if="recepcion">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recepción asociada</dt>
                    <dd class="mt-0.5 text-sm font-semibold">
                      <a
                        :href="`/crud/recepciones/ver/?id=${recepcion.id}`"
                        class="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {{ recepcion.numero_recepcion || recepcion.id }}
                      </a>
                    </dd>
                  </div>
                  <div v-if="recepcion">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de ingreso</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(recepcion.fecha_ingreso || recepcion.created_at) }}</dd>
                  </div>
                  <div v-if="tieneOrdenTrabajo">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Orden de trabajo</dt>
                    <dd class="mt-0.5 text-sm font-semibold">
                      <a
                        v-if="inspeccion.orden_trabajo"
                        :href="`/crud/ordenes/ver/${inspeccion.orden_trabajo}/`"
                        class="text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {{ inspeccion.orden_trabajo_numero || inspeccion.orden_trabajo }}
                      </a>
                      <span v-else class="text-emerald-700 dark:text-emerald-400">{{ inspeccion.orden_trabajo_numero || '—' }}</span>
                    </dd>
                  </div>
                </dl>
              </div-->
            </div>

            <div v-show="activeTab === 'testigos'" class="p-4 space-y-6">
              <div>
                <div class="space-y-4">
                  <div class="grid grid-cols-5 lg:grid-cols-10 gap-2 lg:gap-3">
                    <div
                      v-for="testigo in testigosMeta"
                      :key="testigo.key"
                      :class="getTestigoCardClasses(testigo)"
                    >
                      <MdiIcon :path="testigo.path" :class="getTestigoIconClasses(testigo)" />
                      <span class="mt-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300">
                        {{ testigo.label }}
                      </span>
                    </div>
                  </div>
                  <div class="col-span-1">
                    <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Otros Testigos u Observaciones del Tablero</p>
                    <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
                      {{ inspeccion.otros_testigos_observaciones || '-' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'evidencias'" class="p-4 space-y-4">
              <div v-if="!inspeccion.fotos?.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                No se registraron fotos de evidencia.
              </div>
              <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div
                  v-for="(foto, index) in inspeccion.fotos"
                  :key="foto.id || foto.url || index"
                  class="border border-gray-200 rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                >
                  <div
                    class="relative flex aspect-square w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800"
                    @click="abrirFoto(foto.url || foto.imagen)"
                  >
                    <img
                      v-if="foto.url || foto.imagen"
                      :src="foto.url || foto.imagen"
                      :alt="`Foto ${index + 1}`"
                      class="h-full w-full object-cover"
                    />
                    <span v-else class="text-xs text-gray-500 dark:text-gray-400">Sin imagen</span>
                  </div>
                  <p v-if="foto.descripcion" class="mt-2 text-xs text-gray-600 dark:text-gray-300">{{ foto.descripcion }}</p>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'servicios'" class="p-4 space-y-8">
              <div>
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <Toolbox class="w-5 h-5 text-gray-800 dark:text-white" />
                    Servicios
                  </span>
                </h4>
                <div v-if="!inspeccion.servicios_detectados?.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No se registraron servicios detectados.
                </div>
                <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Servicio</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Horas</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Opcional</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-for="(s, index) in inspeccion.servicios_detectados" :key="s.id || index">
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ s.descripcion || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatoHoras(s.horas_estimadas) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ PRIORIDADES[s.prioridad] || s.prioridad || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ s.es_sugerido ? 'Sí' : 'No' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <WrenchIcon class="w-5 h-5 text-gray-800 dark:text-white" />
                    Repuestos
                  </span>
                </h4>
                <div v-if="!inspeccion.repuestos_sugeridos?.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No se registraron repuestos sugeridos.
                </div>
                <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Repuesto</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Cant.</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Opcional</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-for="(r, index) in inspeccion.repuestos_sugeridos" :key="r.id || index">
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ r.descripcion || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatNumber(r.cantidad) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ PRIORIDADES[r.prioridad] || r.prioridad || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ r.es_sugerido ? 'Sí' : 'No' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
          <div class="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="activeTabIndex <= 0"
              @click="goToTab(-1)"
            >
              <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
              </svg>
              Anterior
            </button>
            <button
              type="button"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="activeTabIndex >= TAB_ORDER.length - 1"
              @click="goToTab(1)"
            >
              Siguiente
              <svg class="w-6 h-6 text-gray-800 dark:text-white ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
              </svg>
            </button>
          </div>
        </div>
        <!--Columna derecha-->
        <div class="lg:col-span-1 space-y-4">
          <!-- Resumen de la inspección-->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-3">
              <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Resumen de la inspección</h2>
            </div>
            <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">N° Inspección</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ numeroInspeccion }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Cliente</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ clienteInfo?.nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Vehículo</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ placaDisplay || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Inspector</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ responsableNombre }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo</dt>
                <dd class="font-medium text-sm text-black dark:text-white"><TipoTrabajoBadge :tipo="inspeccion.tipo_inspeccion" size="sm" /></dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Estado</dt>
                <dd>
                  <EstadoInspeccionBadge :estado="inspeccion.estado" :estado-display="inspeccion.estado_display" size="sm" />
                </dd>
              </div>
            </dl>
          </div>
          <!-- Datos del Vehículo-->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-3">
              <Car class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Vehículo</h2>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-if="vehiculoImagenSrc"
                type="button"
                title="Ver foto del vehículo"
                class="h-full min-h-40 overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in dark:bg-gray-700"
                @click="abrirFoto(vehiculoImagenSrc)"
              >
                <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
              </button>
              <div v-else class="h-full min-h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 dark:bg-gray-700 dark:border-gray-600">
                <div class="flex flex-col items-center gap-1.5 text-center">
                  <Camera class="w-6 h-6" />
                  <span>Foto del vehículo</span>
                </div>
              </div>
              <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <IconEngine class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      N° Motor:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculoInfo?.numero_motor || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <component :is="transmisionIcon" class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      Transmisión:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ transmisionLabel || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <IconGasStation class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      Combustible:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ combustibleLabel || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <!-- Relaciones del flujo -->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-1">
              <Workflow class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Relaciones del flujo</h2>
            </div>
            <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Recepción de origen, cotización y orden de trabajo.
            </p>
            <RelacionesFlujo :pasos="relacionesInspeccion" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showImageModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click="cerrarFoto"
  >
    <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl" @click.stop>
      <button
        type="button"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Cerrar"
        @click="cerrarFoto"
      >
        <X class="w-5 h-5" />
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Imagen ampliada" />
    </div>
  </div>


  <div
    v-if="showDecisionModal"
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="decision-cotizacion-title"
  >
    <!-- Fondo oscurecido: al hacer click aquí no se cierra el modal. -->
    <div class="fixed inset-0 bg-black/70" aria-hidden="true"></div>
    <div class="relative w-full max-w-3xl my-8 bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-start gap-3">
          <IconFileInvoice class="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 id="decision-cotizacion-title" class="text-base font-semibold text-gray-900 dark:text-white">
              El cliente ya aceptó {{ cotizacionesAceptadas.length }}
              {{ cotizacionesAceptadas.length === 1 ? 'cotización' : 'cotizaciones' }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Revisa cuáles usará esta visita antes de cotizar de nuevo.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Cerrar"
          @click="cerrarDecisionModal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Cotizaciones del vehículo</h4>
          <button
            type="button"
            class="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
            @click="alternarTodas"
          >
            {{ todasSeleccionadas ? 'Desmarcar todas' : 'Marcar todas' }}
          </button>
        </div>

        <ul class="space-y-2">
          <li
            v-for="cotizacion in cotizacionesAceptadas"
            :key="cotizacion.id"
            class="flex items-start gap-3 p-3 border rounded-lg dark:border-gray-600"
            :class="selectedCotizaciones.includes(cotizacion.id)
              ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/30'
              : 'border-gray-200 dark:border-gray-700'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 mt-1 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
              :checked="selectedCotizaciones.includes(cotizacion.id)"
              :aria-label="`Usar ${cotizacion.numero}`"
              @change="alternarCotizacion(cotizacion.id)"
            >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-primary-700 dark:text-white dark:hover:text-primary-400"
                  @click="irACotizacion(cotizacion.id)"
                >
                  {{ cotizacion.numero }}
                </button>
                <span class="px-2 py-0.5 text-xs font-medium text-green-800 rounded-full bg-green-100 dark:bg-green-900 dark:text-green-300">
                  Aceptada
                </span>
                <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatMoney(cotizacion.total) }}</span>
                <span v-if="cotizacion.vinculada" class="text-xs text-gray-500 dark:text-gray-400">
                  ya vinculada a esta visita
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Aceptada el {{ formatShortDate(cotizacion.fechaAceptacion) }} ·
                {{ cotizacion.servicios.length }} servicio(s) · {{ cotizacion.repuestos.length }} repuesto(s)
              </p>
            </div>
          </li>
        </ul>

        <div class="p-3 border rounded-lg border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
            :aria-expanded="showComparacion"
            @click="showComparacion = !showComparacion"
          >
            <ClipboardList class="w-4 h-4" />
            Comparar con la inspección
            <span class="text-xs text-gray-500 dark:text-gray-400">
              ({{ resumenCobertura.nuevas }} nuevos · {{ resumenCobertura.cubiertas }} ya cotizados)
            </span>
          </button>

          <div v-if="showComparacion" class="mt-3 overflow-x-auto">
            <p v-if="resumenCobertura.total === 0" class="text-sm text-gray-500 dark:text-gray-400">
              La inspección todavía no tiene ítems cargados.
            </p>
            <table v-else class="w-full text-sm text-left text-gray-600 dark:text-gray-300">
              <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:text-gray-700 dark:text-gray-300">
                <tr>
                  <th scope="col" class="px-2 py-2">Ítem</th>
                  <th scope="col" class="px-2 py-2">Cantidad</th>
                  <th scope="col" class="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(fila, index) in coberturaItems"
                  :key="`${fila.tipo}-${fila.descripcion}-${index}`"
                  class="border-t border-gray-100 dark:border-gray-700"
                >
                  <td class="px-2 py-2">
                    <span class="mr-1 text-xs text-gray-400">{{ fila.tipo }}</span>{{ fila.descripcion }}
                  </td>
                  <td class="px-2 py-2 whitespace-nowrap">{{ fila.cantidad }}</td>
                  <td class="px-2 py-2">
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-full"
                      :class="fila.cubierta
                        ? 'text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-amber-800 bg-amber-100 dark:bg-amber-900 dark:text-amber-300'"
                    >
                      {{ fila.cubierta ? `Ya cotizado en ${fila.cotizacion}` : 'Nuevo' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="flex items-start gap-3 w-full p-3 text-left border rounded-lg border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
          :disabled="vinculandoCotizaciones || selectedCotizaciones.length === 0"
          @click="usarCotizacionesAceptadas"
        >
          <CheckCircle2 class="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400" />
          <span>
            <span class="block text-sm font-semibold text-gray-900 dark:text-white">
              {{ vinculandoCotizaciones ? 'Vinculando...' : 'Usar las cotizaciones marcadas' }}
            </span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">
              Se ligan a esta inspección y a la recepción ({{ selectedCotizaciones.length }} seleccionadas,
              {{ formatMoney(totalAceptadas) }}). No se crea una cotización nueva ni se modifica lo aprobado.
            </span>
          </span>
        </button>

        <button
          type="button"
          class="flex items-start gap-3 w-full p-3 text-left border rounded-lg border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          @click="crearComplementaria"
        >
          <SquarePen class="w-5 h-5 mt-0.5 text-gray-500 dark:text-gray-400" />
          <span>
            <span class="block text-sm font-semibold text-gray-900 dark:text-white">
              Crear cotización complementaria
            </span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">
              Genera una cotización nueva con los ítems de la inspección y deja las aprobadas intactas como referencia.
            </span>
          </span>
        </button>

        <button
          type="button"
          class="flex items-start gap-3 w-full p-3 text-left border rounded-lg border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          @click="crearNuevaCotizacion"
        >
          <IconFileInvoice class="w-5 h-5 mt-0.5 text-gray-500 dark:text-gray-400" />
          <span>
            <span class="block text-sm font-semibold text-gray-900 dark:text-white">
              Crear cotización nueva desde esta inspección
            </span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">
              Genera una cotización nueva solo con los ítems de esta inspección, sin vincular ni modificar las aceptadas existentes.
            </span>
          </span>
        </button>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          El vínculo formal entre la cotización complementaria y las aprobadas se registra al crear la orden de trabajo.
        </p>
      </div>
    </div>
  </div>

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

  <ConfirmModal
    v-model="showGenerarCotizacionModal"
    :title="tituloConfirmacionCotizacion"
    :message="textoConfirmacionCotizacion"
    :icon="IconFileInvoice"
    icon-class="text-green-600 dark:text-green-400"
    :confirm-text="textoConfirmarCotizacion"
    confirming-text="Generando..."
    confirm-class="bg-green-600 hover:bg-green-700 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
    variant="success"
    :is-deleting="isGeneratingCotizacion"
    @confirm="crearCotizacion"
    @cancel="showGenerarCotizacionModal = false"
  />
</template>