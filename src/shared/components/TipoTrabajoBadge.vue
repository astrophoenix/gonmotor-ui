<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { getTipoTrabajoConfig } from '../config/tiposTrabajo';

const props = defineProps({
  tipo: { type: String, default: '' },
  /** Densidad del badge: `sm` (resúmenes), `md` (listados/detalle), `lg`. */
  size: { type: String, default: 'md' },
  /**
   * Clase Tailwind para el tamaño de letra del label (p. ej. `text-sm`).
   * Si se omite se usa la del `size`; permite agrandar solo el texto cuando
   * el icono ya es grande.
   */
  text: { type: String, default: '' },
});

const config = computed(() => getTipoTrabajoConfig(props.tipo));

const TAMANOS = {
  sm: { wrap: 'gap-1 px-2 py-0.5', text: 'text-xs', icon: 'w-4 h-4' },
  md: { wrap: 'gap-1.5 px-2.5 py-1', text: 'text-sm', icon: 'w-6 h-6' },
  lg: { wrap: 'gap-2 px-3 py-1.5', text: 'text-base', icon: 'w-7 h-7' },
};

const tamano = computed(() => TAMANOS[props.size] || TAMANOS.md);

const textoLabel = computed(() => props.text || tamano.value.text);

// `icon` admite datos de @iconify (objeto) o un componente Vue.
const esIconoIconify = computed(() => Boolean(config.value.icon?.body));

const label = computed(() => {
  if (config.value.value) return config.value.label;
  const raw = (props.tipo || '').trim();
  if (!raw) return config.value.label;
  return raw.charAt(0) + raw.slice(1).toLowerCase();
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-medium whitespace-nowrap"
    :class="[config.color, tamano.wrap, textoLabel]"
    :title="`Tipo de trabajo: ${label}`"
  >
    <Icon v-if="esIconoIconify" :icon="config.icon" :class="[tamano.icon, 'shrink-0']" />
    <component v-else :is="config.icon" :class="[tamano.icon, 'shrink-0']" />
    {{ label }}
  </span>
</template>
