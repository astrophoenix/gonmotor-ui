<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import {
  Car,
  Camera,
  Check,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarCheck,
  ClipboardList,
  FilePen,
  FileText,
  Gauge,
  HardHat,
  IdCardIcon,
  ListChecks,
  Loader2,
  Mail,
  NotebookPen,
  Package,
  PaintBucket,
  Phone,
  ReceiptText,
  Shapes,
  Building2,
  Stethoscope,
  TagIcon,
  UserRound,
  Workflow,
  Wrench,
  X,
} from 'lucide-vue-next';
import { API_BASE_URL } from '../../../shared/config/env';
import { ordenesService } from '../services/ordenesService';
import { getEstadoOrden, getPrioridadOrden } from '../constants/estadosOrden';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import EstadoOrdenBadge from './EstadoOrdenBadge.vue';
import { relacionesDeOrden } from '../../../shared/utils/relacionesFlujo';
import { referenciaCorta } from '../../../shared/utils/format';

const orden = ref(null);
const loading = ref(true);
const error = ref('');
const previewImg = ref('');
const showImageModal = ref(false);

// Mismos estilos de tarjeta que la edición de la orden, la recepción y la inspección.
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const ETIQUETA = 'text-xs font-medium text-gray-500 dark:text-gray-400';
const VALOR = 'mt-0.5 text-sm font-semibold text-gray-900 dark:text-white';
const ENLACE = 'hover:text-brand-coral';
const CONTADOR = 'px-1.5 text-xs font-medium normal-case tracking-normal rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums';

const ordenId = computed(() => new URLSearchParams(window.location.search).get('id'));

const cliente = computed(() => orden.value?.cliente || null);
const vehiculo = computed(() => orden.value?.vehiculo || null);
const servicios = computed(() => orden.value?.servicios || []);
const repuestos = computed(() => orden.value?.repuestos || []);
const fotosOrden = computed(() => orden.value?.fotos || []);
const inspeccion = computed(() => orden.value?.inspeccion || null);
const fotosInspeccion = computed(() => inspeccion.value?.fotos || []);
const recepcionesConFotos = computed(() => (orden.value?.recepciones || []).filter((r) => r.fotos?.length));
const relacionesOrden = computed(() => relacionesDeOrden(orden.value));

const estado = computed(() => orden.value?.estado || 'PENDIENTE');
const estadoConfig = computed(() => getEstadoOrden(estado.value, orden.value?.estado_display));
const prioridadBadge = computed(() => getPrioridadOrden(orden.value?.prioridad));

const clienteUrl = computed(() => (cliente.value?.id ? `/crud/clientes/ver/?id=${encodeURIComponent(cliente.value.id)}` : null));
const vehiculoUrl = computed(() => (vehiculo.value?.id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(vehiculo.value.id)}` : null));
const inspeccionHref = computed(() => (inspeccion.value?.id ? `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccion.value.id)}` : ''));

/** Documento del que viene la orden: cotización aprobada, o la inspección o la recepción. */
const origen = computed(() => {
  const ord = orden.value;
  if (!ord) return null;
  if (ord.cotizacion_origen) {
    return {
      etiqueta: 'Viene de la cotización',
      numero: ord.cotizacion_origen_numero,
      href: `/crud/cotizaciones/ver/?id=${encodeURIComponent(ord.cotizacion_origen)}`,
      icon: ReceiptText,
    };
  }
  if (inspeccion.value?.id) {
    return { etiqueta: 'Viene de la inspección', numero: inspeccion.value.numero_inspeccion, href: inspeccionHref.value, icon: Stethoscope };
  }
  const rec = ord.recepciones?.[0];
  if (rec?.id) {
    return {
      etiqueta: 'Viene de la recepción',
      numero: rec.numero_recepcion,
      href: `/crud/recepciones/ver/?id=${encodeURIComponent(rec.id)}`,
      icon: FileText,
    };
  }
  return null;
});

const dtcLista = computed(() => (inspeccion.value?.codigos_dtc || '')
  .split(/[\s,;]+/)
  .map((codigo) => codigo.trim().toUpperCase())
  .filter(Boolean));

const mostrarDiagnostico = ref(true);

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

const placaDisplay = computed(() => formatPlaca(vehiculo.value?.placa));

function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() => resolveMediaUrl(vehiculo.value?.imagen));

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCantidad(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

function ivaLabel(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%`;
}

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
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

// ---- Datos de la planificación (una sola vez; estado y prioridad van en la cabecera) ----
const kilometrajeLabel = computed(() => (
  orden.value?.kilometraje != null ? `${Number(orden.value.kilometraje).toLocaleString('es-EC')} km` : '—'
));
const entregada = computed(() => estado.value === 'ENTREGADO');

// ---- Aviso de estado (solo lectura: las transiciones se hacen desde la edición) ----
const serviciosHechos = computed(() => servicios.value.filter((s) => s.completado).length);

const aviso = computed(() => {
  const ord = orden.value;
  if (!ord) return null;
  switch (estado.value) {
    case 'PENDIENTE':
      return { titulo: 'El trabajo aún no ha comenzado.', detalle: 'Se inicia desde la edición cuando el mecánico toma el vehículo.' };
    case 'EN_ESPERA':
      return { titulo: 'Orden en espera:', detalle: `${ord.motivo_espera || 'sin motivo indicado'}.` };
    case 'EN_PROCESO':
      return {
        titulo: 'Trabajo en proceso.',
        detalle: servicios.value.length
          ? `${serviciosHechos.value} de ${plural(servicios.value.length, 'servicio hecho', 'servicios hechos')}.`
          : 'Aún no hay servicios registrados.',
      };
    case 'COMPLETADO':
      return { titulo: 'Trabajo completado.', detalle: 'El vehículo está listo para entregar al cliente.' };
    case 'ENTREGADO':
      return { titulo: 'Vehículo entregado al cliente:', detalle: formatDate(ord.fecha_entrega) };
    case 'CANCELADO':
      return { titulo: 'Orden anulada.', detalle: 'No admite más trabajo ni evidencia.', peligro: true };
    default:
      return null;
  }
});

// ---- Pasos: Trabajo y Evidencia (los mismos de la edición) ----
const PASOS = [
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'evidencia', label: 'Evidencia' },
];
const activeTab = ref('trabajo');
const activeTabIndex = computed(() => PASOS.findIndex((p) => p.key === activeTab.value));
const pasosRef = ref(null);

function irAPaso(key) {
  activeTab.value = key;
  nextTick(() => {
    const el = pasosRef.value;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

const totalItems = computed(() => servicios.value.length + repuestos.value.length);
const horasManoObra = computed(() => servicios.value.reduce((acc, s) => acc + (Number(s.horas_aplicadas) || 0), 0));
const tieneNotas = computed(() => Boolean((orden.value?.observaciones || '').trim()));

const estadoPasos = computed(() => ({
  trabajo: totalItems.value && serviciosHechos.value === servicios.value.length ? 'completo' : 'pendiente',
  evidencia: fotosOrden.value.length || tieneNotas.value ? 'completo' : 'pendiente',
}));

const resumenPaso = computed(() => ({
  trabajo: servicios.value.length
    ? `${serviciosHechos.value} de ${plural(servicios.value.length, 'servicio hecho', 'servicios hechos')} · ${plural(repuestos.value.length, 'repuesto', 'repuestos')}`
    : 'Mano de obra y repuestos',
  evidencia: `${plural(fotosOrden.value.length, 'foto', 'fotos')}${tieneNotas.value ? ' · con notas' : ''}`,
}));

function pasoCirculoClass(key) {
  if (estadoPasos.value[key] === 'completo') return 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900';
  if (activeTab.value === key) return 'bg-white border-2 border-brand-900 text-brand-900 dark:bg-gray-800 dark:border-brand-300 dark:text-brand-200';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
}

const grupos = computed(() => [
  {
    key: 'svc',
    titulo: 'Mano de obra',
    singular: 'Servicio',
    icon: Wrench,
    filas: servicios.value,
    columna: 'Horas',
    cantidad: (fila) => `${formatCantidad(fila.horas_aplicadas)} h`,
    vacio: 'No hay servicios de mano de obra registrados.',
    subtotal: orden.value?.subtotal_servicios,
  },
  {
    key: 'rpt',
    titulo: 'Repuestos y materiales',
    singular: 'Repuesto',
    icon: Package,
    filas: repuestos.value,
    columna: 'Cant.',
    cantidad: (fila) => formatCantidad(fila.cantidad),
    vacio: 'No hay repuestos o materiales registrados.',
    subtotal: orden.value?.subtotal_repuestos,
  },
]);

// ---- Avance de la ejecución (panel lateral, solo lectura) ----
const requisitos = computed(() => [
  { key: 'partes', label: 'Cliente y vehículo', ok: Boolean(cliente.value && vehiculo.value), paso: null },
  { key: 'mecanico', label: 'Mecánico asignado', ok: Boolean(orden.value?.mecanico_nombre), paso: null },
  { key: 'trabajo', label: 'Trabajo registrado', ok: totalItems.value > 0, paso: 'trabajo' },
  {
    key: 'hechos',
    label: servicios.value.length ? `Servicios terminados (${serviciosHechos.value}/${servicios.value.length})` : 'Servicios terminados',
    ok: servicios.value.length > 0 ? serviciosHechos.value === servicios.value.length : totalItems.value > 0,
    paso: 'trabajo',
  },
]);

const requisitosCumplidos = computed(() => requisitos.value.filter((r) => r.ok).length);
const avancePorcentaje = computed(() => Math.round((requisitosCumplidos.value / requisitos.value.length) * 100));

const registrado = computed(() => [
  { key: 'svc', label: 'Servicios', valor: servicios.value.length, paso: 'trabajo' },
  { key: 'rpt', label: 'Repuestos', valor: repuestos.value.length, paso: 'trabajo' },
  { key: 'horas', label: 'Horas de M.O.', valor: formatCantidad(horasManoObra.value), paso: 'trabajo' },
  { key: 'fotos', label: 'Fotos', valor: fotosOrden.value.length, paso: 'evidencia' },
]);

function irARequisito(req) {
  if (req.paso) irAPaso(req.paso);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

const descuento = computed(() => Number(orden.value?.descuento) || 0);

onMounted(async () => {
  if (!ordenId.value) {
    error.value = 'Falta el identificador de la orden de trabajo.';
    loading.value = false;
    return;
  }
  try {
    orden.value = await ordenesService.getById(ordenId.value);
  } catch (err) {
    error.value = err.message || 'Error al cargar la orden de trabajo.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <EntityHeader
    mode="detail"
    entity="Orden de trabajo"
    :record-number="orden?.numero_orden || ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Órdenes', href: '/crud/ordenes/' },
      { label: 'Orden de trabajo' },
    ]"
  >
    <template #badges>
      <template v-if="orden">
        <EstadoOrdenBadge :estado="orden.estado" :estado-display="orden.estado_display" size="md" />
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          :class="prioridadBadge.color"
          :title="`Prioridad: ${prioridadBadge.label}`">
          <component :is="prioridadBadge.icon" class="w-4 h-4 shrink-0" aria-hidden="true" />
          {{ prioridadBadge.label }}
        </span>
        <!-- Marca de etapa: la misma de la edición. -->
        <span
          class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/30 dark:text-brand-200 dark:ring-brand-500/50"
          title="La orden de trabajo es la etapa de ejecución: el trabajo aprobado se realiza en el taller">
          <HardHat class="w-3.5 h-3.5" />
          Etapa de ejecución
        </span>
      </template>
    </template>

    <template #actions>
      <a
        v-if="orden"
        :href="`/crud/ordenes/editar/?id=${encodeURIComponent(orden.id)}`"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800">
        <FilePen class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Editar
      </a>
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-6">
    <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''" />

    <div v-if="loading" :class="[SECCION, 'flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
      <Loader2 class="w-4 h-4 animate-spin" />
      Cargando orden de trabajo...
    </div>

    <div v-else-if="!orden" :class="[SECCION, 'text-center text-sm text-gray-500 dark:text-gray-400']">
      Orden de trabajo no encontrada.
    </div>

    <template v-else>
      <!-- Aviso del estado: dice en qué punto está el trabajo -->
      <div
        v-if="aviso"
        class="flex items-start gap-3 p-4 mb-4 text-sm border rounded-lg"
        :class="aviso.peligro
          ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800/60 dark:text-red-100'
          : 'bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-700/20 dark:border-brand-500/40 dark:text-brand-100'">
        <component :is="estadoConfig.icon" class="w-5 h-5 mt-0.5 shrink-0" />
        <p>
          <span class="font-semibold">{{ aviso.titulo }}</span>
          {{ aviso.detalle }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div class="space-y-4 lg:col-span-3">
          <!-- Vehículo en taller: cliente, vehículo y responsables, una sola vez -->
          <section :class="SECCION">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 :class="TITULO_SECCION">
                <Wrench class="w-4 h-4" />
                Vehículo en taller
              </h4>
              <a
                v-if="origen"
                :href="origen.href"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-brand-900 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
                title="Abrir el documento del que viene esta orden">
                <component :is="origen.icon" class="w-3.5 h-3.5" />
                {{ origen.etiqueta }}
                <span class="font-mono font-semibold">{{ origen.numero }}</span>
              </a>
            </div>

            <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
              <!-- Cliente -->
              <div class="min-w-0">
                <p :class="ETIQUETA">Cliente</p>
                <a v-if="clienteUrl" :href="clienteUrl" :class="[VALOR, ENLACE, 'block truncate text-base']" :title="cliente?.nombre">{{ cliente?.nombre }}</a>
                <p v-else :class="[VALOR, 'truncate text-base']">{{ cliente?.nombre || '—' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Identificación:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <dt>Teléfono:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <dt>Correo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Vehículo, con su foto en miniatura (no desplaza los datos) -->
              <div class="relative min-w-0 md:border-s md:border-gray-200 md:ps-5 md:dark:border-gray-700">
                <p :class="ETIQUETA">Vehículo</p>
                <a v-if="vehiculoUrl" :href="vehiculoUrl" :class="[VALOR, ENLACE, 'block pe-20 font-mono text-base tracking-widest']">{{ placaDisplay }}</a>
                <p v-else :class="[VALOR, 'pe-20 font-mono text-base tracking-widest']">{{ placaDisplay || '—' }}</p>
                <button
                  v-if="vehiculoImagenSrc"
                  type="button"
                  title="Ampliar foto del vehículo"
                  class="absolute top-0 end-0 w-[72px] h-12 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200 cursor-zoom-in dark:bg-gray-700 dark:ring-gray-600"
                  @click="abrirFoto(vehiculoImagenSrc)">
                  <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="w-full h-full object-cover" />
                </button>
                <div v-else class="absolute top-0 end-0 flex items-center justify-center w-[72px] h-12 text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-md dark:bg-gray-700/40 dark:border-gray-600" title="Sin foto del vehículo">
                  <Car class="w-5 h-5" />
                </div>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <TagIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Marca:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" />
                    <dt>Modelo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}<template v-if="vehiculo?.anio"> · {{ vehiculo.anio }}</template></dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                    <dt>Color:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Responsables -->
              <div class="min-w-0 md:border-s md:border-gray-200 md:ps-5 md:dark:border-gray-700">
                <p :class="ETIQUETA">Mecánico responsable</p>
                <p :class="[VALOR, 'truncate text-base']">{{ orden.mecanico_nombre || 'Sin asignar' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <UserRound class="w-3.5 h-3.5 shrink-0" />
                    <dt>Asesor:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ orden.asesor_nombre || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Building2 class="w-3.5 h-3.5 shrink-0" />
                    <dt>Taller:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ orden.sucursal_nombre || '—' }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Planificación de la orden -->
            <dl class="grid grid-cols-2 gap-4 pt-4 mt-5 border-t border-gray-100 xl:grid-cols-4 dark:border-gray-700">
              <div>
                <dt :class="[ETIQUETA, 'inline-flex items-center gap-1.5']"><ClipboardList class="w-3.5 h-3.5" /> Tipo de trabajo</dt>
                <dd class="mt-0.5"><TipoTrabajoBadge :tipo="orden.tipo_trabajo" size="sm" /></dd>
              </div>
              <div>
                <dt :class="[ETIQUETA, 'inline-flex items-center gap-1.5']"><Gauge class="w-3.5 h-3.5" /> Kilometraje</dt>
                <dd :class="[VALOR, 'tabular-nums']">{{ kilometrajeLabel }}</dd>
              </div>
              <div>
                <dt :class="[ETIQUETA, 'inline-flex items-center gap-1.5']"><CalendarClock class="w-3.5 h-3.5" /> Ingreso</dt>
                <dd :class="[VALOR, 'tabular-nums']">{{ formatDate(orden.fecha_ingreso || orden.created_at) }}</dd>
              </div>
              <div>
                <dt :class="[ETIQUETA, 'inline-flex items-center gap-1.5']">
                  <CalendarCheck class="w-3.5 h-3.5" />
                  {{ entregada ? 'Entregada' : 'Entrega comprometida' }}
                </dt>
                <dd :class="[VALOR, 'tabular-nums']">{{ formatDate(orden.fecha_entrega) }}</dd>
              </div>
            </dl>
          </section>

          <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <!-- Pasos: Trabajo y Evidencia -->
            <nav ref="pasosRef" aria-label="Secciones de la orden de trabajo" class="scroll-mt-20 border-b border-gray-200 dark:border-gray-700">
              <ol class="grid grid-cols-2" role="tablist">
                <li v-for="(paso, index) in PASOS" :key="paso.key">
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="activeTab === paso.key"
                    class="flex w-full h-full flex-col items-center gap-1.5 px-2 py-3 -mb-px text-center border-b-2 transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
                    :class="activeTab === paso.key
                      ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'"
                    @click="irAPaso(paso.key)">
                    <span class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-sm font-semibold" :class="pasoCirculoClass(paso.key)">
                      <Check v-if="estadoPasos[paso.key] === 'completo'" class="w-4 h-4" />
                      <template v-else>{{ index + 1 }}</template>
                    </span>
                    <span class="min-w-0">
                      <span class="block text-xs font-semibold sm:text-sm" :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'">
                        {{ paso.label }}
                      </span>
                      <span class="hidden text-xs truncate sm:block text-gray-500 dark:text-gray-400">{{ resumenPaso[paso.key] }}</span>
                    </span>
                  </button>
                </li>
              </ol>
            </nav>

            <div class="p-4 sm:p-5 space-y-4 bg-gray-50/60 dark:bg-gray-900/30">
              <!-- 1. Trabajo -->
              <div v-show="activeTab === 'trabajo'" class="space-y-4">
                <!-- Lo que diagnosticó la inspección -->
                <section v-if="inspeccion?.diagnostico_tecnico || inspeccion?.recomendaciones" class="border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                  <button
                    type="button"
                    class="flex items-center justify-between w-full gap-2 px-4 py-3 text-left sm:px-5"
                    :aria-expanded="mostrarDiagnostico"
                    @click="mostrarDiagnostico = !mostrarDiagnostico">
                    <span :class="TITULO_SECCION">
                      <Stethoscope class="w-4 h-4" />
                      Diagnóstico a resolver
                    </span>
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ mostrarDiagnostico ? 'Ocultar' : 'Ver' }}</span>
                  </button>
                  <div v-show="mostrarDiagnostico" class="grid grid-cols-1 gap-4 px-4 pb-4 text-sm sm:px-5 md:grid-cols-2">
                    <div>
                      <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Diagnóstico</p>
                      <p class="text-gray-900 whitespace-pre-line dark:text-white">{{ inspeccion.diagnostico_tecnico || '—' }}</p>
                      <div v-if="dtcLista.length" class="flex flex-wrap gap-1.5 mt-2">
                        <span
                          v-for="codigo in dtcLista"
                          :key="codigo"
                          class="px-2 py-0.5 font-mono text-xs font-semibold rounded bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/60">
                          {{ codigo }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Recomendaciones</p>
                      <p class="text-gray-900 whitespace-pre-line dark:text-white">{{ inspeccion.recomendaciones || '—' }}</p>
                      <a v-if="inspeccionHref" :href="inspeccionHref" class="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-700 hover:underline dark:text-brand-200">
                        Ver inspección <span class="font-mono">{{ inspeccion.numero_inspeccion }}</span>
                      </a>
                    </div>
                  </div>
                </section>

                <section v-for="grupo in grupos" :key="grupo.key" :class="SECCION">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 :class="TITULO_SECCION">
                      <component :is="grupo.icon" class="w-4 h-4" />
                      {{ grupo.titulo }}
                      <span :class="CONTADOR">{{ grupo.filas.length }}</span>
                    </h4>
                    <span v-if="grupo.key === 'svc' && grupo.filas.length" class="text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ serviciosHechos }}/{{ grupo.filas.length }}</span> hechos
                    </span>
                  </div>
                  <div v-if="!grupo.filas.length" class="px-3 py-6 text-sm text-center text-gray-500 border border-dashed border-gray-300 rounded-lg dark:text-gray-400 dark:border-gray-600">
                    {{ grupo.vacio }}
                  </div>
                  <div v-else class="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
                    <table class="w-full text-sm">
                      <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                        <tr>
                          <th v-if="grupo.key === 'svc'" class="w-12 px-2 py-2 font-medium text-center">Hecho</th>
                          <th class="px-3 py-2 font-medium text-left">{{ grupo.singular }}</th>
                          <th class="hidden w-20 px-2 py-2 font-medium text-right sm:table-cell">{{ grupo.columna }}</th>
                          <th class="hidden w-28 px-2 py-2 font-medium text-right sm:table-cell">P. unitario</th>
                          <th class="hidden w-24 px-2 py-2 font-medium text-right md:table-cell">Desc.</th>
                          <th class="hidden w-16 px-2 py-2 font-medium text-right md:table-cell">IVA</th>
                          <th class="w-24 px-3 py-2 font-medium text-right">Neto</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr
                          v-for="fila in grupo.filas"
                          :key="fila.id"
                          :class="fila.completado ? 'bg-green-50/60 dark:bg-green-900/10' : ''">
                          <td v-if="grupo.key === 'svc'" class="px-2 py-2.5 text-center">
                            <span
                              class="inline-flex items-center justify-center w-5 h-5 rounded-full"
                              :class="fila.completado ? 'bg-green-600 text-white dark:bg-green-500' : 'border-2 border-dashed border-gray-300 dark:border-gray-500'"
                              :title="fila.completado ? 'Hecho' : 'Pendiente'">
                              <Check v-if="fila.completado" class="w-3 h-3" />
                              <span class="sr-only">{{ fila.completado ? 'Hecho' : 'Pendiente' }}</span>
                            </span>
                          </td>
                          <td class="px-3 py-2.5 min-w-0">
                            <p class="text-gray-900 dark:text-white">{{ fila.descripcion || '—' }}</p>
                            <!-- En pantallas angostas, cantidad y precio van bajo la descripción -->
                            <p class="mt-0.5 text-xs text-gray-500 tabular-nums sm:hidden dark:text-gray-400">
                              {{ grupo.cantidad(fila) }} × $ {{ formatNumber(fila.precio_unitario) }} · IVA {{ ivaLabel(fila.iva_porcentaje) }}
                            </p>
                          </td>
                          <td class="hidden px-2 py-2.5 text-right text-gray-700 tabular-nums sm:table-cell dark:text-gray-300">{{ grupo.cantidad(fila) }}</td>
                          <td class="hidden px-2 py-2.5 text-right text-gray-700 tabular-nums sm:table-cell dark:text-gray-300">$ {{ formatNumber(fila.precio_unitario) }}</td>
                          <td class="hidden px-2 py-2.5 text-right text-gray-700 tabular-nums md:table-cell dark:text-gray-300">{{ Number(fila.descuento) ? `$ ${formatNumber(fila.descuento)}` : '—' }}</td>
                          <td class="hidden px-2 py-2.5 text-right text-gray-700 tabular-nums md:table-cell dark:text-gray-300">{{ ivaLabel(fila.iva_porcentaje) }}</td>
                          <td class="px-3 py-2.5 font-medium text-right text-gray-900 tabular-nums whitespace-nowrap dark:text-white">$ {{ formatNumber(fila.subtotal) }}</td>
                        </tr>
                      </tbody>
                      <tfoot class="border-t border-gray-200 dark:border-gray-700">
                        <tr>
                          <td colspan="7" class="px-3 py-2 text-xs text-right text-gray-500 dark:text-gray-400">
                            Subtotal {{ grupo.titulo.toLowerCase() }}:
                            <span class="ms-1 text-sm font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(grupo.subtotal) }}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              </div>

              <!-- 2. Evidencia -->
              <div v-show="activeTab === 'evidencia'" class="space-y-4">
                <section :class="SECCION">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h4 :class="TITULO_SECCION">
                      <Camera class="w-4 h-4" />
                      Evidencia del trabajo
                    </h4>
                    <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ plural(fotosOrden.length, 'foto', 'fotos') }}</span>
                  </div>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Piezas cambiadas, piezas retiradas y mediciones finales.
                  </p>
                  <div v-if="!fotosOrden.length" class="flex flex-col items-center justify-center gap-1.5 py-8 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg dark:text-gray-400 dark:border-gray-600">
                    <Camera class="w-5 h-5 text-gray-400" />
                    No se registraron fotos del trabajo.
                  </div>
                  <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    <figure v-for="foto in fotosOrden" :key="foto.id" class="overflow-hidden bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
                      <button type="button" class="block w-full cursor-zoom-in" title="Ampliar foto" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                        <img :src="resolveMediaUrl(foto.miniatura || foto.imagen)" loading="lazy" :alt="foto.descripcion || 'Foto del trabajo'" class="w-full h-36 object-cover hover:opacity-90" />
                      </button>
                      <figcaption v-if="foto.descripcion" class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{{ foto.descripcion }}</figcaption>
                    </figure>
                  </div>
                </section>

                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-1']">
                    <NotebookPen class="w-4 h-4" />
                    Notas para el cliente
                  </h4>
                  <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">Qué se hizo, hallazgos adicionales y recomendaciones para la próxima visita.</p>
                  <p v-if="tieneNotas" class="p-3 text-sm text-gray-900 whitespace-pre-line rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:text-white">{{ orden.observaciones }}</p>
                  <p v-else class="text-sm italic text-gray-400 dark:text-gray-500">Sin notas registradas.</p>
                </section>

                <!-- Fotos de los documentos de origen, como referencia -->
                <section v-if="recepcionesConFotos.length || fotosInspeccion.length" :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-1']">
                    <Workflow class="w-4 h-4" />
                    Evidencia de origen
                  </h4>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Cómo llegó el vehículo y qué encontró la inspección.</p>
                  <div class="space-y-5">
                    <div v-for="recepcion in recepcionesConFotos" :key="recepcion.id">
                      <p class="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Recepción
                        <a :href="`/crud/recepciones/ver/?id=${encodeURIComponent(recepcion.id)}`" class="font-mono font-semibold text-brand-700 hover:underline dark:text-brand-200">
                          {{ recepcion.numero_recepcion || referenciaCorta(recepcion.id) }}
                        </a>
                      </p>
                      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                        <figure v-for="foto in recepcion.fotos" :key="foto.id" class="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
                          <button type="button" class="block w-full cursor-zoom-in" title="Ampliar foto" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                            <img :src="resolveMediaUrl(foto.miniatura || foto.imagen)" loading="lazy" :alt="foto.tipo_vista_display || 'Foto de la recepción'" class="w-full h-20 object-cover hover:opacity-90" />
                          </button>
                          <figcaption v-if="foto.tipo_vista_display || foto.descripcion" class="px-2 py-1 text-[11px] truncate text-gray-600 dark:text-gray-300">
                            {{ foto.tipo_vista_display || foto.descripcion }}
                          </figcaption>
                        </figure>
                      </div>
                    </div>
                    <div v-if="fotosInspeccion.length">
                      <p class="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Inspección
                        <a :href="inspeccionHref" class="font-mono font-semibold text-brand-700 hover:underline dark:text-brand-200">
                          {{ inspeccion.numero_inspeccion || referenciaCorta(inspeccion.id) }}
                        </a>
                      </p>
                      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                        <figure v-for="foto in fotosInspeccion" :key="foto.id" class="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
                          <button type="button" class="block w-full cursor-zoom-in" title="Ampliar foto" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                            <img :src="resolveMediaUrl(foto.miniatura || foto.imagen)" loading="lazy" :alt="foto.descripcion || 'Foto de la inspección'" class="w-full h-20 object-cover hover:opacity-90" />
                          </button>
                          <figcaption v-if="foto.descripcion" class="px-2 py-1 text-[11px] truncate text-gray-600 dark:text-gray-300" :title="foto.descripcion">{{ foto.descripcion }}</figcaption>
                        </figure>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <!-- Navegación entre pasos -->
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 sm:px-5 dark:border-gray-700">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                :class="activeTabIndex <= 0 ? 'invisible' : ''"
                @click="irAPaso(PASOS[activeTabIndex - 1].key)">
                <ArrowLeft class="w-4 h-4" />
                {{ PASOS[activeTabIndex - 1]?.label || 'Anterior' }}
              </button>
              <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Sección {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
                :class="activeTabIndex >= PASOS.length - 1 ? 'invisible' : ''"
                @click="irAPaso(PASOS[activeTabIndex + 1].key)">
                {{ PASOS[activeTabIndex + 1]?.label || 'Siguiente' }}
                <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <aside class="space-y-4 lg:col-span-1">
          <!-- Avance de la ejecución -->
          <section :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-3']">
              <ListChecks class="w-4 h-4" />
              Avance
            </h4>
            <div class="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ requisitosCumplidos }} de {{ requisitos.length }} requisitos</span>
              <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ avancePorcentaje }}%</span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
              <div
                class="h-2 rounded-full"
                :class="avancePorcentaje === 100 ? 'bg-green-600 dark:bg-green-500' : 'bg-brand-900 dark:bg-brand-300'"
                :style="{ width: `${avancePorcentaje}%` }"></div>
            </div>
            <ul class="mt-3 -mx-2 space-y-0.5">
              <li v-for="req in requisitos" :key="req.key">
                <button type="button" class="flex w-full items-center gap-2.5 px-2 py-1.5 text-sm text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700" @click="irARequisito(req)">
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full"
                    :class="req.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'border-2 border-dashed border-gray-300 dark:border-gray-500'">
                    <Check v-if="req.ok" class="w-3 h-3" />
                  </span>
                  <span class="flex-1 min-w-0 truncate" :class="req.ok ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'">{{ req.label }}</span>
                </button>
              </li>
            </ul>

            <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Registrado</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="h in registrado"
                :key="h.key"
                type="button"
                class="flex flex-col items-start px-3 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                @click="irAPaso(h.paso)">
                <span class="text-lg font-semibold leading-tight tabular-nums" :class="Number(h.valor) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ h.valor }}</span>
                <span class="text-xs text-gray-500 truncate max-w-full dark:text-gray-400">{{ h.label }}</span>
              </button>
            </div>
          </section>

          <!-- Valor de la orden -->
          <section :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-3']">
              <ReceiptText class="w-4 h-4" />
              Valor de la orden
            </h4>
            <dl class="space-y-1.5 text-sm">
              <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                <dt>Mano de obra</dt>
                <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.subtotal_servicios) }}</dd>
              </div>
              <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                <dt>Repuestos</dt>
                <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.subtotal_repuestos) }}</dd>
              </div>
              <div v-if="descuento" class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                <dt>Descuento</dt>
                <dd class="font-medium tabular-nums">− $ {{ formatNumber(descuento) }}</dd>
              </div>
              <div class="flex justify-between gap-2 pt-1.5 border-t border-gray-100 text-gray-600 dark:border-gray-700 dark:text-gray-300">
                <dt>Base 0%</dt>
                <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.subtotal_base_0) }}</dd>
              </div>
              <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                <dt>Base gravada</dt>
                <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.subtotal_base_gravada) }}</dd>
              </div>
              <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                <dt>IVA</dt>
                <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.monto_iva) }}</dd>
              </div>
            </dl>
            <div class="flex items-baseline justify-between gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
              <span class="text-xl font-bold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(orden.total) }}</span>
            </div>
          </section>

          <!-- Relaciones del flujo -->
          <section :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-1']">
              <Workflow class="w-4 h-4" />
              Relaciones del flujo
            </h4>
            <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">Recepción, inspección y cotización que originaron esta orden.</p>
            <RelacionesFlujo :pasos="relacionesOrden" />
          </section>
        </aside>
      </div>
    </template>
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
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Foto ampliada" />
    </div>
  </div>
</template>
