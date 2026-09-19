<script setup>
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, CheckCircle2, Clock, FolderInput, FileText, Image as ImageIcon, SquarePen, TriangleAlert, WrenchIcon, X, Toolbox } from 'lucide-vue-next';
import { IconFileInvoice, IconLockOpen2 } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import FlowSteps from '../../../shared/components/FlowSteps.vue';
import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';

const inspeccion = ref(null);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const showReabrirModal = ref(false);
const isReopening = ref(false);

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

const ESTADO_BADGES = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', dot: 'bg-yellow-500', icon: Clock },
  EN_PROCESO: { label: 'En proceso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', dot: 'bg-blue-500', icon: WrenchIcon },
  FINALIZADA: { label: 'Finalizada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', dot: 'bg-green-500', icon: CheckCircle2 },
};

const TIPO_BADGES = {
  PREVENTIVO: { label: 'Mantenimiento Preventivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  CORRECTIVO: { label: 'Revisión Correctiva', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  DIAGNOSTICO: { label: 'Diagnóstico', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  ESTETICA: { label: 'Evaluación Estética', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
  GARANTIA: { label: 'Revisión por Garantía', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
};

const estadoBadge = computed(() => ESTADO_BADGES[inspeccion.value?.estado] || { label: inspeccion.value?.estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-500', icon: TriangleAlert });
const tipoBadge = computed(() => TIPO_BADGES[inspeccion.value?.tipo_inspeccion] || { label: inspeccion.value?.tipo_inspeccion || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });

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

const pasosFlujo = computed(() => {
  const ins = inspeccion.value || {};
  const recepcion = ins.recepcion || null;
  const estadoCotizacion = ins.cotizacion_estado || (ins.tiene_cotizacion_activa ? 'BORRADOR' : null);
  return buildPasosFlujo([
    { entidad: 'recepcion', estado: recepcion?.estado, estadoDisplay: recepcion?.estado_display },
    { entidad: 'inspeccion', estado: ins.estado, estadoDisplay: ins.estado_display },
    { entidad: 'cotizacion', estado: estadoCotizacion, estadoDisplay: ins.cotizacion_estado_display },
    { entidad: 'orden', estado: ins.orden_trabajo_estado, estadoDisplay: ins.orden_trabajo_estado_display },
  ]);
});

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

async function crearCotizacion() {
  if (isSyncingCotizacion.value) return;
  const cotizacionId = inspeccion.value?.cotizacion_activa_id;
  if (!cotizacionId) {
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
    error.value = syncError.message || 'No se pudo actualizar la cotización con los cambios de la inspección.';
    isSyncingCotizacion.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
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
    await inspeccionesService.update(inspeccionId, { estado: 'EN_PROCESO' });
    if (inspeccion.value) {
      inspeccion.value = { ...inspeccion.value, estado: 'EN_PROCESO', estado_display: 'En proceso' };
    }
    showReabrirModal.value = false;
    successMessage.value = 'Inspección reabierta. Ahora está en proceso.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo reabrir la inspección.';
  } finally {
    isReopening.value = false;
  }
}

const numeroInspeccion = computed(
  () => inspeccion.value?.numero_inspeccion || `#${inspeccion.value?.id}`
);

onMounted(async () => {
  if (params.get('finalizada')) {
    successMessage.value = 'Inspección finalizada correctamente.';
    params.delete('finalizada');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);
  }
  if (!inspeccionId) {
    error.value = 'Falta el identificador de la inspección.';
    loading.value = false;
    return;
  }
  try {
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
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar la inspección.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400 dark:text-gray-500">/</li>
        <li class="inline-flex items-center">
          <a href="/crud/inspecciones/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inspecciones</a>
        </li>
        <li class="text-gray-400">/ Inspección / {{ numeroInspeccion }}</li>
      </ol>
    </nav>

    <template v-if="inspeccion">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          Inspección {{ inspeccion.numero_inspeccion || `#${inspeccion.id}` }}
        </h1>
        <!--span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium', tipoBadge.color]">
          {{ tipoBadge.label }}
        </span-->
        <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium', estadoBadge.color]">
          <component :is="estadoBadge.icon" class="w-4 h-4" aria-hidden="true" />
          {{ estadoBadge.label }}
        </span>
        <div class="flex items-center gap-2 ml-auto flex-wrap">
          <!--a
            href="/crud/inspecciones/"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <ArrowLeft class="w-4 h-4" />
            Inspecciones
          </a-->
          <a
            v-if="!estaFinalizada"
            :href="`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800"
          >
            <SquarePen class="w-4 h-4" />
            Editar
          </a>
          <button
            v-if="estaFinalizada"
            type="button"
            :disabled="isReopening"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-600 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="solicitarReabrir"
          >
            <IconLockOpen2 class="w-4 h-4" />
            Reabrir
          </button>
          <button
            v-if="estaFinalizada"
            type="button"
            :disabled="isSyncingCotizacion"
            :title="tieneCotizacionActiva ? 'Actualizar la cotización existente para reflejar los cambios de la inspección.' : 'Generar una cotización desde este diagnóstico'"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="crearCotizacion"
          >
            <IconFileInvoice class="w-4 h-4" />
            {{ isSyncingCotizacion ? 'Sincronizando...' : (tieneCotizacionActiva ? 'Actualizar cotización' : 'Generar cotización') }}
          </button>
        </div>
      </div>
    </template>
  </div>

  <div class="p-4">
    <div v-if="inspeccion" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div>
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert
        v-if="error"
        type="error"
        :title="error"
        message=""
        dismissible
        @dismiss="error = ''"
      />

      <Alert
        v-if="successMessage"
        type="success"
        :title="successMessage"
        message=""
        dismissible
        @dismiss="successMessage = ''"
      />

      <div v-if="loading" class="p-6 text-center text-gray-500 dark:text-gray-400">
        Cargando inspección...
      </div>

      <template v-else-if="inspeccion">
        <div class="mb-4">
          <h4 class="mb-3 text-lg font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <FileText class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              Información General
            </span>
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-700/40 dark:border-gray-600/60">
            <div>
              <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
              <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.nombre || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.identificacion || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ clienteInfo?.telefono || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ clienteInfo?.email || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
              <div class="flex flex-col gap-4 sm:flex-row">
                <dl class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.placa || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.marca || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.modelo || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ vehiculoInfo?.color || '—' }}</dd>
                  </div>
                </dl>
                <div class="w-full shrink-0 sm:w-36">
                  <button
                    v-if="vehiculoInfo?.imagen"
                    type="button"
                    title="Ver foto del vehículo"
                    class="block w-full overflow-hidden rounded-lg border border-gray-200 cursor-zoom-in dark:border-gray-600"
                    @click="abrirFoto(vehiculoInfo.imagen)"
                  >
                    <img :src="vehiculoInfo.imagen" alt="Foto del vehículo" class="h-28 w-full object-cover" />
                  </button>
                  <div v-else class="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    Sin foto
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="flex flex-wrap -mb-px">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'informacion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'informacion'"
            >
              <FileText class="w-4 h-4" />
              1. Diagnóstico
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'testigos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'testigos'"
            >
              <TriangleAlert class="w-4 h-4" />
              2. Testigos
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'evidencias' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'evidencias'"
            >
              <ImageIcon class="w-4 h-4" />
              3. Evidencias
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'servicios' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'servicios'"
            >
              <Toolbox class="w-4 h-4" />
              4. Servicios &amp; Repuestos
            </button>
          </nav>
        </div>

        <div v-show="activeTab === 'informacion'" class="p-4 space-y-6">
          <div>
            <h4 class="mb-3 text-lg font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <FileText class="w-5 h-5 text-gray-800 dark:text-white" />
                Detalles del diagnóstico
              </span>
            </h4>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° inspección</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.numero_inspeccion || '-' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de inspección</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.tipo_inspeccion_display || tipoBadge.label }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                <dd class="mt-1">
                  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', estadoBadge.color]">
                    <span :class="['w-2 h-2 rounded-full', estadoBadge.dot]" aria-hidden="true"></span>
                    {{ inspeccion.estado_display || estadoBadge.label }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Responsable</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.responsable_nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de registro</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(inspeccion.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cotización</dt>
                <dd class="mt-0.5 text-sm font-semibold">
                  <a
                    v-if="tieneCotizacionActiva && inspeccion.cotizacion_activa_id"
                    :href="`/crud/cotizaciones/editar/?id=${encodeURIComponent(inspeccion.cotizacion_activa_id)}`"
                    class="text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {{ inspeccion.numero_cotizacion || `#${inspeccion.cotizacion_activa_id}` }}
                  </a>
                  <span v-else>—</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Códigos de falla (DTC)</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.codigos_dtc || '—' }}</dd>
              </div>
              <div class="sm:col-span-2 lg:col-span-2">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Motivo de ingreso</dt>
                <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.motivo_ingreso || '—' }}</dd>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnóstico</dt>
                <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.diagnostico_tecnico || '—' }}</dd>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recomendaciones</dt>
                <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.recomendaciones || '—' }}</dd>
              </div>
            </dl>
          </div>

          <hr class="border-gray-200 dark:border-gray-700" />

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
          </div>
        </div>

        <div v-show="activeTab === 'testigos'" class="p-4 space-y-6">
          <div>
            <h4 class="mb-3 text-lg font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <TriangleAlert class="w-5 h-5 text-gray-800 dark:text-white" />
                Testigos luminosos
              </span>
            </h4>
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
          <h4 class="mb-4 text-lg font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <ImageIcon class="w-5 h-5 text-gray-800 dark:text-white" />
              Fotos de la Inspección
            </span>
          </h4>
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
            <h4 class="mb-4 text-lg font-semibold dark:text-white">
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
            <h4 class="mb-4 text-lg font-semibold dark:text-white">
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

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
      </template>
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