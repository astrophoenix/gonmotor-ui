<script setup>
import { ArrowRight } from 'lucide-vue-next';

defineProps({
  titulo: { type: String, required: true },
  valor: { type: [String, Number], default: '—' },
  subtitulo: { type: String, default: '' },
  icono: { type: [Object, String], default: null },
  tono: { type: String, default: 'brand' },
  href: { type: String, default: '' },
  textoAccion: { type: String, default: 'Ver detalle' },
  cargando: { type: Boolean, default: false },
});

const TONOS = {
  brand: 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-100',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  accent: 'bg-accent-100 text-accent-600 dark:bg-accent-600/20 dark:text-accent-400',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
};
</script>

<template>
  <div class="flex flex-col justify-between h-full gap-3 p-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium truncate text-body" :title="titulo">{{ titulo }}</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-heading" :aria-label="titulo">
          <span v-if="cargando">…</span>
          <slot v-else name="valor">{{ valor }}</slot>
        </p>
      </div>
      <span
        v-if="icono"
        class="inline-flex items-center justify-center w-10 h-10 rounded-base shrink-0"
        :class="TONOS[tono] || TONOS.brand"
        aria-hidden="true"
      >
        <component :is="icono" class="w-5 h-5" />
      </span>
    </div>

    <div class="flex items-end justify-between gap-2 min-h-5">
      <p class="text-xs text-body" :title="subtitulo">{{ subtitulo }}</p>
      <a
        v-if="href"
        :href="href"
        class="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-primary-600 hover:underline dark:text-primary-400"
      >
        {{ textoAccion }}
        <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
      </a>
    </div>
  </div>
</template>
