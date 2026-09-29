import { computed, ref } from 'vue';
import { dashboardService } from '../services/dashboardService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

/**
 * Estado del dashboard principal.
 *
 * El backend agrega todo en una sola llamada a `GET /api/core/dashboard/`
 * (KPIs, tendencia mensual, distribución por tipo de trabajo, recepciones del
 * día, órdenes urgentes/en curso y repuestos con stock bajo), filtrado por el
 * `empresa_id` de la sesión.
 */
export function useDashboard() {
  const datos = ref(null);
  const cargando = ref(false);
  const error = ref(null);
  const actualizadoEn = ref(null);

  const latestRequest = createLatestRequest();

  const kpis = computed(() => datos.value?.kpis || {});
  const tendencia = computed(() => datos.value?.tendencia || []);
  const distribucionServicios = computed(() => datos.value?.distribucion_servicios || []);
  const recepcionesHoy = computed(() => datos.value?.recepciones_hoy || []);
  const ultimosIngresos = computed(() => datos.value?.ultimos_ingresos || []);
  const ordenesActivas = computed(() => datos.value?.ordenes_activas || []);
  const stockBajo = computed(() => datos.value?.stock_bajo || []);

  /** La tabla de ingresos usa las recepciones de hoy y, si no hay, los últimos ingresos. */
  const filasRecepciones = computed(() => (
    recepcionesHoy.value.length ? recepcionesHoy.value : ultimosIngresos.value
  ));
  const sinRecepcionesHoy = computed(() => recepcionesHoy.value.length === 0);

  async function cargar() {
    const { signal, id } = latestRequest.begin();
    cargando.value = true;
    error.value = null;

    try {
      const respuesta = await dashboardService.get({ signal });
      if (!latestRequest.isCurrent(id)) return;
      datos.value = respuesta;
      actualizadoEn.value = new Date();
    } catch (err) {
      if (!latestRequest.isCurrent(id) || isAbortError(err)) return;
      error.value = err?.message || 'No fue posible cargar el dashboard.';
    } finally {
      if (latestRequest.isCurrent(id)) cargando.value = false;
    }
  }

  return {
    datos,
    cargando,
    error,
    actualizadoEn,
    kpis,
    tendencia,
    distribucionServicios,
    recepcionesHoy,
    ultimosIngresos,
    filasRecepciones,
    sinRecepcionesHoy,
    ordenesActivas,
    stockBajo,
    cargar,
  };
}
