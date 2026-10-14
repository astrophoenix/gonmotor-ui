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

          <p class="mt-3 text-xs text-body">
            <template v-if="periodo.desde || periodo.hasta">
              Periodo: {{ periodo.desde || '—' }} al {{ periodo.hasta || '—' }}
            </template>
            <template v-else>Sin rango (OT entregadas)</template>
          </p>
        </div>
      </div>
    </div>

    <div v-if="!isLoading && !data && !errorMessage" class="px-4 sm:px-6 lg:px-8 py-8 text-center">
      <BarChart3 class="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">Sin datos</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Selecciona filtros y consulta la rentabilidad.</p>
    </div>

    <div v-if="data && !isLoading" class="px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            Resultado
            <span
              v-if="esRentable"
              class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
            >
              <TrendingUp class="w-3.5 h-3.5 mr-1" />
              Rentable
            </span>
            <span
              v-else-if="enEquilibrio"
              class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            >
              Equilibrio
            </span>
            <span
              v-else
              class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            >
              <TrendingDown class="w-3.5 h-3.5 mr-1" />
              Pérdida
            </span>
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Órdenes de Trabajo <strong>ENTREGADAS</strong>
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos</p>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(ingresosTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Ventas OT entregadas</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">CMV Total</p>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(cmvTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Repuestos: {{ formatCurrency(cmvRepuestos) }} • Servicios: {{ formatCurrency(cmvServicios) }}</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Margen Bruto</p>
          <p class="text-xl sm:text-2xl font-bold mt-1" :class="margenBruto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ formatCurrency(margenBruto) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Ingresos − CMV</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos Operativos</p>
          <p class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ formatCurrency(gastosTotal) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Del periodo</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Utilidad Neta</p>
          <p class="text-xl sm:text-2xl font-bold mt-1" :class="utilidadNeta > 0 ? 'text-emerald-600 dark:text-emerald-400' : utilidadNeta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'">{{ formatCurrency(utilidadNeta) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Margen Bruto − Gastos</p>
        </div>
      </div>

      <!-- Gráfico de composición -->
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <BarChart3 class="w-5 h-5 mr-2 text-brand-500" />
            Composición de la rentabilidad
          </h3>
          <RentabilidadChart
            :ingresos="Number(ingresosTotal)"
            :cmv="Number(cmvTotal)"
            :gastos="Number(gastosTotal)"
            :utilidad="Number(utilidadNeta)"
            :margen-bruto="Number(margenBruto)"
          />
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3">
            <Info class="w-5 h-5 mr-2 text-blue-500" />
            ¿Qué significa?
          </h3>
          <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <p class="font-medium text-gray-900 dark:text-white mb-1">CMV</p>
              <p>Costo de repuestos y mano de obra aplicada.</p>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white mb-1">Gastos Operativos</p>
              <p>Arriendo, sueldos, servicios, etc. del periodo.</p>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white mb-1">Utilidad Neta</p>
              <p>Margen Bruto − Gastos. Muestra si gana o pierde.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-brand-500" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import EntityHeader from '@/shared/components/EntityHeader.vue';
import Alert from '@/shared/components/Alert.vue';
import FilterActions from '@/shared/components/FilterActions.vue';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { talleresService } from '@/modules/configuracion/services/talleresService';
import { useReportes } from '../composables/useReportes';
import RentabilidadChart from './RentabilidadChart.vue';
import {
  ChartColumn,
  CalendarDays,
  Filter,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-vue-next';

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
  esRentable,
  enEquilibrio,
  periodo,
  fetchData,
  resetFilters,
  formatCurrency,
} = useReportes();

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

function consultar() {
  clearAlert();
  filters.value.fechaDesde = fechaInputAIso(fechaDesdeInput.value) || null;
  filters.value.fechaHasta = fechaInputAIso(fechaHastaInput.value) || null;
  // Filtro Taller oculto (sin «Todos los talleres»): siempre el taller activo.
  if (!authStore.esTodosLosTalleres) filters.value.tallerId = authStore.tallerId;
  // Sin taller elegido → rentabilidad de la empresa; con taller → la de ese taller.
  viewMode.value = filters.value.tallerId ? 'taller' : 'empresa';
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
