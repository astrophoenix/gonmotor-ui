<script setup>
import { computed, ref, watch } from 'vue';
import { Loader2, PackageMinus, PackagePlus, TriangleAlert, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { ordenesService } from '../services/ordenesService';

/**
 * Despacha una línea de repuesto desde el almacén o la devuelve.
 *
 * Si el backend responde stock insuficiente y el usuario tiene la acción
 * especial `stock_negativo`, ofrece despachar igual dejando el stock en
 * negativo. Emite `hecho` con la línea actualizada.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  linea: { type: Object, default: null },
  /** 'despachar' | 'devolver' */
  modo: { type: String, default: 'despachar' },
  puedeStockNegativo: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'hecho']);

const cantidad = ref('');
const motivo = ref('');
const guardando = ref(false);
const errorMessage = ref('');
const errorCantidad = ref('');
const stockInsuficiente = ref(null);

const esDevolucion = computed(() => props.modo === 'devolver');
const tope = computed(() => Number(esDevolucion.value ? props.linea?.cantidad_despachada : props.linea?.cantidad_pendiente_despacho) || 0);

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  cantidad.value = String(tope.value);
  motivo.value = '';
  errorMessage.value = '';
  errorCantidad.value = '';
  stockInsuficiente.value = null;
});

function cerrar() {
  if (guardando.value) return;
  emit('update:modelValue', false);
}

async function confirmar(autorizarNegativo = false) {
  const valor = Number(cantidad.value);
  if (!valor || valor <= 0 || valor > tope.value) {
    errorCantidad.value = `Ingresa una cantidad entre 0,01 y ${tope.value}.`;
    return;
  }
  guardando.value = true;
  errorMessage.value = '';
  errorCantidad.value = '';
  try {
    const linea = esDevolucion.value
      ? await ordenesService.devolverRepuesto(props.linea.id, { cantidad: valor.toFixed(2), motivo: motivo.value.trim() })
      : await ordenesService.despacharRepuesto(props.linea.id, {
        cantidad: valor.toFixed(2),
        ...(autorizarNegativo ? { autorizar_stock_negativo: true } : {}),
      });
    emit('hecho', linea);
    emit('update:modelValue', false);
  } catch (error) {
    if (error.data?.stock_insuficiente) {
      stockInsuficiente.value = { stock: [].concat(error.data.stock_actual ?? '0')[0] };
    } else {
      errorMessage.value = error.message || 'No se pudo completar el movimiento.';
    }
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <component :is="esDevolucion ? PackagePlus : PackageMinus" class="w-5 h-5" />
          {{ esDevolucion ? 'Devolver al almacén' : 'Despachar repuesto' }}
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

        <p class="text-sm text-gray-600 dark:text-gray-300">
          <span class="font-semibold text-gray-900 dark:text-white">{{ linea?.descripcion }}</span>
          <span v-if="linea?.codigo_repuesto" class="font-mono"> · {{ linea.codigo_repuesto }}</span>
          <br>
          Despachado {{ linea?.cantidad_despachada }} de {{ linea?.cantidad }}.
        </p>

        <div>
          <label for="despacho-cantidad" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad</label>
          <input
            id="despacho-cantidad"
            v-model="cantidad"
            type="number"
            min="0.01"
            :max="tope"
            step="0.01"
            class="block w-full p-2.5 text-sm rounded border tabular-nums dark:bg-gray-700 dark:text-white"
            :class="errorCantidad ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-300 dark:border-gray-600'"
            @input="stockInsuficiente = null">
          <p v-if="errorCantidad" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errorCantidad }}</p>
        </div>

        <div v-if="esDevolucion">
          <label for="despacho-motivo" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
          <input
            id="despacho-motivo"
            v-model="motivo"
            type="text"
            maxlength="255"
            placeholder="Ej.: sobró, no era la pieza correcta"
            class="block w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        </div>

        <!-- Stock insuficiente -->
        <div
          v-if="stockInsuficiente"
          class="flex gap-2 p-3 text-sm border rounded-lg bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700/60 dark:text-amber-100">
          <TriangleAlert class="w-5 h-5 shrink-0" />
          <p>
            En el almacén hay <span class="font-semibold tabular-nums">{{ stockInsuficiente.stock }}</span>.
            <template v-if="puedeStockNegativo">Puedes despachar igual: el stock quedará en negativo hasta registrar la compra o un ajuste.</template>
            <template v-else>Registra la compra o pide a un administrador que autorice el despacho.</template>
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="guardando"
          @click="cerrar">
          Cancelar
        </button>
        <button
          v-if="stockInsuficiente && puedeStockNegativo"
          type="button"
          :disabled="guardando"
          class="inline-flex items-center gap-1.5 text-white bg-amber-600 rounded hover:bg-amber-700 focus:ring-4 focus:ring-amber-300 font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="confirmar(true)">
          <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
          Despachar en negativo
        </button>
        <button
          v-else
          type="button"
          :disabled="guardando || Boolean(stockInsuficiente)"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="confirmar()">
          <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
          {{ esDevolucion ? 'Devolver' : 'Despachar' }}
        </button>
      </div>
    </div>
  </div>
</template>
