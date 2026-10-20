<script setup>
/**
 * Asistente de importación masiva desde Excel (Prepara → Sube → Revisa → Listo).
 *
 * Genérico: cada módulo aporta su `config` (textos, columnas, reglas, cómo
 * pintar una fila) y su `servicio`. Nada se guarda hasta confirmar en «Revisa»:
 * el paso usa el modo `?validar=1` del backend (ver gonmotor-api, «Importación
 * masiva»). Contrato de respuesta: `total`, `exitosos`, `nuevos`,
 * `actualizados`, `errores` y, al validar, `filas` [{ fila, estado, motivo, … }].
 * Configuración de ejemplo: `modules/clientes/constants/importacionClientes.js`.
 */
import { computed, ref, watch } from 'vue';
import {
  X, Check, Download, CloudUpload, CircleAlert, CircleCheck, TriangleAlert,
  ArrowLeft, ArrowRight, Eye, EyeOff, Info, Lock, FileSpreadsheet, Trash2,
} from 'lucide-vue-next';
import { useToast } from '../composables/useToast';
import ToastContainer from './ToastContainer.vue';
import Alert from './Alert.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /**
   * {
   *   titulo, subtitulo, icono,
   *   entidad: { singular, plural },
   *   plantilla: { nombre, muestra: { columnas: [], fila: [] } },
   *   columnas: { obligatorias: [], grupos: [{ titulo, columnas: [] }] },
   *   reglas: [{ icono, titulo, texto }],
   *   fila: { principal, secundaria, extra, extraEtiqueta },   // claves de `filas`
   *   contadores: [{ clave, etiqueta }],                       // contadores adicionales (p. ej. vehículos)
   * }
   */
  config: { type: Object, required: true },
  /** { descargarPlantilla(), validar(file), importar(file), descargarErrores(errores) } */
  servicio: { type: Object, required: true },
});

const emit = defineEmits(['update:modelValue', 'imported']);
const { showSuccess, showError } = useToast();

const PASOS = [
  { titulo: 'Prepara tu archivo', detalle: 'Plantilla y reglas' },
  { titulo: 'Sube el archivo', detalle: 'Excel .xlsx' },
  { titulo: 'Revisa', detalle: 'Antes de guardar' },
  { titulo: 'Listo', detalle: 'Resultado' },
];
const FILAS_POR_TANDA = 50;
const BTN_PRIMARIO = 'inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-brand-700 dark:hover:bg-brand-600 dark:focus:ring-brand-800';
const BTN_SECUNDARIO = 'inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700';

const paso = ref(1);
const archivo = ref(null);
const arrastrando = ref(false);
const validando = ref(false);
const importando = ref(false);
const descargandoPlantilla = ref(false);
const descargandoErrores = ref(false);
const errorMensaje = ref('');
const columnasFaltantes = ref([]);
const previa = ref(null);
const resultado = ref(null);
const filtro = ref('todas');
const visibles = ref(FILAS_POR_TANDA);
const verColumnas = ref(false);
const avisoDescartar = ref(false);
const inputArchivo = ref(null);

const entidad = computed(() => props.config.entidad || { singular: 'registro', plural: 'registros' });
const totalColumnas = computed(() =>
  (props.config.columnas?.grupos || []).reduce((n, g) => n + g.columnas.length, 0));
const ocupado = computed(() => validando.value || importando.value);

const contadoresPrevia = computed(() => {
  if (!previa.value) return [];
  return [
    { valor: previa.value.nuevos, etiqueta: `${entidad.value.plural} nuevos`, clase: 'text-emerald-700 dark:text-emerald-400' },
    { valor: previa.value.actualizados, etiqueta: 'se actualizan', clase: 'text-brand-700 dark:text-brand-200' },
    ...(props.config.contadores || []).map((c) => ({
      valor: previa.value[c.clave] ?? 0, etiqueta: c.etiqueta, clase: 'text-gray-900 dark:text-white',
    })),
    { valor: filasConError.value, etiqueta: 'filas con error', clase: filasConError.value ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white' },
  ];
});
const filasConError = computed(() => (previa.value?.filas || []).filter((f) => f.estado === 'error').length);
const aImportar = computed(() => (previa.value ? previa.value.nuevos + previa.value.actualizados : 0));
const filasFiltradas = computed(() => {
  const filas = previa.value?.filas || [];
  return filtro.value === 'errores' ? filas.filter((f) => f.estado === 'error') : filas;
});
const filasVisibles = computed(() => filasFiltradas.value.slice(0, visibles.value));

function etiquetaCantidad(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

const tituloResultado = computed(() => {
  const r = resultado.value;
  if (!r) return '';
  if (!r.exitosos) return `No se importó ningún ${entidad.value.singular}`;
  return `${etiquetaCantidad(r.exitosos, `${entidad.value.singular} importado`, `${entidad.value.plural} importados`)}`;
});
const detalleResultado = computed(() => {
  const r = resultado.value;
  if (!r || !r.exitosos) return 'Revisa los motivos, corrige tu Excel y vuelve a intentarlo.';
  const partes = [`${r.nuevos} ${r.nuevos === 1 ? 'nuevo' : 'nuevos'} y ${r.actualizados} ${r.actualizados === 1 ? 'actualizado' : 'actualizados'}`];
  (props.config.contadores || []).forEach((c) => {
    if (r[c.clave]) partes.push(`${r[c.clave]} ${c.etiqueta}`);
  });
  return `${partes.join(', con ')}. Ya aparecen en tu listado.`;
});

// ------------------------------------------------------------------ ciclo de vida
function reiniciar() {
  paso.value = 1;
  quitarArchivo();
  resultado.value = null;
  verColumnas.value = false;
  avisoDescartar.value = false;
}

watch(() => props.modelValue, (abierto) => {
  if (abierto) reiniciar();
  document.body.style.overflow = abierto ? 'hidden' : '';
});

function cerrar() {
  if (ocupado.value) return;
  // Archivo revisado y sin importar: primer cierre avisa, el segundo descarta.
  if (paso.value === 3 && !avisoDescartar.value) {
    avisoDescartar.value = true;
    return;
  }
  emit('update:modelValue', false);
}

// ------------------------------------------------------------------ paso 1
async function descargarPlantilla() {
  if (descargandoPlantilla.value) return;
  descargandoPlantilla.value = true;
  try {
    await props.servicio.descargarPlantilla();
  } catch (error) {
    showError(error.message || 'No se pudo descargar la plantilla.');
  } finally {
    descargandoPlantilla.value = false;
  }
}

// ------------------------------------------------------------------ paso 2
function elegirArchivo() {
  if (!ocupado.value) inputArchivo.value?.click();
}

function tomarArchivo(file) {
  arrastrando.value = false;
  if (!file) return;
  columnasFaltantes.value = [];
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    archivo.value = null;
    errorMensaje.value = 'El archivo debe ser un Excel .xlsx. Si lo tienes en otro formato, guárdalo como .xlsx desde Excel.';
    return;
  }
  errorMensaje.value = '';
  archivo.value = file;
}

function onInput(event) {
  tomarArchivo(event.target.files?.[0]);
  event.target.value = '';
}

function quitarArchivo() {
  archivo.value = null;
  errorMensaje.value = '';
  columnasFaltantes.value = [];
  previa.value = null;
  filtro.value = 'todas';
  visibles.value = FILAS_POR_TANDA;
}

function tamanoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function revisar() {
  if (!archivo.value || validando.value) return;
  validando.value = true;
  errorMensaje.value = '';
  columnasFaltantes.value = [];
  try {
    previa.value = await props.servicio.validar(archivo.value);
    filtro.value = 'todas';
    visibles.value = FILAS_POR_TANDA;
    avisoDescartar.value = false;
    paso.value = 3;
  } catch (error) {
    if (error.data?.columnas_faltantes?.length) {
      columnasFaltantes.value = error.data.columnas_faltantes;
      archivo.value = null;
    } else {
      errorMensaje.value = error.message || 'No se pudo leer el archivo.';
    }
  } finally {
    validando.value = false;
  }
}

// ------------------------------------------------------------------ paso 3
async function importar() {
  if (!archivo.value || importando.value || !aImportar.value) return;
  importando.value = true;
  errorMensaje.value = '';
  try {
    resultado.value = await props.servicio.importar(archivo.value);
    avisoDescartar.value = false;
    paso.value = 4;
    if (resultado.value.exitosos > 0) emit('imported', resultado.value);
  } catch (error) {
    // 400 con errores en todas las filas: se muestra como resultado, no como fallo.
    if (Array.isArray(error.data?.errores)) {
      resultado.value = error.data;
      paso.value = 4;
    } else {
      errorMensaje.value = error.message || 'No se pudo completar la importación.';
    }
  } finally {
    importando.value = false;
  }
}

function subirOtro() {
  quitarArchivo();
  resultado.value = null;
  paso.value = 2;
}

async function descargarErrores(errores) {
  if (!errores?.length || descargandoErrores.value) return;
  descargandoErrores.value = true;
  try {
    await props.servicio.descargarErrores(errores);
    showSuccess('Descargamos las filas con su motivo.');
  } catch (error) {
    showError(error.message || 'No se pudo descargar el archivo de errores.');
  } finally {
    descargandoErrores.value = false;
  }
}

/** Motivo de error en rojo; en una fila que sí se importa es un aviso (ámbar). */
function claseMotivo(fila) {
  return fila.estado === 'error'
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-700 dark:text-amber-300';
}

const insignias = {
  nuevo: { texto: 'Nuevo', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800' },
  actualiza: { texto: 'Se actualiza', clase: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-700' },
  error: { texto: 'Error', clase: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800' },
};
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" :aria-label="config.titulo">
    <!-- Clic fuera no cierra (contrato de modales). -->
    <div class="fixed inset-0 bg-brand-950/60" />

    <div class="relative flex w-full h-full overflow-hidden bg-white shadow-xl sm:max-w-4xl sm:h-[min(640px,90vh)] sm:rounded-2xl dark:bg-gray-800">
      <!-- Riel de pasos (escritorio) -->
      <aside class="hidden sm:flex w-60 shrink-0 flex-col p-6 bg-gray-50 border-r border-gray-200 dark:bg-gray-900/40 dark:border-gray-700">
        <div class="flex items-center justify-center w-10 h-10 mb-4 text-white rounded-xl bg-brand-900 dark:bg-brand-700">
          <component :is="config.icono || FileSpreadsheet" class="w-5 h-5" />
        </div>
        <p class="text-base font-semibold text-gray-900 dark:text-white">{{ config.titulo }}</p>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">{{ config.subtitulo }}</p>
        <ol class="space-y-5">
          <li v-for="(p, i) in PASOS" :key="p.titulo" class="relative flex items-start gap-3">
            <span
              v-if="i < PASOS.length - 1"
              class="absolute left-[13px] top-7 h-5 w-px"
              :class="i + 1 < paso ? 'bg-brand-900 dark:bg-brand-300' : 'bg-gray-300 dark:bg-gray-600'"
            />
            <span
              class="flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-full shrink-0"
              :class="i + 1 < paso
                ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-950'
                : i + 1 === paso
                  ? 'bg-white text-brand-900 ring-2 ring-brand-900 dark:bg-gray-800 dark:text-white dark:ring-brand-300'
                  : 'bg-white text-gray-400 ring-1 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600'"
            >
              <Check v-if="i + 1 < paso" class="w-3.5 h-3.5" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <div class="pt-0.5">
              <p
                class="text-sm"
                :class="i + 1 === paso ? 'font-semibold text-gray-900 dark:text-white' : i + 1 < paso ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-400'"
              >{{ p.titulo }}</p>
              <p class="text-xs" :class="i + 1 <= paso ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'">{{ p.detalle }}</p>
            </div>
          </li>
        </ol>
        <p class="flex gap-2 pt-6 mt-auto text-xs text-gray-500 dark:text-gray-400">
          <Lock class="w-4 h-4 shrink-0" />
          Nada se guarda hasta que confirmes en el paso 3.
        </p>
      </aside>

      <div class="flex flex-col flex-1 min-w-0">
        <!-- Cabecera -->
        <div class="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-7 sm:pt-6">
          <div class="flex-1 min-w-0">
            <p v-if="paso !== 4" class="mb-0.5 text-xs font-medium text-gray-500 sm:hidden">{{ config.titulo }}</p>
            <template v-if="paso === 1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Prepara tu archivo</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Parte de la plantilla para que las columnas coincidan.</p>
            </template>
            <template v-else-if="paso === 2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sube el archivo</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Lo revisamos antes de guardar nada.</p>
            </template>
            <template v-else-if="paso === 3">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Revisa antes de importar</h3>
              <p class="text-sm text-gray-500 truncate dark:text-gray-400">{{ archivo?.name }} · {{ etiquetaCantidad(previa?.total || 0, 'fila leída', 'filas leídas') }}</p>
            </template>
          </div>
          <button
            type="button"
            class="flex items-center justify-center -mr-2 text-gray-400 rounded-lg w-9 h-9 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-white"
            :disabled="ocupado"
            @click="cerrar"
          >
            <X class="w-5 h-5" />
            <span class="sr-only">Cerrar</span>
          </button>
        </div>

        <!-- Progreso (móvil) -->
        <div v-if="paso !== 4" class="px-5 pb-3 sm:hidden">
          <div class="flex items-center justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Paso {{ paso }} de {{ PASOS.length }}</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ PASOS[paso - 1].titulo }}</span>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            <div v-for="n in PASOS.length" :key="n" class="h-1 rounded-full" :class="n <= paso ? 'bg-brand-900 dark:bg-brand-300' : 'bg-gray-200 dark:bg-gray-700'" />
          </div>
        </div>

        <!-- Cuerpo -->
        <div class="flex-1 px-5 pb-4 space-y-4 overflow-y-auto sm:px-7">
          <Alert
            v-if="avisoDescartar && paso === 3"
            type="info"
            title="Aún no has importado"
            message="Puedes importar ahora o cerrar de nuevo para descartar la revisión."
            dismissible
            @dismiss="avisoDescartar = false"
          />

          <!-- 1 · Prepara -->
          <template v-if="paso === 1">
            <div class="overflow-hidden border border-gray-200 rounded-xl dark:border-gray-700">
              <div v-if="config.plantilla?.muestra" class="hidden px-4 pt-4 overflow-hidden sm:block bg-gray-50 dark:bg-gray-900/40" aria-hidden="true">
                <div class="overflow-hidden text-[11px] bg-white rounded-t-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                  <div class="grid font-medium text-white bg-emerald-700" :style="{ gridTemplateColumns: `repeat(${config.plantilla.muestra.columnas.length}, minmax(0, 1fr))` }">
                    <div v-for="c in config.plantilla.muestra.columnas" :key="c" class="px-2 py-1.5 truncate border-r border-emerald-600">{{ c }}</div>
                  </div>
                  <div class="grid text-gray-500" :style="{ gridTemplateColumns: `repeat(${config.plantilla.muestra.columnas.length}, minmax(0, 1fr))` }">
                    <div v-for="(v, i) in config.plantilla.muestra.fila" :key="i" class="px-2 py-1.5 truncate border-t border-r border-gray-100 dark:border-gray-700">{{ v }}</div>
                  </div>
                  <div class="grid" :style="{ gridTemplateColumns: `repeat(${config.plantilla.muestra.columnas.length}, minmax(0, 1fr))` }">
                    <div v-for="c in config.plantilla.muestra.columnas" :key="c" class="px-2 py-1.5 border-t border-r border-gray-100 dark:border-gray-700">&nbsp;</div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ config.plantilla?.nombre }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ totalColumnas }} columnas · 1 fila de ejemplo</p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                  :disabled="descargandoPlantilla"
                  @click="descargarPlantilla"
                >
                  <Download class="w-4 h-4" />
                  {{ descargandoPlantilla ? 'Descargando…' : 'Descargar plantilla' }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div v-for="r in config.reglas" :key="r.titulo" class="flex gap-3 p-3 sm:block sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40">
                <div class="flex items-center justify-center w-8 h-8 shrink-0 sm:mb-2 bg-white rounded-lg ring-1 ring-gray-200 text-brand-700 dark:bg-gray-800 dark:ring-gray-700 dark:text-brand-200">
                  <component :is="r.icono" class="w-4 h-4" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ r.titulo }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ r.texto }}</p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline underline-offset-4 dark:text-brand-200 dark:hover:text-white"
                :aria-expanded="verColumnas"
                @click="verColumnas = !verColumnas"
              >
                <component :is="verColumnas ? EyeOff : Eye" class="w-4 h-4" />
                {{ verColumnas ? 'Ocultar columnas' : `Ver las ${totalColumnas} columnas` }}
              </button>
              <div v-if="verColumnas" class="p-4 mt-3 space-y-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
                <div v-for="g in config.columnas?.grupos" :key="g.titulo">
                  <p class="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{{ g.titulo }}</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="c in g.columnas"
                      :key="c"
                      class="inline-flex px-2 py-0.5 text-xs rounded-md"
                      :class="config.columnas.obligatorias?.includes(c)
                        ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-950'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700'"
                    >{{ c }}</span>
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Las columnas resaltadas son obligatorias. <span class="text-accent-500 dark:text-accent-400">*</span></p>
              </div>
            </div>
          </template>

          <!-- 2 · Sube -->
          <template v-else-if="paso === 2">
            <input ref="inputArchivo" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" @change="onInput">

            <div
              v-if="columnasFaltantes.length"
              class="flex flex-col items-center gap-3 px-6 py-10 text-center border-2 border-red-300 border-dashed rounded-xl bg-red-50/40 dark:bg-red-900/10 dark:border-red-800"
            >
              <div class="flex items-center justify-center w-12 h-12 text-red-600 bg-red-100 rounded-full dark:bg-red-900/40 dark:text-red-400">
                <CircleAlert class="w-6 h-6" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">El archivo no tiene todas las columnas</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">Faltan: <span class="font-medium">{{ columnasFaltantes.join(', ') }}</span>.</p>
              </div>
              <div class="flex flex-col w-full gap-2 sm:flex-row sm:w-auto">
                <button type="button" class="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600" @click="elegirArchivo">Elegir otro archivo</button>
                <button type="button" class="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600" :disabled="descargandoPlantilla" @click="descargarPlantilla">
                  <Download class="w-4 h-4" /> Descargar plantilla
                </button>
              </div>
            </div>

            <div v-else-if="archivo" class="p-4 border rounded-xl border-brand-200 bg-brand-50/50 dark:border-gray-600 dark:bg-gray-900/40">
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
                  <FileSpreadsheet class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate dark:text-white">{{ archivo.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ validando ? 'Revisando filas…' : `${tamanoLegible(archivo.size)} · listo para revisar` }}</p>
                </div>
                <template v-if="!validando">
                  <button type="button" class="px-3 text-sm font-medium text-gray-700 rounded-lg h-9 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-700" @click="elegirArchivo">Cambiar</button>
                  <button type="button" class="flex items-center justify-center text-gray-400 rounded-lg w-9 h-9 hover:text-red-600 hover:bg-white dark:hover:bg-gray-700" title="Quitar archivo" @click="quitarArchivo">
                    <Trash2 class="w-4 h-4" />
                    <span class="sr-only">Quitar archivo</span>
                  </button>
                </template>
              </div>
              <div v-if="validando" class="h-1.5 mt-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div class="w-1/3 h-full rounded-full bg-brand-900 animate-pulse dark:bg-brand-300" />
              </div>
            </div>

            <div
              v-else
              role="button"
              tabindex="0"
              class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center transition-colors border-2 border-dashed cursor-pointer sm:py-16 rounded-xl"
              :class="arrastrando
                ? 'border-brand-500 bg-brand-50 dark:bg-gray-700'
                : 'border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'"
              @click="elegirArchivo"
              @keydown.enter.prevent="elegirArchivo"
              @keydown.space.prevent="elegirArchivo"
              @dragover.prevent="arrastrando = true"
              @dragleave.prevent="arrastrando = false"
              @drop.prevent="tomarArchivo($event.dataTransfer.files?.[0])"
            >
              <div class="flex items-center justify-center bg-white rounded-full shadow-sm w-14 h-14 ring-1 ring-brand-200 text-brand-700 dark:bg-gray-900 dark:ring-gray-600 dark:text-brand-200">
                <CloudUpload class="w-7 h-7" />
              </div>
              <div>
                <p class="text-base font-medium text-gray-900 dark:text-white">Suelta aquí tu Excel</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">o <span class="font-medium underline text-brand-700 underline-offset-4 dark:text-brand-200">búscalo en tu equipo</span></p>
              </div>
              <p class="text-xs text-gray-400">Solo .xlsx con las columnas de la plantilla</p>
            </div>

            <p v-if="errorMensaje" class="flex gap-2 text-sm text-red-600 dark:text-red-400">
              <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" />{{ errorMensaje }}
            </p>
          </template>

          <!-- 3 · Revisa -->
          <template v-else-if="paso === 3 && previa">
            <div class="grid grid-cols-2 gap-2" :class="contadoresPrevia.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'">
              <div v-for="c in contadoresPrevia" :key="c.etiqueta" class="px-3 py-2.5 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700">
                <p class="text-xl font-semibold" :class="c.clase">{{ c.valor }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ c.etiqueta }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2">
              <div class="inline-flex p-0.5 text-sm bg-gray-100 rounded-lg dark:bg-gray-900/60" role="tablist">
                <button
                  v-for="t in [{ id: 'todas', texto: 'Todas', n: previa.filas.length }, { id: 'errores', texto: 'Con error', n: filasConError }]"
                  :key="t.id"
                  type="button"
                  role="tab"
                  :aria-selected="filtro === t.id"
                  class="px-3 py-1 rounded-md"
                  :class="filtro === t.id ? 'bg-white shadow-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-400'"
                  @click="filtro = t.id; visibles = FILAS_POR_TANDA"
                >
                  {{ t.texto }} <span :class="t.id === 'errores' && t.n ? 'text-red-600' : 'text-gray-400'">{{ t.n }}</span>
                </button>
              </div>
              <button
                v-if="previa.errores.length"
                type="button"
                class="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline underline-offset-4 disabled:opacity-60 dark:text-brand-200"
                :disabled="descargandoErrores"
                @click="descargarErrores(previa.errores)"
              >
                <Download class="w-4 h-4" /> Descargar errores
              </button>
            </div>

            <p v-if="!filasFiltradas.length" class="py-8 text-sm text-center text-gray-500 dark:text-gray-400">
              {{ filtro === 'errores' ? 'Ninguna fila tiene errores.' : 'El archivo no tiene filas con datos.' }}
            </p>

            <!-- Tabla (escritorio) -->
            <div v-if="filasFiltradas.length" class="hidden overflow-hidden border border-gray-200 sm:block rounded-xl dark:border-gray-700">
              <table class="w-full text-sm">
                <thead class="text-xs tracking-wide text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th class="w-12 px-3 py-2 font-medium text-left">Fila</th>
                    <th class="px-3 py-2 font-medium text-left">{{ entidad.singular }}</th>
                    <th v-if="config.fila?.extra" class="px-3 py-2 font-medium text-left">{{ config.fila.extraEtiqueta }}</th>
                    <th class="px-3 py-2 font-medium text-left w-28">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr v-for="f in filasVisibles" :key="f.fila" :class="f.estado === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''">
                    <td class="px-3 py-2 text-gray-500 align-top">{{ f.fila }}</td>
                    <td class="px-3 py-2 align-top">
                      <p class="text-gray-900 dark:text-white">{{ f[config.fila?.principal] || '—' }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ f[config.fila?.secundaria] || '—' }}</p>
                      <p v-if="f.motivo" class="mt-0.5 text-xs" :class="claseMotivo(f)">{{ f.motivo }}</p>
                    </td>
                    <td v-if="config.fila?.extra" class="px-3 py-2 text-gray-600 align-top dark:text-gray-300">{{ f[config.fila.extra] || '—' }}</td>
                    <td class="px-3 py-2 align-top">
                      <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ring-1 whitespace-nowrap" :class="insignias[f.estado].clase">{{ insignias[f.estado].texto }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Tarjetas (móvil) -->
            <ul v-if="filasFiltradas.length" class="space-y-2 sm:hidden">
              <li
                v-for="f in filasVisibles"
                :key="f.fila"
                class="p-3 rounded-xl ring-1"
                :class="f.estado === 'error' ? 'ring-red-200 bg-red-50/40 dark:ring-red-800 dark:bg-red-900/10' : 'ring-gray-200 dark:ring-gray-700'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Fila {{ f.fila }}</span>
                  <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ring-1" :class="insignias[f.estado].clase">{{ insignias[f.estado].texto }}</span>
                </div>
                <p class="mt-1 text-sm font-medium text-gray-900 truncate dark:text-white">{{ f[config.fila?.principal] || '—' }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ [f[config.fila?.secundaria], config.fila?.extra && f[config.fila.extra]].filter(Boolean).join(' · ') || '—' }}
                </p>
                <p v-if="f.motivo" class="mt-1 text-xs" :class="claseMotivo(f)">{{ f.motivo }}</p>
              </li>
            </ul>

            <button
              v-if="filasFiltradas.length > visibles"
              type="button"
              class="w-full py-2 text-sm font-medium rounded-lg text-brand-700 hover:bg-gray-50 dark:text-brand-200 dark:hover:bg-gray-700"
              @click="visibles += FILAS_POR_TANDA"
            >
              Mostrar más ({{ filasFiltradas.length - visibles }} restantes)
            </button>

            <button
              v-if="previa.errores.length"
              type="button"
              class="flex items-center justify-center w-full gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg sm:hidden dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
              :disabled="descargandoErrores"
              @click="descargarErrores(previa.errores)"
            >
              <Download class="w-4 h-4" /> Descargar filas con error
            </button>

            <p v-if="errorMensaje" class="flex gap-2 text-sm text-red-600 dark:text-red-400">
              <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" />{{ errorMensaje }}
            </p>
            <p v-else-if="!aImportar" class="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Info class="w-4 h-4 mt-0.5 shrink-0" />No hay {{ entidad.plural }} válidos para importar. Corrige las filas con error y vuelve a subir el archivo.
            </p>
            <p v-else-if="filasConError" class="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Info class="w-4 h-4 shrink-0" />Las filas con error se omitirán. Puedes corregirlas en tu Excel y volver a subirlo.
            </p>
          </template>

          <!-- 4 · Listo -->
          <template v-else-if="paso === 4 && resultado">
            <div class="flex flex-col items-center pt-6 text-center">
              <div
                class="flex items-center justify-center w-16 h-16 mb-4 rounded-full ring-8"
                :class="resultado.exitosos
                  ? 'bg-emerald-50 ring-emerald-50/50 text-emerald-600 dark:bg-emerald-900/30 dark:ring-emerald-900/10'
                  : 'bg-amber-50 ring-amber-50/50 text-amber-600 dark:bg-amber-900/30 dark:ring-amber-900/10'"
              >
                <component :is="resultado.exitosos ? CircleCheck : TriangleAlert" class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ tituloResultado }}</h3>
              <p class="max-w-sm text-sm text-gray-500 dark:text-gray-400">{{ detalleResultado }}</p>
            </div>
            <div v-if="resultado.errores?.length" class="flex flex-col gap-3 p-4 rounded-xl ring-1 ring-gray-200 sm:flex-row sm:items-center dark:ring-gray-700">
              <div class="flex flex-1 gap-3">
                <TriangleAlert class="w-5 h-5 text-amber-500 shrink-0" />
                <div class="text-sm">
                  <p class="font-medium text-gray-900 dark:text-white">{{ etiquetaCantidad(resultado.errores.length, 'fila no se importó', 'filas no se importaron') }}</p>
                  <p class="text-gray-500 dark:text-gray-400">Descárgalas con su motivo, corrígelas y súbelas de nuevo.</p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                :disabled="descargandoErrores"
                @click="descargarErrores(resultado.errores)"
              >
                <Download class="w-4 h-4" /> Descargar
              </button>
            </div>
          </template>
        </div>

        <!-- Pie -->
        <div class="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-100 sm:flex-row sm:justify-between sm:px-7 dark:border-gray-700">
          <template v-if="paso === 1">
            <button type="button" :class="BTN_SECUNDARIO" @click="cerrar">Cancelar</button>
            <button type="button" :class="BTN_PRIMARIO" @click="paso = 2">
              Ya tengo mi archivo <ArrowRight class="w-4 h-4" />
            </button>
          </template>
          <template v-else-if="paso === 2">
            <button type="button" :class="BTN_SECUNDARIO" :disabled="validando" @click="paso = 1">
              <ArrowLeft class="w-4 h-4" /> Atrás
            </button>
            <button type="button" :class="BTN_PRIMARIO" :disabled="!archivo || validando" @click="revisar">
              <svg v-if="validando" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".25" stroke-width="4" /><path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" /></svg>
              {{ validando ? 'Revisando…' : 'Revisar archivo' }}
            </button>
          </template>
          <template v-else-if="paso === 3">
            <button type="button" :class="BTN_SECUNDARIO" :disabled="importando" @click="subirOtro">
              <ArrowLeft class="w-4 h-4" /> Subir otro archivo
            </button>
            <button type="button" :class="BTN_PRIMARIO" :disabled="!aImportar || importando" @click="importar">
              <svg v-if="importando" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".25" stroke-width="4" /><path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" /></svg>
              {{ importando ? 'Importando…' : `Importar ${etiquetaCantidad(aImportar, entidad.singular, entidad.plural)}` }}
            </button>
          </template>
          <template v-else>
            <button type="button" :class="BTN_SECUNDARIO" @click="subirOtro">Importar otro archivo</button>
            <button type="button" :class="BTN_PRIMARIO" @click="emit('update:modelValue', false)">Ver {{ entidad.plural }}</button>
          </template>
        </div>
      </div>
    </div>
  </div>

  <ToastContainer />
</template>

