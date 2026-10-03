<script setup>
import FlujoSearchSelect from './FlowEntitySearchSelect.vue';
import { ordenesService } from '../../modules/ordenes/services/ordenesService';

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'flujo-orden' },
  placeholder: { type: String, default: 'Buscar orden...' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '/crud/ordenes/editar/' },
});
const emit = defineEmits(['update:modelValue', 'select', 'clear']);
function buscar(params) { return ordenesService.list(params); }
</script>

<template>
  <FlujoSearchSelect tipo="orden" v-bind="$props" :buscar="buscar" @update:model-value="emit('update:modelValue', $event)" @select="emit('select', $event)" @clear="emit('clear')" />
</template>