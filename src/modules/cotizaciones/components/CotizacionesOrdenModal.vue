<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Loader2, Search, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { cotizacionesService } from '../services/cotizacionesService';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';
import { idDocumento, motivoIncompatibilidad, totalCotizaciones, visitaCotizacion } from '../utils/consolidacion';

const props = defineProps({
  modelValue: Boolean,
  inicial: { type: Object, default: null },
  orden: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'completed']);
const seleccionadas = ref([]);
const filas = ref([]);
const busqueda = ref('');
const pagina = ref(1);
const siguiente = ref(null);
const anterior = ref(null);
const cantidad = ref(0);
const cargando = ref(false);
const enviando = ref(false);
const error = ref('');
const fase = ref('seleccion');
const dialogo = ref(null);
const incorporando = computed(() => Boolean(props.orden));
const titulo = computed(() => incorporando.value ? 'Agregar cotizaciones' : 'Generar orden de trabajo');
const total = computed(() => totalCotizaciones(seleccionadas.value));
const permitida = computed(() => !props.orden || ['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO'].includes(props.orden.estado));
const seleccionValida = computed(() => seleccionadas.value.length > 0 && permitida.value
  && seleccionadas.value.every((c) => !motivoIncompatibilidad(c, seleccionadas.value, props.orden)));
const columnas = ['Selección', 'Cotización', 'Cliente', 'Vehículo', 'Importe', 'Estado'];
const BOTON = 'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-brand-500 dark:text-brand-200 dark:hover:bg-brand-700';
const PRIMARIO = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed';
let version = 0;
let controlador;
let temporizador;
let overflowAnterior = '';
let inicializando = false;
let estabaAbierto = false;
let focoAnterior;
const inspecciones = new Map();

async function completarVisita(cotizacion) {
  try {
    let inspeccion = null;
    if (!cotizacion.recepcion_origen && cotizacion.inspeccion_origen && !cotizacion.orden_trabajo_aplicada) {
      const id = idDocumento(cotizacion.inspeccion_origen);
      if (!inspecciones.has(id)) inspecciones.set(id, inspeccionesService.getById(id));
      inspeccion = await inspecciones.get(id);
    }
    return { ...cotizacion, visita: visitaCotizacion(cotizacion, inspeccion), errorVisita: false };
  } catch {
    inspecciones.delete(idDocumento(cotizacion.inspeccion_origen));
    return { ...cotizacion, errorVisita: true };
  }
}

function mantenerFoco(event) {
  const elementos = [...dialogo.value.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')];
  const primero = elementos[0];
  const ultimo = elementos[elementos.length - 1];
  if (event.shiftKey && document.activeElement === primero) {
    event.preventDefault(); ultimo?.focus();
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault(); primero?.focus();
  }
}

function cancelarCarga() {
  version += 1;
  controlador?.abort();
  clearTimeout(temporizador);
}

async function cargar(numero = 1) {
  cancelarCarga();
  const actual = version;
  controlador = new AbortController();
  cargando.value = true;
  error.value = '';
  try {
    const recuperadas = await Promise.all(seleccionadas.value.filter((c) => c.errorVisita).map(completarVisita));
    if (actual !== version) return;
    seleccionadas.value = seleccionadas.value.map((c) => recuperadas.find((r) => r.id === c.id) || c);
    const vehiculo = idDocumento(props.orden?.vehiculo || props.inicial?.vehiculo);
    const filters = { estado: 'ACEPTADA' };
    if (vehiculo) filters.vehiculo = vehiculo;
    const data = await cotizacionesService.list({ page: numero, search: busqueda.value, filters, signal: controlador.signal });
    const resultados = await Promise.all((Array.isArray(data) ? data : data.results || []).map(completarVisita));
    if (actual !== version) return;
    filas.value = resultados;
    pagina.value = numero;
    siguiente.value = data.next || null;
    anterior.value = data.previous || null;
    cantidad.value = data.count ?? resultados.length;
  } catch (err) {
    if (actual === version && err.name !== 'AbortError') error.value = err.message || 'No se pudieron cargar las cotizaciones.';
  } finally {
    if (actual === version) cargando.value = false;
  }
}

function motivo(cotizacion) {
  return motivoIncompatibilidad(cotizacion, seleccionadas.value, props.orden);
}
function elegida(cotizacion) {
  return seleccionadas.value.some((c) => c.id === cotizacion.id);
}
function cambiar(cotizacion) {
  if (enviando.value || cotizacion.id === props.inicial?.id) return;
  if (elegida(cotizacion)) seleccionadas.value = seleccionadas.value.filter((c) => c.id !== cotizacion.id);
  else if (!motivo(cotizacion)) seleccionadas.value = [...seleccionadas.value, cotizacion];
}
function cerrar() {
  if (enviando.value) return;
  if (seleccionadas.value.length) fase.value = 'descartar';
  else emit('update:modelValue', false);
}
async function confirmar() {
  if (enviando.value || !seleccionValida.value || fase.value !== 'confirmacion') return;
  enviando.value = true;
  error.value = '';
  try {
    const ids = seleccionadas.value.map((c) => c.id);
    // El flujo individual conserva su endpoint; el resto usa la operación consolidada.
    const resultado = !props.orden && ids.length === 1
      ? await cotizacionesService.generarOrden(ids[0])
      : await cotizacionesService.generarOrdenConsolidada(ids, props.orden?.id);
    seleccionadas.value = [];
    emit('completed', resultado);
    emit('update:modelValue', false);
  } catch (err) {
    error.value = err.message || 'No se pudo completar la operación. Revisa la selección e inténtalo nuevamente.';
  } finally {
    enviando.value = false;
  }
}

watch(busqueda, () => {
  if (!props.modelValue || inicializando) return;
  cancelarCarga();
  cargando.value = true;
  temporizador = setTimeout(() => cargar(1), 300);
}, { flush: 'sync' });
watch(() => props.modelValue, async (abierto) => {
  cancelarCarga();
  if (!abierto) {
    inicializando = false;
    if (estabaAbierto) {
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus?.();
    }
    estabaAbierto = false;
    return;
  }
  inicializando = true;
  estabaAbierto = true;
  focoAnterior = document.activeElement;
  nextTick(() => dialogo.value?.querySelector('input[type=search]')?.focus());
  overflowAnterior = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  seleccionadas.value = [];
  filas.value = [];
  busqueda.value = '';
  fase.value = 'seleccion';
  error.value = '';
  inspecciones.clear();
  if (props.inicial) {
    const actual = version;
    cargando.value = true;
    const inicial = await completarVisita(props.inicial);
    if (!props.modelValue || actual !== version) return;
    seleccionadas.value = [inicial];
  }
  inicializando = false;
  cargar(1);
}, { immediate: true });
onBeforeUnmount(() => {
  cancelarCarga();
  if (props.modelValue) document.body.style.overflow = overflowAnterior;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @keydown.esc.prevent="cerrar">
      <section ref="dialogo" @keydown.tab="mantenerFoco" role="dialog" aria-modal="true" aria-labelledby="cotizaciones-orden-titulo" class="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg border border-brand-200 bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900">
        <header class="flex items-center justify-between gap-4 border-b border-brand-100 p-4 dark:border-brand-700">
          <div>
            <h2 id="cotizaciones-orden-titulo" class="text-lg font-semibold text-brand-900 dark:text-white">{{ titulo }}</h2>
            <p class="text-sm text-brand-500 dark:text-brand-300">{{ orden ? `OT ${orden.numero_orden}` : 'Selecciona cotizaciones aceptadas de la misma visita.' }}</p>
          </div>
          <button type="button" :class="BOTON" :disabled="enviando" aria-label="Cerrar selector de cotizaciones" @click="cerrar"><X class="h-5 w-5" /></button>
        </header>
        <div class="space-y-4 overflow-y-auto p-4">
          <Alert v-if="error" type="error" :message="error" />
          <Alert v-if="!permitida" type="warning" message="El estado actual de la Orden Trabajo no permite Agregar cotizaciones." />
          <template v-if="fase === 'seleccion'">
            <label class="block text-sm font-medium text-brand-700 dark:text-brand-200" for="buscar-cotizaciones-orden">Buscar por número, cliente o vehículo</label>
            <form class="relative" @submit.prevent="cargar(1)">
              <Search class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-500" />
              <input id="buscar-cotizaciones-orden" v-model="busqueda" type="search" maxlength="100" autofocus class="block w-full rounded border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 focus:ring-2 focus:ring-primary-300 dark:border-brand-500 dark:bg-brand-800 dark:text-white">
            </form>
            <button type="button" :class="BOTON" :disabled="cargando || enviando" @click="cargar(pagina)">Actualizar cotizaciones</button>
            <EntityTable :columns="columnas" :items="filas" :loading="cargando" empty-text="No se encontraron cotizaciones aceptadas." :show-pagination="true" :previous-url="anterior" :next-url="siguiente" :pagination-disabled="cargando || enviando" :range-label="`Página ${pagina} · ${cantidad} resultados`" @page-change="cargar(pagina + $event)">
              <template #row="{ item }">
                <tr :class="motivo(item) && !elegida(item) ? 'opacity-60' : ''">
                  <td class="p-4"><input type="checkbox" :checked="elegida(item)" :disabled="enviando || item.id === inicial?.id || (!elegida(item) && Boolean(motivo(item)))" :aria-label="`Seleccionar ${item.numero_cotizacion}`" :title="motivo(item) || 'Seleccionar cotización'" class="h-4 w-4 rounded border-brand-300 text-brand-900 focus:ring-primary-300" @change="cambiar(item)"></td>
                  <td class="p-4 text-sm text-brand-900 dark:text-white"><span class="font-mono">{{ item.numero_cotizacion }}</span><p v-if="motivo(item)" class="mt-1 max-w-64 text-xs text-brand-500 dark:text-brand-300">{{ motivo(item) }}</p></td>
                  <td class="p-4 text-sm text-brand-700 dark:text-brand-200">{{ item.cliente_nombre || '—' }}</td>
                  <td class="p-4 text-sm text-brand-700 dark:text-brand-200">{{ item.vehiculo_placa || '—' }}<span class="block text-xs">{{ [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ') }}</span></td>
                  <td class="whitespace-nowrap p-4 text-sm text-brand-900 dark:text-white">{{ formatCurrency(item.total) }}</td>
                  <td class="p-4"><EstadoCotizacionBadge :estado="item.estado" /></td>
                </tr>
              </template>
            </EntityTable>
          </template>
          <template v-else-if="fase === 'confirmacion'">
            <p class="text-sm text-brand-700 dark:text-brand-200">{{ incorporando ? 'Se incorporarán las cotizaciones seleccionadas a esta OT.' : 'Se generará una única OT con las cotizaciones seleccionadas.' }} Revisa los documentos y el importe antes de confirmar.</p>
          </template>
          <p v-else class="text-sm text-brand-700 dark:text-brand-200">¿Descartar la selección y cerrar?</p>
          <div v-if="seleccionadas.length" class="space-y-2 rounded-lg border border-brand-100 p-3 dark:border-brand-700">
            <h3 class="text-sm font-semibold text-brand-900 dark:text-white">Seleccionadas ({{ seleccionadas.length }})</h3>
            <ul class="space-y-2">
              <li v-for="item in seleccionadas" :key="item.id" class="flex items-center justify-between gap-3 text-sm text-brand-700 dark:text-brand-200">
                <span>{{ item.numero_cotizacion }} · {{ item.cliente_nombre }} · {{ item.vehiculo_placa }} · {{ formatCurrency(item.total) }}<span v-if="item.id === inicial?.id" class="ml-2 text-xs">Inicial</span><span v-if="motivo(item)" class="block text-red-600 dark:text-red-400">{{ motivo(item) }}</span></span>
                <button v-if="fase === 'seleccion' && item.id !== inicial?.id" type="button" :class="BOTON" :aria-label="`Quitar ${item.numero_cotizacion}`" @click="cambiar(item)"><X class="h-4 w-4" /></button>
              </li>
            </ul>
          </div>
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-4 border-t border-brand-100 p-4 dark:border-brand-700">
          <p class="text-sm font-semibold text-brand-900 dark:text-white">{{ incorporando ? 'Importe adicional' : 'Total consolidado' }}: {{ formatCurrency(total) }}</p>
          <div class="flex flex-wrap gap-2">
            <template v-if="fase === 'descartar'">
              <button type="button" :class="BOTON" @click="fase = 'seleccion'">Volver</button>
              <button type="button" :class="PRIMARIO" @click="emit('update:modelValue', false)">Descartar selección</button>
            </template>
            <template v-else>
              <button type="button" :class="BOTON" :disabled="enviando" @click="fase === 'confirmacion' ? fase = 'seleccion' : cerrar()">{{ fase === 'confirmacion' ? 'Volver a la selección' : 'Cancelar' }}</button>
              <button v-if="fase === 'seleccion'" type="button" :class="PRIMARIO" :disabled="!seleccionValida || cargando" @click="fase = 'confirmacion'">Revisar selección</button>
              <button v-else type="button" :class="PRIMARIO" :disabled="!seleccionValida || enviando" @click="confirmar"><Loader2 v-if="enviando" class="h-4 w-4 animate-spin" />{{ enviando ? 'Procesando…' : incorporando ? 'Confirmar incorporación' : 'Generar orden' }}</button>
            </template>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
