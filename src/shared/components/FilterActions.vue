<script setup>
import { ref, watch } from 'vue';
import { Search, RotateCcw } from 'lucide-vue-next';

const props = defineProps({
  /** Indica si hay una petición en curso; deshabilita ambos botones. */
  loading: {
    type: Boolean,
    default: false,
  },
  clearLabel: {
    type: String,
    default: 'Limpiar',
  },
  searchLabel: {
    type: String,
    default: 'Buscar',
  },
  loadingLabel: {
    type: String,
    default: 'Buscando...',
  },
});

const emit = defineEmits(['clear', 'search']);

// Bloqueo interno: evita doble click en el mismo tick (antes de que el
// `loading` del padre se refleje). Se libera cuando termina la petición.
const pending = ref(false);

watch(() => props.loading, (loading) => {
  if (!loading) pending.value = false;
});

function handleClear() {
  if (pending.value || props.loading) return;
  pending.value = true;
  emit('clear');
}

function handleSearch() {
  if (pending.value || props.loading) return;
  pending.value = true;
  emit('search');
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      :disabled="loading"
      class="inline-flex items-center px-3 py-2 text-sm font-medium rounded text-heading bg-neutral-secondary-medium border border-default-medium shadow-xs hover:bg-neutral-secondary focus:ring-4 focus:ring-gray/20 disabled:cursor-not-allowed disabled:opacity-60"
      @click="handleClear"
    >
      <RotateCcw class="w-4 h-4 mr-1.5" />
      {{ clearLabel }}
    </button>
    <button
      type="button"
      :disabled="loading"
      class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 disabled:cursor-wait disabled:opacity-70"
      @click="handleSearch"
    >
      <svg
        v-if="loading"
        class="w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <Search v-else class="w-4 h-4 mr-1.5" />
      {{ loading ? loadingLabel : searchLabel }}
    </button>
  </div>
</template>