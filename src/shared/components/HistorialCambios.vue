<script setup>
/**
 * Historial de cambios de un documento del flujo (lateral de los `*Detail.vue`).
 *
 * Lee `GET <endpoint>` (paginado, más reciente primero) y agrupa los eventos
 * de un mismo guardado (`operacion`). En el lateral muestra los últimos
 * guardados; «Ver historial completo» abre un panel con todo, página a página.
 * El padre lo monta solo si el rol tiene la acción especial `historial_<recurso>`.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { History, X } from 'lucide-vue-next';
import { request } from '../services/httpClient';
import { formatDateTime } from '../utils/datetime';

const props = defineProps({
  /** Ruta del historial, p. ej. `/api/ordenes/ordenes-trabajo/<id>/historial/`. */
  endpoint: { type: String, required: true },
  /** Cualquier valor que cambie cuando el documento se recarga: vuelve a pedir el historial. */
  version: { type: [Object, String, Number], default: null },
  /** Guardados visibles en el lateral. */
  limite: { type: Number, default: 5 },
});

const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';

const TITULOS = {
  creado: 'Documento creado',
  eliminado: 'Documento eliminado',
  sincronizado: 'Sincronizado',
  cotizacion_aplicada: 'Cotización aplicada',
};
const PUNTOS = {
  estado: 'bg-brand-900 dark:bg-brand-300',
  creado: 'bg-brand-900 dark:bg-brand-300',
  linea_agregada: 'bg-green-600',
  linea_eliminada: 'bg-red-600',
  foto_eliminada: 'bg-red-600',
  eliminado: 'bg-red-600',
};

const eventos = ref([]);
const total = ref(0);
const pagina = ref(1);
const hayMas = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const panelAbierto = ref(false);

/** Eventos consecutivos de una misma operación forman un guardado. */
const guardados = computed(() => {
  const grupos = [];
  for (const evento of eventos.value) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.operacion === evento.operacion) ultimo.eventos.push(evento);
    else grupos.push({ operacion: evento.operacion, fecha: evento.fecha, usuario: evento.usuario_nombre, eventos: [evento] });
  }
  return grupos;
});
const recientes = computed(() => guardados.value.slice(0, props.limite));

function titulo(evento) {
  return evento.etiqueta || TITULOS[evento.evento] || 'Cambio';
}

function punto(grupo) {
  const tipos = grupo.eventos.map((e) => e.evento);
  const clave = Object.keys(PUNTOS).find((tipo) => tipos.includes(tipo));
  return PUNTOS[clave] || 'bg-gray-400 dark:bg-gray-500';
}

/** Valor anterior y nuevo a mostrar; en altas y bajas solo uno de los dos. */
function valores(evento) {
  return { anterior: evento.valor_anterior, nuevo: evento.valor_nuevo, flecha: Boolean(evento.valor_anterior && evento.valor_nuevo) };
}

async function cargar(numero = 1) {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const separador = props.endpoint.includes('?') ? '&' : '?';
    const data = await request(`${props.endpoint}${separador}page=${numero}`);
    const filas = data.results || [];
    eventos.value = numero === 1 ? filas : [...eventos.value, ...filas];
    total.value = data.count ?? eventos.value.length;
    hayMas.value = Boolean(data.next);
    pagina.value = numero;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo cargar el historial de cambios.';
  } finally {
    isLoading.value = false;
  }
}

function cargarMas() {
  if (!isLoading.value && hayMas.value) cargar(pagina.value + 1);
}

function cerrarConEscape(evento) {
  if (evento.key === 'Escape') panelAbierto.value = false;
}

watch(panelAbierto, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : '';
  if (abierto) window.addEventListener('keydown', cerrarConEscape);
  else window.removeEventListener('keydown', cerrarConEscape);
});

watch(() => [props.endpoint, props.version], () => cargar(1), { immediate: true });

onBeforeUnmount(() => {
  window.removeEventListener('keydown', cerrarConEscape);
  document.body.style.overflow = '';
});

defineExpose({ recargar: () => cargar(1) });
</script>

<template>
  <section :class="SECCION">
    <h4 :class="[TITULO_SECCION, 'mb-4']">
      <History class="w-4 h-4" />
      Historial de cambios
    </h4>

    <p v-if="errorMessage" class="text-xs text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    <p v-else-if="isLoading && !eventos.length" class="text-xs text-gray-500 dark:text-gray-400">Cargando historial…</p>
    <p v-else-if="!eventos.length" class="text-xs text-gray-500 dark:text-gray-400">Aún no hay cambios registrados.</p>

    <template v-else>
      <ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
        <li v-for="grupo in recientes" :key="grupo.operacion" class="mb-5 ms-5 last:mb-0">
          <span class="absolute -start-1.5 mt-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-800" :class="punto(grupo)"></span>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ grupo.usuario }}</p>
          <time class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatDateTime(grupo.fecha) }}</time>
          <ul class="mt-1 space-y-0.5">
            <li v-for="evento in grupo.eventos.slice(0, 3)" :key="evento.id" class="text-xs text-gray-600 dark:text-gray-300">
              <span class="font-medium">{{ titulo(evento) }}</span>
              <template v-if="valores(evento).anterior || valores(evento).nuevo">:
                <span v-if="valores(evento).anterior" :class="{ 'line-through text-gray-400 dark:text-gray-500': ['linea_eliminada', 'foto_eliminada'].includes(evento.evento) }">{{ valores(evento).anterior }}</span>
                <span v-if="valores(evento).flecha"> → </span>
                <span v-if="valores(evento).nuevo">{{ valores(evento).nuevo }}</span>
              </template>
            </li>
            <li v-if="grupo.eventos.length > 3" class="text-xs text-gray-500 dark:text-gray-400">y {{ grupo.eventos.length - 3 }} cambios más</li>
          </ul>
        </li>
      </ol>
      <button
        type="button"
        class="w-full px-3 py-2 mt-4 text-sm font-medium text-brand-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        @click="panelAbierto = true">
        Ver historial completo
      </button>
    </template>
  </section>

  <!-- Panel lateral con todo el historial: solo lectura, se puede cerrar sin perder nada. -->
  <Teleport to="body">
    <div v-if="panelAbierto" class="fixed inset-0 z-50 flex justify-end">
      <div class="fixed inset-0 bg-black/50" @click="panelAbierto = false"></div>
      <div
        class="relative flex flex-col w-full h-full max-w-md bg-white shadow-lg dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="historial-cambios-titulo">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 id="historial-cambios-titulo" class="text-base font-semibold text-gray-900 dark:text-white">Historial de cambios</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ total }} cambios registrados</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center w-9 h-9 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
            @click="panelAbierto = false">
            <X class="w-5 h-5" />
            <span class="sr-only">Cerrar historial</span>
          </button>
        </div>

        <div class="flex-1 p-4 overflow-y-auto">
          <ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
            <li v-for="grupo in guardados" :key="grupo.operacion" class="mb-6 ms-5 last:mb-0">
              <span class="absolute -start-1.5 mt-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-800" :class="punto(grupo)"></span>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ grupo.usuario }}</p>
              <time class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatDateTime(grupo.fecha) }}</time>
              <dl class="mt-2 space-y-2">
                <div v-for="evento in grupo.eventos" :key="evento.id" class="text-sm">
                  <dt class="font-medium text-gray-700 dark:text-gray-200">{{ titulo(evento) }}</dt>
                  <dd v-if="valores(evento).anterior || valores(evento).nuevo" class="text-gray-600 dark:text-gray-300 break-words">
                    <span v-if="valores(evento).anterior" class="text-gray-400 line-through dark:text-gray-500">{{ valores(evento).anterior }}</span>
                    <span v-if="valores(evento).flecha" class="text-gray-400"> → </span>
                    <span v-if="valores(evento).nuevo">{{ valores(evento).nuevo }}</span>
                  </dd>
                </div>
              </dl>
            </li>
          </ol>
          <p v-if="errorMessage" class="mt-4 text-xs text-red-600 dark:text-red-400">{{ errorMessage }}</p>
          <button
            v-if="hayMas"
            type="button"
            class="w-full px-3 py-2 mt-6 text-sm font-medium text-brand-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            :disabled="isLoading"
            @click="cargarMas">
            {{ isLoading ? 'Cargando…' : 'Cargar más' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
