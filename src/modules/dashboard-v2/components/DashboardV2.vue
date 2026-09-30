<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Car,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { formatCurrency, formatNumber } from '../../../shared/utils/format';
import { useDashboardV2 } from '../composables/useDashboardV2';
import AlertasInventario from './AlertasInventario.vue';
import BarrasDistribucionChart from './BarrasDistribucionChart.vue';
import DistribucionTipoChart from './DistribucionTipoChart.vue';
import FiltrosDashboardV2 from './FiltrosDashboardV2.vue';
import FlujoOperativoTable from './FlujoOperativoTable.vue';
import KpiCard from '../../dashboard/components/KpiCard.vue';
import OrdenesCriticasTable from './OrdenesCriticasTable.vue';
import QuickActionsV2 from './QuickActionsV2.vue';
import TendenciaFinancieraChart from './TendenciaFinancieraChart.vue';

const {
  cargando,
  error,
  actualizadoEn,
  rango,
  fechaDesde,
  fechaHasta,
  sucursal,
  sucursales,
  cargandoSucursales,
  errorSucursales,
  periodo,
  kpis,
  tendencia,
  distribucionTipo,
  distribucionEstado,
  distribucionCategoria,
  recepciones,
  citas,
  ordenesActivas,
  stockBajo,
  granularidad,
  etiquetaPeriodo,
  nombreSucursal,
  cargar,
  cargarSucursales,
  aplicarRango,
  aplicarFechas,
  seleccionarSucursal,
} = useDashboardV2();

const mostrarError = ref(true);

onMounted(() => {
  cargar();
  cargarSucursales();
});

const primeraCarga = computed(() => cargando.value && !periodo.value);

const valorFacturacion = computed(() => formatCurrency(kpis.value.facturacion_mes ?? 0));

const variacionFacturacion = computed(() => kpis.value.variacion_facturacion_pct);

const subtituloFacturacion = computed(() => {
  const ticket = kpis.value.ticket_promedio;
  const ticketTexto = ticket === null || ticket === undefined
    ? 'sin órdenes en el periodo'
    : `ticket promedio ${formatCurrency(ticket)}`;
  return `${ticketTexto} · ${kpis.value.ordenes_periodo ?? 0} órdenes en el periodo`;
});

const subtituloCitas = computed(() => {
  const partes = [`${kpis.value.citas_pendientes_hoy ?? 0} pendientes hoy`];
  const conversion = kpis.value.tasa_conversion_cita_pct;
  if (conversion === null || conversion === undefined) {
    partes.push('sin citas en el periodo');
  } else {
    partes.push(
      `${kpis.value.citas_convertidas_periodo ?? 0} de ${kpis.value.citas_periodo ?? 0} convertidas (${formatNumber(conversion, 1)}%)`
    );
  }
  return partes.join(' · ');
});

const subtituloCotizaciones = computed(() => {
  const monto = formatCurrency(kpis.value.monto_cotizaciones_pendientes ?? 0);
  const aprobacion = kpis.value.tasa_aprobacion_pct;
  const aprobacionTexto = aprobacion === null || aprobacion === undefined
    ? 'sin cotizaciones resueltas'
    : `aprobación ${formatNumber(aprobacion, 1)}%`;
  return `${monto} pendientes · ${aprobacionTexto}`;
});

const subtituloStock = computed(() => {
  const agotados = kpis.value.repuestos_agotados ?? 0;
  return agotados > 0
    ? `${agotados} agotados · reposición inmediata`
    : 'Repuestos por debajo del stock mínimo';
});

const hayDatos = computed(() => Boolean(periodo.value));

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
            <li class="inline-flex items-center text-gray-700 dark:text-gray-300">
              <a href="/" class="hover:text-primary-600 dark:hover:text-primary-400">Inicio</a>
            </li>
            <li aria-current="page" class="inline-flex items-center text-gray-700 dark:text-gray-300">
              <LayoutDashboard class="w-4 h-4 mx-1.5" aria-hidden="true" />
              Tablero ejecutivo
            </li>
          </ol>
        </nav>

        <h1 class="inline-flex items-center gap-2 text-md font-semibold text-gray-900 sm:text-xl dark:text-white">
          <Building2 class="w-5 h-5 text-brand-500" aria-hidden="true" />
          Tablero ejecutivo del taller
        </h1>

        <Alert
          v-if="error && mostrarError"
          type="error"
          title="No se pudo cargar el tablero ejecutivo"
          :message="error"
          dismissible
          @dismiss="mostrarError = false"
        />
      </div>
    </div>

    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <FiltrosDashboardV2
        :rango="rango"
        :fecha-desde="fechaDesde"
        :fecha-hasta="fechaHasta"
        :sucursal="sucursal"
        :sucursales="sucursales"
        :cargando="cargando"
        :cargando-sucursales="cargandoSucursales"
        :error-sucursales="errorSucursales"
        :actualizado-en="actualizadoEn"
        :etiqueta-periodo="etiquetaPeriodo"
        :nombre-sucursal="nombreSucursal"
        @cambiar-rango="aplicarRango"
        @cambiar-fechas="aplicarFechas"
        @cambiar-sucursal="seleccionarSucursal"
        @refrescar="refrescar"
      />

      <template v-if="primeraCarga">
        <div class="grid gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-5" aria-hidden="true">
          <div v-for="indice in 5" :key="indice" class="h-28 border rounded-base border-default bg-neutral-primary-soft animate-pulse" />
        </div>
        <div class="grid gap-4 mb-4 xl:grid-cols-3" aria-hidden="true">
          <div class="h-96 border rounded-base border-default bg-neutral-primary-soft animate-pulse xl:col-span-2" />
          <div class="h-96 border rounded-base border-default bg-neutral-primary-soft animate-pulse" />
        </div>
        <p class="mt-3 text-sm text-body" role="status">Cargando indicadores del periodo…</p>
      </template>

      <template v-else-if="hayDatos">
        <QuickActionsV2 />

        <div class="grid gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            titulo="Vehículos en taller"
            :valor="kpis.vehiculos_en_taller ?? 0"
            subtitulo="Recepciones sin salida registrada"
            :icono="Car"
            tono="brand"
            href="/crud/recepciones/"
            texto-accion="Ver recepciones"
          />

          <KpiCard
            titulo="Facturación del mes"
            :subtitulo="subtituloFacturacion"
            :icono="CircleDollarSign"
            tono="emerald"
            href="/crud/ordenes/"
            texto-accion="Ver órdenes"
          >
            <template #valor>
              <span class="inline-flex items-baseline flex-wrap gap-2">
                <span>{{ valorFacturacion }}</span>
                <span
                  v-if="variacionFacturacion !== null && variacionFacturacion !== undefined"
                  class="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  :class="variacionFacturacion >= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-accent-100 text-accent-600 dark:bg-accent-600/20 dark:text-accent-400'"
                  :title="`Facturación del mes anterior: ${formatCurrency(kpis.facturacion_mes_anterior ?? 0)}`"
                >
                  {{ variacionFacturacion >= 0 ? '+' : '' }}{{ variacionFacturacion }}%
                </span>
              </span>
            </template>
          </KpiCard>

          <KpiCard
            titulo="Pipeline de citas"
            :valor="kpis.citas_hoy ?? 0"
            :subtitulo="subtituloCitas"
            :icono="CalendarDays"
            tono="primary"
            href="/crud/citas/"
            texto-accion="Ver citas"
          />

          <KpiCard
            titulo="Cotizaciones por aprobar"
            :valor="kpis.cotizaciones_pendientes ?? 0"
            :subtitulo="subtituloCotizaciones"
            :icono="FileText"
            tono="amber"
            href="/crud/cotizaciones/"
            texto-accion="Ver cotizaciones"
          />

          <KpiCard
            titulo="Alertas de inventario"
            :valor="kpis.alertas_stock_bajo ?? 0"
            :subtitulo="subtituloStock"
            :icono="AlertTriangle"
            tono="accent"
            href="/crud/repuestos/"
            texto-accion="Ver repuestos"
          />
        </div>

        <div class="grid gap-4 mb-4 xl:grid-cols-3">
          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default xl:col-span-2">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div>
                <h2 class="text-lg font-semibold text-heading">Tendencia financiera y operativa</h2>
                <p class="text-sm text-body">
                  Ingresos frente a órdenes creadas y completadas ·
                  {{ granularidad === 'mes' ? 'agregación mensual' : 'agregación diaria' }}
                </p>
              </div>
            </div>
            <TendenciaFinancieraChart :datos="tendencia" :granularidad="granularidad" />
          </section>

          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <div class="mb-2">
              <h2 class="text-lg font-semibold text-heading">Tipos de trabajo</h2>
              <p class="text-sm text-body">Órdenes del periodo por tipo de ingreso</p>
            </div>
            <DistribucionTipoChart :datos="distribucionTipo" />
          </section>
        </div>

        <div class="grid gap-4 mb-4 xl:grid-cols-2">
          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <div class="mb-2">
              <h2 class="text-lg font-semibold text-heading">Embudo de estados</h2>
              <p class="text-sm text-body">Órdenes del periodo por etapa del proceso</p>
            </div>
            <BarrasDistribucionChart
              :datos="distribucionEstado"
              campo="ordenes"
              metrica="estado de la orden"
              unidad="órdenes"
              :altura="280"
            />
          </section>

          <section class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <div class="mb-2">
              <h2 class="text-lg font-semibold text-heading">Categorías de servicio</h2>
              <p class="text-sm text-body">Trabajos del catálogo usados en las inspecciones</p>
            </div>
            <BarrasDistribucionChart
              :datos="distribucionCategoria"
              campo="servicios"
              metrica="categoría de servicio"
              unidad="servicios"
              :altura="280"
            />
          </section>
        </div>

        <div class="grid gap-4 mb-4 xl:grid-cols-3">
          <div class="xl:col-span-2">
            <FlujoOperativoTable
              :recepciones="recepciones"
              :citas="citas"
              :cargando="cargando"
              :periodo="`${periodo?.desde} a ${periodo?.hasta}`"
            />
          </div>
          <AlertasInventario
            :items="stockBajo"
            :alertas="kpis.alertas_stock_bajo ?? 0"
            :agotados="kpis.repuestos_agotados ?? 0"
            :cargando="cargando"
          />
        </div>

        <OrdenesCriticasTable
          :ordenes="ordenesActivas"
          :cargando="cargando"
          :periodo="`${periodo?.desde} a ${periodo?.hasta}`"
        />
      </template>

      <p v-else-if="!cargando" class="py-8 text-sm text-center text-body" role="status">
        No hay datos disponibles para el periodo seleccionado.
      </p>
    </div>
  </div>
</template>
