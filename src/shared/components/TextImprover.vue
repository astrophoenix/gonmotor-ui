<script setup>
/**
 * TextImprover — Mejora con IA un campo de texto libre, reutilizable.
 *
 * Centraliza el flujo completo: llamada al endpoint /api/core/mejorar-texto/,
 * estados de carga/error, reemplazo del texto, y opción de "Restaurar original".
 *
 * Uso básico:
 *   <TextImprover v-model="form.motivo" :contexto="'motivo de ingreso'" />
 *
 * Uso con scoped slot (para colocar el botón y los mensajes donde se prefiera):
 *   <TextImprover v-model="form.observaciones" :contexto="'observaciones'"
 *     v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }">
 *     ... botón @click="mejorar" y mensajes generados por el consumidor ...
 *   </TextImprover>
 *
 * El slot expone:
 *   - mejorar()      : dispara la mejora usando el modelValue actual.
 *   - restaurar()    : devuelve el texto original (si existía antes de mejorar).
 *   - mejorando      : booleano de estado de carga.
 *   - error          : mensaje de error ('' si no hay).
 *   - mejorado       : booleano que indica que la mejora fue aplicada.
 *   - tieneOriginal  : booleano: hay un original capturado para restaurar.
 *
 * Sin slot, se renderiza un botón por defecto junto a los mensajes de estado.
 */
import { computed, ref } from 'vue';
import { mejorarTexto } from '../services/textImproverService';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  contexto: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Mejorar texto',
  },
  loadingLabel: {
    type: String,
    default: 'Mejorando...',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const mejorando = ref(false);
const error = ref('');
const original = ref(null);
const mejorado = ref(false);

const tieneOriginal = computed(() => original.value !== null);

async function mejorar() {
  const texto = (props.modelValue || '').trim();
  if (!texto) {
    error.value = 'Escribe primero el texto para poder mejorarlo.';
    return;
  }
  error.value = '';
  mejorando.value = true;
  const snapshot = props.modelValue;
  try {
    const data = await mejorarTexto(texto, props.contexto);
    const resultado = (data?.mejorado || '').trim();
    if (!resultado) {
      throw new Error('El servicio no devolvió un texto mejorado.');
    }
    original.value = snapshot;
    mejorado.value = true;
    emit('update:modelValue', resultado);
    emit('success', resultado);
  } catch (err) {
    error.value = err.message || 'No fue posible mejorar el texto.';
    emit('error', err);
  } finally {
    mejorando.value = false;
  }
}

function restaurar() {
  if (original.value !== null) {
    emit('update:modelValue', original.value);
  }
  original.value = null;
  mejorado.value = false;
  error.value = '';
}

function limpiar() {
  original.value = null;
  mejorado.value = false;
  error.value = '';
}

defineExpose({ mejorar, restaurar, limpiar, mejorando, error, mejorado, tieneOriginal });
</script>

<template>
  <slot
    :mejorar="mejorar"
    :restaurar="restaurar"
    :mejorando="mejorando"
    :error="error"
    :mejorado="mejorado"
    :tieneOriginal="tieneOriginal"
  >
    <div class="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        :disabled="mejorando || disabled"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 focus:ring-4 focus:ring-primary-blue-300 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="mejorar"
      >
        <svg v-if="!mejorando" class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>
        </svg>
        <svg v-else class="w-4 h-4 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ mejorando ? loadingLabel : label }}
      </button>
      <p v-if="error" class="text-sm text-red-600 dark:text-red-500">{{ error }}</p>
      <template v-if="mejorado && !error">
        <div class="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
          <p>Texto mejorado. Revisa antes de guardar.</p>
          <button
            v-if="tieneOriginal"
            type="button"
            class="text-xs font-medium underline hover:no-underline"
            @click="restaurar"
          >
            Restaurar original
          </button>
        </div>
      </template>
    </div>
  </slot>
</template>