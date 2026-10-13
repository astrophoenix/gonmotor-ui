import { ref, computed } from 'vue';
import { fetchRentabilidadTaller, fetchRentabilidadEmpresa } from '../services/reportesService';

function formatCurrency(value) {
  if (value === null || value === undefined) return '$0,00';
  const num = Number(value);
  if (Number.isNaN(num)) return '$0,00';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function useReportes() {
  const data = ref(null);
  const isLoading = ref(false);
  const errorMessage = ref('');
  const viewMode = ref('taller');
  const filters = ref({
    tallerId: null,
    fechaDesde: null,
    fechaHasta: null,
  });

  const ingresosTotal = computed(() => data.value?.ingresos?.total || 0);
  const cmvRepuestos = computed(() => data.value?.costos?.repuestos_vendidos || 0);
  const cmvServicios = computed(() => data.value?.costos?.servicios || 0);
  const cmvTotal = computed(() => data.value?.costos?.total_cmv || (Number(cmvRepuestos.value) + Number(cmvServicios.value)));
  const margenBruto = computed(() => data.value?.margen_bruto || 0);
  const gastosTotal = computed(() => data.value?.gastos?.total || 0);
  const utilidadNeta = computed(() => data.value?.utilidad_neta || 0);
  const esRentable = computed(() => Number(utilidadNeta.value) > 0);
  const enEquilibrio = computed(() => Number(utilidadNeta.value) === 0);
  const periodo = computed(() => data.value?.periodo || { desde: null, hasta: null });

  async function fetchData() {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const params = {};
      if (filters.value.fechaDesde) params.fecha_desde = filters.value.fechaDesde;
      if (filters.value.fechaHasta) params.fecha_hasta = filters.value.fechaHasta;

      if (viewMode.value === 'taller') {
        if (!filters.value.tallerId) {
          data.value = null;
          errorMessage.value = 'Selecciona un taller para consultar la rentabilidad.';
          return;
        }
        params.taller_id = filters.value.tallerId;
        data.value = await fetchRentabilidadTaller(params);
      } else {
        if (filters.value.tallerId) params.taller_id = filters.value.tallerId;
        data.value = await fetchRentabilidadEmpresa(params);
      }
    } catch (error) {
      console.error('Error al obtener rentabilidad:', error);
      const detail = error?.response?.data?.detail || error?.response?.data?.error || 'No se pudo cargar la rentabilidad.';
      errorMessage.value = typeof detail === 'string' ? detail : 'No se pudo cargar la rentabilidad.';
      data.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function resetFilters() {
    filters.value = {
      tallerId: null,
      fechaDesde: null,
      fechaHasta: null,
    };
    data.value = null;
    errorMessage.value = '';
  }

  return {
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
  };
}
