<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  CalendarDays,
  Download,
  Filter,
  LoaderCircle,
  Search,
} from 'lucide-vue-next';
import { IconFileTypePdf, IconFileTypeXls } from '@tabler/icons-vue';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import {
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  createLatestRequest,
  isAbortError,
} from '../../../shared/utils/search';
import { citasService } from '../services/citasService';
import AppointmentsView from './AppointmentsView.vue';
import CitaCalendarModal from './CitaCalendarModal.vue';
import CitaModal from './CitaModal.vue';
import { ESTADOS_CITA, fechaLocal, proximaHoraFutura } from '../../calendario/composables/useCalendario';
import CalendarioView from '../../calendario/components/CalendarioView.vue';

const CLAVE_VISTA = 'gonmotor_citas_vista';
const MENSAJE_REFERENCIAL = 'Esta acción es solo referencial y estará disponible próximamente.';

function leerVistaInicial() {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'lista' ? 'lista' : 'calendario';
  } catch {
    return 'calendario';
  }
}

/* ------------------------------------------------------------------ estado */

const search = ref('');
const estadoFiltro = ref('');
const fechaFiltro = ref('');
const fechaSeleccionada = ref(fechaLocal(new Date()));
const modo = ref(leerVistaInicial());
const recargarToken = ref(0);

// Estado y fecha se editan en el panel. En la vista Lista son borradores que
// solo se aplican al pulsar "Buscar" (mismo contrato que Vehículos); en la vista
// Calendario el estado aplica en vivo porque filtra los eventos de la agenda.
const draftEstado = ref(estadoFiltro.value);
const draftFecha = ref(fechaFiltro.value);

const estadoPanel = computed({
  get: () => (modo.value === 'lista' ? draftEstado.value : estadoFiltro.value),
  set: (valor) => {
    draftEstado.value = valor;
    if (modo.value !== 'lista') estadoFiltro.value = valor;
  },
});

// La tabla y el calendario notifican su carga, el resumen de la página y las
// citas del rango visible que resaltan la búsqueda.
const listaCargando = ref(false);
const aplicando = ref(false);
const resumenLista = ref({ activas: 0, total: 0 });
const coincidencias = ref(0);

const ES_CALENDARIO = computed(() => modo.value === 'calendario');
const AYUDA_BUSQUEDA = 'Resalta las citas del rango visible; el estado filtra los eventos de la agenda.';
const AYUDA_LISTADO = 'Filtra el listado de citas por texto, estado y fecha.';

const tituloPanel = computed(() =>
  ES_CALENDARIO.value ? 'Calendario de Citas' : 'Listado de Citas'
);

const ayudaPanel = computed(() => (ES_CALENDARIO.value ? AYUDA_BUSQUEDA : AYUDA_LISTADO));

const resumenLabel = computed(() => {
  const { activas, total } = resumenLista.value;
  if (!total) return '';
  return `${activas} activa${activas === 1 ? '' : 's'} en esta página · ${total} cita${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`;
});

const alert = ref({ type: 'default', title: '', message: '' });

function avisar(type, title, message) {
  alert.value = { type, title, message };
  const contenedor = document.getElementById('citas-alertas');
  if (contenedor) contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ocultarAlerta() {
  alert.value = { type: 'default', title: '', message: '' };
}

function recargar() {
  recargarToken.value += 1;
}

/* ------------------------------------------------------------------ filtros */

/** Pulso de carga para que el panel no deje bloqueados Limpiar/Buscar. */
function liberarFiltros() {
  aplicando.value = true;
  nextTick(() => {
    aplicando.value = false;
  });
}

function aplicarFiltros() {
  estadoFiltro.value = draftEstado.value;
  fechaFiltro.value = draftFecha.value;
  mostrarResultados.value = false;
  liberarFiltros();
}

function limpiarFiltros() {
  clearTimeout(searchTimer);
  search.value = '';
  estadoFiltro.value = '';
  fechaFiltro.value = '';
  draftEstado.value = '';
  draftFecha.value = '';
  resultados.value = [];
  mostrarResultados.value = false;
  liberarFiltros();
}

/** Enter en el buscador: en Lista aplica el borrador; en Calendario solo cierra. */
function onSubmitBusqueda() {
  if (ES_CALENDARIO.value) {
    mostrarResultados.value = false;
    return;
  }
  aplicarFiltros();
}

/* ------------------------------------------------------------------ modales */

const showCitaModal = ref(false);
const citaModalId = ref(null);
const prefill = ref(null);

const showCalendarModal = ref(false);
const calendarCita = ref(null);

const showDeleteModal = ref(false);
const citaAEliminar = ref(null);
const isDeleting = ref(false);

const showConvertModal = ref(false);
const citaAConvertir = ref(null);
const convertingError = ref('');
const isConverting = ref(false);

function abrirCreacion() {
  const hoy = fechaLocal(new Date());
  // En la vista lista se parte de hoy; en la del calendario, del día marcado.
  const base = modo.value === 'calendario' ? (fechaSeleccionada.value || hoy) : hoy;

  if (base < hoy) {
    avisar(
      'warning',
      'Fecha no disponible',
      'No se pueden agendar citas en el pasado. Selecciona una fecha futura.',
    );
    return;
  }

  const hora = base === hoy ? proximaHoraFutura() : '08:00';
  prefill.value = {
    fecha_cita: base,
    duracion_minutos: 60,
    ...(hora ? { hora_cita: hora } : {}),
  };
  citaModalId.value = null;
  showCitaModal.value = true;
}

function crearDesdePanel(datos) {
  prefill.value = datos || null;
  citaModalId.value = null;
  showCitaModal.value = true;
}

function onAccion({ cita, tipo }) {
  if (!cita) return;
  switch (tipo) {
    case 'editar':
      citaModalId.value = cita.id;
      prefill.value = null;
      showCitaModal.value = true;
      break;
    case 'compartir':
      calendarCita.value = cita;
      showCalendarModal.value = true;
      break;
    case 'eliminar':
      citaAEliminar.value = cita;
      showDeleteModal.value = true;
      break;
    case 'convertir':
      citaAConvertir.value = cita;
      convertingError.value = '';
      showConvertModal.value = true;
      break;
    case 'whatsapp':
      avisar('info', 'Enviar por WhatsApp', MENSAJE_REFERENCIAL);
      break;
    case 'correo':
      avisar('info', 'Enviar por correo', MENSAJE_REFERENCIAL);
      break;
    default:
      break;
  }
}

function onCitaGuardada(mensaje) {
  showCitaModal.value = false;
  avisar('success', '', mensaje);
  recargar();
}

async function confirmarEliminar() {
  if (!citaAEliminar.value) return;
  isDeleting.value = true;
  try {
    const response = await citasService.delete(
      citaAEliminar.value.id,
      `${citaAEliminar.value.fecha_cita} ${citaAEliminar.value.hora_cita}`
    );
    avisar('success', '', response.message);
    recargar();
  } catch (error) {
    avisar('error', '', error.message || 'No se pudo eliminar la cita.');
  } finally {
    // Se cierra siempre: el aviso (también en error) vive fuera del modal.
    isDeleting.value = false;
    showDeleteModal.value = false;
    citaAEliminar.value = null;
  }
}

async function confirmarConvertir() {
  if (!citaAConvertir.value) return;
  convertingError.value = '';
  isConverting.value = true;
  try {
    const response = await citasService.convertirARecepcion(citaAConvertir.value.id);
    showConvertModal.value = false;
    avisar(
      'success',
      '',
      `Cita convertida. Recepción ${response.numero_recepcion || `#${response.recepcion_id}`} generada correctamente.`
    );
    citaAConvertir.value = null;
    recargar();
  } catch (error) {
    convertingError.value = error.message || 'No se pudo convertir la cita.';
  } finally {
    isConverting.value = false;
  }
}

function fechaCorta(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

/* ------------------------------------------------- buscador (modo calendario) */

const calendarioRef = ref(null);
const resultados = ref([]);
const buscando = ref(false);
const mostrarResultados = ref(false);
const busquedaRequest = createLatestRequest();
let searchTimer = null;

function hayResultados() {
  return mostrarResultados.value && search.value.trim().length >= MIN_SEARCH_LENGTH;
}

async function buscarResultados() {
  const { signal, id } = busquedaRequest.begin();
  buscando.value = true;
  try {
    const data = await citasService.list({
      search: search.value.trim(),
      estado: estadoFiltro.value,
      pageSize: 20,
      signal,
    });
    if (!busquedaRequest.isCurrent(id)) return;
    resultados.value = Array.isArray(data) ? data : (data.results || []);
    mostrarResultados.value = true;
  } catch (error) {
    if (!busquedaRequest.isCurrent(id) || isAbortError(error)) return;
    resultados.value = [];
    mostrarResultados.value = true;
  } finally {
    if (busquedaRequest.isCurrent(id)) buscando.value = false;
  }
}

watch(search, () => {
  clearTimeout(searchTimer);
  resultados.value = [];
  mostrarResultados.value = false;
  // En modo lista ya filtra la tabla; el desplegable solo aporta en el calendario.
  if (modo.value !== 'calendario') return;
  if (search.value.trim().length < MIN_SEARCH_LENGTH) return;
  searchTimer = setTimeout(buscarResultados, SEARCH_DEBOUNCE_MS);
});

function elegirResultado(cita) {
  mostrarResultados.value = false;
  if (calendarioRef.value) calendarioRef.value.irACita(cita);
}

function rangoCita(cita) {
  const inicio = String(cita.hora_cita || '').slice(0, 5);
  return `${fechaCorta(cita.fecha_cita)}${inicio ? ` · ${inicio}` : ''}`;
}

/* ------------------------------------------------------ desplegables (click fuera) */

const buscadorRef = ref(null);
const exportarRef = ref(null);
const exportarAbierto = ref(false);

function onClickFuera(event) {
  if (buscadorRef.value && !buscadorRef.value.contains(event.target)) mostrarResultados.value = false;
  if (exportarRef.value && !exportarRef.value.contains(event.target)) exportarAbierto.value = false;
}

/* ------------------------------------------------------------------ misc */

// El panel edita borradores: se sincronizan con los filtros aplicados.
watch(estadoFiltro, (valor) => {
  draftEstado.value = valor;
});
watch(fechaFiltro, (valor) => {
  draftFecha.value = valor;
});

watch(modo, (valor) => {
  try {
    localStorage.setItem(CLAVE_VISTA, valor);
  } catch {
    /* almacenamiento no disponible: se mantiene solo en memoria */
  }
  if (valor !== 'calendario') {
    clearTimeout(searchTimer);
    mostrarResultados.value = false;
  }
});

onMounted(() => document.addEventListener('click', onClickFuera));

onUnmounted(() => {
  document.removeEventListener('click', onClickFuera);
  clearTimeout(searchTimer);
  busquedaRequest.cancel();
});
</script>

<template>
  <div>
    <div class="p-4 py-3 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
      <div class="w-full">
        <div>
          <nav class="flex mb-1.5" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
              <li class="inline-flex items-center">
                <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
              </li>
              <li class="text-gray-400" aria-current="page">/ Citas</li>
            </ol>
          </nav>
          <h1 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">
            <CalendarDays class="w-5 h-5 text-gray-900 dark:text-gray-400" />
            Citas
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Busca por placa o propietario, revisa la disponibilidad y agenda tus citas.
          </p>
        </div>

        <div id="citas-alertas">
          <Alert
            :type="alert.type"
            :title="alert.title"
            :message="alert.message"
            dismissible
            @dismiss="ocultarAlerta"
          />
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <!-- PANEL DE FILTROS -->
      <div class="bg-neutral-primary-soft shadow-xs rounded border border-default mb-4">
        <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
          <div>
            <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
              <Filter class="w-5 h-5" />
              Búsqueda
            </h2>
            <p class="text-sm text-body">{{ ayudaPanel }}</p>
          </div>

          <div v-if="!ES_CALENDARIO" class="flex flex-wrap items-center gap-2">
            <FilterActions
              :loading="aplicando || listaCargando"
              @clear="limpiarFiltros"
              @search="aplicarFiltros" />
          </div>
        </div>

        <div class="p-4">
          <div class="flex flex-wrap items-end gap-3 min-w-0">
            <div class="w-full min-w-60 shrink-0 lg:flex-1" :class="ES_CALENDARIO ? 'lg:max-w-xl' : 'lg:max-w-md'">
              <label for="citas-search" class="block mb-1 text-sm font-medium text-heading">Buscar cita</label>
              <div ref="buscadorRef" class="relative">
                <form @submit.prevent="onSubmitBusqueda">
                  <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <Search class="w-4 h-4 text-body" />
                  </div>
                  <input
                    id="citas-search"
                    v-model="search"
                    v-sanitize-search
                    type="search"
                    maxlength="100"
                    placeholder="Placa, cliente o motivo"
                    class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"
                  />
                </form>

                <div
                  v-if="hayResultados()"
                  class="absolute left-0 z-40 mt-1 w-full min-w-[19rem] overflow-hidden rounded-lg border border-default bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div class="flex items-center justify-between gap-2 border-b border-default px-3 py-2 text-xs text-body">
                    <span>
                      {{ resultados.length }} resultado{{ resultados.length === 1 ? '' : 's' }}
                    </span>
                    <LoaderCircle v-if="buscando" class="w-3.5 h-3.5 animate-spin" />
                  </div>

                  <p v-if="!resultados.length" class="px-3 py-3 text-xs text-body">
                    No se encontraron citas con «{{ search.trim() }}».
                  </p>

                  <ul v-else class="max-h-72 overflow-y-auto py-1">
                    <li v-for="cita in resultados" :key="cita.id">
                      <button
                        type="button"
                        class="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                        @click="elegirResultado(cita)"
                      >
                        <span class="flex items-baseline justify-between gap-2">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">
                            {{ cita.vehiculo?.placa || 'Sin placa' }}
                          </span>
                          <span class="text-xs text-body">{{ rangoCita(cita) }}</span>
                        </span>
                        <span class="block truncate text-xs text-gray-600 dark:text-gray-300">
                          {{ cita.cliente?.nombre || 'Sin cliente' }} · {{ cita.motivo_display }}
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="w-full sm:w-auto sm:shrink-0">
              <label for="citas-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
              <select
                id="citas-estado"
                v-model="estadoPanel"
                class="block w-full sm:w-52 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
              >
                <option v-for="e in ESTADOS_CITA" :key="e.value" :value="e.value">{{ e.label }}</option>
              </select>
            </div>

            <div v-if="!ES_CALENDARIO" class="w-full sm:w-auto sm:shrink-0">
              <label for="citas-fecha" class="block mb-1 text-sm font-medium text-heading">Fecha</label>
              <input
                id="citas-fecha"
                v-model="draftFecha"
                type="date"
                class="block w-full sm:w-44 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
              />
            </div>

            <p v-if="ES_CALENDARIO" class="w-full sm:w-auto sm:shrink-0 sm:pb-2.5 text-sm text-body">
              <template v-if="search.trim().length >= MIN_SEARCH_LENGTH">
                {{ coincidencias }} cita{{ coincidencias === 1 ? '' : 's' }} coincide{{ coincidencias === 1 ? '' : 'n' }} en el rango visible
              </template>
              <template v-else>
                Escribe {{ MIN_SEARCH_LENGTH }} caracteres o más para resaltar coincidencias.
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- PANEL DE LISTADO -->
      <div class="relative bg-neutral-primary-soft shadow-xs rounded border border-default">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-heading">{{ tituloPanel }}</h2>
            <p v-if="modo === 'lista' && resumenLabel" class="text-sm text-body">{{ resumenLabel }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex overflow-hidden rounded-lg border border-default-medium text-sm">
              <button
                type="button"
                :aria-pressed="modo === 'calendario'"
                class="px-3 py-2 font-medium transition"
                :class="modo === 'calendario'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
                @click="modo = 'calendario'"
              >
                Calendario
              </button>
              <button
                type="button"
                :aria-pressed="modo === 'lista'"
                class="px-3 py-2 font-medium transition"
                :class="modo === 'lista'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
                @click="modo = 'lista'"
              >
                Lista
              </button>
            </div>

            <div ref="exportarRef" class="relative">
              <button
                type="button"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-default-medium rounded shadow-xs hover:bg-neutral-secondary-medium dark:bg-gray-800 dark:text-gray-300 dark:border-default-medium dark:hover:bg-gray-700"
                :aria-expanded="exportarAbierto"
                @click.stop="exportarAbierto = !exportarAbierto"
              >
                <Download class="w-4 h-4 mr-1.5" />
                Exportar
              </button>

              <div
                v-if="exportarAbierto"
                class="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-lg border border-default bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  @click="exportarAbierto = false; avisar('info', 'Exportar a Excel', MENSAJE_REFERENCIAL)"
                >
                  <IconFileTypeXls class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Exportar a Excel
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  @click="exportarAbierto = false; avisar('info', 'Exportar a PDF', MENSAJE_REFERENCIAL)"
                >
                  <IconFileTypePdf class="w-4 h-4 text-red-600 dark:text-red-400" />
                  Exportar a PDF
                </button>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded bg-primary-500 shadow-xs hover:bg-primary-600 focus:ring-4 focus:ring-primary-300"
              @click="abrirCreacion"
            >
              <CalendarDays class="w-5 h-5 mr-1.5 -ml-1 text-white" />
              Nueva cita
            </button>
          </div>
        </div>

        <CalendarioView
          v-if="modo === 'calendario'"
          ref="calendarioRef"
          v-model:search="search"
          v-model:estado-filtro="estadoFiltro"
          v-model:fecha-seleccionada="fechaSeleccionada"
          :recargar-token="recargarToken"
          @crear="crearDesdePanel"
          @accion="onAccion"
          @coincidencias="coincidencias = $event"
          @alert="({ type, title, message }) => avisar(type, title, message)"
        />

        <AppointmentsView
          v-else
          v-model:search="search"
          v-model:estado-filtro="estadoFiltro"
          v-model:fecha-filtro="fechaFiltro"
          :recargar-token="recargarToken"
          @accion="onAccion"
          @cargando="listaCargando = $event"
          @resumen="resumenLista = $event"
          @alert="({ type, title, message }) => avisar(type, title, message)"
        />
      </div>
    </div>

    <CitaModal
      v-model="showCitaModal"
      :cita-id="citaModalId"
      :prefill="prefill"
      @created="onCitaGuardada('Cita creada correctamente.')"
      @updated="onCitaGuardada('Cita actualizada correctamente.')"
    />

    <CitaCalendarModal v-model="showCalendarModal" :cita="calendarCita" />

    <ConfirmModal
      v-model="showDeleteModal"
      entity-name="cita"
      :item-name="citaAEliminar ? `${citaAEliminar.fecha_cita} ${citaAEliminar.hora_cita}` : ''"
      :is-deleting="isDeleting"
      @confirm="confirmarEliminar"
      @cancel="citaAEliminar = null"
    />

    <div
      v-if="showConvertModal && citaAConvertir"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Convertir cita a recepción</h3>
        </div>
        <div class="px-6 py-4">
          <Alert v-if="convertingError" type="error" :message="convertingError" dismissible @dismiss="convertingError = ''" />
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Se creará una recepción de vehículo con los datos de la cita
            <span class="font-semibold">{{ fechaCorta(citaAConvertir.fecha_cita) }} {{ citaAConvertir.hora_cita }}</span>
            para el vehículo <span class="font-semibold">{{ citaAConvertir.vehiculo?.placa }}</span>
            y el cliente <span class="font-semibold">{{ citaAConvertir.cliente?.nombre }}</span>.
            La cita quedará marcada como completada.
          </p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
            @click="showConvertModal = false; citaAConvertir = null"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isConverting"
            class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="confirmarConvertir"
          >
            {{ isConverting ? 'Convirtiendo...' : 'Convertir' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
