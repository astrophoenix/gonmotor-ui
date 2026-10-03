<script setup>
import FlujoSearchSelect from './FlowEntitySearchSelect.vue';
import { citasService } from '../../modules/citas/services/citasService';

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'flujo-cita' },
  placeholder: { type: String, default: 'Buscar cita...' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '/crud/citas/?crear=1' },
});
const emit = defineEmits(['update:modelValue', 'select', 'clear']);
function buscar(params) {
  const search = params.search || '';
  const numero = search.match(/^(?:cita\s*#?\s*)?(\d+)$/i)?.[1];
  return citasService.list({
    ...params,
    search: numero ? '' : search,
    filters: { ...params.filters, ...(numero ? { numero } : {}) },
  });
}
</script>

<template>
  <FlujoSearchSelect tipo="cita" v-bind="$props" :buscar="buscar" @update:model-value="emit('update:modelValue', $event)" @select="emit('select', $event)" @clear="emit('clear')" />
</template>