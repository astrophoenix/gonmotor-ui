<script setup>
import { computed, ref, watch } from 'vue';
import { Loader2, Lock, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { cajaService } from '../services/cajaService';

/**
 * Cierre de la jornada: el cajero cuenta el efectivo y el modal muestra el
 * sobrante o faltante contra lo esperado. Si no cuadra, la observación es
 * obligatoria (misma regla del backend).
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sesion: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'cerrada']);

const contado = ref('');
const observacion = ref('');
const errores = ref({});
const errorMessage = ref('');
const guardando = ref(false);

const esperado = computed(() => Number(props.sesion?.resumen?.efectivo_esperado) || 0);
const diferencia = computed(() => (contado.value === '' ? null : Math.round((Number(contado.value) - esperado.value) * 100) / 100));

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  contado.value = '';
  observacion.value = '';
  errores.value = {};
  errorMessage.value = '';
});

function dinero(valor) {
  return Number(valor || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cerrarModal() {
  if (!guardando.value) emit('update:modelValue', false);
}

async function confirmar() {
  const nuevos = {};
  if (contado.value === '' || Number(contado.value) < 0 || Number.isNaN(Number(contado.value))) {
    nuevos.efectivo_contado = 'Ingresa el efectivo contado.';
  } else if (diferencia.value && !observacion.value.trim()) {
    nuevos.observacion = 'Explica la diferencia.';
  }
  errores.value = nuevos;
  if (Object.keys(nuevos).length || guardando.value) return;

  guardando.value = true;
  errorMessage.value = '';
  try {
    const sesion = await cajaService.cerrar(props.sesion.id, {
      efectivo_contado: Number(contado.value).toFixed(2),
      observacion: observacion.value.trim(),
    });
    emit('cerrada', sesion);
    emit('update:modelValue', false);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    errores.value = Object.fromEntries(
      ['efectivo_contado', 'observacion'].filter((c) => data[c]).map((c) => [c, [].concat(data[c])[0]]),
    );
    if (!Object.keys(errores.value).length) errorMessage.value = error.message || 'No se pudo cerrar la caja.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg my-auto bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Lock class="w-5 h-5" />
          Cerrar caja
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="cerrarModal">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form class="px-6 py-4 space-y-4" novalidate @submit.prevent="confirmar">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <div class="flex items-baseline justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <span class="text-sm text-gray-600 dark:text-gray-300">Efectivo esperado</span>
          <span class="text-xl font-bold text-gray-900 tabular-nums dark:text-white">$ {{ dinero(esperado) }}</span>
        </div>
        <div>
          <label for="cierre-contado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Efectivo contado <span class="text-accent-500 dark:text-accent-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 flex items-center text-sm text-gray-500 start-0 ps-3 dark:text-gray-400">$</span>
            <input
              id="cierre-contado"
              v-model="contado"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              class="block w-full p-2.5 ps-7 text-sm rounded shadow-xs tabular-nums focus:outline-none focus:ring-2 dark:bg-gray-700"
              :class="errores.efectivo_contado
                ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 dark:text-red-400'
                : 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white'">
          </div>
          <p v-if="errores.efectivo_contado" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.efectivo_contado }}</p>
          <p
            v-if="diferencia !== null"
            class="mt-2 text-sm font-medium"
            :class="diferencia === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">
            <template v-if="diferencia === 0">La caja cuadra.</template>
            <template v-else>{{ diferencia > 0 ? 'Sobrante' : 'Faltante' }} de $ {{ dinero(Math.abs(diferencia)) }}.</template>
          </p>
        </div>
        <div>
          <label for="cierre-observacion" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Observación <span v-if="diferencia" class="text-accent-500 dark:text-accent-400">*</span>
          </label>
          <input
            id="cierre-observacion"
            v-model="observacion"
            type="text"
            maxlength="255"
            placeholder="Ej.: vuelto mal dado a un cliente"
            class="block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700"
            :class="errores.observacion
              ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 dark:text-red-400'
              : 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white'">
          <p v-if="errores.observacion" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.observacion }}</p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Una caja cerrada ya no admite pagos ni movimientos; solo un administrador puede reabrirla.</p>
      </form>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="guardando"
          @click="cerrarModal">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="guardando"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="confirmar">
          <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
          {{ guardando ? 'Cerrando...' : 'Cerrar caja' }}
        </button>
      </div>
    </div>
  </div>
</template>
