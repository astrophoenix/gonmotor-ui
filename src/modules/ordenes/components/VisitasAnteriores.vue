<script setup>
import { computed, ref, watch } from 'vue';
import { CopyPlus, History, Package, Wrench } from 'lucide-vue-next';

/**
 * Visitas anteriores del vehículo (captura rápida de la OT): muestra la última
 * y permite elegir otra de las recientes para copiar sus servicios y
 * repuestos al formulario. Emite `copiar` con `{ visita, preciosCatalogo }`;
 * las líneas se agregan como filas nuevas y se guardan con la orden.
 */
const props = defineProps({
  visitas: { type: Array, default: () => [] },
});

const emit = defineEmits(['copiar']);

const seleccionada = ref('');
const preciosCatalogo = ref(false);

watch(() => props.visitas, (lista) => {
  seleccionada.value = lista[0]?.id || '';
}, { immediate: true });

const visita = computed(() => props.visitas.find((v) => v.id === seleccionada.value) || null);
const totalLineas = computed(() => (visita.value ? visita.value.servicios.length + visita.value.repuestos.length : 0));

function fecha(valor) {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function etiqueta(v) {
  const km = v.kilometraje != null ? ` · ${Number(v.kilometraje).toLocaleString('es-EC')} km` : '';
  return `${v.numero_orden} · ${fecha(v.fecha_ingreso)}${km}`;
}
</script>

<template>
  <section v-if="visitas.length" class="p-4 border rounded-lg sm:p-5 bg-brand-50/60 border-brand-200 dark:bg-brand-700/20 dark:border-brand-500/40">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h4 class="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-brand-700 dark:text-brand-200">
          <History class="w-4 h-4" />
          {{ visitas.length === 1 ? 'Última visita' : 'Visitas anteriores' }}
        </h4>
        <select
          v-if="visitas.length > 1"
          v-model="seleccionada"
          aria-label="Visita a copiar"
          class="block w-full mt-2 p-2 text-sm bg-white border border-gray-300 rounded shadow-xs sm:w-80 focus:ring-2 focus:ring-brand-200 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option v-for="v in visitas" :key="v.id" :value="v.id">{{ etiqueta(v) }}</option>
        </select>
        <p v-else-if="visita" class="mt-1 text-sm text-gray-700 dark:text-gray-300">{{ etiqueta(visita) }}</p>

        <ul v-if="visita" class="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
          <li v-for="(s, i) in visita.servicios" :key="`s${i}`" class="flex items-center gap-1.5">
            <Wrench class="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span class="truncate">{{ s.descripcion }}</span>
          </li>
          <li v-for="(r, i) in visita.repuestos" :key="`r${i}`" class="flex items-center gap-1.5">
            <Package class="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span class="truncate">{{ r.descripcion }} × {{ Number(r.cantidad) }}</span>
          </li>
          <li v-if="!totalLineas" class="text-gray-500">Sin trabajos registrados.</li>
        </ul>
      </div>

      <div v-if="visita && totalLineas" class="flex flex-col gap-2 sm:items-end shrink-0">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-800 focus:ring-4 focus:ring-brand-200"
          @click="emit('copiar', { visita, preciosCatalogo })">
          <CopyPlus class="w-4 h-4" />
          Copiar trabajos ({{ totalLineas }})
        </button>
        <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input v-model="preciosCatalogo" type="checkbox" class="w-4 h-4 border-gray-300 rounded text-brand-700 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600">
          Usar precios actuales del catálogo
        </label>
      </div>
    </div>
  </section>
</template>
