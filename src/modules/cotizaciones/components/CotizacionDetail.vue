<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FolderOpen,
  FileText,
  IdCardIcon,
  Loader2,
  Mail,
  MessageSquareText,
  Package,
  PaintBucket,
  Pencil,
  Phone,
  Shapes,
  Store,
  TagIcon,
  UserCheck,
  Workflow,
  Wrench,
} from 'lucide-vue-next';
import { IconBrandWhatsapp, IconLockOpen2 } from '@tabler/icons-vue';
import { cotizacionesService } from '../services/cotizacionesService';
import { formatPlate } from '../../../shared/utils/formatPlate';
import { formatDateTime } from '../../../shared/utils/datetime';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeCotizacion } from '../../../shared/utils/relacionesFlujo';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';

const METODOS_ACEPTACION = [
  { value: 'PRESENCIAL', label: 'Presencial en taller' },
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEFONO', label: 'Teléfono' },
];

const cotizacionId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const cotizacion = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

const mostrarModalReabrir = ref(false);
const mostrarModalGenerarOrden = ref(false);
const procesandoReapertura = ref(false);
const procesandoGeneracionOrden = ref(false);

const ordenGenerada = computed(() => cotizacion.value?.orden_generada_numero || '');

const puedeGenerarOrden = computed(
  () => cotizacion.value?.estado === 'ACEPTADA' && !ordenGenerada.value
);

const puedeReabrir = computed(
  () => cotizacion.value?.estado === 'ACEPTADA' && !ordenGenerada.value
);

const puedeEditar = computed(
  () => Boolean(cotizacion.value) && cotizacion.value.estado !== 'ACEPTADA'
);

const metodoAceptacionLabel = computed(() => {
  const metodo = cotizacion.value?.metodo_aceptacion;
  if (!metodo) return '';
  return (METODOS_ACEPTACION.find((m) => m.value === metodo) || {}).label || metodo;
});

const iconoMetodoAceptacion = computed(() => {
  const iconos = { WHATSAPP: IconBrandWhatsapp, EMAIL: Mail, TELEFONO: Phone, PRESENCIAL: UserCheck };
  return iconos[cotizacion.value?.metodo_aceptacion] || UserCheck;
});

// Mismo criterio que CotizacionEdit: '02/10/2026, 09:56 p. m.'
function formatFechaHora12(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Chips de recepción, inspección y orden vinculadas a esta cotización.
const relacionesCotizacion = computed(() => relacionesDeCotizacion(cotizacion.value));

// Los subtotales por categoría se derivan únicamente del campo `subtotal` que
// ya calcula el backend en cada servicio/repuesto (sin recalcular precios*horas).
const subtotalServicios = computed(() =>
  (cotizacion.value?.servicios || []).reduce((acc, s) => acc + (Number(s.subtotal) || 0), 0)
);
const subtotalRepuestos = computed(() =>
  (cotizacion.value?.repuestos || []).reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0)
);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ivaLabel(valor) {
  const tasa = Number(valor) || 0;
  return `${(tasa * 100).toFixed(0)}%`;
}

const fechaEmision = computed(() => formatDateTime(cotizacion.value?.created_at));

function goTo(path) {
  window.location.assign(path);
}

function abrirModalReabrir() {
  mostrarModalReabrir.value = true;
}

function abrirModalGenerarOrden() {
  mostrarModalGenerarOrden.value = true;
}

function irAEditar() {
  if (!cotizacionId.value) return;
  goTo(`/crud/cotizaciones/editar/?id=${encodeURIComponent(cotizacionId.value)}`);
}

// El PDF se genera en el backend y está disponible en cualquier estado de la
// cotización: el botón depende únicamente de que exista una cotización guardada.
function descargarPdf() {
  return cotizacionesService.exportarPdf(cotizacionId.value);
}

async function confirmarGenerarOrden() {
  if (!cotizacionId.value || !cotizacion.value || procesandoGeneracionOrden.value) return;
  procesandoGeneracionOrden.value = true;
  try {
    const resultado = await cotizacionesService.generarOrden(cotizacionId.value, {
      metodo_aceptacion: cotizacion.value.metodo_aceptacion || 'PRESENCIAL',
    });
    mostrarModalGenerarOrden.value = false;
    successMessage.value = `Orden de trabajo N° ${resultado.numero_orden} generada correctamente.`;
    await cargar();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo completar la operación.';
  } finally {
    procesandoGeneracionOrden.value = false;
  }
}

async function confirmarReabrir() {
  if (!cotizacionId.value || !cotizacion.value || procesandoReapertura.value) return;
  procesandoReapertura.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
    mostrarModalReabrir.value = false;
    irAEditar();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo reabrir la cotización.';
  } finally {
    procesandoReapertura.value = false;
  }
}

async function cargar() {
  if (!cotizacionId.value) {
    errorMessage.value = 'Falta el identificador de la cotización.';
    loading.value = false;
    return;
  }
  try {
    cotizacion.value = await cotizacionesService.getById(cotizacionId.value);
  } catch (error) {
    errorMessage.value = error.message || 'Error al cargar la cotización.';
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="mb-3" aria-label="Breadcrumb">
      <ol class="inline-flex flex-wrap items-center gap-x-1 text-sm font-medium md:gap-x-2">
        <li class="inline-flex items-center gap-x-1 md:gap-x-2">
          <a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="inline-flex items-center gap-x-1 md:gap-x-2">
          <span class="text-gray-400" aria-hidden="true">/</span>
          <a href="/crud/cotizaciones/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Cotizaciones</a>
        </li>
        <li class="inline-flex items-center gap-x-1 md:gap-x-2">
          <span class="text-gray-400" aria-hidden="true">/</span>
          <span class="text-gray-500 dark:text-gray-400">Cotización</span>
        </li>
      </ol>
    </nav>

    <template v-if="cotizacion">
      <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div class="flex flex-1 min-w-0 items-start gap-3">
          <FolderOpen class="w-5 h-5 shrink-0 mt-1.5 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
          <div class="min-w-0">
            <h1 class="text-lg font-semibold leading-8 text-gray-900 sm:text-xl dark:text-white">
              Cotización
            </h1>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ cotizacion.numero_cotizacion }}</span>
              <span class="text-sm text-gray-400" aria-hidden="true">&bull;</span>
              <EstadoCotizacionBadge :estado="cotizacion.estado" size="md" />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <button
            v-if="puedeGenerarOrden"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-base bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
            @click="abrirModalGenerarOrden"
          >
            <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
            Generar orden de trabajo
          </button>
          <button
            v-if="puedeReabrir"
            type="button"
            :disabled="procesandoReapertura"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-700 rounded-base border border-red-600 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200 dark:text-red-400 dark:border-red-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="abrirModalReabrir"
          >
            <IconLockOpen2 class="w-4 h-4" aria-hidden="true" />
            Reabrir
          </button>
          <button
            v-if="puedeEditar"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-700 rounded-base border border-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 dark:text-brand-400 dark:border-brand-400 dark:hover:bg-gray-700"
            @click="irAEditar"
          >
            <Pencil class="w-4 h-4" aria-hidden="true" />
            Editar
          </button>
          <PdfExportButton
            :descargador="descargarPdf"
            @error="errorMessage = $event"
          />
        </div>
      </div>
    </template>
  </div>

  <div class="p-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <div class="relative mx-auto max-w-8xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
          <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
          <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

          <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 class="w-6 h-6 animate-spin" />
              <span>Cargando cotización...</span>
            </div>
          </div>

          <template v-else-if="cotizacion">
            <!-- ===== 1. INFORMACIÓN GENERAL: cliente / vehículo / asesor ===== -->
            <div class="mb-6">
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4">
                <div class="flex items-center gap-2 mb-4">
                  <FileText class="w-5 h-5 text-gray-900 dark:text-white" />
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Información General</h2>
                  <span
                    v-if="cotizacion.validez_dias"
                    class="ml-auto text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span class="font-medium text-gray-900 dark:text-white">Validez:</span>
                    {{ cotizacion.validez_dias }} días
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr_1fr]">
                  <!-- Cliente -->
                  <div class="min-w-0">
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</p>
                    <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ cotizacion.cliente_nombre || '—' }}</p>
                    <div class="mt-3 space-y-1.5">
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.cliente_identificacion || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.cliente_telefono || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.cliente_email || '—' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Vehículo -->
                  <div class="min-w-0">
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo</p>
                    <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ formatPlate(cotizacion.vehiculo_placa) || '—' }}</p>
                    <div class="mt-3 space-y-1.5">
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <TagIcon class="w-3.5 h-3.5 shrink-0" /> Marca:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_marca || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_modelo || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_color || '—' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Asesor -->
                  <div class="min-w-0">
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Asesor</p>
                    <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ cotizacion.asesor_nombre || '—' }}</p>
                    <div class="mt-3 space-y-1.5">
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.asesor_identificacion || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.asesor_telefono || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                        <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                        <span class="truncate font-bold text-gray-900 dark:text-white">{{ cotizacion.asesor_email || '—' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Metadatos de la cotización (siempre visibles) -->
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 mt-4 text-sm text-gray-600 border-t border-gray-200 dark:border-gray-600 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5" title="Fecha y hora de emisión">
                    <CalendarDays class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                    <span class="font-medium text-gray-900 dark:text-white">Emisión:</span>
                    {{ fechaEmision }}
                  </span>
                  <span class="inline-flex items-center gap-1.5 md:border-l md:border-gray-200 md:pl-6 md:dark:border-gray-600" title="Taller donde se creó la cotización">
                    <Store class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                    <span class="font-medium text-gray-900 dark:text-white">Taller:</span>
                    {{ cotizacion.sucursal_nombre || '—' }}
                  </span>
                  <!--span class="inline-flex items-center gap-1.5 md:border-l md:border-gray-200 md:pl-6 md:dark:border-gray-600" title="Origen de la cotización">
                    <ClipboardList class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                    <span class="font-medium text-gray-900 dark:text-white">Origen:</span>
                    <template v-if="cotizacion.inspeccion_origen">
                      <a
                        :href="`/crud/inspecciones/ver/?id=${encodeURIComponent(cotizacion.inspeccion_origen)}`"
                        class="font-medium text-primary-blue-700 hover:underline dark:text-primary-blue-400">Cod Inspección {{ cotizacion.inspeccion_numero || `#${cotizacion.inspeccion_origen}` }}</a>
                      <a
                        v-if="cotizacion.recepcion_origen"
                        :href="`/crud/recepciones/ver/?id=${encodeURIComponent(cotizacion.recepcion_origen)}`"
                        class="font-medium text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                        / Recepción {{ cotizacion.recepcion_numero || `#${cotizacion.recepcion_origen}` }}
                      </a>
                    </template>
                    <a
                      v-else-if="cotizacion.recepcion_origen"
                      :href="`/crud/recepciones/ver/?id=${encodeURIComponent(cotizacion.recepcion_origen)}`"
                      class="font-medium text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                      Recepción {{ cotizacion.recepcion_numero || `#${cotizacion.recepcion_origen}` }}
                    </a>
                    <span v-else>Independiente</span>
                  </span-->
                  <span
                    v-if="cotizacion.fecha_aceptacion"
                    class="inline-flex basis-full items-center gap-1.5 pt-1"
                    title="Aceptación de la cotización por parte del cliente">
                    <CheckCircle2 class="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span class="font-medium text-gray-900 dark:text-white">Aceptada:</span>
                    {{ formatFechaHora12(cotizacion.fecha_aceptacion) }} -
                    <component :is="iconoMetodoAceptacion" class="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                    {{ metodoAceptacionLabel || '—' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- ===== 2. SERVICIOS ===== -->
            <section class="mt-6">
              <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Wrench class="w-5 h-5 text-gray-800 dark:text-white" />
                Servicios
              </h3>
              <div v-if="cotizacion.servicios?.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                      <th class="px-4 py-3">Descripción</th>
                      <th class="px-4 py-3 w-24 text-right">Horas</th>
                      <th class="px-4 py-3 w-32 text-right">P. Unitario</th>
                      <th class="px-4 py-3 w-28 text-right">Descuento</th>
                      <th class="px-4 py-3 w-16 text-right">IVA</th>
                      <th class="px-4 py-3 w-32 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-600 dark:bg-gray-800">
                    <tr v-for="(servicio, index) in cotizacion.servicios" :key="servicio.id || index">
                      <td class="px-4 py-3 text-gray-900 dark:text-white">
                        {{ servicio.descripcion || '—' }}
                        <span
                          v-if="servicio.es_opcional"
                          class="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700"
                        >opcional</span>
                      </td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ servicio.horas_estimadas ?? '—' }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(servicio.precio_unitario) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(servicio.descuento) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ ivaLabel(servicio.iva_porcentaje) }}</td>
                      <td class="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(servicio.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="p-5 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                Sin servicios registrados en esta cotización.
              </div>
            </section>

            <!-- ===== 3. REPUESTOS / MATERIALES ===== -->
            <section class="mt-8">
              <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Package class="w-5 h-5 text-gray-800 dark:text-white" />
                Repuestos / Materiales
              </h3>
              <div v-if="cotizacion.repuestos?.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                      <th class="px-4 py-3">Descripción</th>
                      <th class="px-4 py-3 w-24 text-right">Cant.</th>
                      <th class="px-4 py-3 w-32 text-right">P. Unitario</th>
                      <th class="px-4 py-3 w-28 text-right">Descuento</th>
                      <th class="px-4 py-3 w-16 text-right">IVA</th>
                      <th class="px-4 py-3 w-32 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-600 dark:bg-gray-800">
                    <tr v-for="(repuesto, index) in cotizacion.repuestos" :key="repuesto.id || index">
                      <td class="px-4 py-3 text-gray-900 dark:text-white">
                        {{ repuesto.descripcion || '—' }}
                        <span
                          v-if="repuesto.es_opcional"
                          class="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700"
                        >opcional</span>
                      </td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ repuesto.cantidad ?? '—' }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(repuesto.precio_unitario_referencial) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(repuesto.descuento) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ ivaLabel(repuesto.iva_porcentaje) }}</td>
                      <td class="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(repuesto.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="p-5 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                Sin repuestos o materiales registrados en esta cotización.
              </div>
            </section>

            <!-- ===== 4. OBSERVACIONES + RESUMEN ===== -->
            <section class="grid grid-cols-1 gap-6 mt-8 lg:grid-cols-2">
              <div>
                <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <MessageSquareText class="w-5 h-5 text-gray-800 dark:text-white" />
                  Observaciones
                </h3>
                <div
                  v-if="cotizacion.observaciones"
                  class="p-4 text-sm whitespace-pre-line rounded-lg bg-gray-50 border border-gray-200 text-gray-800 dark:bg-gray-700/40 dark:border-gray-600/60 dark:text-gray-200"
                >
                  {{ cotizacion.observaciones }}
                </div>
                <div
                  v-else
                  class="p-5 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600"
                >
                  Sin observaciones.
                </div>
              </div>

              <div>
                <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <CircleDollarSign class="w-5 h-5 text-gray-800 dark:text-white" />
                  Resumen
                </h3>
                <div class="p-5 space-y-2 text-sm rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-700/40 dark:border-gray-600/60">
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal servicios</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalServicios) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal repuestos / materiales</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalRepuestos) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal neto</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(cotizacion.subtotal_neto) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Descuento total</span>
                    <span class="font-medium tabular-nums text-accent-600 dark:text-accent-400">$ {{ formatMoney(cotizacion.descuento) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal base 0%</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(cotizacion.subtotal_base_0) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal base gravada</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(cotizacion.subtotal_base_gravada) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>IVA total</span>
                    <span class="font-medium tabular-nums">$ {{ formatMoney(cotizacion.total_iva) }}</span>
                  </div>
                  <div class="flex items-center justify-between pt-3 mt-3 text-base font-bold border-t border-gray-200 text-gray-900 dark:border-gray-600 dark:text-white">
                    <span>Total</span>
                    <span class="tabular-nums">$ {{ formatMoney(cotizacion.total) }}</span>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <div v-else-if="!loading" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Cotización no encontrada.
          </div>
        </div>
      </div>

      <div class="lg:col-span-1 space-y-4">
        <!-- ===== 0. RELACIONES DEL FLUJO ===== -->
        <div class="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
          <div class="flex items-center gap-2 mb-1">
            <Workflow class="w-5 h-5 text-gray-900 dark:text-white" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Relaciones del flujo</h2>
          </div>
          <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Recepción, inspección y orden de trabajo relacionadas.
          </p>
          <RelacionesFlujo :pasos="relacionesCotizacion" />
        </div>
      </div>
    </div>

    
  </div>

  <!-- Confirmación para reabrir -->
  <ConfirmModal
    v-model="mostrarModalReabrir"
    title="Reabrir cotización"
    message='Al reabrir la cotización, volverá al estado "Enviada al cliente" y el cliente deberá aceptarla nuevamente. Serás trasladado a la pantalla de edición para ajustar la cotización.'
    :icon="IconLockOpen2"
    icon-class="text-primary-600 dark:text-primary-400"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    confirm-class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 dark:bg-primary-700 dark:hover:bg-primary-800"
    variant="primary"
    :is-deleting="procesandoReapertura"
    @confirm="confirmarReabrir"
  />

  <!-- Confirmación para generar orden de trabajo -->
  <ConfirmModal
    v-model="mostrarModalGenerarOrden"
    title="Generar orden de trabajo"
    message="Se generará una orden de trabajo a partir de esta cotización aceptada."
    :icon="ArrowLeftRight"
    icon-class="text-green-600 dark:text-green-400"
    confirm-text="Generar orden"
    confirming-text="Generando..."
    confirm-class="bg-green-600 hover:bg-green-700 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
    variant="primary"
    :is-deleting="procesandoGeneracionOrden"
    @confirm="confirmarGenerarOrden"
  />
</template>