<script setup>
defineProps({
  activo: {
    type: Boolean,
    default: false,
  },
  // Concordancia de género: «Activa» / «Inactiva» (p. ej. empresas).
  femenino: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <span
    v-if="activo"
    class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30"
  >
    <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
    {{ femenino ? 'Activa' : 'Activo' }}
  </span>
  <span
    v-else
    class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-500/30"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
    {{ femenino ? 'Inactiva' : 'Inactivo' }}
  </span>
</template>
