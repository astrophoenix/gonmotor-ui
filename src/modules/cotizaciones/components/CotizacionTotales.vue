<script setup>
// Resumen de importes de la cotización (total destacado + desglose fiscal).
// Solo presenta valores: cada pantalla le pasa los suyos (Edit los calcula en
// vivo, Detail usa los que devuelve el backend).
import { CircleDollarSign } from 'lucide-vue-next';

defineProps({
  subtotalServicios: { type: Number, default: 0 },
  subtotalRepuestos: { type: Number, default: 0 },
  subtotalNeto: { type: Number, default: 0 },
  descuento: { type: Number, default: 0 },
  base0: { type: Number, default: 0 },
  baseGravada: { type: Number, default: 0 },
  iva: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  nServicios: { type: Number, default: 0 },
  nRepuestos: { type: Number, default: 0 },
});

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <section class="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
    <div class="px-4 py-4 sm:px-5 bg-brand-900 text-white dark:bg-brand-700">
      <p class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-brand-100">
        <CircleDollarSign class="w-4 h-4" />
        Total de la cotización
      </p>
      <p class="mt-1 text-3xl font-bold tabular-nums">
        <span class="text-lg font-semibold text-brand-100">$</span> {{ formatMoney(total) }}
      </p>
      <p class="mt-0.5 text-xs text-brand-100">IVA incluido · {{ nServicios }} servicio{{ nServicios === 1 ? '' : 's' }} · {{ nRepuestos }} repuesto{{ nRepuestos === 1 ? '' : 's' }}</p>
    </div>
    <dl class="px-4 py-3 space-y-2 text-sm sm:px-5">
      <div class="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
        <dt>Servicios</dt>
        <dd class="font-medium tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(subtotalServicios) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
        <dt>Repuestos / materiales</dt>
        <dd class="font-medium tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(subtotalRepuestos) }}</dd>
      </div>
      <div v-if="descuento" class="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
        <dt>Descuentos aplicados</dt>
        <dd class="font-medium tabular-nums text-accent-600 dark:text-accent-400">− $ {{ formatMoney(descuento) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 text-gray-600 dark:border-gray-700 dark:text-gray-300">
        <dt class="font-medium text-gray-900 dark:text-white">Subtotal neto</dt>
        <dd class="font-semibold tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(subtotalNeto) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <dt>Base 0%</dt>
        <dd class="tabular-nums">$ {{ formatMoney(base0) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <dt>Base gravada</dt>
        <dd class="tabular-nums">$ {{ formatMoney(baseGravada) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
        <dt>IVA</dt>
        <dd class="font-medium tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(iva) }}</dd>
      </div>
    </dl>
  </section>
</template>
