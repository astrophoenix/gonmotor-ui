<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  Package,
  Pencil,
  Send,
  Wrench,
  XCircle,
  X,
} from 'lucide-vue-next';
import { IconLockOpen2 } from '@tabler/icons-vue';
import { cotizacionesService } from '../services/cotizacionesService';
import { formatPlate } from '../../../shared/utils/formatPlate';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import FlowSteps from '../../../shared/components/FlowSteps.vue';
import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';

const ESTADOS = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
  ENVIADA: { label: 'Enviada al cliente', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Send },
  ACEPTADA: { label: 'Aceptada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle },
  VENCIDA: { label: 'Vencida', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock },
  CONVERTIDA: { label: 'Convertida a orden', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300', icon: ArrowLeftRight },
};

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
const previewImg = ref('');
const showImageModal = ref(false);

const mostrarModalReabrir = ref(false);
const mostrarModalGenerarOrden = ref(false);
const procesandoReapertura = ref(false);
const procesandoGeneracionOrden = ref(false);

const estadoBadge = computed(() => ESTADOS[cotizacion.value?.estado] || ESTADOS.BORRADOR);

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

const pasosFlujo = computed(() => {
  const cot = cotizacion.value || {};
  const ordenId = cot.orden_generada_id || cot.orden_trabajo_origen || null;
  const ordenNumero = cot.orden_generada_id ? cot.orden_generada_numero : cot.orden_trabajo_numero;
  return buildPasosFlujo([
    {
      entidad: 'recepcion',
      estado: cot.recepcion_estado,
      estadoDisplay: cot.recepcion_estado_display,
      id: cot.recepcion_origen,
      numero: cot.recepcion_numero,
    },
    {
      entidad: 'inspeccion',
      estado: cot.inspeccion_estado,
      estadoDisplay: cot.inspeccion_estado_display,
      id: cot.inspeccion_origen,
      numero: cot.inspeccion_numero,
    },
    {
      entidad: 'cotizacion',
      estado: cot.estado,
      estadoDisplay: cot.estado_display,
      id: cot.id,
      numero: cot.numero_cotizacion,
    },
    {
      entidad: 'orden',
      estado: cot.orden_trabajo_estado,
      estadoDisplay: cot.orden_trabajo_estado_display,
      id: ordenId,
      numero: ordenNumero,
    },
  ]);
});

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

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function goTo(path) {
  window.location.assign(path);
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
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/cotizaciones/" class="hover:text-primary-600">Cotizaciones</a></li>
        <li class="text-gray-400">/ Detalle {{ cotizacion?.numero_cotizacion || '' }}</li>
      </ol>
    </nav>
    <template v-if="cotizacion">
      <div class="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          title="Volver al listado"
          class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          @click="goTo('/crud/cotizaciones/')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          Cotización {{ cotizacion.numero_cotizacion }}
        </h1>
        <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium', estadoBadge.color]">
          <component :is="estadoBadge.icon" class="w-4 h-4" aria-hidden="true" />
          {{ estadoBadge.label }}
        </span>
        <div class="flex items-center ml-auto gap-2 flex-wrap">
        <button
          v-if="puedeGenerarOrden"
          type="button"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="abrirModalGenerarOrden"
        >
          <ArrowLeftRight class="w-4 h-4 mr-2" />
          Generar orden de trabajo
        </button>
        <button
          v-if="puedeReabrir"
          type="button"
          :disabled="procesandoReapertura"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-600 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="abrirModalReabrir"
        >
          <IconLockOpen2 class="w-4 h-4" />
          Reabrir
        </button>
        <button
          v-if="puedeEditar"
          type="button"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-600 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800"
          @click="irAEditar"
        >
          <Pencil class="w-4 h-4" />
          Editar
        </button>
        </div>
      </div>
    </template>
  </div>

  <div class="p-4">
    <div v-if="cotizacion" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div>
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 class="w-6 h-6 animate-spin" />
          <span>Cargando cotización...</span>
        </div>
      </div>

      <template v-else-if="cotizacion">
        <!-- ===== 1. HEADER DE LA COTIZACIÓN ===== -->
        <header class="flex flex-col gap-3 pb-5 border-b border-gray-200 dark:border-gray-600">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
            </span>
            <div class="min-w-0">
              <h2 class="text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">
                Cotización {{ cotizacion.numero_cotizacion }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Emitida el {{ formatDate(cotizacion.created_at) || '—' }}
                <span v-if="cotizacion.validez_dias" class="ml-2">· Vigencia: {{ cotizacion.validez_dias }} días</span>
              </p>
            </div>
            <div class="flex items-center gap-2 ml-auto flex-wrap">
              <span
                v-if="ordenGenerada"
                class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
              >
                Orden de trabajo {{ ordenGenerada }}
              </span>
            </div>
          </div>
        </header>

        <!-- ===== 2. CLIENTE + VEHÍCULO + FOTOGRAFÍA ===== -->
        <section class="grid grid-cols-1 gap-6 p-5 mt-5 rounded-lg bg-gray-50 border border-gray-200 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_10rem] dark:bg-gray-700/40 dark:border-gray-600/60">
          <div>
            <h3 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h3>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente / Razón Social</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ cotizacion.cliente_nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cotizacion.cliente_telefono || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cotizacion.cliente_identificacion || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cotizacion.cliente_email || '—' }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h3>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ formatPlate(cotizacion.vehiculo_placa) || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_modelo || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_marca || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cotizacion.vehiculo_color || '—' }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200"></h3>
            <button
              v-if="cotizacion.vehiculo_imagen"
              type="button"
              title="Ver foto del vehículo"
              class="block w-full max-w-[10rem] overflow-hidden rounded-lg border border-gray-200 cursor-zoom-in dark:border-gray-600"
              @click="abrirFoto(cotizacion.vehiculo_imagen)"
            >
              <img
                :src="cotizacion.vehiculo_imagen"
                alt="Foto del vehículo"
                class="h-28 w-full object-cover"
              />
            </button>
            <div
              v-else
              class="flex h-28 w-full max-w-[10rem] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400"
            >
              <ImageIcon class="w-5 h-5" />
              Sin foto
            </div>
          </div>
        </section>

        <!-- ===== 3. INFORMACIÓN SECUNDARIA ===== -->
        <div class="flex flex-wrap gap-x-6 gap-y-1.5 py-4 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-600 dark:text-gray-400">
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-300">Taller:</span>
            <span class="ml-1">{{ cotizacion.sucursal_nombre || '—' }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-300">Origen:</span>
            <span class="ml-1">
              <a
                v-if="cotizacion.inspeccion_origen"
                :href="`/crud/inspecciones/ver/?id=${encodeURIComponent(cotizacion.inspeccion_origen)}`"
                class="text-primary-blue-700 hover:underline dark:text-primary-blue-400"
              >Inspección {{ cotizacion.inspeccion_numero || `#${cotizacion.inspeccion_origen}` }}</a>
              <a
                v-if="cotizacion.recepcion_origen"
                :href="`/crud/recepciones/ver/?id=${encodeURIComponent(cotizacion.recepcion_origen)}`"
                class="text-primary-blue-700 hover:underline dark:text-primary-blue-400"
              ><span v-if="cotizacion.inspeccion_origen"> / </span>Recepción {{ cotizacion.recepcion_numero || `#${cotizacion.recepcion_origen}` }}</a>
              <span v-if="!cotizacion.inspeccion_origen && !cotizacion.recepcion_origen">Independiente</span>
            </span>
          </div>
          <div v-if="cotizacion.fecha_aceptacion">
            <span class="font-medium text-gray-600 dark:text-gray-300">Aceptada el:</span>
            <span class="ml-1">{{ formatDate(cotizacion.fecha_aceptacion) }}</span>
            <span v-if="metodoAceptacionLabel" class="ml-1">· {{ metodoAceptacionLabel }}</span>
          </div>
        </div>

        <!-- ===== 4. SERVICIOS ===== -->
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
                  <th class="px-4 py-3 w-32 text-right">Subtotal</th>
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
                  <td class="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(servicio.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-5 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
            Sin servicios registrados en esta cotización.
          </div>
        </section>

        <!-- ===== 5. REPUESTOS / MATERIALES ===== -->
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
                  <th class="px-4 py-3 w-32 text-right">Subtotal</th>
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
                  <td class="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(repuesto.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-5 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
            Sin repuestos o materiales registrados en esta cotización.
          </div>
        </section>

        <!-- ===== 6. OBSERVACIONES + RESUMEN ===== -->
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
                <span>Subtotal</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(cotizacion.subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>IVA (15%)</span>
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

  <!-- Vista ampliada de la fotografía -->
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
</template>