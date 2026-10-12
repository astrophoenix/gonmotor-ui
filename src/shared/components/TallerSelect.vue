<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Check, ChevronDown, Loader2, Search, Wrench } from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import { listarTalleresDisponibles } from '../services/talleresDisponiblesService';
import { createLatestRequest, isAbortError, SEARCH_DEBOUNCE_MS } from '../utils/search';

const props = defineProps({
  /** Id del taller seleccionado. */
  modelValue: { type: [Number, String], default: null },
  /**
   * Lista de talleres precargada. Si se pasa, el componente filtra en memoria
   * (modo local, p. ej. en el login); si no, consulta `/api/auth/talleres/`.
   */
  talleres: { type: Array, default: null },
  /** Nombre del taller activo (etiqueta del disparador cuando aún no hay lista). */
  nombre: { type: String, default: '' },
  placeholder: { type: String, default: 'Seleccionar taller' },
  /** `topbar` (chip compacto) o `campo` (ancho completo, para el login). */
  variante: { type: String, default: 'topbar' },
  /** Alineación del panel desplegable. */
  alinear: { type: String, default: 'right' },
  /** Pide confirmación antes de emitir el cambio (útil en el topbar). */
  confirmar: { type: Boolean, default: false },
  /** Deshabilita el disparador y muestra un spinner mientras se aplica el cambio. */
  cambiando: { type: Boolean, default: false },
  /**
   * Muestra arriba la opción «Todos los talleres» (emite `id: null`). Solo para
   * la administración que puede operar sin taller activo.
   */
  permitirTodos: { type: Boolean, default: false },
  /** Marca el campo en error (borde rojo) cuando es obligatorio y está vacío. */
  invalid: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

const MAX_VISIBLES = 5;

const OPCION_TODOS = { id: null, nombre: 'Todos los talleres', esTodos: true };

const abierto = ref(false);
const termino = ref('');
const resultados = ref([]);
const total = ref(0);
const cargando = ref(false);
const error = ref('');
const indiceActivo = ref(-1);

const pendiente = ref(null);
const modalConfirmacion = ref(false);

const raizRef = ref(null);
const inputRef = ref(null);

const latest = createLatestRequest();
let temporizador = null;

const esLocal = computed(() => Array.isArray(props.talleres));

function normalizar(texto) {
  return (texto ?? '').toString().toLowerCase();
}

const fuente = computed(() => {
  if (esLocal.value) {
    const q = normalizar(termino.value).trim();
    if (!q) return props.talleres;
    return props.talleres.filter((taller) =>
      [taller.nombre, taller.ciudad, taller.codigo_sucursal]
        .some((campo) => normalizar(campo).includes(q))
    );
  }
  return resultados.value;
});

const opciones = computed(() =>
  props.permitirTodos ? [OPCION_TODOS, ...fuente.value] : fuente.value
);

const visibles = computed(() => opciones.value.slice(0, MAX_VISIBLES));

const totalFuente = computed(() =>
  esLocal.value ? fuente.value.length : total.value
);

const restantes = computed(() => {
  const reales = visibles.value.filter((opcion) => !opcion.esTodos).length;
  return Math.max(totalFuente.value - reales, 0);
});

const tallerActual = computed(() => {
  const id = props.modelValue;
  if (id == null) return null;
  return fuente.value.find((t) => String(t.id) === String(id)) || null;
});

const etiqueta = computed(() => {
  if (props.modelValue == null && props.permitirTodos) return OPCION_TODOS.nombre;
  return tallerActual.value?.nombre || props.nombre || props.placeholder;
});

const nombrePendiente = computed(() => pendiente.value?.nombre || '');

const mensajeConfirmacion = computed(
  () => `Vas a cambiar del taller «${etiqueta.value}» a «${nombrePendiente.value}». Se abrirá el tablero del taller seleccionado.`
);

const esVarianteCampo = computed(() => props.variante === 'campo');

const claseDisparador = computed(() => {
  if (esVarianteCampo.value) {
    const base =
      'flex h-10 w-full items-center justify-between gap-3 rounded-xl border-[1.5px] bg-white px-3.5 text-base text-brand-ink outline-none transition-colors focus:ring-4 dark:bg-slate-800 dark:text-white';
    return props.invalid
      ? `${base} border-brand-red focus:border-brand-red focus:ring-brand-red/15 dark:border-brand-red`
      : `${base} border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring dark:border-slate-600`;
  }
  const base =
    'inline-flex min-w-0 max-w-[15rem] items-center gap-2 rounded-lg border bg-brand-50 px-2.5 py-2 text-sm text-ink transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-brand-800 dark:text-white dark:hover:bg-brand-700';
  return props.invalid
    ? `${base} border-brand-red dark:border-brand-red`
    : `${base} border-brand-100 dark:border-brand-700`;
});

const claseEtiqueta = computed(() =>
  esVarianteCampo.value ? 'truncate font-medium' : 'hidden truncate font-medium sm:inline'
);

const clasePanel = computed(() => {
  const base =
    'absolute z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900';
  if (esVarianteCampo.value) {
    return `${base} left-0 w-full`;
  }
  return `${base} ${props.alinear === 'left' ? 'left-0' : 'right-0'} w-[300px] max-w-[calc(100vw-2rem)]`;
});

function seleccionar(taller) {
  if (String(taller.id) === String(props.modelValue)) {
    cerrar(true);
    return;
  }

  if (props.confirmar) {
    pendiente.value = taller;
    modalConfirmacion.value = true;
    cerrar();
    return;
  }

  aplicar(taller);
  cerrar(true);
}

function aplicar(taller) {
  emit('update:modelValue', taller.id);
  emit('change', taller);
}

function confirmarCambio() {
  const taller = pendiente.value;
  modalConfirmacion.value = false;
  pendiente.value = null;
  if (taller) aplicar(taller);
}

function cancelarCambio() {
  modalConfirmacion.value = false;
  pendiente.value = null;
}

function abrir() {
  abierto.value = true;
  indiceActivo.value = -1;
  nextTick(() => inputRef.value?.focus());
  if (!esLocal.value && !resultados.value.length) {
    cargar('');
  }
}

function cerrar(enfocar = false) {
  abierto.value = false;
  termino.value = '';
  indiceActivo.value = -1;
  latest.cancel();
  if (enfocar) raizRef.value?.querySelector('[data-disparador]')?.focus();
}

function alternar() {
  abierto.value ? cerrar() : abrir();
}

async function cargar(q) {
  const { signal, id } = latest.begin();
  cargando.value = true;
  error.value = '';

  try {
    const data = await listarTalleresDisponibles(q, signal);
    if (!latest.isCurrent(id)) return;
    resultados.value = data.resultados || [];
    total.value = data.total ?? resultados.value.length;
  } catch (fallo) {
    if (isAbortError(fallo) || !latest.isCurrent(id)) return;
    error.value = fallo.message || 'No se pudieron cargar los talleres.';
    resultados.value = [];
    total.value = 0;
  } finally {
    if (latest.isCurrent(id)) cargando.value = false;
  }
}

watch(termino, (valor) => {
  if (esLocal.value) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => cargar(valor), SEARCH_DEBOUNCE_MS);
});

function mover(delta) {
  if (!visibles.value.length) return;
  const actual = indiceActivo.value;
  const siguiente = actual + delta;
  indiceActivo.value = Math.min(Math.max(siguiente, 0), visibles.value.length - 1);
}

function onTeclado(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    mover(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    mover(-1);
  } else if (event.key === 'Enter') {
    const taller = visibles.value[indiceActivo.value] || visibles.value[0];
    if (taller) {
      event.preventDefault();
      seleccionar(taller);
    }
  } else if (event.key === 'Escape') {
    cerrar(true);
  }
}

function onClickFuera(event) {
  if (abierto.value && raizRef.value && !raizRef.value.contains(event.target)) {
    cerrar();
  }
}

onMounted(() => {
  document.addEventListener('click', onClickFuera);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickFuera);
  clearTimeout(temporizador);
  latest.cancel();
});
</script>

<template>
  <div ref="raizRef" class="relative">
    <button
      data-disparador
      type="button"
      :class="claseDisparador"
      aria-haspopup="listbox"
      :aria-expanded="String(abierto)"
      aria-controls="taller-select-panel"
      :title="etiqueta"
      :disabled="cambiando"
      @click="alternar"
      @keydown.down.prevent="abrir()"
    >
      <Wrench class="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-100" aria-hidden="true" />
      <span :class="claseEtiqueta" class="flex-1 text-left">{{ etiqueta }}</span>
      <Loader2 v-if="cambiando" class="h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-hidden="true" />
      <ChevronDown
        v-else
        class="h-3.5 w-3.5 shrink-0 text-muted transition-transform"
        :class="abierto && 'rotate-180'"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="abierto"
      id="taller-select-panel"
      class="pt-0"
      :class="clasePanel"
      role="listbox"
      aria-label="Talleres disponibles"
    >
      <!-- Buscador -->
      <div class="border-b border-brand-100 p-2 dark:border-brand-700">
        <div class="relative">
          <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="termino"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Buscar taller…"
            aria-label="Buscar taller"
            class="w-full rounded-lg border border-brand-100 bg-brand-50 py-1.5 pl-8 pr-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-brand-700 dark:bg-brand-800 dark:text-white dark:placeholder:text-brand-300"
            @keydown="onTeclado"
          >
        </div>
      </div>

      <!-- Estados -->
      <div v-if="cargando" class="flex items-center gap-2 px-4 py-5 text-sm text-ink-soft dark:text-brand-300">
        <Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando talleres…
      </div>
      <div v-else-if="error" class="px-4 py-5 text-sm text-danger">{{ error }}</div>
      <div v-else-if="!visibles.length" class="px-4 py-5 text-sm text-ink-soft dark:text-brand-300">
        {{ termino ? `Sin coincidencias para «${termino}».` : 'No hay talleres disponibles.' }}
      </div>

      <!-- Lista -->
      <template v-else>
        <ul class="max-h-64 overflow-y-auto py-1.5">
          <li v-for="(taller, indice) in visibles" :key="taller.id">
            <button
              type="button"
              role="option"
              :aria-selected="String(String(taller.id) === String(modelValue))"
              class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
              :class="indice === indiceActivo
                ? 'bg-surface dark:bg-brand-800'
                : 'hover:bg-surface dark:hover:bg-brand-800'"
              @mouseenter="indiceActivo = indice"
              @click="seleccionar(taller)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-100">
                <Wrench class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink dark:text-white">
                  {{ taller.nombre }}
                </span>
                <span
                  v-if="taller.ciudad || taller.codigo_sucursal"
                  class="block truncate text-xs text-ink-soft dark:text-brand-300"
                >
                  {{ [taller.ciudad, taller.codigo_sucursal].filter(Boolean).join(' · ') }}
                </span>
              </span>
              <Check
                v-if="String(taller.id) === String(modelValue)"
                class="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-100"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>

        <!-- Indicación delicada de que hay más -->
        <div
          v-if="restantes > 0"
          class="border-t border-brand-100 px-3 py-1.5 text-center text-[11px] text-muted dark:border-brand-700"
        >
          y {{ restantes }} taller{{ restantes === 1 ? '' : 'es' }} más…
        </div>
      </template>
    </div>

    <ConfirmModal
      v-model="modalConfirmacion"
      title="Cambiar de taller"
      :message="mensajeConfirmacion"
      :icon="Wrench"
      variant="primary"
      confirm-text="Cambiar taller"
      confirming-text="Cambiando…"
      :is-deleting="cambiando"
      @confirm="confirmarCambio"
      @cancel="cancelarCambio"
    />
  </div>
</template>
