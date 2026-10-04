<script setup>
import { computed, ref, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw } from 'lucide-vue-next';
import CitaAccionesMenu from '../../citas/components/CitaAccionesMenu.vue';
import {
  COLORES_ESTADO,
  fechaLocal,
  horaLocal,
  useCalendario,
} from '../composables/useCalendario';

/**
 * Panel de calendario de la pantalla unificada de citas.
 * La cabecera, los filtros y los modales viven en CitasView; este componente
 * renderiza la rejilla y el panel lateral, y notifica las acciones elegidas.
 */
const props = defineProps({
  recargarToken: { type: Number, default: 0 },
});

const emit = defineEmits(['crear', 'accion', 'alert', 'coincidencias']);

const search = defineModel('search', { type: String, default: '' });
const estadoFiltro = defineModel('estadoFiltro', { type: String, default: '' });
const fechaSeleccionada = defineModel('fechaSeleccionada', { type: String, default: '' });

const {
  citas,
  eventos,
  isLoading,
  errorMessage,
  rangoActual,
  disponibilidad,
  disponibilidadLoading,
  fetchRango,
  fetchDisponibilidad,
  refrescar,
  limpiarError,
} = useCalendario({ fechaSeleccionada });

const ESTADO_BADGES = {
  PROGRAMADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONFIRMADA: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  EN_PROGRESO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NO_ASISTIO: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function avisar(type, title, message) {
  emit('alert', { type, title, message });
}

const calendarRef = ref(null);
const vista = ref('timeGridWeek');
const tituloRango = ref('');

const eventosVisibles = computed(() => {
  if (!estadoFiltro.value) return eventos.value;
  return eventos.value.filter((evento) => evento.extendedProps.cita.estado === estadoFiltro.value);
});

/**
 * Citas que coinciden con el texto buscado: se marcan con un anillo rojo.
 * Al ser un `computed` sobre el rango cargado, la cita elegida en el buscador
 * se resalta sola en cuanto `gotoDate` trae sus datos al rango visible.
 */
const resaltadas = computed(() => {
  const termino = (search.value || '').trim().toLowerCase();
  if (termino.length < 3) return new Set();
  const ids = new Set();
  for (const cita of citas.value) {
    const texto = [
      cita.vehiculo && cita.vehiculo.placa,
      cita.vehiculo && cita.vehiculo.marca,
      cita.vehiculo && cita.vehiculo.modelo,
      cita.cliente && cita.cliente.nombre,
      cita.cliente && cita.cliente.identificacion,
      cita.motivo_descripcion,
    ].filter(Boolean).join(' ').toLowerCase();
    if (texto.includes(termino)) ids.add(Number(cita.id));
  }
  return ids;
});

const fechaLegible = computed(() => {
  if (!fechaSeleccionada.value) return '';
  const [anio, mes, dia] = fechaSeleccionada.value.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
});

const horarioLabel = computed(() => {
  const horario = disponibilidad.value && disponibilidad.value.horario;
  return horario ? `${horario.apertura} – ${horario.cierre}` : 'Sin horario configurado';
});

const ocupacionLabel = computed(() => {
  if (!disponibilidad.value) return '—';
  const { citas_ocupadas, capacidad_dia } = disponibilidad.value;
  return capacidad_dia ? `${citas_ocupadas} / ${capacidad_dia}` : String(citas_ocupadas);
});

const cuposLabel = computed(() => {
  if (!disponibilidad.value || !disponibilidad.value.aplicable) return '—';
  const { citas_disponibles, capacidad_dia } = disponibilidad.value;
  if (!capacidad_dia) return 'Sin límite';
  return String(citas_disponibles ?? 0);
});

const cuposAgotados = computed(() =>
  Boolean(disponibilidad.value && disponibilidad.value.aplicable && disponibilidad.value.capacidad_dia)
  && !disponibilidad.value.citas_disponibles
);

const porcentajeOcupacion = computed(() => {
  if (!disponibilidad.value || !disponibilidad.value.capacidad_dia) return 0;
  const { citas_ocupadas, capacidad_dia } = disponibilidad.value;
  return Math.min(Math.round((citas_ocupadas / capacidad_dia) * 100), 100);
});

const picoLabel = computed(() => {
  if (!disponibilidad.value) return '—';
  const { concurrentes_max, capacidad_simultanea } = disponibilidad.value;
  return capacidad_simultanea ? `${concurrentes_max} / ${capacidad_simultanea}` : String(concurrentes_max);
});

const citasDelDia = computed(() => {
  const filtro = estadoFiltro.value;
  return citas.value
    .filter((cita) => cita.fecha_cita === fechaSeleccionada.value && (!filtro || cita.estado === filtro))
    .slice()
    .sort((a, b) => String(a.hora_cita).localeCompare(String(b.hora_cita)));
});

/**
 * Recepción generada por una cita completada: sirve de atajo para abrirla
 * directo desde "Citas del día" sin entrar a la cita.
 */
function recepcionDe(cita) {
  if (!cita || cita.estado !== 'COMPLETADA' || !cita.recepcion_generada) return null;
  return {
    id: cita.recepcion_generada,
    numero: cita.recepcion_generada_numero || `#${cita.recepcion_generada}`,
  };
}

function abrirRecepcion(cita) {
  const recepcion = recepcionDe(cita);
  if (!recepcion) return;
  window.location.assign(`/crud/recepciones/editar/?id=${encodeURIComponent(recepcion.id)}`);
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: esLocale,
  firstDay: 1,
  timeZone: 'local',
  height: 'auto',
  expandRows: true,
  allDaySlot: false,
  allDayText: '',
  slotMinTime: '07:00:00',
  slotMaxTime: '20:00:00',
  slotDuration: '00:30:00',
  snapDuration: '00:15:00',
  scrollTime: '08:00:00',
  scrollTimeReset: false,
  nowIndicator: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: 3,
  editable: false,
  eventStartEditable: false,
  eventDurationEditable: false,
  headerToolbar: false,
  buttonText: { month: 'Mes', week: 'Semana', day: 'Día', today: 'Hoy' },
  views: {
    dayGridMonth: { buttonText: 'Mes', titleFormat: { month: 'long', year: 'numeric' } },
    timeGridWeek: { buttonText: 'Semana', titleFormat: { day: 'numeric', month: 'long', year: 'numeric' } },
    timeGridDay: { buttonText: 'Día', titleFormat: { day: 'numeric', month: 'long', year: 'numeric' } },
  },
  events: eventosVisibles.value,
  eventClassNames: (info) => (resaltadas.value.has(Number(info.event.id)) ? ['cita-resaltada'] : []),
  select: onSelect,
  eventClick: onEventClick,
  datesSet: onDatesSet,
}));

function mover(accion) {
  const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
  if (!api) return;
  if (accion === 'today') api.today();
  else if (accion === 'prev') api.prev();
  else api.next();
}

function esSeleccionPasada(info) {
  const ahora = new Date();
  if (info.view.type === 'dayGridMonth') {
    // En la vista mensual solo se compara el día: la hora se elige en el modal.
    return fechaLocal(info.start) < fechaLocal(ahora);
  }
  return info.start <= ahora;
}

function rechazarPasado() {
  avisar(
    'warning',
    'Horario no disponible',
    'No se pueden agendar citas en el pasado. Selecciona una fecha y hora futuras.',
  );
  const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
  if (api) api.unselect();
}

function onSelect(info) {
  if (esSeleccionPasada(info)) {
    rechazarPasado();
    return;
  }

  const enVistaMensual = info.view.type === 'dayGridMonth';
  const duracion = enVistaMensual ? 60 : Math.max(15, Math.round((info.end - info.start) / 60000));

  emit('crear', {
    fecha_cita: fechaLocal(info.start),
    duracion_minutos: duracion,
    ...(enVistaMensual ? {} : { hora_cita: horaLocal(info.start) }),
  });

  const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
  if (api) api.unselect();
}

function onEventClick(info) {
  emit('accion', { cita: info.event.extendedProps.cita, tipo: 'editar' });
}

function onDatesSet(info) {
  const desde = fechaLocal(info.start);
  const fin = new Date(info.end);
  fin.setDate(fin.getDate() - 1);
  const hasta = fechaLocal(fin);

  tituloRango.value = info.view.title;
  if (info.view.type !== vista.value) vista.value = info.view.type;

  fetchRango(desde, hasta);

  const hoy = fechaLocal(new Date());
  const seleccionada = fechaSeleccionada.value;
  if (!seleccionada || seleccionada < desde || seleccionada > hasta) {
    fechaSeleccionada.value = hoy >= desde && hoy <= hasta ? hoy : desde;
  }
}

function onAccion(cita, tipo) {
  emit('accion', { cita, tipo });
}

/** Salta a la fecha de la cita elegida en el buscador y la deja resaltada. */
function irACita(cita) {
  if (!cita || !cita.fecha_cita) return;
  fechaSeleccionada.value = cita.fecha_cita;
  const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
  if (api) api.gotoDate(cita.fecha_cita);
}

defineExpose({ irACita });

function colorDe(cita) {
  return COLORES_ESTADO[cita.estado] || COLORES_ESTADO.PROGRAMADA;
}

function rangoHorario(cita) {
  const inicio = String(cita.hora_cita).slice(0, 5);
  const [hora, minutos] = inicio.split(':').map(Number);
  const duracion = Number(cita.duracion_minutos) || 60;
  const fin = new Date(2000, 0, 1, hora, minutos + duracion);
  return `${inicio} – ${horaLocal(fin)}`;
}

watch(vista, (valor) => {
  const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
  if (api && valor && api.view.type !== valor) api.changeView(valor);
});

watch(fechaSeleccionada, (valor) => {
  if (!valor) return;
  fetchDisponibilidad(valor);
  const rango = rangoActual.value;
  if (rango && (valor < rango.desde || valor > rango.hasta)) {
    const api = calendarRef.value && calendarRef.value.getApi && calendarRef.value.getApi();
    if (api) api.gotoDate(valor);
  }
}, { immediate: true });

watch(() => props.recargarToken, (valor) => {
  if (valor > 0) refrescar();
});

// El panel de CitasView indica cuántas citas del rango visible resaltan la
// búsqueda, para que en modo Calendario el criterio se vea aplicado.
watch(resaltadas, (set) => emit('coincidencias', set.size), { immediate: true });

watch(errorMessage, (valor) => {
  if (valor) {
    avisar('error', 'No se pudo cargar la agenda', valor);
    limpiarError();
  }
});
</script>

<template>
  <div class="p-4">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              title="Anterior"
              aria-label="Anterior"
              class="p-2 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="mover('prev')"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              @click="mover('today')"
            >
              Hoy
            </button>
            <button
              type="button"
              title="Siguiente"
              aria-label="Siguiente"
              class="p-2 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="mover('next')"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
            <h2 class="ml-2 text-base font-semibold text-gray-900 dark:text-white">
              {{ tituloRango }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="isLoading" class="text-xs text-gray-500 dark:text-gray-400">Cargando...</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ citasDelDia.length }} cita{{ citasDelDia.length === 1 ? '' : 's' }} el día seleccionado
            </span>
            <select
              v-model="vista"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="dayGridMonth">Mes</option>
              <option value="timeGridWeek">Semana</option>
              <option value="timeGridDay">Día</option>
            </select>
          </div>
        </div>

        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </section>

      <aside class="flex flex-col gap-4">
        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <label for="cal-fecha" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Día seleccionado
          </label>
          <input
            id="cal-fecha"
            v-model="fechaSeleccionada"
            type="date"
            class="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p class="mt-2 text-sm font-medium text-gray-900 capitalize dark:text-white">
            {{ fechaLegible }}
          </p>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Ocupación del taller</h3>
            <button
              type="button"
              title="Actualizar"
              aria-label="Actualizar ocupación"
              class="p-1 text-gray-500 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="refrescar"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </div>

          <div v-if="!disponibilidad && disponibilidadLoading" class="text-xs text-gray-500 dark:text-gray-400">
            Consultando agenda...
          </div>

          <div v-else-if="!disponibilidad" class="text-xs text-gray-500 dark:text-gray-400">
            Sin datos de disponibilidad.
          </div>

          <div v-else>
            <dl class="space-y-1.5 text-xs">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 dark:text-gray-400">Horario</dt>
                <dd class="font-medium text-gray-900 dark:text-white">{{ horarioLabel }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 dark:text-gray-400">Citas del día</dt>
                <dd class="font-medium text-gray-900 dark:text-white">{{ ocupacionLabel }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 dark:text-gray-400">Cupos disponibles</dt>
                <dd class="font-medium" :class="cuposAgotados ? 'text-accent-600 dark:text-accent-400' : 'text-gray-900 dark:text-white'">
                  {{ cuposLabel }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 dark:text-gray-400">Concurrencia pico</dt>
                <dd class="font-medium text-gray-900 dark:text-white">{{ picoLabel }}</dd>
              </div>
            </dl>

            <div v-if="disponibilidad.aplicable && disponibilidad.capacidad_dia" class="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-2 rounded-full transition-all"
                :style="{ width: porcentajeOcupacion + '%', backgroundColor: cuposAgotados ? '#D9011B' : '#2B4352' }"
              />
            </div>
            <p v-else-if="disponibilidad.aplicable" class="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              Este taller no tiene límite diario de citas.
            </p>
            <p v-else class="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              La empresa no tiene un taller configurado.
            </p>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            Citas del día ({{ citasDelDia.length }})
          </h3>

          <div v-if="!citasDelDia.length" class="text-xs text-gray-500 dark:text-gray-400">
            No hay citas para esta fecha.
          </div>

          <ul v-else class="space-y-1">
            <li v-for="cita in citasDelDia" :key="cita.id" class="flex items-start gap-1">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-start gap-2 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="onAccion(cita, 'editar')">
                <span class="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" :style="{ backgroundColor: colorDe(cita).bg }" />
                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline justify-between gap-2">
                    <span class="text-xs font-semibold text-gray-900 dark:text-white">
                      {{ rangoHorario(cita) }}
                    </span>
                    <span class="truncate text-xs text-gray-500 dark:text-gray-400">
                      {{ (cita.cliente && cita.cliente.nombre) || 'Sin cliente' }}
                    </span>
                  </span>
                  <span class="block truncate text-xs text-gray-600 dark:text-gray-300">
                    {{ (cita.vehiculo && cita.vehiculo.placa) || '—' }} · {{ cita.motivo_display }}
                  </span>
                  <span class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="ESTADO_BADGES[cita.estado] || 'bg-gray-100 text-gray-800'">
                    {{ cita.estado_display }}
                  </span>
                  <span class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                    <button
                      v-if="recepcionDe(cita)"
                      type="button"
                      :title="`Abrir la recepción ${recepcionDe(cita).numero}`"
                      class="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:border-brand-400 dark:bg-brand-500/20 dark:text-brand-50 dark:hover:bg-brand-500/40"
                      @click.stop="abrirRecepcion(cita)">
                      <ClipboardList class="h-3 w-3" />
                      {{ recepcionDe(cita).numero }}
                    </button>
                  </span>
                </span>
              </button>
              <div class="mt-1.5 flex flex-shrink-0 flex-col items-end gap-1.5">
                <CitaAccionesMenu :cita="cita" @accion="(tipo) => onAccion(cita, tipo)" />
              </div>
            </li>
          </ul>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Leyenda</h3>
          <ul class="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <li v-for="(color, key) in COLORES_ESTADO" :key="key" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: color.bg }" />
              {{ color.label }}
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>
