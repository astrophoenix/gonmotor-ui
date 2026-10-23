<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import Alert from '@/shared/components/Alert.vue';
import { createLatestRequest, isAbortError } from '@/shared/utils/search';
import { ordenesService } from '../services/ordenesService';

const props = defineProps({ vehiculoId: { type: String, default: '' }, kilometraje: { type: [String, Number], default: null } });
const emit = defineEmits(['cargado']);
const garantias = ref([]), error = ref(''), cargando = ref(false);
const latest = createLatestRequest();
let timer;
watch(() => [props.vehiculoId, props.kilometraje], () => {
  clearTimeout(timer); latest.cancel(); garantias.value = []; error.value = ''; cargando.value = false;
  emit('cargado', { ordenes_origen: [] });
  if (!props.vehiculoId) return;
  timer = setTimeout(async () => {
    const { id, signal } = latest.begin(); cargando.value = true;
    try {
      const data = await ordenesService.garantiasVehiculo(props.vehiculoId, props.kilometraje, signal);
      if (latest.isCurrent(id)) { garantias.value = data.garantias || []; emit('cargado', data); }
    } catch (err) {
      if (latest.isCurrent(id) && !isAbortError(err)) error.value = err.message || 'No se pudieron verificar las garantías.';
    } finally { if (latest.isCurrent(id)) cargando.value = false; }
  }, 300);
}, { immediate: true });
onBeforeUnmount(() => { clearTimeout(timer); latest.cancel(); });
</script>

<template>
  <p v-if="cargando" role="status" class="text-sm text-brand-500 dark:text-brand-300">Consultando garantías del vehículo…</p>
  <Alert v-if="error" type="error" :message="error" />
  <section v-if="garantias.length" class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-brand-900 dark:border-amber-700 dark:bg-amber-950 dark:text-brand-100" aria-label="Garantías del vehículo">
    <h3 class="font-semibold">Este vehículo tiene trabajos con garantía</h3>
    <p class="mt-1 text-sm">Revisa si el motivo de esta visita corresponde a alguno de estos trabajos.</p>
    <ul class="mt-3 space-y-3 text-sm">
      <li v-for="g in garantias" :key="g.servicio_id" class="break-words">
        <p class="font-medium">{{ g.descripcion }}</p>
        <a :href="`/crud/ordenes/ver/?id=${encodeURIComponent(g.orden_id)}`" class="underline">{{ g.numero_orden }}</a> · {{ g.taller }}
        <p>Desde {{ g.fecha_inicio }}<span v-if="g.fecha_hasta"> · Hasta {{ g.fecha_hasta }} inclusive</span><span v-if="g.kilometraje_hasta != null"> · Hasta {{ Number(g.kilometraje_hasta).toLocaleString('es-EC') }} km inclusive</span></p>
        <p v-if="g.estado === 'POR_VERIFICAR'" class="font-semibold">Kilometraje pendiente de verificar.</p>
      </li>
    </ul>
  </section>
</template>
