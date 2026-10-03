<script setup>
import FlujoSearchSelect from './FlowEntitySearchSelect.vue';
import { recepcionesService } from '../../modules/recepciones/services/recepcionesService';

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'flujo-recepcion' },
  placeholder: { type: String, default: 'Buscar recepción...' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '/crud/recepciones/editar/' },
});
const emit = defineEmits(['update:modelValue', 'select', 'clear']);
function buscar(params) { return recepcionesService.list(params); }
</script>

<template>
  <FlujoSearchSelect tipo="recepcion" v-bind="$props" :buscar="buscar" @update:model-value="emit('update:modelValue', $event)" @select="emit('select', $event)" @clear="emit('clear')" />
</template>