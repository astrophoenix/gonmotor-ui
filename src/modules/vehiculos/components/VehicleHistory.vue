<script setup>
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { Search, RotateCcw, ClipboardList, TriangleAlert, CalendarX2, FileText, History } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import { TIPOS_TRABAJO } from '../../../shared/config/tiposTrabajo';
import { formatCurrency } from '../../../shared/utils/format';
import { formatFecha, formatKm } from '../utils/fichaVehiculo';
import { useVehicleHistory } from '../composables/useVehicleHistory';
import VehicleHistoryVisit from './VehicleHistoryVisit.vue';

const props = defineProps({
  vehicleId: { type: String, required: true },
});

const emit = defineEmits(['foto']);

const {
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
} = useVehicleHistory(props.vehicleId);

const cargado = ref(false);
const tiposTrabajo = TIPOS_TRABAJO.filter((tipo) => tipo.value);

let temporizador = null;
function buscarConPausa() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => fetchHistorial(1), 350);
}
onScopeDispose(() => clearTimeout(temporizador));

function elegirTipo(valor) {
  filtros.tipoTrabajo = filtros.tipoTrabajo === valor ? '' : valor;
  fetchHistorial(1);
}

const tarjetas = computed(() => {
  const i = indicadores.value || {};
  const lista = [
    { label: 'Visitas', valor: i.visitas != null ? String(i.visitas) : '—' },
    {
      label: 'Última visita',
      valor: i.dias_desde_ultima_visita == null
        ? '—'
        : i.dias_desde_ultima_visita === 0 ? 'Hoy' : `Hace ${i.dias_desde_ultima_visita} día${i.dias_desde_ultima_visita === 1 ? '' : 's'}`,
      detalle: i.ultima_visita ? formatFecha(i.ultima_visita) : '',
    },
    { label: 'Km por año', valor: i.km_por_anio != null ? formatKm(i.km_por_anio) : '—', detalle: i.km_por_anio == null ? 'Se calcula con 2 visitas o más' : '' },
  ];
  // El gasto solo llega a roles con permiso de ver órdenes.
  if (i.gasto_total != null) {
    lista.push({ label: 'Gasto acumulado', valor: formatCurrency(i.gasto_total), detalle: 'Órdenes completadas o entregadas' });
  }
  return lista;
});

const visitas = computed(() => entradas.value.filter((e) => e.tipo === 'visita'));
const primeraVisitaId = computed(() => (currentPage.value === 1 && visitas.value[0] ? claveDe(visitas.value[0]) : null));

function claveDe(entrada) {
  const docs = Object.values(entrada.documentos || {}).flat();
  return `${entrada.tipo}-${docs.map((d) => d.id).join('-')}-${entrada.fecha}`;
}

/** Lecturas que bajan respecto a la visita anterior (más antigua) se marcan. */
const kmSospechoso = computed(() => {
  const marcadas = new Set();
  const lista = entradas.value.filter((e) => e.tipo === 'visita' && e.kilometraje != null);
  lista.forEach((entrada, i) => {
    const anterior = lista[i + 1];
    if (anterior && entrada.kilometraje < anterior.kilometraje) marcadas.add(claveDe(entrada));
  });
  return marcadas;
});

const ICONO_EVENTO = { cita: CalendarX2, cotizacion: FileText };

onMounted(async () => {
  await fetchHistorial(1);
  cargado.value = true;
});
</script>

<template>
  <div class="space-y-6">
    <Alert
      v-if="errorMessage"
      type="error"
      :title="errorMessage"
      message=""
      dismissible
      @dismiss="errorMessage = ''"
    />

    <!-- Indicadores -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="tarjeta in tarjetas"
        :key="tarjeta.label"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <p class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ tarjeta.label }}</p>
        <p class="mt-2 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
          <span v-if="!cargado" class="inline-block h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></span>
          <template v-else>{{ tarjeta.valor }}</template>
        </p>
        <p v-if="cargado && tarjeta.detalle" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ tarjeta.detalle }}</p>
      </div>
    </div>

    <!-- Pendientes recomendados -->
    <section
      v-if="pendientes.length"
      class="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-900/20"
    >
      <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
        <TriangleAlert class="h-4 w-4" aria-hidden="true" />
        Pendientes recomendados ({{ pendientes.length }})
      </h3>
      <ul class="mt-2 space-y-1.5">
        <li
          v-for="(pendiente, i) in pendientes"
          :key="i"
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-amber-900 dark:text-amber-100"
        >
          <span>
            <span class="font-medium">{{ pendiente.descripcion }}</span>
            <span class="text-amber-800/80 dark:text-amber-200/80">
              · prioridad {{ pendiente.prioridad_display.toLowerCase() }} · {{ formatFecha(pendiente.fecha) }}
            </span>
          </span>
          <a
            :href="pendiente.origen.url"
            class="text-xs font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
          >Ver {{ pendiente.origen.numero }}</a>
        </li>
      </ul>
    </section>

    <!-- Filtros -->
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-full min-w-56 lg:flex-1">
          <label for="historial-buscar" class="mb-1 block text-sm font-medium text-gray-900 dark:text-white">Buscar en el historial</label>
          <div class="relative">
            <Search class="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              id="historial-buscar"
              v-model="filtros.q"
              type="search"
              maxlength="100"
              placeholder="Frenos, aceite, código DTC, N.º de documento…"
              class="block w-full rounded border border-gray-300 bg-white py-2 ps-9 pe-3 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              @input="buscarConPausa"
            >
          </div>
        </div>
        <div v-if="indicadores && indicadores.talleres && indicadores.talleres.length > 1" class="w-full sm:w-44">
          <label for="historial-taller" class="mb-1 block text-sm font-medium text-gray-900 dark:text-white">Taller</label>
          <select
            id="historial-taller"
            v-model="filtros.taller"
            class="block w-full rounded border border-gray-300 bg-white py-2 text-sm text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            @change="fetchHistorial(1)"
          >
            <option value="">Todos</option>
            <option v-for="taller in indicadores.talleres" :key="taller.id" :value="taller.id">{{ taller.nombre }}</option>
          </select>
        </div>
        <div class="w-[calc(50%-0.375rem)] sm:w-40">
          <label for="historial-desde" class="mb-1 block text-sm font-medium text-gray-900 dark:text-white">Desde</label>
          <input
            id="historial-desde"
            v-model="filtros.desde"
            type="date"
            class="block w-full rounded border border-gray-300 bg-white py-2 text-sm text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            @change="fetchHistorial(1)"
          >
        </div>
        <div class="w-[calc(50%-0.375rem)] sm:w-40">
          <label for="historial-hasta" class="mb-1 block text-sm font-medium text-gray-900 dark:text-white">Hasta</label>
          <input
            id="historial-hasta"
            v-model="filtros.hasta"
            type="date"
            class="block w-full rounded border border-gray-300 bg-white py-2 text-sm text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            @change="fetchHistorial(1)"
          >
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          v-for="tipo in tiposTrabajo"
          :key="tipo.value"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          :class="filtros.tipoTrabajo === tipo.value
            ? 'border-brand-600 bg-brand-700 text-white dark:border-brand-300 dark:bg-brand-200 dark:text-brand-900'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'"
          :aria-pressed="String(filtros.tipoTrabajo === tipo.value)"
          @click="elegirTipo(tipo.value)"
        >{{ tipo.label }}</button>
        <button
          v-if="hayFiltros()"
          type="button"
          class="ms-auto inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          @click="limpiarFiltros"
        >
          <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar
        </button>
      </div>
    </section>

    <!-- Carga inicial -->
    <div v-if="!cargado" class="space-y-4 animate-pulse" aria-busy="true" aria-label="Cargando historial">
      <div v-for="n in 3" :key="n" class="flex gap-4">
        <div class="hidden w-24 shrink-0 sm:block"><div class="h-4 rounded bg-gray-200 dark:bg-gray-700"></div></div>
        <div class="h-28 flex-1 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>

    <!-- Vacío -->
    <div
      v-else-if="!entradas.length && !isLoading"
      class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800"
    >
      <History class="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <template v-if="hayFiltros()">
        <p class="text-sm text-gray-600 dark:text-gray-300">Ninguna visita coincide con los filtros.</p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          @click="limpiarFiltros"
        >
          <RotateCcw class="h-4 w-4" aria-hidden="true" />
          Limpiar filtros
        </button>
      </template>
      <template v-else>
        <p class="text-sm text-gray-600 dark:text-gray-300">Este vehículo aún no tiene visitas en tu empresa.</p>
        <a
          href="/crud/recepciones/agregar/"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-800"
        >
          <ClipboardList class="h-4 w-4" aria-hidden="true" />
          Nueva recepción
        </a>
      </template>
    </div>

    <!-- Línea de tiempo -->
    <ol v-else class="relative space-y-4" :class="{ 'opacity-60 transition-opacity': isLoading }" aria-label="Historial del vehículo">
      <li
        v-for="entrada in entradas"
        :key="claveDe(entrada)"
        class="relative flex flex-col gap-2 sm:flex-row sm:gap-0"
      >
        <!-- Riel: fecha y kilometraje -->
        <div
          class="flex items-baseline gap-2 sm:w-28 sm:shrink-0 sm:flex-col sm:items-end sm:gap-0 sm:pe-5 sm:text-right"
          :class="{ 'sm:pt-4': entrada.tipo === 'visita' }"
        >
          <span
            class="text-xs font-semibold"
            :class="entrada.tipo === 'visita' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
          >{{ formatFecha(entrada.fecha) || 'Sin fecha' }}</span>
          <span v-if="entrada.kilometraje != null" class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {{ formatKm(entrada.kilometraje) }}
          </span>
          <span
            v-if="kmSospechoso.has(claveDe(entrada))"
            class="text-[11px] text-amber-700 dark:text-amber-300"
            title="Esta lectura es menor que la de la visita anterior"
          >Lectura menor a la anterior</span>
        </div>

        <!-- Marca sobre el riel -->
        <div class="absolute top-0 bottom-[-1rem] left-28 hidden w-px bg-gray-200 dark:bg-gray-700 sm:block" aria-hidden="true"></div>
        <span
          class="absolute left-28 hidden -translate-x-1/2 rounded-full sm:block"
          :class="entrada.tipo === 'visita'
            ? (claveDe(entrada) === primeraVisitaId
              ? 'top-5 h-3 w-3 bg-accent-500 ring-4 ring-accent-100 dark:ring-accent-500/20'
              : 'top-5 h-3 w-3 border-2 border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-800')
            : 'top-[0.45rem] h-2 w-2 bg-gray-300 dark:bg-gray-600'"
          aria-hidden="true"
        ></span>

        <div class="min-w-0 flex-1 sm:ps-5">
          <VehicleHistoryVisit
            v-if="entrada.tipo === 'visita'"
            :visita="entrada"
            :reciente="claveDe(entrada) === primeraVisitaId"
            @foto="(url) => emit('foto', url)"
          />
          <!-- Evento sin visita: una línea fina, sin tarjeta -->
          <p v-else class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <component :is="ICONO_EVENTO[entrada.subtipo] || FileText" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="font-medium text-gray-700 dark:text-gray-300">{{ entrada.texto }}</span>
            <span v-if="entrada.motivo">· {{ entrada.motivo }}</span>
            <span v-if="entrada.total">· {{ formatCurrency(entrada.total) }}</span>
            <span v-if="entrada.taller">· {{ entrada.taller.nombre }}</span>
            <template v-for="(lista, tipo) in entrada.documentos" :key="tipo">
              <a
                v-for="doc in lista.filter((d) => d.accesible)"
                :key="doc.id"
                :href="doc.url"
                class="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
                :class="{ 'font-mono': tipo !== 'cita' }"
              >{{ tipo === 'cita' ? 'Ver cita' : doc.numero }}</a>
            </template>
          </p>
        </div>
      </li>
    </ol>

    <Pagination
      v-if="cargado && total > 10"
      :total="total"
      :current-page="currentPage"
      :next-url="nextUrl"
      :previous-url="previousUrl"
      :disabled="isLoading"
      item-word="entrada"
      @page="fetchHistorial"
    />
  </div>
</template>
