<script setup>
import FlujoSearchSelect from './FlowEntitySearchSelect.vue';
import { inspeccionesService } from '../../modules/inspecciones/services/inspeccionesService';

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'flujo-inspeccion' },
  placeholder: { type: String, default: 'Buscar inspección...' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '/crud/inspecciones/editar/' },
});
const emit = defineEmits(['update:modelValue', 'select', 'clear']);
function buscar(params) { return inspeccionesService.list(params); }
</script>

<template>
  <FlujoSearchSelect tipo="inspeccion" v-bind="$props" :buscar="buscar" @update:model-value="emit('update:modelValue', $event)" @select="emit('select', $event)" @clear="emit('clear')" />
</template>