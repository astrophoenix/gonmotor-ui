<script setup>
// Cabecera común de los modales: icono, título, subtítulo y cerrar, sobre una rejilla de plano
// con tres piezas en línea (llave inglesa, engranaje y bujía) que solo aparecen si el modal es ancho.
import { X } from 'lucide-vue-next';
import { llaveInglesa, engranaje, bujia, ubicar } from '@/modules/auth/utils/piezasPlano';

defineProps({
  icono: { type: [Object, Function], default: null },
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  tituloId: { type: String, default: undefined },
  etiquetaCerrar: { type: String, default: 'Cerrar' },
});
defineEmits(['cerrar']);

const piezas = [
  ubicar(62, 60, -28, `<g transform="scale(0.8)">${llaveInglesa(150)}</g>`, 1),
  ubicar(178, 56, 0, engranaje(14, 38, 32), 1),
  ubicar(262, 58, -24, bujia(0.66), 1),
].join('');
</script>

<template>
  <div class="modal-cabecera @container relative flex shrink-0 rounded-t-[inherit] items-center gap-3 overflow-hidden border-b border-gray-200 bg-white px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 dark:border-gray-700 dark:bg-gray-800">
    <div class="modal-cabecera__rejilla pointer-events-none absolute inset-0" aria-hidden="true"></div>
    <svg
      class="modal-cabecera__piezas pointer-events-none absolute right-16 top-0 hidden h-full w-[300px] text-primary-700/25 @3xl:block dark:text-primary-300/20"
      viewBox="0 0 300 112"
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden="true"
      v-html="piezas"
    ></svg>
    <span v-if="icono" class="relative inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 sm:w-14 sm:h-14 sm:rounded-2xl dark:bg-primary-500/15 dark:text-primary-200 dark:ring-primary-500/20">
      <component :is="icono" class="w-5 h-5 sm:w-6 sm:h-6" />
    </span>
    <div class="relative min-w-0 flex-1">
      <h3 :id="tituloId" class="flex flex-wrap items-center gap-2 text-lg font-semibold leading-tight tracking-tight text-gray-900 sm:text-xl dark:text-white">
        {{ titulo }}
        <slot name="titulo" />
      </h3>
      <p v-if="subtitulo" class="mt-0.5 hidden text-sm sm:block text-gray-500 dark:text-gray-400">{{ subtitulo }}</p>
      <slot />
    </div>
    <button
      type="button"
      class="relative inline-flex items-center justify-center w-10 h-10 shrink-0 self-start rounded-xl bg-white/80 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100 hover:text-gray-700 focus:ring-4 focus:ring-primary-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-primary-800"
      :aria-label="etiquetaCerrar"
      @click="$emit('cerrar')"
    >
      <X class="w-5 h-5" />
    </button>
  </div>
</template>

<style scoped>
.modal-cabecera__rejilla {
  background-image:
    linear-gradient(color-mix(in srgb, var(--color-primary-700) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary-700) 6%, transparent) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: linear-gradient(to left, #000 0%, rgb(0 0 0 / 0.6) 30%, transparent 65%);
}
:global(.dark) .modal-cabecera__rejilla {
  background-image:
    linear-gradient(color-mix(in srgb, var(--color-primary-300) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary-300) 6%, transparent) 1px, transparent 1px);
}
.modal-cabecera__piezas :deep(.pz),
.modal-cabecera__piezas :deep(.fino),
.modal-cabecera__piezas :deep(.som) {
  fill: none;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.modal-cabecera__piezas :deep(.pz) { stroke-width: 1.1; }
.modal-cabecera__piezas :deep(.fino) { stroke-width: 0.7; opacity: 0.8; }
.modal-cabecera__piezas :deep(.som) { stroke-width: 0.5; opacity: 0.45; }
</style>
