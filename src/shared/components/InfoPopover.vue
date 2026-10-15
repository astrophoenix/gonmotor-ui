<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Popover } from 'flowbite';
import { Info } from 'lucide-vue-next';

/**
 * Icono de información con popover descriptivo (patrón «Description popover»
 * de Flowbite). Se instancia con la clase `Popover` al montar porque el
 * auto-init por `data-popover-target` solo cubre el DOM presente al cargar la
 * página, no lo que Vue renderiza después.
 */
const props = defineProps({
  /** Texto accesible del botón (p. ej. «Qué significa Ingresos»). */
  etiqueta: { type: String, required: true },
  /** Bloques del popover: `[{ titulo, texto }]`. */
  secciones: { type: Array, default: () => [] },
  placement: { type: String, default: 'bottom' },
});

const id = `info-popover-${useId()}`;

const disparadorRef = ref(null);
const popoverRef = ref(null);
let instancia = null;

onMounted(() => {
  instancia = new Popover(popoverRef.value, disparadorRef.value, {
    placement: props.placement,
    triggerType: 'hover',
    offset: 8,
  }, { id, override: true });
});

onBeforeUnmount(() => {
  instancia?.destroy();
  instancia = null;
});
</script>

<template>
  <button
    ref="disparadorRef"
    type="button"
    class="inline-flex shrink-0 rounded-full text-gray-400 transition-colors hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-500 dark:hover:text-brand-100"
    :aria-describedby="id"
  >
    <Info class="h-4 w-4" aria-hidden="true" />
    <span class="sr-only">{{ etiqueta }}</span>
  </button>
  <div
    :id="id"
    ref="popoverRef"
    role="tooltip"
    class="absolute z-50 invisible inline-block w-72 text-sm font-normal text-gray-600 transition-opacity duration-300 bg-white border border-gray-200 rounded-lg shadow-sm opacity-0 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600"
  >
    <div class="p-3 space-y-2">
      <template v-for="(seccion, indice) in secciones" :key="indice">
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ seccion.titulo }}</h3>
        <p>{{ seccion.texto }}</p>
      </template>
    </div>
    <div data-popper-arrow></div>
  </div>
</template>
