<script setup>
import { Plus } from 'lucide-vue-next';

/**
 * Columna "Relaciones" de los listados del flujo taller. Solo presentación:
 * recibe los pasos ya normalizados por `utils/relacionesFlujo.js`.
 */
defineProps({
  /** Pasos normalizados: { key, label, icon, numero, estado, url, extra }. El color se ignora: los badges usan un único estilo primary. */
  pasos: { type: Array, default: () => [] },
});

function titulo(paso) {
  return paso.estado ? `${paso.label} ${paso.numero} · ${paso.estado}` : `${paso.label} ${paso.numero}`;
}
</script>

<template>
  <div class="flex flex-col items-start gap-1.5">
    <template v-for="paso in pasos" :key="paso.key">
      <a
        v-if="paso.numero"
        :href="paso.url"
        :title="titulo(paso)"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-primary-200 bg-primary-100 text-primary-700 transition-colors hover:bg-primary-200 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-300">
        <component :is="paso.icon" class="w-3.5 h-3.5 shrink-0" />
        {{ paso.numero }}
        <span
          v-if="paso.extra > 0"
          class="inline-flex items-center gap-0.5 pl-1 border-l border-current/30 font-semibold"
          :title="`${paso.extra} relación(es) adicional(es)`">
          <Plus class="w-2.5 h-2.5" />{{ paso.extra }}
        </span>
      </a>
      <span
        v-else
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        :title="`${paso.label}: sin relación`">
        <component :is="paso.icon" class="w-3.5 h-3.5 shrink-0" />
        {{ paso.label }}: No
      </span>
    </template>
  </div>
</template>
