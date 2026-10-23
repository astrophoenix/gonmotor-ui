<script setup>
// Tarjeta compacta de indicador: icono y título, cifra, línea de estado con punto e ilustración
// inclinada que nace de la esquina inferior derecha. Si tiene `href`, toda la tarjeta enlaza.
defineProps({
  titulo: { type: String, required: true },
  valor: { type: [String, Number], default: '—' },
  subtitulo: { type: String, default: '' },
  // Texto completo que aparece al pasar el cursor (la línea de estado es corta).
  detalle: { type: String, default: '' },
  icono: { type: [Object, String], default: null },
  // Ilustración de fondo; por defecto, el mismo icono.
  ilustracion: { type: [Object, String], default: null },
  estado: { type: String, default: 'neutro' }, // 'neutro' | 'ok' | 'aviso' | 'alerta'
  href: { type: String, default: '' },
  textoAccion: { type: String, default: 'Ver detalle' },
  cargando: { type: Boolean, default: false },
});

const PUNTOS = {
  neutro: 'bg-gray-400 dark:bg-gray-500',
  ok: 'bg-emerald-500',
  aviso: 'bg-amber-500',
  alerta: 'bg-accent-500',
};
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href || undefined"
    :title="href ? `${textoAccion}${detalle ? ` · ${detalle}` : ''}` : (detalle || undefined)"
    class="group relative block h-full overflow-hidden p-4 bg-white border border-gray-200 rounded-xl shadow-xs dark:bg-gray-800 dark:border-gray-700"
    :class="href ? 'transition hover:border-primary-300 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-200 dark:hover:border-primary-500/50 dark:focus:ring-primary-800' : ''"
  >
    <component
      :is="ilustracion || icono"
      v-if="ilustracion || icono"
      class="pointer-events-none absolute -bottom-6 -right-5 w-24 h-24 -rotate-[32deg] text-primary-200/70 transition-transform group-hover:-rotate-[26deg] dark:text-primary-400/15"
      :stroke-width="1.4"
      aria-hidden="true"
    />
    <p class="relative flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
      <component :is="icono" v-if="icono" class="w-4 h-4 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
      <span class="truncate">{{ titulo }}</span>
    </p>
    <p class="relative mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white" :aria-label="titulo">
      <span v-if="cargando">…</span>
      <slot v-else name="valor">{{ valor }}</slot>
    </p>
    <p v-if="subtitulo || $slots.subtitulo" class="relative flex items-center gap-1.5 mt-1 pe-14 text-sm text-gray-500 dark:text-gray-400">
      <span class="w-1.5 h-1.5 shrink-0 rounded-full" :class="PUNTOS[estado] || PUNTOS.neutro" aria-hidden="true"></span>
      <span class="truncate"><slot name="subtitulo">{{ subtitulo }}</slot></span>
    </p>
  </component>
</template>
