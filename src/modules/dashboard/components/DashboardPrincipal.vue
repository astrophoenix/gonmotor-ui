<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  AlertTriangle,
  Car,
  CircleDollarSign,
  Hourglass,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { useDashboard } from '../composables/useDashboard';
import KpiCard from './KpiCard.vue';
import QuickActions from './QuickActions.vue';
import TendenciaIngresosChart from './TendenciaIngresosChart.vue';
import DistribucionServiciosChart from './DistribucionServiciosChart.vue';
import RecepcionesHoy from './RecepcionesHoy.vue';
import OrdenesActivas from './OrdenesActivas.vue';

const {
  datos,
  cargando,
  error,
  actualizadoEn,
  kpis,
  tendencia,
  distribucionServicios,
  filasRecepciones,
  sinRecepcionesHoy,
  ordenesActivas,
  stockBajo,
  cargar,
} = useDashboard();

const mostrarError = ref(true);

onMounted(() => {
  cargar();
});

const primeraCarga = computed(() => cargando.value && !datos.value);

const valorVehiculosEnTaller = computed(() => kpis.value.vehiculos_en_taller ?? 0);

const valorPendientesAprobacion = computed(() => kpis.value.ordenes_pendientes_aprobacion ?? 0);

const valorFacturacion = computed(() => formatCurrency(kpis.value.facturacion_mes ?? 0));

const subtituloFacturacion = computed(() => {
  const partes = [`${kpis.value.ordenes_mes ?? 0} órdenes no anuladas del mes`];
  const variacion = kpis.value.variacion_facturacion_pct;
  if (variacion !== null && variacion !== undefined) {
    partes.push(`${variacion > 0 ? '+' : ''}${variacion}% vs. mes anterior`);
  } else {
    partes.push('sin datos del mes anterior');
  }
  return partes.join(' · ');
});

const valorAlertasStock = computed(() => kpis.value.alertas_stock_bajo ?? 0);

const subtituloAlertasStock = computed(() => (valorAlertasStock.value > 0
  ? 'Repuestos por debajo del stock mínimo'
  : 'Sin alertas de reposición'));

const horaActualizacion = computed(() => {
  if (!actualizadoEn.value) return '';
  return actualizadoEn.value.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
});

const resumenStockBajo = computed(() => stockBajo.value.slice(0, 3));

async function refrescar() {
  mostrarError.value = true;
  await cargar();
}
</script>

<template>
  <div>
    <div class="px-4 py-3 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
      <div class="w-full">
        <nav class="flex mb-1.5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center text-gray-700 dark:text-gray-300" aria-current="page">
              <LayoutDashboard class="w-4 h-4 mr-1.5" aria-hidden="true" />
              Inicio
            </li>
          </ol>
        </nav>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <h1 class="inline-flex items-center gap-2 text-md font-semibold text-gray-900 sm:text-xl dark:text-white">
            Dashboard del taller
          </h1>

          <div class="flex items-center gap-3">
            <span v-if="horaActualizacion" class="text-xs text-body">
              Actualizado {{ horaActualizacion }}
            </span>
            <button
              type="button"
              :disabled="cargando"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-xs text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800"
              @click="refrescar"
            >
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': cargando }" aria-hidden="true" />
              Actualizar
            </button>
          </div>
        </div>

        <Alert
          v-if="error && mostrarError"
          type="error"
          title="No se pudo cargar el dashboard"
          :message="error"
          dismissible
          @dismiss="mostrarError = false"
        />
      </div>
    </div>

    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <template v-if="primeraCarga">
        <div class="grid gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          <div v-for="indice in 4" :key="indice" class="h-28 border rounded-base border-default bg-neutral-primary-soft animate-pulse" />
        </div>
        <div class="h-96 border rounded-base border-default bg-neutral-primary-soft animate-pulse" aria-hidden="true" />
        <p class="mt-3 text-sm text-body" role="status">Cargando indicadores del taller…</p>
      </template>

      <template v-else>
        <QuickActions />

        <div class="grid gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            titulo="Vehículos en taller"
            :valor="valorVehiculosEnTaller"
            subtitulo="Recepciones sin salida registrada"
            :icono="Car"
            tono="brand"
            href="/crud/recepciones/"
            texto-accion="Ver recepciones"
          />
          <KpiCard
            titulo="Pendientes de aprobación"
            :valor="valorPendientesAprobacion"
            subtitulo="Órdenes en espera de aprobación o repuestos"
            :icono="Hourglass"
            tono="amber"
            href="/crud/ordenes/"
            texto-accion="Ver órdenes"
          />
          <KpiCard
            titulo="Facturación del mes"
            :valor="valorFacturacion"
            :subtitulo="subtituloFacturacion"
            :icono="CircleDollarSign"
            tono="emerald"
            href="/crud/ordenes/"
            texto-accion="Ver órdenes"
          />
          <KpiCard
            titulo="Alertas de stock bajo"
            :valor="valorAlertasStock"
            :subtitulo="subtituloAlertasStock"
            :icono="AlertTriangle"
            tono="accent"
            href="/crud/repuestos/"
            texto-accion="Ver repuestos"
          />
        </div>

        <div
          v-if="valorAlertasStock > 0 && resumenStockBajo.length"
          class="p-3 mb-4 border rounded-base bg-accent-100/50 border-accent-400/40 dark:bg-accent-600/20"
          role="status"
        >
          <p class="flex items-center gap-2 text-sm font-medium text-accent-600 dark:text-accent-400">
            <AlertTriangle class="w-4 h-4" aria-hidden="true" />
            Repuestos que requieren reposición
          </p>
          <ul class="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 text-sm text-body">
            <li v-for="repuesto in resumenStockBajo" :key="repuesto.id">
              <span class="font-medium text-heading">{{ repuesto.nombre }}</span>
              ({{ repuesto.codigo }})
              — {{ repuesto.stock_actual }} / mín. {{ repuesto.stock_minimo }}
            </li>
          </ul>
        </div>

        <div class="grid gap-4 mb-4 xl:grid-cols-3">
          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default xl:col-span-2">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div>
                <h2 class="text-lg font-semibold text-heading">Tendencia de ingresos y reparaciones</h2>
                <p class="text-sm text-body">Facturación mensual y órdenes registradas · últimos 6 meses</p>
              </div>
            </div>
            <TendenciaIngresosChart :datos="tendencia" />
          </section>

          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <div class="mb-2">
              <h2 class="text-lg font-semibold text-heading">Tipos de trabajo</h2>
              <p class="text-sm text-body">Distribución de órdenes por motivo de ingreso</p>
            </div>
            <DistribucionServiciosChart :datos="distribucionServicios" />
          </section>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <RecepcionesHoy
            :recepciones="filasRecepciones"
            :cargando="cargando"
            :sin-recepciones-hoy="sinRecepcionesHoy"
          />
          <OrdenesActivas :ordenes="ordenesActivas" :cargando="cargando" />
        </div>
      </template>
    </div>
  </div>
</template>
