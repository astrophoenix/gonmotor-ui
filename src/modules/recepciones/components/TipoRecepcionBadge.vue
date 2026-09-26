<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { getTipoRecepcionConfig } from '../constants/tiposRecepcion';

const props = defineProps({
  tipo: { type: String, default: '' },
});

const config = computed(() => getTipoRecepcionConfig(props.tipo));

const label = computed(() => {
  if (config.value.value) return config.value.label;
  const raw = (props.tipo || '').trim();
  if (!raw) return config.value.label;
  return raw.charAt(0) + raw.slice(1).toLowerCase();
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
    :class="config.color"
    :title="`Tipo de recepción: ${label}`"
  >
    <Icon :icon="config.icon" class="w-5 h-5 shrink-0" />
    {{ label }}
  </span>
</template>
