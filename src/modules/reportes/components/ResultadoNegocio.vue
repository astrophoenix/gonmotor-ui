<script setup>
import { computed } from 'vue';
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next';
import { formatCurrency } from '@/shared/utils/format';

/**
 * Resultado del periodo en grande: lo primero que el dueño debe ver es si el
 * taller (o el negocio completo) ganó o perdió dinero, y cuánto.
 */
const props = defineProps({
  ingresos: { type: Number, default: 0 },
  gastos: { type: Number, default: 0 },
  utilidad: { type: Number, default: 0 },
  /** Nombre del taller consultado; vacío = todos los talleres (negocio completo). */
  taller: { type: String, default: '' },
  periodo: { type: Object, default: () => ({ desde: null, hasta: null }) },
});

const esNegocio = computed(() => !props.taller);

function fechaCorta(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = String(iso).split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : String(iso);
}

const periodoLabel = computed(() => {
  const { desde, hasta } = props.periodo || {};
  if (desde && hasta) return `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`;
  if (desde) return `Desde el ${fechaCorta(desde)}`;
  if (hasta) return `Hasta el ${fechaCorta(hasta)}`;
  return 'Todo el historial';
});

/** Cuánto queda (o se pierde) de cada $100 cobrados, redondeado. */
const porCadaCien = computed(() =>
  props.ingresos > 0 ? Math.round(Math.abs(props.utilidad) / props.ingresos * 100) : null
);

const resultado = computed(() => {
  const sujeto = esNegocio.value ? 'Tu negocio' : 'Tu taller';

  if (!props.ingresos && !props.gastos) {
    return {
      tono: 'neutro',
      icono: Minus,
      titulo: 'Sin movimiento en este periodo',
      mensaje: 'No hay trabajos entregados ni gastos registrados en las fechas elegidas.',
    };
  }
  if (props.utilidad > 0) {
    return {
      tono: 'gana',
      icono: TrendingUp,
      titulo: `${sujeto} ganó`,
      mensaje: `Por cada $100 que cobraste te quedaron $${porCadaCien.value} libres después de pagar todo.`,
    };
  }
  if (props.utilidad < 0) {
    return {
      tono: 'pierde',
      icono: TrendingDown,
      titulo: `${sujeto} perdió`,
      mensaje: porCadaCien.value !== null
        ? `Por cada $100 que cobraste perdiste $${porCadaCien.value}. Revisa tus precios y tus gastos fijos.`
        : 'Tuviste gastos pero ningún trabajo entregado en este periodo.',
    };
  }
  return {
    tono: 'neutro',
    icono: Minus,
    titulo: `${sujeto} quedó en equilibrio`,
    mensaje: 'No ganaste ni perdiste: lo cobrado cubrió justo los costos y los gastos.',
  };
});

const ESTILOS = {
  gana: {
    caja: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
    icono: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    monto: 'text-emerald-700 dark:text-emerald-300',
  },
  pierde: {
    caja: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    icono: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
    monto: 'text-red-700 dark:text-red-300',
  },
  neutro: {
    caja: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
    icono: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    monto: 'text-gray-900 dark:text-white',
  },
};

const estilo = computed(() => ESTILOS[resultado.value.tono]);
</script>

<template>
  <section class="rounded-xl border p-5 sm:p-6" :class="estilo.caja" aria-live="polite">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" :class="estilo.icono">
          <component :is="resultado.icono" class="h-6 w-6" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
            {{ esNegocio ? 'Todos los talleres' : taller }} · {{ periodoLabel }}
          </p>
          <h2 class="mt-0.5 text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">{{ resultado.titulo }}</h2>
          <p
            v-if="resultado.tono !== 'neutro' || utilidad !== 0"
            class="mt-1 text-3xl font-bold tracking-tight sm:text-4xl"
            :class="estilo.monto"
          >
            {{ formatCurrency(Math.abs(utilidad)) }}
          </p>
        </div>
      </div>
      <div class="max-w-md text-sm text-gray-700 md:text-right dark:text-gray-300">
        <p>{{ resultado.mensaje }}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Calculado con las órdenes de trabajo entregadas y los gastos del periodo.</p>
      </div>
    </div>
  </section>
</template>
