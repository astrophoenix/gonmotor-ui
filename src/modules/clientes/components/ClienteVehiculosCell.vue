<script setup>
import { computed, ref, watch } from 'vue';
import { Car, ChevronDown } from 'lucide-vue-next';
import { formatPlate } from '../../../shared/utils/formatPlate';

// El listado es un denso tablero: se muestran como máximo dos placas y el resto
// queda a un clic, para que la columna no crezca con flotas grandes.
const MAX_VISIBLES = 2;

const props = defineProps({
  cliente: {
    type: Object,
    required: true,
  },
});

const expandido = ref(false);

watch(
  () => props.cliente?.id,
  () => {
    expandido.value = false;
  }
);

const vehiculos = computed(() => (Array.isArray(props.cliente?.vehiculos) ? props.cliente.vehiculos : []));

const restantes = computed(() => vehiculos.value.slice(MAX_VISIBLES));

const listaId = computed(() => `cliente-vehiculos-${props.cliente?.id ?? 'nuevo'}`);

const resumen = computed(() => {
  const total = vehiculos.value.length;
  return `${total} vehículo${total === 1 ? '' : 's'}`;
});

function vehiculoUrl(id) {
  return id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}` : null;
}

function descripcion(vehiculo) {
  const modelo = [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ');
  return [modelo, vehiculo?.color].filter(Boolean).join(' · ') || 'Sin datos';
}
</script>

<template>
  <div class="flex flex-col items-start gap-1.5">
    <p
      v-if="!vehiculos.length"
      title="Este cliente no tiene vehículos registrados"
      class="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-body rounded-full border border-dashed border-default-medium"
    >
      <Car class="w-4 h-4 shrink-0" />
      Sin vehículos
    </p>

    <template v-else>
      <ul class="flex flex-col gap-1">
        <li
          v-for="(vehiculo, index) in vehiculos"
          v-show="index < MAX_VISIBLES || expandido"
          :key="vehiculo.id"
          class="flex items-center gap-1.5 text-sm"
        >
          <Car class="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
          <a
            :href="vehiculoUrl(vehiculo.id)"
            :title="`Ver ficha del vehículo ${formatPlate(vehiculo.placa) || ''}`"
            class="font-semibold text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400"
          >
            {{ formatPlate(vehiculo.placa) || 'Sin placa' }}
          </a>
          <span class="truncate text-body">· {{ descripcion(vehiculo) }}</span>
        </li>
      </ul>

      <button
        v-if="restantes.length"
        type="button"
        :aria-expanded="expandido"
        :aria-controls="listaId"
        :title="expandido ? 'Ocultar los demás vehículos' : `Ver los ${restantes.length} vehículos restantes`"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-body rounded-full border border-default-medium transition-colors hover:border-primary-300 hover:text-primary-700 focus:ring-2 focus:ring-primary-200 focus:outline-none dark:hover:border-primary-600 dark:hover:text-primary-300"
        @click="expandido = !expandido"
      >
        <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="expandido && 'rotate-180'" />
        {{ expandido ? 'Ocultar' : `+${restantes.length} más` }}
      </button>

      <p class="text-xs text-gray-400 dark:text-gray-500">{{ resumen }}</p>
    </template>
  </div>
</template>
