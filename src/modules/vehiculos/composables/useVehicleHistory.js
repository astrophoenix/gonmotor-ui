import { ref, reactive } from 'vue';
import { vehiclesService } from '../services/vehiclesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

/** Estado de la pestaña Historial de la ficha del vehículo. */
export function useVehicleHistory(vehicleId) {
  const entradas = ref([]);
  const indicadores = ref(null);
  const pendientes = ref([]);
  const total = ref(0);
  const currentPage = ref(1);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const errorMessage = ref('');
  const filtros = reactive({ q: '', tipoTrabajo: '', taller: '', desde: '', hasta: '' });

  const historialRequest = createLatestRequest();

  async function fetchHistorial(page = 1) {
    const { signal, id } = historialRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await vehiclesService.historial(vehicleId, { page, ...filtros, q: filtros.q.trim(), signal });
      if (!historialRequest.isCurrent(id)) return;
      entradas.value = data.results || [];
      total.value = data.count || 0;
      nextUrl.value = data.next;
      previousUrl.value = data.previous;
      indicadores.value = data.indicadores || null;
      pendientes.value = data.pendientes || [];
      currentPage.value = page;
    } catch (error) {
      if (!historialRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message || 'No se pudo cargar el historial.';
    } finally {
      if (historialRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  function limpiarFiltros() {
    Object.assign(filtros, { q: '', tipoTrabajo: '', taller: '', desde: '', hasta: '' });
    return fetchHistorial(1);
  }

  const hayFiltros = () => Object.values(filtros).some((valor) => String(valor).trim() !== '');

  return {
    entradas,
    indicadores,
    pendientes,
    total,
    currentPage,
    nextUrl,
    previousUrl,
    isLoading,
    errorMessage,
    filtros,
    fetchHistorial,
    limpiarFiltros,
    hayFiltros,
  };
}
