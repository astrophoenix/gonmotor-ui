<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import { proveedoresService } from '../../proveedores/services/proveedoresService';

const props = defineProps({
  modelValue: { type: String, default: '' },
  nombre: { type: String, default: '' },
  inputId: { type: String, required: true },
});
const emit = defineEmits(['update:modelValue', 'seleccionar']);
const busqueda = ref('');
const opciones = ref([]);
const error = ref('');
let timer;
let secuencia = 0;
let controller;
watch(busqueda, (valor) => {
  clearTimeout(timer);
  controller?.abort();
  const actual = ++secuencia;
  opciones.value = [];
  error.value = '';
  if (valor.trim().length < 2) return;
  timer = setTimeout(async () => {
    controller = new AbortController();
    try {
      const datos = await proveedoresService.list({ search: valor.trim(), estado: 'activo', signal: controller.signal });
      if (actual === secuencia) opciones.value = (datos.results || []).map(p => ({ ...p, codigo: p.identificacion || '' }));
    } catch (err) {
      if (actual === secuencia && !controller.signal.aborted) error.value = err.message || 'No se pudieron cargar los proveedores.';
    }
  }, 250);
});
function seleccionar(item) {
  emit('update:modelValue', item.id);
  emit('seleccionar', item);
}
function limpiar() {
  busqueda.value = '';
  emit('update:modelValue', '');
  emit('seleccionar', null);
}
onBeforeUnmount(() => { clearTimeout(timer); ++secuencia; controller?.abort(); });
</script>

<template>
  <div>
    <div v-if="modelValue" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 p-2 text-sm dark:border-brand-500">
      <span class="min-w-0 break-words">{{ nombre || 'Proveedor seleccionado' }}</span>
      <button type="button" class="min-h-11 px-2 font-medium text-brand-700 underline dark:text-brand-200" @click="limpiar">Cambiar proveedor</button>
    </div>
    <template v-else>
      <CatalogoSelect v-model="busqueda" :input-id="inputId" :catalogo="opciones" placeholder="Busca un proveedor (mín. 2 caracteres)" mensaje-sin-resultados="Selecciona un proveedor registrado en Proveedores." @select="seleccionar" />
      <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </template>
  </div>
</template>
