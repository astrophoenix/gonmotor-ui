import { computed, ref } from 'vue';
import { dashboardV2Service } from '../services/dashboardV2Service';
import { talleresService } from '../../configuracion/services/talleresService';
import { request } from '../../../shared/services/httpClient';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export const RANGOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'semana', etiqueta: 'Esta semana' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'personalizado', etiqueta: 'Personalizado' },
];

const PAGINAS_MAX_SUCURSALES = 5;

function aIsoLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Rango predefinido en fechas locales (YYYY-MM-DD) para `clave`. */
export function calcularRango(clave, base = new Date()) {
  const hoy = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  if (clave === 'hoy') {
    return { desde: aIsoLocal(hoy), hasta: aIsoLocal(hoy) };
  }

  if (clave === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return { desde: aIsoLocal(lunes), hasta: aIsoLocal(hoy) };
  }

  if (clave === 'mes') {
    return { desde: aIsoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aIsoLocal(hoy) };
  }

  return { desde: aIsoLocal(hoy), hasta: aIsoLocal(hoy) };
}

/**
 * Estado del Dashboard V2: un único agregado de `GET /api/core/dashboard-v2/`
 * acotado por periodo (`fecha_desde` / `fecha_hasta`) y sucursal (`sucursal`).
 *
 * Los filtros son parte del estado del composable: al cambiar cualquiera de
 * ellos se vuelve a consultar el endpoint y se conserva el último resultado
 * mientras carga (sin parpadeos de la pantalla).
 */
export function useDashboardV2() {
  const datos = ref(null);
  const cargando = ref(false);
  const error = ref(null);
  const actualizadoEn = ref(null);

  const rango = ref('mes');
  const rangoInicial = calcularRango('mes');
  const fechaDesde = ref(rangoInicial.desde);
  const fechaHasta = ref(rangoInicial.hasta);
  const sucursal = ref(null);

  const sucursales = ref([]);
  const cargandoSucursales = ref(false);
  const errorSucursales = ref(null);

  const latestRequest = createLatestRequest();

  const periodo = computed(() => datos.value?.periodo || null);
  const filtros = computed(() => datos.value?.filtros || {});
  const kpis = computed(() => datos.value?.kpis || {});
  const tendencia = computed(() => datos.value?.tendencia || []);
  const distribucionTipo = computed(() => datos.value?.distribucion?.tipo_trabajo || []);
  const distribucionEstado = computed(() => datos.value?.distribucion?.estado_orden || []);
  const distribucionCategoria = computed(() => datos.value?.distribucion?.categoria_servicio || []);
  const recepciones = computed(() => datos.value?.recepciones || []);
  const citas = computed(() => datos.value?.citas || []);
  const ordenesActivas = computed(() => datos.value?.ordenes_activas || []);
  const stockBajo = computed(() => datos.value?.stock_bajo || []);

  const granularidad = computed(() => periodo.value?.granularidad || 'dia');
  const etiquetaPeriodo = computed(() => {
    if (!periodo.value) return '';
    const sufijo = granularidad.value === 'mes' ? 'mensual' : 'diaria';
    return `${periodo.value.desde} → ${periodo.value.hasta} · agregación ${sufijo}`;
  });

  const hayFiltroSucursal = computed(() => Boolean(sucursal.value));
  const nombreSucursal = computed(() => filtros.value.sucursal_nombre || 'Toda la empresa');

  async function cargar() {
    const { signal, id } = latestRequest.begin();
    cargando.value = true;
    error.value = null;

    try {
      const respuesta = await dashboardV2Service.get({
        fechaDesde: fechaDesde.value,
        fechaHasta: fechaHasta.value,
        sucursal: sucursal.value,
        signal,
      });
      if (!latestRequest.isCurrent(id)) return;
      datos.value = respuesta;
      actualizadoEn.value = new Date();
    } catch (err) {
      if (!latestRequest.isCurrent(id) || isAbortError(err)) return;
      error.value = err?.message || 'No fue posible cargar el tablero ejecutivo.';
    } finally {
      if (latestRequest.isCurrent(id)) cargando.value = false;
    }
  }

  /** Aplica un rango predefinido y recarga; `personalizado` deja el rango libre. */
  function aplicarRango(clave) {
    if (!RANGOS.some((opcion) => opcion.clave === clave)) return;
    rango.value = clave;
    if (clave !== 'personalizado') {
      const rangoCalculado = calcularRango(clave);
      fechaDesde.value = rangoCalculado.desde;
      fechaHasta.value = rangoCalculado.hasta;
      cargar();
    }
  }

  /** Aplica fechas del rango personalizado (solo si están completas y en orden). */
  function aplicarFechas(desde, hasta) {
    fechaDesde.value = desde;
    fechaHasta.value = hasta;
    rango.value = 'personalizado';
    if (!desde || !hasta || desde > hasta) return;
    cargar();
  }

  function seleccionarSucursal(id) {
    sucursal.value = id ? Number(id) : null;
    cargar();
  }

  async function cargarSucursales() {
    if (cargandoSucursales.value) return;
    cargandoSucursales.value = true;
    errorSucursales.value = null;

    try {
      const listado = [];
      let url = null;
      let pagina = 1;

      do {
        const data = url ? await request(relativa(url)) : await talleresService.listTalleres({ page: 1, estado: 'activo' });
        listado.push(...(data.results || []));
        url = data.next;
        pagina += 1;
      } while (url && pagina <= PAGINAS_MAX_SUCURSALES);

      sucursales.value = listado;
    } catch (err) {
      if (!isAbortError(err)) {
        errorSucursales.value = err?.message || 'No se pudo cargar el listado de talleres.';
      }
    } finally {
      cargandoSucursales.value = false;
    }
  }

  return {
    datos,
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
    filtros,
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
    hayFiltroSucursal,
    nombreSucursal,
    cargar,
    cargarSucursales,
    aplicarRango,
    aplicarFechas,
    seleccionarSucursal,
  };
}

/** `response.next` de DRF es absoluto; `request` espera la ruta relativa. */
function relativa(url) {
  if (!url.startsWith('http')) return url;
  const destino = new URL(url);
  return `${destino.pathname}${destino.search}`;
}
