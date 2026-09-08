<script setup>
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, User, Car, ClipboardList, ReceiptText, CircleDollarSign, Wrench, Package, SquarePen } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { ordenesService } from '../services/ordenesService';
import Alert from '../../../shared/components/Alert.vue';

const orden = ref(null);
const loading = ref(true);
const error = ref('');
const ordenId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const cliente = computed(() => orden.value?.cliente || null);
const vehiculo = computed(() => orden.value?.vehiculo || null);

const estadoBadge = computed(() => {
  const map = {
    INGRESADO: { label: 'En Recepción / Diagnóstico', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    EN_PROCESO: { label: 'En Trabajo / Ejecución', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    COMPLETADO: { label: 'Trabajo Listo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    ENTREGADO: { label: 'Entregado y Cerrado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    CANCELADO: { label: 'Anulado / Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };
  return map[orden.value?.estado] || { label: orden.value?.estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
});

const prioridadBadge = computed(() => {
  const map = {
    BAJA: { label: 'Baja', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    MEDIA: { label: 'Media', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    ALTA: { label: 'Alta', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    URGENTE: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };
  return map[orden.value?.prioridad] || { label: orden.value?.prioridad || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
});

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function goTo(path) {
  window.location.assign(path);
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
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400">/ <a href="/crud/ordenes/" class="hover:text-primary-600">Órdenes</a></li>
        <li class="text-gray-400">/ Detalle orden {{ orden?.numero_orden || '' }}</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        title="Volver al listado"
        class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        @click="goTo('/crud/ordenes/')"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
        Orden de Trabajo {{ orden?.numero_orden || '' }}
      </h1>
      <span v-if="orden" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium" :class="estadoBadge.color">
        {{ estadoBadge.label }}
      </span>
      <span v-if="orden" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium" :class="prioridadBadge.color">
        Prioridad {{ prioridadBadge.label }}
      </span>
    </div>
  </div>

  <div class="p-4">
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <div v-if="error" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-200">
        {{ error }}
      </div>

      <div v-if="loading" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Cargando orden de trabajo...
      </div>

      <div v-else-if="!orden" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Orden de trabajo no encontrada.
      </div>

      <template v-else>
        <div class="flex items-center justify-end gap-2 mb-6">
          <button
            type="button"
            title="Editar orden de trabajo"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 rounded-lg border border-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-gray-800"
            @click="goTo(`/crud/ordenes/editar/?id=${orden.id}`)"
          >
            <SquarePen class="w-4 h-4" />
            Editar
          </button>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <User class="w-6 h-6 text-gray-800 dark:text-white" />
            Información General
          </span>
        </h4>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
          </div>
        </dl>

        <h5 class="mt-8 mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.placa || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
          </div>
        </dl>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <ClipboardList class="w-6 h-6 text-gray-800 dark:text-white" />
            Datos de la Orden
          </span>
        </h4>

        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nº Orden</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ orden.numero_orden || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Taller</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ orden.sucursal_nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Trabajo</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ orden.tipo_trabajo_display || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Asesor</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ orden.asesor_nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Mecánico Principal</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ orden.mecanico_nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Ingreso</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_ingreso || orden.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Entrega</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_entrega) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cotización de Origen</dt>
            <dd class="mt-1 text-sm font-semibold">
              <a
                v-if="orden.cotizacion_origen"
                :href="`/crud/cotizaciones/editar/?id=${orden.cotizacion_origen}`"
                class="text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {{ orden.cotizacion_origen_numero || `#${orden.cotizacion_origen}` }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Inspección</dt>
            <dd class="mt-1 text-sm font-semibold">
              <a
                v-if="orden.inspeccion?.id"
                :href="`/crud/inspecciones/ver/?id=${orden.inspeccion.id}`"
                class="text-purple-600 hover:underline dark:text-purple-400"
              >
                {{ orden.inspeccion.numero_inspeccion || `#${orden.inspeccion.id}` }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div v-if="orden.recepciones?.length">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recepción / es</dt>
            <dd class="mt-1 text-sm font-semibold">
              <a
                v-for="recepcion in orden.recepciones"
                :key="recepcion.id"
                :href="`/crud/recepciones/ver/?id=${recepcion.id}`"
                class="text-blue-600 hover:underline dark:text-blue-400"
              >
                {{ recepcion.numero_recepcion || `#${recepcion.id}` }}
                <span v-if="recepcion !== orden.recepciones[orden.recepciones.length - 1]" class="text-gray-400">, </span>
              </a>
            </dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Observaciones Internas</dt>
            <dd class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ orden.observaciones_internas || '—' }}</dd>
          </div>
        </dl>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <CircleDollarSign class="w-6 h-6 text-gray-800 dark:text-white" />
            Montos de la Orden
          </span>
        </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Servicios</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_servicios) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Repuestos</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_repuestos) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Descuento</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.descuento) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Neto</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.subtotal_neto) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">IVA (15%)</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.monto_iva) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total</dt>
            <dd class="mt-1 text-sm text-lg font-bold text-gray-900 dark:text-white">{{ formatNumber(orden.total) }} USD</dd>
          </div>
        </dl>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Wrench class="w-6 h-6 text-gray-800 dark:text-white" />
            Servicios / Mano de Obra
          </span>
        </h4>
        <div v-if="orden.servicios?.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th scope="col" class="px-4 py-3">Descripción</th>
                <th scope="col" class="px-4 py-3">Horas</th>
                <th scope="col" class="px-4 py-3">P. Unitario</th>
                <th scope="col" class="px-4 py-3">Subtotal</th>
                <th scope="col" class="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-600 dark:bg-gray-800">
              <tr v-for="servicio in orden.servicios" :key="servicio.id">
                <td class="px-4 py-3 text-gray-900 dark:text-white">{{ servicio.descripcion || '—' }}</td>
                <td class="px-4 py-3">{{ servicio.horas_aplicadas ?? '—' }}</td>
                <td class="px-4 py-3">{{ formatNumber(servicio.precio_unitario) }}</td>
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ formatNumber(servicio.subtotal) }}</td>
                <td class="px-4 py-3">
                  <span :class="['px-2 py-1 rounded-full text-xs font-medium', servicio.completado ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300']">
                    {{ servicio.completado ? 'Completado' : 'Pendiente' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
          Sin servicios registrados.
        </div>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Package class="w-6 h-6 text-gray-800 dark:text-white" />
            Repuestos
          </span>
        </h4>
        <div v-if="orden.repuestos?.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th scope="col" class="px-4 py-3">Código</th>
                <th scope="col" class="px-4 py-3">Descripción</th>
                <th scope="col" class="px-4 py-3">Cantidad</th>
                <th scope="col" class="px-4 py-3">P. Unitario</th>
                <th scope="col" class="px-4 py-3">Subtotal</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-600 dark:bg-gray-800">
              <tr v-for="repuesto in orden.repuestos" :key="repuesto.id">
                <td class="px-4 py-3 text-gray-900 dark:text-white">{{ repuesto.codigo_repuesto || '—' }}</td>
                <td class="px-4 py-3 text-gray-900 dark:text-white">{{ repuesto.descripcion || '—' }}</td>
                <td class="px-4 py-3">{{ repuesto.cantidad ?? '—' }}</td>
                <td class="px-4 py-3">{{ formatNumber(repuesto.precio_unitario) }}</td>
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ formatNumber(repuesto.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
          Sin repuestos registrados.
        </div>
      </template>
    </div>
  </div>
</template>