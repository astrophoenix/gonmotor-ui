<script setup>
/**
 * Ficha de solo lectura (etiqueta / valor) para la variante «consulta» de los
 * modales de entidades sin página de detalle (repuestos, servicios…).
 *
 * Muestra los datos como texto, no como inputs deshabilitados: se lee como una
 * ficha y no como un formulario bloqueado.
 *
 * `campos`: `[{ etiqueta, valor, ancho? }]`. `ancho: 'completo'` ocupa la fila
 * entera (textos largos). Un valor vacío se muestra como «—».
 */
defineProps({
  campos: { type: Array, required: true },
});

function vacio(valor) {
  return valor === null || valor === undefined || String(valor).trim() === '';
}
</script>

<template>
  <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
    <div
      v-for="campo in campos"
      :key="campo.etiqueta"
      :class="campo.ancho === 'completo' ? 'sm:col-span-2 md:col-span-4' : ''"
    >
      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ campo.etiqueta }}</dt>
      <dd
        class="mt-1 text-sm text-gray-900 dark:text-white"
        :class="campo.ancho === 'completo' ? 'whitespace-pre-line' : ''"
      >{{ vacio(campo.valor) ? '—' : campo.valor }}</dd>
    </div>
  </dl>
</template>
