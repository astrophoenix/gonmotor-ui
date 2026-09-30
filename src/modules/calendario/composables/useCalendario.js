import { computed, onScopeDispose, ref } from 'vue';
import { citasService } from '../../citas/services/citasService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

/** Tamaño de página con el que el calendario carga un rango de fechas. */
const PAGE_SIZE = 500;
/** Cortafuegos por si un taller llegara a tener un mes con más citas. */
const MAX_PAGES = 5;

export const ESTADOS_CITA = [
  { value: '', label: 'Todos los estados' },
  { value: 'PROGRAMADA', label: 'Programadas' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'NO_ASISTIO', label: 'No Asistió' },
];

export const COLORES_ESTADO = {
  PROGRAMADA: { bg: '#2B4352', border: '#1E2F3A', label: 'Programada' },
  CONFIRMADA: { bg: '#2563EB', border: '#1D4ED8', label: 'Confirmada' },
  EN_PROGRESO: { bg: '#D97706', border: '#B45309', label: 'En Progreso' },
  COMPLETADA: { bg: '#059669', border: '#047857', label: 'Completada' },
  CANCELADA: { bg: '#9CA3AF', border: '#6B7280', label: 'Cancelada' },
  NO_ASISTIO: { bg: '#D9011B', border: '#A90114', label: 'No Asistió' },
};

export function fechaLocal(date) {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function horaLocal(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function tituloDe(cita) {
  const placa = (cita.vehiculo && cita.vehiculo.placa) || '';
  const cliente = (cita.cliente && cita.cliente.nombre) || '';
  return [placa, cliente].filter(Boolean).join(' · ') || 'Cita';
}

function aEventos(citas) {
  return citas.map((cita) => {
    const inicio = new Date(`${cita.fecha_cita}T${String(cita.hora_cita).slice(0, 5)}:00`);
    const duracion = Number(cita.duracion_minutos) || 60;
    const color = COLORES_ESTADO[cita.estado] || COLORES_ESTADO.PROGRAMADA;
    return {
      id: String(cita.id),
      start: inicio,
      end: new Date(inicio.getTime() + duracion * 60000),
      title: tituloDe(cita),
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: '#FFFFFF',
      extendedProps: { cita },
    };
  });
}

/**
 * Próxima hora futura válida para agendar hoy (múltiplo de 15 min,
 * dentro del rango visible 08:00–19:45). `null` si ya no queda hueco hoy.
 */
export function proximaHoraFutura() {
  const ahora = new Date();
  const minutos = Math.ceil((ahora.getHours() * 60 + ahora.getMinutes() + 15) / 15) * 15;
  const limitados = Math.min(Math.max(minutos, 8 * 60), 19 * 60 + 45);
  if (limitados <= ahora.getHours() * 60 + ahora.getMinutes()) return null;
  const hh = String(Math.floor(limitados / 60)).padStart(2, '0');
  const mm = String(limitados % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * @param {{ fechaSeleccionada?: { value: string } }} [opciones]
 *   Fecha seleccionada compartida con la cabecera de la pantalla unificada de citas.
 */
export function useCalendario(opciones = {}) {
  const citas = ref([]);
  const isLoading = ref(false);
  const errorMessage = ref('');
  const fechaSeleccionada = opciones.fechaSeleccionada || ref(fechaLocal(new Date()));
  const rangoActual = ref(null);
  const disponibilidad = ref(null);
  const disponibilidadLoading = ref(false);

  const eventos = computed(() => aEventos(citas.value));

  const listRequest = createLatestRequest();
  let ultimaFechaDisponible = null;
  let disponibilidadTimer = null;

  async function fetchRango(desde, hasta, forzar = false) {
    if (!desde || !hasta) return;
    const esIgual = rangoActual.value
      && rangoActual.value.desde === desde
      && rangoActual.value.hasta === hasta;
    if (esIgual && !forzar) return;

    rangoActual.value = { desde, hasta };
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const acumuladas = [];
      let pagina = 1;
      let hayMas = true;
      while (hayMas && pagina <= MAX_PAGES) {
        const data = await citasService.list({
          desde,
          hasta,
          page: pagina,
          pageSize: PAGE_SIZE,
          signal,
        });
        if (!listRequest.isCurrent(id)) return;
        const resultados = Array.isArray(data) ? data : (data.results || []);
        acumuladas.push(...resultados);
        hayMas = !Array.isArray(data) && Boolean(data.next) && resultados.length > 0;
        pagina += 1;
      }
      citas.value = acumuladas;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message;
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  function fetchDisponibilidad(fecha, forzar = false) {
    if (!fecha) {
      clearTimeout(disponibilidadTimer);
      disponibilidadLoading.value = false;
      disponibilidad.value = null;
      ultimaFechaDisponible = null;
      return;
    }
    if (ultimaFechaDisponible === fecha && !forzar && disponibilidad.value) return;
    ultimaFechaDisponible = fecha;
    clearTimeout(disponibilidadTimer);
    disponibilidadLoading.value = true;

    disponibilidadTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ fecha });
        disponibilidad.value = await citasService.disponibilidad(params.toString());
      } catch (error) {
        if (!isAbortError(error)) disponibilidad.value = null;
      } finally {
        disponibilidadLoading.value = false;
      }
    }, 250);
  }

  function refrescar() {
    if (rangoActual.value) {
      fetchRango(rangoActual.value.desde, rangoActual.value.hasta, true);
    }
    fetchDisponibilidad(fechaSeleccionada.value, true);
  }

  function limpiarError() {
    errorMessage.value = '';
  }

  onScopeDispose(() => {
    listRequest.cancel();
    clearTimeout(disponibilidadTimer);
  });

  return {
    citas,
    eventos,
    isLoading,
    errorMessage,
    fechaSeleccionada,
    rangoActual,
    disponibilidad,
    disponibilidadLoading,
    fetchRango,
    fetchDisponibilidad,
    refrescar,
    limpiarError,
  };
}
