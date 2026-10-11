<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  Car,
  ClipboardCheck,
  ClipboardList,
  Cog,
  CornerDownLeft,
  FileText,
  Loader2,
  Package,
  Search,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-vue-next';
import { buscarGlobal } from '../services/busquedaService';
import { createLatestRequest, isAbortError } from '../utils/search';
import { formatPlate } from '../utils/formatPlate';

/** Grupos → icono (librería existente del proyecto). */
const ICONOS = {
  clientes: User,
  vehiculos: Car,
  recepciones: ClipboardList,
  ordenes: Wrench,
  cotizaciones: FileText,
  inspecciones: ClipboardCheck,
  proveedores: Truck,
  repuestos: Package,
  servicios: Cog,
};

/** Grupo → constructor de la URL de destino (mismas rutas que usa el resto de la app). */
const RUTAS = {
  clientes: (id) => `/crud/clientes/ver/?id=${encodeURIComponent(id)}`,
  vehiculos: (id) => `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}`,
  recepciones: (id) => `/crud/recepciones/ver/?id=${encodeURIComponent(id)}`,
  ordenes: (id) => `/crud/ordenes/ver/?id=${encodeURIComponent(id)}`,
  cotizaciones: (id) => `/crud/cotizaciones/ver/?id=${encodeURIComponent(id)}`,
  inspecciones: (id) => `/crud/inspecciones/ver/?id=${encodeURIComponent(id)}`,
  proveedores: (id) => `/crud/proveedores/ver/?id=${encodeURIComponent(id)}`,
  repuestos: () => '/crud/repuestos/',
  servicios: () => '/crud/servicios/',
};

const EJEMPLOS = ['GSU-5812', 'REC-0001', 'Juan Pérez'];

const MINIMO = 2;
const DEBOUNCE_MS = 250;

const termino = ref('');
const grupos = ref([]);
const cargando = ref(false);
const error = ref('');
const abierto = ref(false);
const movilAbierto = ref(false);
const indiceActivo = ref(-1);

const raizRef = ref(null);
const inputRef = ref(null);

const latest = createLatestRequest();
let temporizador = null;

const terminoLimpio = computed(() => termino.value.trim());
const hayTermino = computed(() => terminoLimpio.value.length >= MINIMO);
const panelVisible = computed(() => abierto.value || movilAbierto.value);

/** Resultados aplanados para navegación por teclado. */
const plana = computed(() =>
  grupos.value.flatMap((grupo) => grupo.resultados.map((r) => ({ ...r, grupo: grupo.tipo })))
);

/** Índice global de cada resultado (para `aria-activedescendant`/estilos). */
const indicePorClave = computed(() => {
  const mapa = {};
  plana.value.forEach((r, indice) => {
    mapa[`${r.grupo}:${r.id}`] = indice;
  });
  return mapa;
});

function indiceDe(grupo, resultado) {
  return indicePorClave.value[`${grupo.tipo}:${resultado.id}`] ?? -1;
}

const contenedorClase = computed(() =>
  movilAbierto.value
    ? 'fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-brand-100 bg-white px-4 dark:border-brand-800 dark:bg-brand-900'
    : 'hidden lg:block'
);

const panelClase = computed(() =>
  movilAbierto.value
    ? 'fixed inset-x-0 top-14 z-40 mx-3 overflow-hidden rounded-xl border border-line bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900'
    : 'absolute right-0 z-50 mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900'
);

function iconoDe(tipo) {
  return ICONOS[tipo] || Search;
}

function urlResultado(resultado) {
  const constructor = RUTAS[resultado.grupo || resultado.tipo];
  return constructor ? constructor(resultado.id) : null;
}

/** Divide un texto en segmentos para resaltar la coincidencia. */
function segmentos(texto) {
  const completo = (texto ?? '').toString();
  const q = terminoLimpio.value;
  if (!q) return [{ texto: completo, match: false }];

  const indice = completo.toLowerCase().indexOf(q.toLowerCase());
  if (indice === -1) return [{ texto: completo, match: false }];

  return [
    { texto: completo.slice(0, indice), match: false },
    { texto: completo.slice(indice, indice + q.length), match: true },
    { texto: completo.slice(indice + q.length), match: false },
  ].filter((segmento) => segmento.texto);
}

function tituloResultado(resultado) {
  return resultado.grupo === 'vehiculos' ? formatPlate(resultado.titulo) : resultado.titulo;
}

function reiniciar() {
  grupos.value = [];
  cargando.value = false;
  error.value = '';
  indiceActivo.value = -1;
}

async function ejecutarBusqueda() {
  const q = terminoLimpio.value;
  if (q.length < MINIMO) {
    latest.cancel();
    reiniciar();
    return;
  }

  const { signal, id } = latest.begin();
  cargando.value = true;
  error.value = '';

  try {
    const data = await buscarGlobal(q, signal);
    if (!latest.isCurrent(id)) return;
    grupos.value = data.grupos || [];
    indiceActivo.value = -1;
  } catch (fallo) {
    if (isAbortError(fallo) || !latest.isCurrent(id)) return;
    error.value = fallo.message || 'No se pudo completar la búsqueda.';
    grupos.value = [];
  } finally {
    if (latest.isCurrent(id)) cargando.value = false;
  }
}

watch(termino, () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(ejecutarBusqueda, DEBOUNCE_MS);
});

watch(indiceActivo, (indice) => {
  if (indice < 0) return;
  nextTick(() => {
    document.getElementById(`gs-opt-${indice}`)?.scrollIntoView({ block: 'nearest' });
  });
});

function cerrar() {
  abierto.value = false;
  indiceActivo.value = -1;
}

function cerrarMovil() {
  movilAbierto.value = false;
  abierto.value = false;
  termino.value = '';
  reiniciar();
}

function abrirMovil() {
  movilAbierto.value = true;
  abierto.value = true;
  nextTick(() => inputRef.value?.focus());
}

async function elegirEjemplo(ejemplo) {
  termino.value = ejemplo;
  abierto.value = true;
  await nextTick();
  inputRef.value?.focus();
}

function enfocar() {
  if (window.matchMedia('(min-width: 64rem)').matches) {
    inputRef.value?.focus();
    abierto.value = true;
  } else {
    abrirMovil();
  }
}

function navegar(resultado) {
  const url = urlResultado(resultado);
  if (url) {
    window.location.href = url;
  }
}

function onInputKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    abierto.value = true;
    if (!plana.value.length) return;
    indiceActivo.value = Math.min(indiceActivo.value + 1, plana.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (!plana.value.length) return;
    indiceActivo.value = Math.max(indiceActivo.value - 1, 0);
  } else if (event.key === 'Enter') {
    const resultado = plana.value[indiceActivo.value] || plana.value[0];
    if (resultado) {
      event.preventDefault();
      navegar(resultado);
    }
  } else if (event.key === 'Escape') {
    if (movilAbierto.value) {
      cerrarMovil();
    } else {
      cerrar();
      inputRef.value?.blur();
    }
  }
}

function onKeydownGlobal(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    enfocar();
  }
}

function onClickFuera(event) {
  if (raizRef.value && !raizRef.value.contains(event.target)) {
    cerrar();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydownGlobal);
  document.addEventListener('click', onClickFuera);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydownGlobal);
  document.removeEventListener('click', onClickFuera);
  clearTimeout(temporizador);
  latest.cancel();
});
</script>

<template>
  <div ref="raizRef" class="relative">
    <!-- Disparador (móvil): se colapsa a un icono -->
    <button
      v-if="!movilAbierto"
      type="button"
      class="inline-flex items-center justify-center rounded-lg p-2 text-ink-soft transition-colors hover:bg-surface hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden dark:text-brand-300 dark:hover:bg-brand-800 dark:hover:text-white"
      aria-label="Buscar (Ctrl + K)"
      @click="abrirMovil"
    >
      <Search class="h-5 w-5" aria-hidden="true" />
    </button>

    <!-- Campo de búsqueda (inyectado al topbar en escritorio; a pantalla completa en móvil) -->
    <div :class="contenedorClase">
      <div class="relative w-full lg:w-auto">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref="inputRef"
          v-model="termino"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          placeholder="Placa, cliente, REC…"
          aria-label="Búsqueda global"
          aria-controls="global-search-results"
          aria-autocomplete="list"
          :aria-expanded="String(panelVisible)"
          :aria-activedescendant="indiceActivo >= 0 ? `gs-opt-${indiceActivo}` : undefined"
          class="w-full rounded-lg border border-brand-100 bg-brand-50 py-2 pl-8 pr-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 lg:w-[230px] lg:pr-14 xl:w-[280px] dark:border-brand-700 dark:bg-brand-800 dark:text-white dark:placeholder:text-brand-300"
          @focus="abierto = true"
          @keydown="onInputKeydown"
        >
        <kbd
          v-if="!movilAbierto"
          class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] font-medium text-muted lg:flex dark:border-brand-700 dark:bg-brand-900 dark:text-brand-300"
        >
          Ctrl K
        </kbd>
        <button
          v-if="movilAbierto"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-surface hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300 dark:hover:bg-brand-800 dark:hover:text-white"
          aria-label="Cerrar búsqueda"
          @click="cerrarMovil"
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Panel de resultados -->
    <div
      v-if="panelVisible"
      id="global-search-results"
      role="listbox"
      aria-label="Resultados de búsqueda"
      :class="panelClase"
    >
      <!-- Cargando -->
      <div v-if="cargando" class="flex items-center gap-2 px-4 py-6 text-sm text-ink-soft dark:text-brand-300">
        <Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
        Buscando…
      </div>

      <!-- Error -->
      <div v-else-if="error" class="px-4 py-6 text-sm text-danger">{{ error }}</div>

      <!-- Sin término aún: sugerencias -->
      <div v-else-if="!hayTermino" class="px-4 py-5">
        <p class="text-sm font-medium text-ink dark:text-white">Búsqueda global</p>
        <p class="mt-1 text-xs text-ink-soft dark:text-brand-300">
          Encuentra clientes, vehículos, recepciones, órdenes y más. También con
          <kbd class="rounded border border-line px-1 text-[10px] dark:border-brand-700">Ctrl</kbd>
          <kbd class="rounded border border-line px-1 text-[10px] dark:border-brand-700">K</kbd>.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="ejemplo in EJEMPLOS"
            :key="ejemplo"
            type="button"
            class="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand-700 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-brand-700 dark:bg-brand-800 dark:text-brand-100"
            @click="elegirEjemplo(ejemplo)"
          >
            {{ ejemplo }}
          </button>
        </div>
      </div>

      <!-- Sin resultados -->
      <div v-else-if="!plana.length" class="px-4 py-6 text-sm text-ink-soft dark:text-brand-300">
        Sin resultados para «{{ terminoLimpio }}».
      </div>

      <!-- Resultados agrupados -->
      <template v-else>
        <div class="max-h-[70vh] overflow-y-auto py-1.5">
          <div v-for="grupo in grupos" :key="grupo.tipo" class="px-1.5">
            <p class="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <component :is="iconoDe(grupo.tipo)" class="h-3.5 w-3.5" aria-hidden="true" />
              {{ grupo.etiqueta }}
            </p>
            <button
              v-for="resultado in grupo.resultados"
              :id="`gs-opt-${indiceDe(grupo, resultado)}`"
              :key="`${grupo.tipo}-${resultado.id}`"
              type="button"
              role="option"
              :aria-selected="String(indiceDe(grupo, resultado) === indiceActivo)"
              class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
              :class="indiceDe(grupo, resultado) === indiceActivo
                ? 'bg-surface dark:bg-brand-800'
                : 'hover:bg-surface dark:hover:bg-brand-800'"
              @mouseenter="indiceActivo = indiceDe(grupo, resultado)"
              @click="navegar(resultado)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-100">
                <component :is="iconoDe(grupo.tipo)" class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink dark:text-white">
                  <template v-for="(segmento, i) in segmentos(tituloResultado(resultado))" :key="i">
                    <mark
                      v-if="segmento.match"
                      class="rounded-sm bg-brand-100 text-brand-900 dark:bg-brand-700 dark:text-white"
                    >{{ segmento.texto }}</mark>
                    <template v-else>{{ segmento.texto }}</template>
                  </template>
                </span>
                <span
                  v-if="resultado.subtitulo"
                  class="block truncate text-xs text-ink-soft dark:text-brand-300"
                >
                  <template v-for="(segmento, i) in segmentos(resultado.subtitulo)" :key="i">
                    <mark
                      v-if="segmento.match"
                      class="rounded-sm bg-brand-100 text-brand-900 dark:bg-brand-700 dark:text-white"
                    >{{ segmento.texto }}</mark>
                    <template v-else>{{ segmento.texto }}</template>
                  </template>
                </span>
              </span>
              <span
                v-if="resultado.meta"
                class="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-800 dark:text-brand-100"
              >
                {{ resultado.meta }}
              </span>
            </button>
          </div>
        </div>

        <!-- Pie con atajos -->
        <div class="flex items-center justify-between border-t border-brand-100 px-3 py-2 text-[11px] text-muted dark:border-brand-700">
          <span class="flex items-center gap-2">
            <span>↑↓ navegar</span>
            <span class="flex items-center gap-1"><CornerDownLeft class="h-3 w-3" aria-hidden="true" /> abrir</span>
            <span>Esc cerrar</span>
          </span>
          <span>{{ grupos.length }} módulo{{ grupos.length === 1 ? '' : 's' }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
