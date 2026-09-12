<script setup>
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, Car, FileText, Image as ImageIcon, SquarePen, TriangleAlert, X } from 'lucide-vue-next';
import { IconFileInvoice, IconRefresh } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';

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

const PRIORIDADES = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

const ESTADO_BADGES = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  EN_PROCESO: { label: 'En proceso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  FINALIZADA: { label: 'Finalizada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
};

const TIPO_BADGES = {
  PREVENTIVO: { label: 'Preventivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  CORRECTIVO: { label: 'Correctivo', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  DIAGNOSTICO: { label: 'Diagnóstico / Escaneo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  ESTETICA: { label: 'Estética', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
  GARANTIA: { label: 'Garantía', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
};

const estadoBadge = computed(() => ESTADO_BADGES[inspeccion.value?.estado] || { label: inspeccion.value?.estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });
const tipoBadge = computed(() => TIPO_BADGES[inspeccion.value?.tipo_inspeccion] || { label: inspeccion.value?.tipo_inspeccion || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });

const recepcion = computed(() => inspeccion.value?.recepcion || null);

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

function crearCotizacion() {
  window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(inspeccionId)}`);
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
        <li class="text-gray-400 dark:text-gray-500" aria-current="page">/ Ver</li>
      </ol>
    </nav>

    <template v-if="inspeccion">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          Inspección {{ inspeccion.numero_inspeccion || `#${inspeccion.id}` }}
        </h1>
        <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium', tipoBadge.color]">
          {{ tipoBadge.label }}
        </span>
        <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium', estadoBadge.color]">
          {{ estadoBadge.label }}
        </span>
        <a
          href="/crud/inspecciones/"
          class="inline-flex items-center gap-2 px-3 py-2 ml-auto text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ArrowLeft class="w-4 h-4" />
          Volver a la lista
        </a>
        <a
          v-if="!estaFinalizada"
          :href="`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700"
        >
          <SquarePen class="w-4 h-4" />
          Editar
        </a>
        <template v-if="estaFinalizada">
          <button
            type="button"
            :disabled="isReopening"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 rounded-lg border border-amber-600 hover:bg-amber-50 focus:ring-4 focus:ring-amber-300 dark:text-amber-400 dark:border-amber-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="solicitarReabrir"
          >
            <IconRefresh class="w-4 h-4" />
            Reabrir inspección
          </button>
          <button
            type="button"
            :disabled="tieneCotizacionActiva"
            :title="tieneCotizacionActiva ? 'Ya existe una cotización activa para esta inspección.' : 'Generar una cotización desde este diagnóstico'"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="crearCotizacion"
          >
            <IconFileInvoice class="w-4 h-4" />
            Generar cotización
          </button>
        </template>
      </div>
    </template>
  </div>

  <div class="p-4">
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
        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
            Información de la Inspección
          </span>
        </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.estado_display || estadoBadge.label }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de inspección</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.tipo_inspeccion_display || tipoBadge.label }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° inspección</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.numero_inspeccion || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Códigos de falla (DTC)</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ inspeccion.codigos_dtc || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recepción de origen</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              <a
                v-if="recepcion"
                :href="`/crud/recepciones/ver/?id=${recepcion.id}`"
                class="text-blue-600 hover:underline dark:text-blue-400"
              >
                {{ recepcion.numero_recepcion || `#${recepcion.id}` }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de registro</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatDate(inspeccion.created_at) }}</dd>
          </div>
          <div v-if="tieneOrdenTrabajo" class="sm:col-span-2 lg:col-span-1">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Orden de trabajo</dt>
            <dd class="mt-1 text-sm font-semibold">
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
          <div v-if="tieneCotizacionActiva" class="sm:col-span-2 lg:col-span-1">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cotización</dt>
            <dd class="mt-1 text-sm font-semibold">
              <a
                v-if="inspeccion.cotizacion_activa_id"
                :href="`/crud/cotizaciones/editar/?id=${encodeURIComponent(inspeccion.cotizacion_activa_id)}`"
                class="text-blue-600 hover:underline dark:text-blue-400"
              >
                Cotización activa
              </a>
              <span v-else class="text-blue-700 dark:text-blue-400">Cotización activa</span>
            </dd>
          </div>
        </dl>

        <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Motivo de ingreso</dt>
            <dd class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.motivo_ingreso || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnóstico</dt>
            <dd class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.diagnostico_tecnico || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recomendaciones</dt>
            <dd class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ inspeccion.recomendaciones || '—' }}</dd>
          </div>
        </div>

        <div v-if="recepcion" class="mt-10">
          <h4 class="mb-4 text-xl font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <Car class="w-6 h-6 text-gray-800 dark:text-white" />
              Recepción asociada
            </span>
          </h4>
          <div class="grid grid-cols-1 gap-6 text-sm md:grid-cols-3">
            <div>
              <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Vehículo</p>
              <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
                <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.vehiculo?.placa || recepcion.placa || '-' }}</p>
                <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.vehiculo?.marca || recepcion.marca }} {{ recepcion.vehiculo?.modelo || recepcion.modelo }}</p>
                <p v-if="recepcion.vehiculo?.color || recepcion.color" class="mt-1 text-gray-500 dark:text-gray-400">Color: {{ recepcion.vehiculo?.color || recepcion.color }}</p>
              </div>
            </div>
            <div>
              <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Cliente</p>
              <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
                <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.cliente?.nombre || recepcion.cliente_nombre || '-' }}</p>
                <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.identificacion || '-' }}</p>
                <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.telefono || '-' }}</p>
              </div>
            </div>
            <div>
              <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Ingreso</p>
              <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
                <p class="text-gray-900 dark:text-white">{{ formatDate(recepcion.created_at) }}</p>
                <p class="mt-1 text-gray-500 dark:text-gray-400">Recepción #{{ recepcion.numero_recepcion || recepcion.id }}</p>
              </div>
            </div>
          </div>
        </div>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <TriangleAlert class="w-6 h-6 text-gray-800 dark:text-white" />
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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <ImageIcon class="w-6 h-6 text-gray-800 dark:text-white" />
            Fotos de la Inspección ({{ inspeccion.fotos?.length || 0 }})
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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
            Servicios Detectados ({{ inspeccion.servicios_detectados?.length || 0 }})
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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Car class="w-6 h-6 text-gray-800 dark:text-white" />
            Repuestos Sugeridos ({{ inspeccion.repuestos_sugeridos?.length || 0 }})
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
    :icon="IconRefresh"
    icon-class="text-amber-600 dark:text-amber-400"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    variant="primary"
    :is-deleting="isReopening"
    @confirm="confirmarReabrir"
    @cancel="showReabrirModal = false"
  />
</template>