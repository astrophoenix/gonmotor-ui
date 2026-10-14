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

    <section class="px-4 py-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel de reporte</label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="viewMode = 'taller'"
              :class="[
                'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                viewMode === 'taller'
                  ? 'bg-brand-900 text-white border-brand-900 hover:bg-brand-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700',
              ]"
            >
              <Building2 class="w-4 h-4 mr-2" />
              Por taller
            </button>
            <button
              type="button"
              @click="viewMode = 'empresa'"
              :class="[
                'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                viewMode === 'empresa'
                  ? 'bg-brand-900 text-white border-brand-900 hover:bg-brand-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700',
              ]"
            >
              <Building class="w-4 h-4 mr-2" />
              Por empresa
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Taller
            <span v-if="viewMode === 'taller'" class="text-red-500">*</span>
          </label>
          <TallerSelect
            v-model="filters.tallerId"
            :required="viewMode === 'taller'"
            placeholder="Seleccionar taller..."
          />
          <p v-if="viewMode === 'empresa'" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Opcional: filtrar por un taller
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha desde</label>
          <input
            v-model="filters.fechaDesde"
            type="date"
            class="block w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha hasta</label>
          <input
            v-model="filters.fechaHasta"
            type="date"
            class="block w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <template v-if="periodo.desde || periodo.hasta">
            Periodo: {{ periodo.desde || '—' }} al {{ periodo.hasta || '—' }}
          </template>
          <template v-else>Sin rango (OT entregadas)</template>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="resetFilters"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RotateCcw class="w-4 h-4 mr-2" />
            Limpiar
          </button>
          <button
            type="button"
            @click="consultar"
            :disabled="isLoading || (viewMode === 'taller' && !filters.tallerId)"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-900 rounded-lg hover:bg-brand-800 disabled:opacity-50"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
            <Search v-else class="w-4 h-4 mr-2" />
            Consultar
          </button>
        </div>
      </div>
    </section>

    <div v-if="!isLoading && !data && !errorMessage" class="px-4 py-8 text-center">
      <BarChart3 class="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">Sin datos</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Selecciona filtros y consulta la rentabilidad.</p>
    </div>

    <div v-if="data && !isLoading" class="px-4 py-4 space-y-4">
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

    <div v-if="isLoading" class="px-4 py-8 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-brand-500" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import EntityHeader from '@/shared/components/EntityHeader.vue';
import Alert from '@/shared/components/Alert.vue';
import TallerSelect from '@/shared/components/TallerSelect.vue';
import { useReportes } from '../composables/useReportes';
import RentabilidadChart from './RentabilidadChart.vue';
import {
  ChartColumn,
  Building2,
  Building,
  Search,
  RotateCcw,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-vue-next';

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

function consultar() {
  clearAlert();
  fetchData();
}

onMounted(() => {
  if (viewMode.value === 'empresa') {
    fetchData();
  }
});

watch(viewMode, (nuevo) => {
  if (nuevo === 'empresa') {
    clearAlert();
    fetchData();
  }
});
</script>
