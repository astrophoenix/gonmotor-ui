<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  Car,
  Camera,
  ClipboardList,
  CircleDollarSign,
  Package,
  SquarePen,
  X,
  FileText,
  IdCardIcon,
  Phone,
  Mail,
  ShieldCheck,
  TagIcon,
  Shapes,
  PaintBucket,
  Image as ImageIcon,
  Toolbox,
  Wrench,
  Workflow,
} from 'lucide-vue-next';
import { API_BASE_URL } from '../../../shared/config/env';
import { ordenesService } from '../services/ordenesService';
import { PRIORIDADES_ORDEN } from '../constants/estadosOrden';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import EstadoOrdenBadge from './EstadoOrdenBadge.vue';
import { relacionesDeOrden } from '../../../shared/utils/relacionesFlujo';

const orden = ref(null);
const loading = ref(true);
const error = ref('');
const previewImg = ref('');
const showImageModal = ref(false);

const activeTab = ref('resumen');
const TAB_ORDER = ['resumen', 'trabajo', 'montos', 'evidencia'];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    activeTab.value = TAB_ORDER[next];
  }
}

const ordenId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const numeroOrden = computed(() => orden.value?.numero_orden || '—');
const cliente = computed(() => orden.value?.cliente || null);
const vehiculo = computed(() => orden.value?.vehiculo || null);

const servicios = computed(() => orden.value?.servicios || []);
const repuestos = computed(() => orden.value?.repuestos || []);

const fotosOrden = computed(() => orden.value?.fotos || []);
const inspeccion = computed(() => orden.value?.inspeccion || null);
const fotosInspeccion = computed(() => inspeccion.value?.fotos || []);
const recepcionesConFotos = computed(() =>
  (orden.value?.recepciones || []).filter((r) => r.fotos && r.fotos.length)
);

const relacionesOrden = computed(() => relacionesDeOrden(orden.value));

const PRIORIDAD_BADGES = {
  BAJA: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  MEDIA: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ALTA: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  URGENTE: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const prioridadLabel = computed(() => {
  const encontrada = PRIORIDADES_ORDEN.find((p) => p.value === orden.value?.prioridad);
  return encontrada?.label || orden.value?.prioridad_display || orden.value?.prioridad || '—';
});

const prioridadBadge = computed(() =>
  PRIORIDAD_BADGES[orden.value?.prioridad] || PRIORIDAD_BADGES.MEDIA
);

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

function formatoHoras(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 })} h`;
}

function ivaLabel(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%`;
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
    :title="orden?.cliente?.nombre"
    :record-number="orden ? numeroOrden : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Órdenes', href: '/crud/ordenes/' },
      { label: 'Orden de trabajo' },
    ]"
  >
    <template #badges>
      <template v-if="orden">
        <EstadoOrdenBadge
          :estado="orden.estado"
          :estado-display="orden.estado_display"
          size="md"
        />
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="prioridadBadge.color"
        >
          Prioridad {{ prioridadLabel }}
        </span>
      </template>
    </template>

    <template #actions>
      <a
        v-if="orden"
        :href="`/crud/ordenes/editar/?id=${orden.id}`"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-700 rounded-base border border-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 dark:text-brand-400 dark:border-brand-400 dark:hover:bg-gray-700"
      >
        <SquarePen class="w-4 h-4" aria-hidden="true" />
        Editar
      </a>
    </template>
  </EntityHeader>

  <div class="p-4">
    <div class="relative mx-auto max-w-8xl">
      <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''"/>

      <div v-if="loading" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Cargando orden de trabajo...
      </div>

      <div v-else-if="!orden" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Orden de trabajo no encontrada.
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
                  {{ cliente?.nombre || '—' }}
                </p>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</span>
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
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="min-w-0">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Asignación
                </p>
                <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {{ orden.mecanico_nombre || 'Sin mecánico asignado' }}
                </p>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Wrench class="w-3.5 h-3.5 shrink-0" /> Mecánico:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ orden.mecanico_nombre || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <ShieldCheck class="w-3.5 h-3.5 shrink-0" /> Asesor:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ orden.asesor_nombre || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <ClipboardList class="w-3.5 h-3.5 shrink-0" /> Taller:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ orden.sucursal_nombre || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex flex-wrap -mb-px">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'resumen' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'resumen'">
                  <FileText class="w-4 h-4" />
                  1. Resumen
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'trabajo' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'trabajo'">
                  <Toolbox class="w-4 h-4" />
                  2. Trabajo
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'montos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'montos'">
                  <CircleDollarSign class="w-4 h-4" />
                  3. Montos
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'evidencia' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'evidencia'">
                  <ImageIcon class="w-4 h-4" />
                  4. Evidencia
                </button>
              </nav>
            </div>

            <!-- Resumen -->
            <div v-show="activeTab === 'resumen'" class="p-4 space-y-6">
              <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de trabajo</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                    <TipoTrabajoBadge :tipo="orden.tipo_trabajo" size="md" />
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Prioridad</dt>
                  <dd class="mt-0.5">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="prioridadBadge.color">
                      {{ prioridadLabel }}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd class="mt-0.5">
                    <EstadoOrdenBadge :estado="orden.estado" :estado-display="orden.estado_display" size="sm" />
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° Orden</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold text-gray-900 dark:text-white">{{ orden.numero_orden || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Taller</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.sucursal_nombre || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Asesor</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.asesor_nombre || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Mecánico principal</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.mecanico_nombre || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de ingreso</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_ingreso || orden.created_at) }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de entrega</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_entrega) }}</dd>
                </div>
                <div v-if="orden.estado === 'EN_ESPERA'" class="sm:col-span-2">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Motivo de espera</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.motivo_espera || '—' }}</dd>
                </div>
              </dl>

              <div>
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</p>
                <div class="block w-full p-2.5 text-sm whitespace-pre-line rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
                  {{ orden.observaciones || '—' }}
                </div>
              </div>
            </div>

            <!-- Trabajo -->
            <div v-show="activeTab === 'trabajo'" class="p-4 space-y-8">
              <div>
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <Toolbox class="w-5 h-5 text-gray-800 dark:text-white" />
                    Servicios
                  </span>
                </h4>
                <div v-if="!servicios.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No hay servicios de mano de obra registrados.
                </div>
                <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Servicio</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Horas</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">P. unitario</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Descuento</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">IVA</th>
                        <th class="p-3 text-xs font-medium text-right text-gray-700 uppercase dark:text-gray-300">Neto</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-for="servicio in servicios" :key="servicio.id">
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ servicio.descripcion || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatoHoras(servicio.horas_aplicadas) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatNumber(servicio.precio_unitario) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatNumber(servicio.descuento) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ ivaLabel(servicio.iva_porcentaje) }}</td>
                        <td class="p-3 text-sm font-semibold text-right text-gray-900 dark:text-white">{{ formatNumber(servicio.subtotal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <Package class="w-5 h-5 text-gray-800 dark:text-white" />
                    Repuestos
                  </span>
                </h4>
                <div v-if="!repuestos.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No hay repuestos o materiales registrados.
                </div>
                <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Código</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Repuesto</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Cant.</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">P. unitario</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Descuento</th>
                        <th class="p-3 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">IVA</th>
                        <th class="p-3 text-xs font-medium text-right text-gray-700 uppercase dark:text-gray-300">Neto</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-for="repuesto in repuestos" :key="repuesto.id">
                        <td class="p-3 font-mono text-xs text-gray-500 dark:text-gray-400">{{ repuesto.codigo_repuesto || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ repuesto.descripcion || '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ repuesto.cantidad ?? '—' }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatNumber(repuesto.precio_unitario) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ formatNumber(repuesto.descuento) }}</td>
                        <td class="p-3 text-sm text-gray-900 dark:text-white">{{ ivaLabel(repuesto.iva_porcentaje) }}</td>
                        <td class="p-3 text-sm font-semibold text-right text-gray-900 dark:text-white">{{ formatNumber(repuesto.subtotal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Montos -->
            <div v-show="activeTab === 'montos'" class="p-4 space-y-6">
              <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Servicios</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_servicios) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Repuestos</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_repuestos) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Descuento</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.descuento) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Neto</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_neto) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal base 0%</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_base_0) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal base gravada</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_base_gravada) }} USD</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">IVA total</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.monto_iva) }} USD</dd>
                </div>
              </dl>

              <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
                <span class="text-lg font-bold text-gray-900 dark:text-white">{{ formatNumber(orden.total) }} USD</span>
              </div>
            </div>

            <!-- Evidencia -->
            <div v-show="activeTab === 'evidencia'" class="p-4 space-y-8">
              <div>
                <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Evidencia de la Orden</h5>
                <div v-if="!fotosOrden.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No se registraron fotos de la orden.
                </div>
                <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <figure
                    v-for="foto in fotosOrden"
                    :key="foto.id"
                    class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <button type="button" class="block w-full cursor-zoom-in" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                      <img :src="resolveMediaUrl(foto.imagen)" :alt="foto.descripcion || `Foto ${foto.id}`" class="w-full h-40 object-cover hover:opacity-90" />
                    </button>
                    <figcaption v-if="foto.descripcion" class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{{ foto.descripcion }}</figcaption>
                  </figure>
                </div>
              </div>

              <div v-if="recepcionesConFotos.length">
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <Camera class="w-5 h-5 text-gray-800 dark:text-white" />
                    Recepción del Vehículo
                  </span>
                </h4>
                <div v-for="recepcion in recepcionesConFotos" :key="recepcion.id" class="mb-5 last:mb-0">
                  <h5 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {{ recepcion.numero_recepcion || `Recepción #${recepcion.id}` }}
                  </h5>
                  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <figure
                      v-for="foto in recepcion.fotos"
                      :key="foto.id"
                      class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                    >
                      <button type="button" class="block w-full cursor-zoom-in" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                        <img :src="resolveMediaUrl(foto.imagen)" :alt="foto.tipo_vista_display || `Foto ${foto.id}`" class="w-full h-40 object-cover hover:opacity-90" />
                      </button>
                      <figcaption v-if="foto.tipo_vista_display || foto.descripcion" class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {{ foto.tipo_vista_display || foto.descripcion }}
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </div>

              <div v-if="inspeccion">
                <h4 class="mb-4 text-md font-semibold dark:text-white">
                  <span class="inline-flex items-center gap-2">
                    <ImageIcon class="w-5 h-5 text-gray-800 dark:text-white" />
                    Inspección de Origen
                    <a
                      :href="`/crud/inspecciones/ver/?id=${inspeccion.id}`"
                      class="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {{ inspeccion.numero_inspeccion || `#${inspeccion.id}` }}
                    </a>
                  </span>
                </h4>
                <div v-if="!fotosInspeccion.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
                  No se registraron fotos de la inspección.
                </div>
                <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <figure
                    v-for="foto in fotosInspeccion"
                    :key="foto.id"
                    class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                  >
                    <button type="button" class="block w-full cursor-zoom-in" @click="abrirFoto(resolveMediaUrl(foto.imagen))">
                      <img :src="resolveMediaUrl(foto.imagen)" :alt="foto.descripcion || `Foto ${foto.id}`" class="w-full h-40 object-cover hover:opacity-90" />
                    </button>
                    <figcaption v-if="foto.descripcion" class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{{ foto.descripcion }}</figcaption>
                  </figure>
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

        <!-- Columna derecha -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Resumen de la orden -->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-3">
              <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Resumen de la orden</h2>
            </div>
            <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">N° Orden</dt>
                <dd class="font-mono font-medium text-sm text-black dark:text-white">{{ numeroOrden }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Cliente</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ cliente?.nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Vehículo</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ placaDisplay || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Mecánico</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ orden.mecanico_nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo</dt>
                <dd class="font-medium text-sm text-black dark:text-white"><TipoTrabajoBadge :tipo="orden.tipo_trabajo" size="sm" /></dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Prioridad</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ prioridadLabel }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Estado</dt>
                <dd>
                  <EstadoOrdenBadge :estado="orden.estado" :estado-display="orden.estado_display" size="sm" />
                </dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Total</dt>
                <dd class="font-semibold text-sm text-black dark:text-white">{{ formatNumber(orden.total) }} USD</dd>
              </div>
            </dl>
          </div>

          <!-- Vehículo -->
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
                  <dt class="font-medium text-gray-700 dark:text-gray-300">Marca</dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">Modelo</dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.modelo || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">Año</dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.anio || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">Color</dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.color || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">Kilometraje actual</dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.kilometraje_actual != null ? `${vehiculo.kilometraje_actual} km` : '—' }}</dd>
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
              Recepción, inspección y cotización que originaron esta orden.
            </p>
            <RelacionesFlujo :pasos="relacionesOrden" />
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
</template>