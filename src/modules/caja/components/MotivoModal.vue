<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { ref, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';

/**
 * Pide un motivo obligatorio antes de una acción (anular un movimiento,
 * reabrir una caja). El padre hace la petición en `confirmar(motivo)` y
 * devuelve una promesa; si falla, el error se muestra aquí.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  textoConfirmar: { type: String, default: 'Confirmar' },
  placeholder: { type: String, default: '' },
  peligro: { type: Boolean, default: false },
  confirmar: { type: Function, required: true },
});

const emit = defineEmits(['update:modelValue']);

const motivo = ref('');
const error = ref('');
const guardando = ref(false);

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  motivo.value = '';
  error.value = '';
});

function cerrar() {
  if (!guardando.value) emit('update:modelValue', false);
}

async function enviar() {
  if (guardando.value) return;
  if (!motivo.value.trim()) {
    error.value = 'Indica el motivo.';
    return;
  }
  guardando.value = true;
  error.value = '';
  try {
    await props.confirmar(motivo.value.trim());
    emit('update:modelValue', false);
  } catch (err) {
    error.value = (Array.isArray(err.data?.motivo) ? err.data.motivo[0] : null) || err.message || 'No se pudo completar la acción.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-md my-auto bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <ModalCabecera
        :titulo="titulo"
        @cerrar="cerrar"
      />
      <div class="px-6 py-4 space-y-3">
        <p v-if="descripcion" class="text-sm text-gray-600 dark:text-gray-300">{{ descripcion }}</p>
        <div>
          <label for="motivo-accion" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Motivo <span class="text-accent-500 dark:text-accent-400">*</span>
          </label>
          <input
            id="motivo-accion"
            v-model="motivo"
            type="text"
            maxlength="255"
            :placeholder="placeholder"
            class="block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400"
            :class="error
              ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500'
              : 'bg-white border border-gray-300 text-gray-900 focus:ring-primary-200 focus:border-primary-500 dark:border-gray-600 dark:text-white'"
            @keydown.enter.prevent="enviar">
          <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="guardando"
          @click="cerrar">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="guardando"
          class="inline-flex items-center gap-1.5 text-white rounded focus:ring-4 font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          :class="peligro ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300' : 'bg-primary-700 hover:bg-primary-800 focus:ring-primary-200 dark:focus:ring-primary-800'"
          @click="enviar">
          <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
          {{ textoConfirmar }}
        </button>
      </div>
    </div>
  </div>
</template>
