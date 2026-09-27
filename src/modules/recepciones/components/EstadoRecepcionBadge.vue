<script setup>
import { computed } from 'vue';
import { getEstadoRecepcion } from '../constants/estadosRecepcion';

const props = defineProps({
  estado: { type: String, default: '' },
  estadoDisplay: { type: String, default: '' },
  /** Densidad del badge: `sm` (resúmenes), `md` (listados), `lg` (encabezados). */
  size: { type: String, default: 'md' },
});

const config = computed(() => getEstadoRecepcion(props.estado, props.estadoDisplay));

const TAMANOS = {
  sm: { wrap: 'gap-1 px-2 py-0.5 text-xs', icon: 'w-3.5 h-3.5' },
  md: { wrap: 'gap-1.5 px-2.5 py-1 text-xs', icon: 'w-5 h-5' },
  lg: { wrap: 'gap-1.5 px-2.5 py-1 text-sm', icon: 'w-4 h-4' },
};

const tamano = computed(() => TAMANOS[props.size] || TAMANOS.md);
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-medium whitespace-nowrap"
    :class="[config.color, tamano.wrap]"
    :title="`Estado de recepción: ${config.label}`"
  >
    <component :is="config.icon" :class="[tamano.icon, 'shrink-0']" aria-hidden="true" />
    {{ config.label }}
  </span>
</template>
