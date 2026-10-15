<script setup>
import { computed } from 'vue';
import { formatCurrency } from '@/shared/utils/format';

/**
 * «¿A dónde se va cada $100 que cobras?»: una sola barra al 100 % repartida
 * entre repuestos, mano de obra, gastos y lo que le queda al taller. Pensada
 * para dueños sin formación financiera (sin margen bruto ni utilidad).
 */
const props = defineProps({
  ingresos: { type: Number, default: 0 },
  costoRepuestos: { type: Number, default: 0 },
  costoManoObra: { type: Number, default: 0 },
  gastos: { type: Number, default: 0 },
  utilidad: { type: Number, default: 0 },
});

/** Ancho mínimo (%) de un tramo para escribir su monto dentro de la barra. */
const ANCHO_MIN_ETIQUETA = 10;

const hayIngresos = computed(() => props.ingresos > 0);
const gana = computed(() => props.utilidad >= 0);

function deCadaCien(monto) {
  return Math.round(monto / props.ingresos * 100);
}

const tramos = computed(() => {
  if (!hayIngresos.value) return [];
  const lista = [
    { clave: 'repuestos', nombre: 'Repuestos', monto: props.costoRepuestos, color: 'bg-amber-400', punto: 'bg-amber-400' },
    { clave: 'mano', nombre: 'Mano de obra', monto: props.costoManoObra, color: 'bg-sky-500', punto: 'bg-sky-500' },
    { clave: 'gastos', nombre: 'Gastos del taller', monto: props.gastos, color: 'bg-slate-400', punto: 'bg-slate-400' },
  ].map((tramo) => ({ ...tramo, cien: deCadaCien(tramo.monto) }));

  if (gana.value) {
    // «Te quedan» cierra la cuenta para que la barra sume exactamente $100.
    const usados = lista.reduce((suma, tramo) => suma + tramo.cien, 0);
    lista.push({
      clave: 'queda',
      nombre: 'Te quedan',
      monto: props.utilidad,
      cien: Math.max(0, 100 - usados),
      color: 'bg-emerald-500',
      punto: 'bg-emerald-500',
      destacado: true,
    });
  }
  return lista;
});

/** Con pérdida los tramos suman más de $100: el ancho se reparte sobre su total. */
const baseAncho = computed(() => tramos.value.reduce((suma, tramo) => suma + tramo.cien, 0) || 100);

function ancho(tramo) {
  return (tramo.cien / baseAncho.value) * 100;
}

const perdidaCien = computed(() => (gana.value ? 0 : deCadaCien(Math.abs(props.utilidad))));
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">¿A dónde se va cada $100 que cobras?</h3>

    <p v-if="!hayIngresos" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      No hay trabajos entregados en este periodo.
    </p>

    <template v-else>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        <template v-if="gana">
          De cada $100 que cobraste, <strong class="text-emerald-700 dark:text-emerald-300">te quedaron ${{ tramos.at(-1).cien }}</strong>.
        </template>
        <template v-else>
          Por cada $100 que cobraste gastaste ${{ 100 + perdidaCien }}:
          <strong class="text-red-700 dark:text-red-300">perdiste ${{ perdidaCien }}</strong>.
        </template>
      </p>

      <!-- Barra única al 100 % -->
      <div
        class="mt-3 flex h-10 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
        role="img"
        :aria-label="tramos.map((tramo) => `${tramo.nombre}: $${tramo.cien} de cada $100`).join(', ')"
      >
        <div
          v-for="tramo in tramos.filter((item) => item.cien > 0)"
          :key="tramo.clave"
          class="flex items-center justify-center text-xs font-semibold text-white"
          :class="tramo.color"
          :style="{ width: `${ancho(tramo)}%` }"
          :title="`${tramo.nombre}: $${tramo.cien} de cada $100 (${formatCurrency(tramo.monto)})`"
        >
          <span v-if="ancho(tramo) >= ANCHO_MIN_ETIQUETA" class="truncate px-1">${{ tramo.cien }}</span>
        </div>
      </div>

      <!-- Detalle -->
      <ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="tramo in tramos"
          :key="tramo.clave"
          class="flex items-start gap-2 rounded-lg border p-3"
          :class="tramo.destacado
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
            : 'border-gray-200 dark:border-gray-700'"
        >
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :class="tramo.punto" aria-hidden="true"></span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ tramo.nombre }}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${{ tramo.cien }} <span class="text-xs font-normal text-gray-500 dark:text-gray-400">de cada $100</span></p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatCurrency(tramo.monto) }} en el periodo</p>
          </div>
        </li>
      </ul>

      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Cobraste <strong class="text-gray-900 dark:text-white">{{ formatCurrency(ingresos) }}</strong> ·
        <template v-if="gana">Te quedaron <strong class="text-emerald-700 dark:text-emerald-300">{{ formatCurrency(utilidad) }}</strong></template>
        <template v-else>Perdiste <strong class="text-red-700 dark:text-red-300">{{ formatCurrency(Math.abs(utilidad)) }}</strong></template>
      </p>
    </template>
  </div>
</template>
