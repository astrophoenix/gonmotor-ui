<script setup>
import FlujoSearchSelect from './FlowEntitySearchSelect.vue';
import { cotizacionesService } from '../../modules/cotizaciones/services/cotizacionesService';

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'flujo-cotizacion' },
  placeholder: { type: String, default: 'Buscar cotización...' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '/crud/cotizaciones/editar/' },
});
const emit = defineEmits(['update:modelValue', 'select', 'clear']);
function buscar(params) { return cotizacionesService.list(params); }
</script>

<template>
  <FlujoSearchSelect tipo="cotizacion" v-bind="$props" :buscar="buscar" @update:model-value="emit('update:modelValue', $event)" @select="emit('select', $event)" @clear="emit('clear')" />
</template>