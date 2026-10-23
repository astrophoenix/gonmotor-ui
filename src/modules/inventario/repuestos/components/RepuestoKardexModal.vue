<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { History, Loader2, SlidersHorizontal, X } from 'lucide-vue-next';
import Alert from '../../../../shared/components/Alert.vue';
import Pagination from '../../../../shared/components/Pagination.vue';
import { formatDateTime } from '../../../../shared/utils/datetime';
import { repuestosService } from '../services/repuestosService';

/**
 * Kardex de un repuesto (entradas y salidas de stock) y ajuste por conteo
 * físico. El ajuste solo se muestra con `puedeAjustar` (inventario/modificar).
 * Emite `ajustado` con el repuesto actualizado.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Fila del listado: `id`, `codigo`, `nombre`, `stock_actual`, `stock_minimo`. */
  repuesto: { type: Object, default: null },
  puedeAjustar: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'ajustado']);

const movimientos = ref([]);
const total = ref(0);
const pagina = ref(1);
const siguiente = ref(null);
const anterior = ref(null);
const cargando = ref(false);
const errorMessage = ref('');

const stockActual = ref('0');
const ajustando = ref(false);
const guardando = ref(false);
const ajuste = reactive({ stock_contado: '', motivo: '' });
const erroresAjuste = ref({});

const diferencia = computed(() => {
  const contado = Number(ajuste.stock_contado);
  if (ajuste.stock_contado === '' || Number.isNaN(contado)) return null;
  return contado - Number(stockActual.value);
});

function cantidadTexto(valor) {
  const numero = Number(valor);
  return `${numero > 0 ? '+' : ''}${numero.toLocaleString('es-EC', { maximumFractionDigits: 2 })}`;
}

async function cargar(page = 1) {
  if (!props.repuesto?.id) return;
  cargando.value = true;
  errorMessage.value = '';
  try {
    const data = await repuestosService.movimientos(props.repuesto.id, { page });
    movimientos.value = data.results || [];
    total.value = data.count;
    siguiente.value = data.next;
    anterior.value = data.previous;
    pagina.value = page;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo cargar el kardex.';
  } finally {
    cargando.value = false;
  }
}

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  stockActual.value = props.repuesto?.stock_actual ?? '0';
  ajustando.value = false;
  Object.assign(ajuste, { stock_contado: '', motivo: '' });
  erroresAjuste.value = {};
  cargar(1);
});

function cerrar() {
  if (guardando.value) return;
  emit('update:modelValue', false);
}

async function guardarAjuste() {
  const errores = {};
  if (ajuste.stock_contado === '' || Number(ajuste.stock_contado) < 0) errores.stock_contado = 'Ingresa el stock contado (0 o más).';
  else if (diferencia.value === 0) errores.stock_contado = 'Es igual al stock registrado; no hay nada que ajustar.';
  if (!ajuste.motivo.trim()) errores.motivo = 'Indica el motivo del ajuste.';
  erroresAjuste.value = errores;
  if (Object.keys(errores).length) return;

  guardando.value = true;
  try {
    const actualizado = await repuestosService.ajustarStock(props.repuesto.id, {
      stock_contado: Number(ajuste.stock_contado).toFixed(2),
      motivo: ajuste.motivo.trim(),
    });
    stockActual.value = actualizado.stock_actual;
    ajustando.value = false;
    Object.assign(ajuste, { stock_contado: '', motivo: '' });
    emit('ajustado', actualizado);
    await cargar(1);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    erroresAjuste.value = {
      stock_contado: [].concat(data.stock_contado || [])[0],
      motivo: [].concat(data.motivo || [])[0],
    };
    if (!erroresAjuste.value.stock_contado && !erroresAjuste.value.motivo) {
      errorMessage.value = error.message || 'No se pudo ajustar el stock.';
    }
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <History class="w-5 h-5" />
          Kardex · <span class="font-mono">{{ repuesto?.codigo }}</span>
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="cerrar">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-4 space-y-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ repuesto?.nombre }} · stock actual
            <span class="text-lg font-bold text-gray-900 tabular-nums dark:text-white">{{ stockActual }}</span>
            <span v-if="Number(repuesto?.stock_minimo)" class="text-xs text-gray-500 dark:text-gray-400"> (mín. {{ repuesto.stock_minimo }})</span>
          </p>
          <button
            v-if="puedeAjustar && !ajustando"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            @click="ajustando = true">
            <SlidersHorizontal class="w-4 h-4" />
            Ajustar stock
          </button>
        </div>

        <!-- Ajuste por conteo físico -->
        <form v-if="ajustando" class="p-4 space-y-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700" novalidate @submit.prevent="guardarAjuste">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label for="kardex-contado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Stock contado <span class="text-accent-500 dark:text-accent-400">*</span></label>
              <input
                id="kardex-contado"
                v-model="ajuste.stock_contado"
                type="number"
                min="0"
                step="0.01"
                class="block w-full p-2.5 text-sm rounded border tabular-nums dark:bg-gray-700 dark:text-white"
                :class="erroresAjuste.stock_contado ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300 dark:border-gray-600'">
              <p v-if="diferencia !== null && diferencia !== 0" class="mt-1 text-xs" :class="diferencia < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'">
                Diferencia: {{ cantidadTexto(diferencia) }}
              </p>
              <p v-if="erroresAjuste.stock_contado" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ erroresAjuste.stock_contado }}</p>
            </div>
            <div class="sm:col-span-2">
              <label for="kardex-motivo" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Motivo <span class="text-accent-500 dark:text-accent-400">*</span></label>
              <input
                id="kardex-motivo"
                v-model="ajuste.motivo"
                type="text"
                maxlength="255"
                placeholder="Ej.: inventario físico mensual, pieza dañada"
                class="block w-full p-2.5 text-sm rounded border dark:bg-gray-700 dark:text-white"
                :class="erroresAjuste.motivo ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300 dark:border-gray-600'">
              <p v-if="erroresAjuste.motivo" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ erroresAjuste.motivo }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" :disabled="guardando" @click="ajustando = false">
              Cancelar
            </button>
            <button type="submit" :disabled="guardando" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded bg-brand-900 hover:bg-brand-800 disabled:opacity-50">
              <Loader2 v-if="guardando" class="w-4 h-4 animate-spin" />
              Guardar ajuste
            </button>
          </div>
        </form>

        <div v-if="cargando" class="flex items-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 class="w-4 h-4 animate-spin" />
          Cargando movimientos...
        </div>
        <p v-else-if="!movimientos.length" class="py-4 text-sm text-gray-500 dark:text-gray-400">Este repuesto aún no tiene movimientos.</p>
        <div v-else class="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
          <table class="w-full text-sm">
            <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
              <tr>
                <th class="px-3 py-2 font-medium text-left">Fecha</th>
                <th class="px-3 py-2 font-medium text-left">Movimiento</th>
                <th class="px-3 py-2 font-medium text-right">Cantidad</th>
                <th class="px-3 py-2 font-medium text-right">Stock</th>
                <th class="hidden px-3 py-2 font-medium text-left sm:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="mov in movimientos" :key="mov.id">
                <td class="px-3 py-2 text-gray-700 whitespace-nowrap dark:text-gray-300">{{ formatDateTime(mov.fecha) }}</td>
                <td class="px-3 py-2">
                  <p class="font-medium text-gray-900 dark:text-white">{{ mov.tipo_display }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    <a v-if="mov.orden_trabajo" :href="`/crud/ordenes/ver/?id=${encodeURIComponent(mov.orden_trabajo)}`" class="hover:underline">{{ mov.referencia }}</a>
                    <template v-else>{{ mov.referencia }}</template>
                    <template v-if="mov.motivo"><template v-if="mov.referencia"> · </template>{{ mov.motivo }}</template>
                  </p>
                </td>
                <td class="px-3 py-2 font-semibold text-right tabular-nums whitespace-nowrap" :class="Number(mov.cantidad) < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'">
                  {{ cantidadTexto(mov.cantidad) }}
                </td>
                <td class="px-3 py-2 text-right text-gray-900 tabular-nums dark:text-white">{{ mov.stock_resultante }}</td>
                <td class="hidden px-3 py-2 text-gray-600 sm:table-cell dark:text-gray-300">{{ mov.usuario_nombre || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination
          v-if="total > movimientos.length"
          :total="total"
          :current-page="pagina"
          :next-url="siguiente"
          :previous-url="anterior"
          :disabled="cargando"
          item-word="movimiento"
          @page="cargar"
        />
      </div>
    </div>
  </div>
</template>
