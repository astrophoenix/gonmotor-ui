<script setup>
import { Check } from 'lucide-vue-next';

// Ruta de recuperación que acompaña a «olvidé mi contraseña» y «restablecer».
// `actual` = paso en curso (1-3); 4 marca todo completado.
const props = defineProps({
  actual: { type: Number, required: true },
  variante: { type: String, default: 'panel' }, // 'panel' (lista en la marca) | 'barra' (pie de la tarjeta)
});

const PASOS = [
  'Escribe el correo de tu cuenta',
  'Abre el enlace que te enviamos',
  'Crea tu nueva contraseña',
];
</script>

<template>
  <ol v-if="variante === 'panel'" class="mt-7 max-w-[420px]" aria-label="Pasos para recuperar el acceso">
    <li
      v-for="(paso, i) in PASOS"
      :key="paso"
      class="relative flex items-center gap-4 pb-5 last:pb-0"
      :aria-current="i + 1 === props.actual ? 'step' : undefined"
    >
      <span
        v-if="i < PASOS.length - 1"
        class="absolute left-[17px] top-9 h-[calc(100%-36px)] w-px"
        :class="i + 1 < props.actual ? 'bg-accent-400/70' : 'bg-white/20'"
        aria-hidden="true"
      ></span>
      <span
        class="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
        :class="i + 1 < props.actual
          ? 'bg-accent-400 text-white'
          : i + 1 === props.actual
            ? 'bg-white text-brand-900 ring-4 ring-white/15'
            : 'border border-white/30 text-white/60'"
      >
        <Check v-if="i + 1 < props.actual" class="h-4.5 w-4.5" aria-hidden="true" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span
        class="text-base font-semibold"
        :class="i + 1 <= props.actual ? 'text-white' : 'text-white/55'"
      >{{ paso }}</span>
    </li>
  </ol>

  <span v-else class="flex items-center gap-2 whitespace-nowrap text-[12.5px] font-bold text-brand-400 dark:text-brand-300">
    <span class="flex gap-1" aria-hidden="true">
      <span
        v-for="n in PASOS.length"
        :key="n"
        class="h-1 w-[18px] rounded-sm"
        :class="n <= props.actual ? 'bg-brand-900 dark:bg-brand-50' : 'bg-brand-200 dark:bg-brand-600'"
      ></span>
    </span>
    {{ props.actual > PASOS.length ? 'Listo' : `Paso ${props.actual} de ${PASOS.length}` }}
  </span>
</template>
