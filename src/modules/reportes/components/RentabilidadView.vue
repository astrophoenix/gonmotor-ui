<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Rentabilidad"
      :breadcrumb="breadcrumb"
      :icon="ChartColumn"
    />

    <div v-if="alert.message" class="px-4 pt-3">
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        :dismissible="alert.dismissible"
        @dismiss="clearAlert"
      />
    </div>

    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <!-- PANEL DE FILTROS -->
      <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default">
        <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
          <h2 class="flex items-center gap-2 text-md font-semibold text-heading">
            <Filter class="w-5 h-5" />
            Búsqueda
          </h2>

          <div class="flex flex-wrap items-center gap-2">
            <FilterActions
              :loading="isLoading"
              search-label="Consultar"
              loading-label="Consultando..."
              @clear="limpiar"
              @search="consultar" />
          </div>
        </div>

        <div class="p-4">
          <div class="flex flex-wrap items-end gap-3 min-w-0">
            <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:shrink-0">
              <label for="filtro-taller" class="block mb-1 text-sm font-medium text-heading">Taller</label>
              <select
                id="filtro-taller"
                v-model="filters.tallerId"
                class="block w-full sm:w-48 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
                <option :value="null">Todos los talleres</option>
                <option v-for="taller in talleres" :key="taller.id" :value="taller.id">{{ tallerLabel(taller) }}</option>
              </select>
            </div>

            <div class="w-full sm:w-40 sm:shrink-0">
              <label for="filtro-fecha-desde" class="block mb-1 text-sm font-medium text-heading">Desde</label>
              <div class="relative">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
                </div>
                <input
                  id="filtro-fecha-desde"
                  ref="fechaDesdeInput"
                  datepicker
                  datepicker-autohide
                  datepicker-format="dd/mm/yyyy"
                  type="text"
                  autocomplete="off"
                  placeholder="dd/mm/aaaa"
                  class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
              </div>
            </div>

            <div class="w-full sm:w-40 sm:shrink-0">
              <label for="filtro-fecha-hasta" class="block mb-1 text-sm font-medium text-heading">Hasta</label>
              <div class="relative">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
                </div>
                <input
                  id="filtro-fecha-hasta"
                  ref="fechaHastaInput"
                  datepicker
                  datepicker-autohide
                  datepicker-format="dd/mm/yyyy"
                  type="text"
                  autocomplete="off"
                  placeholder="dd/mm/aaaa"
                  class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
              </div>
            </div>
          </div>

          <!--p class="mt-3 text-xs text-body">
            <template v-if="periodo.desde || periodo.hasta">
              Periodo: {{ periodo.desde || '—' }} al {{ periodo.hasta || '—' }}
            </template>
            <template v-else>
              No se han seleccionado fechas.
            </template>
          </p-->
        </div>
      </div>
    </div>

    <div v-if="!isLoading && !data && !errorMessage" class="px-4 sm:px-6 lg:px-8 py-8 text-center">
      <BarChart3 class="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">Sin datos</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Selecciona filtros y consulta la rentabilidad.</p>
    </div>

    <div v-if="data && !isLoading" class="px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
      <ResultadoNegocio
        :ingresos="Number(ingresosTotal)"
        :gastos="Number(gastosTotal)"
        :utilidad="Number(utilidadNeta)"
        :taller="tallerConsultado"
        :periodo="periodo"
      />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos</p>
            <InfoPopover etiqueta="Qué significa Ingresos" :secciones="AYUDA_CARDS.ingresos" />
          </div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(ingresosTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Ventas OT entregadas</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Costo de los trabajos</p>
            <InfoPopover etiqueta="Qué significa Costo de los trabajos" :secciones="AYUDA_CARDS.costo" />
          </div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(cmvTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Repuestos: {{ formatCurrency(cmvRepuestos) }} • Servicios: {{ formatCurrency(cmvServicios) }}</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Margen Bruto</p>
            <InfoPopover etiqueta="Qué significa Margen Bruto" :secciones="AYUDA_CARDS.margen" />
          </div>
          <p class="text-xl sm:text-2xl font-bold mt-1" :class="margenBruto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ formatCurrency(margenBruto) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Ingresos − Costo de los trabajos</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos Operativos</p>
            <InfoPopover etiqueta="Qué significa Gastos Operativos" :secciones="AYUDA_CARDS.gastos" />
          </div>
          <p class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ formatCurrency(gastosTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Del periodo</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Utilidad Neta</p>
            <InfoPopover etiqueta="Qué significa Utilidad Neta" :secciones="AYUDA_CARDS.utilidad" />
          </div>
          <p class="text-xl sm:text-2xl font-bold mt-1" :class="utilidadNeta > 0 ? 'text-emerald-600 dark:text-emerald-400' : utilidadNeta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'">{{ formatCurrency(utilidadNeta) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Margen Bruto − Gastos</p>
        </div>
      </div>

      <!-- Cascada: de los ingresos a la utilidad neta -->
      <div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <BarChart3 class="w-5 h-5 mr-2 text-brand-500" />
            De los ingresos a la utilidad
          </h3>
          <div
            v-if="avisoDatosFaltantes"
            class="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
            role="status"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{{ avisoDatosFaltantes }}</span>
            <a href="/crud/gastos/" class="font-medium underline hover:no-underline">Ir a Gastos</a>
          </div>
          <RentabilidadCascadaChart
            :ingresos="Number(ingresosTotal)"
            :costo-repuestos="Number(cmvRepuestos)"
            :costo-mano-obra="Number(cmvServicios)"
            :margen-bruto="Number(margenBruto)"
            :gastos="Number(gastosTotal)"
            :utilidad="Number(utilidadNeta)"
          />
        </div>
        <!-- «Salud del negocio» oculto por ahora (SaludNegocio.vue se conserva). -->
      </div>

      <!-- Lectura sencilla: de cada $100 cobrados -->
      <CadaCienDolares
        :ingresos="Number(ingresosTotal)"
        :costo-repuestos="Number(cmvRepuestos)"
        :costo-mano-obra="Number(cmvServicios)"
        :gastos="Number(gastosTotal)"
        :utilidad="Number(utilidadNeta)"
      />

      <!-- Evolución mensual -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center">
          <TrendingUp class="w-5 h-5 mr-2 text-brand-500" aria-hidden="true" />
          Evolución mensual
        </h3>
        <p class="mt-1 mb-2 text-sm text-gray-500 dark:text-gray-400">
          Últimos 12 meses hasta la fecha «Hasta».
        </p>
        <EvolucionMensualChart :meses="evolucionMensual" />
      </div>
    </div>

    <div v-if="isLoading" class="px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-brand-500" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import EntityHeader from '@/shared/components/EntityHeader.vue';
import Alert from '@/shared/components/Alert.vue';
import FilterActions from '@/shared/components/FilterActions.vue';
import InfoPopover from '@/shared/components/InfoPopover.vue';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { talleresService } from '@/modules/configuracion/services/talleresService';
import { useReportes } from '../composables/useReportes';
import RentabilidadCascadaChart from './RentabilidadCascadaChart.vue';
import EvolucionMensualChart from './EvolucionMensualChart.vue';
import CadaCienDolares from './CadaCienDolares.vue';
import ResultadoNegocio from './ResultadoNegocio.vue';
import {
  ChartColumn,
  CalendarDays,
  Filter,
  Loader2,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from 'lucide-vue-next';

/**
 * Ayuda de cada card en lenguaje de taller (sin jerga contable): qué es y un
 * ejemplo con números redondos.
 */
const AYUDA_CARDS = {
  ingresos: [
    { titulo: '¿Qué es?', texto: 'Todo lo que cobraste a tus clientes por los trabajos entregados en el periodo: repuestos y mano de obra.' },
    { titulo: 'Ejemplo', texto: 'Si entregaste 3 trabajos de $100 cada uno, tus ingresos son $300.' },
  ],
  costo: [
    { titulo: '¿Qué es?', texto: 'Lo que a ti te costó hacer esos trabajos: lo que pagaste por los repuestos y por la mano de obra.' },
    { titulo: 'Ejemplo', texto: 'Si compraste un filtro en $40 y se lo cobraste al cliente en $60, aquí se cuentan los $40.' },
  ],
  margen: [
    { titulo: '¿Qué es?', texto: 'Lo que te queda de los trabajos después de pagar repuestos y mano de obra, antes de los gastos fijos del taller.' },
    { titulo: 'Ejemplo', texto: 'Cobraste $300 y te costaron $180: tu margen es $120.' },
    { titulo: 'Ojo', texto: 'Si sale en rojo, estás cobrando menos de lo que te cuestan los trabajos.' },
  ],
  gastos: [
    { titulo: '¿Qué es?', texto: 'Lo que cuesta mantener el taller abierto, haya o no trabajos: arriendo, sueldos, luz, agua, internet. Se registran en el módulo Gastos.' },
    { titulo: 'Ejemplo', texto: 'Arriendo $500 + luz $50 = $550 de gastos en el mes.' },
  ],
  utilidad: [
    { titulo: '¿Qué es?', texto: 'Lo que realmente ganaste: el margen de los trabajos menos los gastos del taller.' },
    { titulo: 'Ejemplo', texto: 'Margen $1.200 − gastos $550 = $650 de ganancia real.' },
    { titulo: 'Ojo', texto: 'Si sale en rojo, el taller perdió dinero en este periodo.' },
  ],
};

const authStore = useAuthStore();
const talleres = ref([]);

const breadcrumb = [
  { label: 'Reportes' },
  { label: 'Rentabilidad' },
];

const alert = ref({
  type: 'info',
  title: '',
  message: '',
  dismissible: true,
});

function setAlert(type, title, message, dismissible = true) {
  alert.value = { type, title, message, dismissible };
}

function clearAlert() {
  alert.value = { type: 'info', title: '', message: '', dismissible: true };
}

const {
  data,
  isLoading,
  errorMessage,
  viewMode,
  filters,
  ingresosTotal,
  cmvRepuestos,
  cmvServicios,
  cmvTotal,
  margenBruto,
  gastosTotal,
  utilidadNeta,
  periodo,
  fetchData,
  resetFilters,
  formatCurrency,
} = useReportes();

const evolucionMensual = computed(() => data.value?.evolucion_mensual || []);

/**
 * Sin costos (con trabajos entregados) o sin gastos en el periodo, la utilidad
 * sale inflada: se avisa para que se registren antes de leerla como real.
 */
const avisoDatosFaltantes = computed(() => {
  if (!data.value) return '';
  const faltanCostos = Number(ingresosTotal.value) > 0 && Number(cmvTotal.value) === 0;
  const faltanGastos = Number(gastosTotal.value) === 0;
  if (!faltanCostos && !faltanGastos) return '';
  const que = faltanCostos && faltanGastos ? 'costos y gastos' : faltanCostos ? 'costos' : 'gastos';
  return `Faltan ${que} registrados; la utilidad no es real.`;
});

watch(errorMessage, (msg) => {
  if (msg) setAlert('danger', 'Error', msg);
  else clearAlert();
});

async function cargarTalleres() {
  try {
    const respuesta = await talleresService.listTalleres();
    talleres.value = Array.isArray(respuesta) ? respuesta : respuesta?.results || [];
  } catch {
    talleres.value = [];
  }
}

function tallerLabel(taller) {
  return [taller.nombre, taller.ciudad].filter(Boolean).join(' · ') || `Taller ${taller.id}`;
}

// Flowbite escribe directamente en input.value (no emite input/change), por eso
// estos campos se leen del DOM en vez de usar v-model.
const fechaDesdeInput = ref(null);
const fechaHastaInput = ref(null);

function fechaInputAIso(elemento) {
  const valor = (elemento?.value || '').trim();
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const match = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const [, dia, mes, anio] = match;
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function limpiarCamposFecha() {
  [fechaDesdeInput, fechaHastaInput].forEach((campo) => {
    const elemento = campo.value;
    if (!elemento) return;
    elemento.value = '';
    if (typeof elemento.datepicker?.clear === 'function') elemento.datepicker.clear();
  });
}

/** Nombre del taller de la última consulta; vacío = todos los talleres. */
const tallerConsultado = ref('');

function nombreTaller(id) {
  if (!id) return '';
  if (!authStore.esTodosLosTalleres) return authStore.tallerNombre || 'Taller activo';
  const taller = talleres.value.find((item) => String(item.id) === String(id));
  return taller ? tallerLabel(taller) : `Taller ${id}`;
}

function consultar() {
  clearAlert();
  filters.value.fechaDesde = fechaInputAIso(fechaDesdeInput.value) || null;
  filters.value.fechaHasta = fechaInputAIso(fechaHastaInput.value) || null;
  // Filtro Taller oculto (sin «Todos los talleres»): siempre el taller activo.
  if (!authStore.esTodosLosTalleres) filters.value.tallerId = authStore.tallerId;
  // Sin taller elegido → rentabilidad de la empresa; con taller → la de ese taller.
  viewMode.value = filters.value.tallerId ? 'taller' : 'empresa';
  tallerConsultado.value = nombreTaller(filters.value.tallerId);
  fetchData();
}

function limpiar() {
  resetFilters();
  limpiarCamposFecha();
  consultar();
}

onMounted(() => {
  if (authStore.esTodosLosTalleres) cargarTalleres();
  consultar();
});
</script>
