<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Car,
  CircleDollarSign,
  Coins,
  Cog,
  FileText,
  LayoutDashboard,
  Package,
  Wrench,
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { formatCurrency, formatNumber } from '../../../shared/utils/format';
import { useAuthStore } from '../../auth/stores/authStore';
import { DIAS_ALERTA_EN_TALLER, useDashboard } from '../composables/useDashboard';
import AlertasInventario from './AlertasInventario.vue';
import BarrasDistribucionChart from './BarrasDistribucionChart.vue';
import DistribucionTipoChart from './DistribucionTipoChart.vue';
import FiltrosDashboard from './FiltrosDashboard.vue';
import FlujoOperativoTable from './FlujoOperativoTable.vue';
import KpiCard from './KpiCard.vue';
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
  secciones,
  granularidad,
  etiquetaPeriodo,
  nombreSucursal,
  cargar,
  cargarSucursales,
  aplicarRango,
  aplicarFechas,
  seleccionarSucursal,
} = useDashboard();

const mostrarError = ref(true);

/** ¿El rol ve este bloque? Sin `secciones` (API anterior) se muestra todo. */
function ve(seccion) {
  return secciones.value[seccion] !== false;
}

// La fila de KPIs se adapta a cuántas tarjetas ve el rol (clases completas
// para que Tailwind las genere).
const COLUMNAS_KPI = ['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5'];
const columnasKpi = computed(() => {
  const visibles = ['vehiculos_en_taller', 'facturacion', 'citas', 'cotizaciones_por_aprobar', 'inventario']
    .filter(ve).length;
  return COLUMNAS_KPI[visibles] || 'xl:grid-cols-5';
});

const authStore = useAuthStore();

const nombreUsuario = computed(() => {
  const usuario = authStore.user || {};
  const nombre = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim();
  return nombre || usuario.username || 'bienvenido';
});

onMounted(() => {
  cargar();
  // El selector de taller solo se muestra con «Todos los talleres».
  if (authStore.esTodosLosTalleres) cargarSucursales();
});

const vehiculosDemorados = computed(() => kpis.value.vehiculos_demorados ?? 0);
const diasAlertaTaller = computed(() => kpis.value.dias_alerta_en_taller ?? DIAS_ALERTA_EN_TALLER);

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
          <LayoutDashboard class="w-5 h-5 text-brand-700" aria-hidden="true" />
          ¡Hola, {{ nombreUsuario }}!
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
      <FiltrosDashboard
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

        <div class="grid gap-4 mb-4 sm:grid-cols-2" :class="columnasKpi">
          <KpiCard
            v-if="ve('vehiculos_en_taller')"
            titulo="Vehículos en taller"
            :valor="kpis.vehiculos_en_taller ?? 0"
            :subtitulo="`${vehiculosDemorados} con +${diasAlertaTaller} días`"
            :detalle="`Recepciones sin salida registrada · ${vehiculosDemorados} con más de ${diasAlertaTaller} días`"
            :estado="vehiculosDemorados > 0 ? 'aviso' : 'ok'"
            :icono="Car"
            href="/crud/recepciones/"
            texto-accion="Ver recepciones"
          />

          <KpiCard
            v-if="ve('facturacion')"
            titulo="Facturación"
            :subtitulo="`${kpis.ordenes_periodo ?? 0} ${kpis.ordenes_periodo === 1 ? 'orden' : 'órdenes'}`"
            :detalle="subtituloFacturacion"
            :icono="CircleDollarSign"
            :ilustracion="Coins"
            href="/crud/ordenes/"
            texto-accion="Ver órdenes"
          >
            <template #valor>
              <span class="inline-flex items-center flex-wrap gap-2">
                <span>{{ valorFacturacion }}</span>
                <span
                  v-if="variacionFacturacion !== null && variacionFacturacion !== undefined"
                  class="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full tracking-normal"
                  :class="variacionFacturacion >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-accent-50 text-accent-600 dark:bg-accent-600/20 dark:text-accent-400'"
                  :title="`Facturación del mes anterior: ${formatCurrency(kpis.facturacion_mes_anterior ?? 0)}`"
                >
                  <component :is="variacionFacturacion >= 0 ? ArrowUp : ArrowDown" class="w-3 h-3" aria-hidden="true" />
                  {{ Math.abs(variacionFacturacion) }} %
                </span>
              </span>
            </template>
          </KpiCard>

          <KpiCard
            v-if="ve('citas')"
            titulo="Citas de hoy"
            :valor="kpis.citas_hoy ?? 0"
            :subtitulo="kpis.tasa_conversion_cita_pct === null || kpis.tasa_conversion_cita_pct === undefined
              ? 'Sin citas en el periodo'
              : `${kpis.citas_convertidas_periodo ?? 0}/${kpis.citas_periodo ?? 0} convertidas`"
            :detalle="subtituloCitas"
            :estado="(kpis.citas_pendientes_hoy ?? 0) > 0 ? 'aviso' : 'ok'"
            :icono="CalendarDays"
            href="/crud/citas/"
            texto-accion="Ver citas"
          />

          <KpiCard
            v-if="ve('cotizaciones_por_aprobar')"
            titulo="Por aprobar"
            :valor="kpis.cotizaciones_pendientes ?? 0"
            :subtitulo="formatCurrency(kpis.monto_cotizaciones_pendientes ?? 0)"
            :detalle="`Cotizaciones por aprobar · ${subtituloCotizaciones}`"
            :estado="(kpis.cotizaciones_pendientes ?? 0) > 0 ? 'aviso' : 'neutro'"
            :icono="FileText"
            :ilustracion="Wrench"
            href="/crud/cotizaciones/"
            texto-accion="Ver cotizaciones"
          />

          <KpiCard
            v-if="ve('inventario')"
            titulo="Inventario"
            :valor="kpis.alertas_stock_bajo ?? 0"
            :subtitulo="(kpis.repuestos_agotados ?? 0) > 0
              ? `${kpis.repuestos_agotados} agotados`
              : ((kpis.alertas_stock_bajo ?? 0) > 0 ? 'Bajo el stock mínimo' : 'Sin alertas')"
            :detalle="subtituloStock"
            :estado="(kpis.repuestos_agotados ?? 0) > 0 ? 'alerta' : ((kpis.alertas_stock_bajo ?? 0) > 0 ? 'aviso' : 'ok')"
            :icono="Package"
            :ilustracion="Cog"
            href="/crud/repuestos/"
            texto-accion="Ver repuestos"
          />
        </div>

        <div v-if="ve('tendencia') || ve('ordenes')" class="grid gap-4 mb-4 xl:grid-cols-3">
          <section v-if="ve('tendencia')" class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default" :class="ve('ordenes') ? 'xl:col-span-2' : 'xl:col-span-3'">
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

          <section v-if="ve('ordenes')" class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default" :class="ve('tendencia') ? '' : 'xl:col-span-3'">
            <div class="mb-2">
              <h2 class="text-lg font-semibold text-heading">Tipos de trabajo</h2>
              <p class="text-sm text-body">Órdenes del periodo por tipo de ingreso</p>
            </div>
            <DistribucionTipoChart :datos="distribucionTipo" />
          </section>
        </div>

        <div v-if="ve('ordenes') || ve('categoria_servicio')" class="grid gap-4 mb-4 xl:grid-cols-2">
          <section v-if="ve('ordenes')" class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default" :class="ve('categoria_servicio') ? '' : 'xl:col-span-2'">
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

          <section v-if="ve('categoria_servicio')" class="p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default" :class="ve('ordenes') ? '' : 'xl:col-span-2'">
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

        <div v-if="ve('vehiculos_en_taller') || ve('citas') || ve('inventario')" class="grid gap-4 mb-4 xl:grid-cols-3">
          <div v-if="ve('vehiculos_en_taller') || ve('citas')" :class="ve('inventario') ? 'xl:col-span-2' : 'xl:col-span-3'">
            <FlujoOperativoTable
              :recepciones="recepciones"
              :citas="citas"
              :cargando="cargando"
              :periodo="`${periodo?.desde} a ${periodo?.hasta}`"
            />
          </div>
          <AlertasInventario
            v-if="ve('inventario')"
            :class="ve('vehiculos_en_taller') || ve('citas') ? '' : 'xl:col-span-3'"
            :items="stockBajo"
            :alertas="kpis.alertas_stock_bajo ?? 0"
            :agotados="kpis.repuestos_agotados ?? 0"
            :cargando="cargando"
          />
        </div>

        <OrdenesCriticasTable
          v-if="ve('ordenes')"
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
