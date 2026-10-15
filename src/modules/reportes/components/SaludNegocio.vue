<script setup>
import { computed } from 'vue';
import { HeartPulse, Scale } from 'lucide-vue-next';
import { formatCurrency } from '@/shared/utils/format';

/**
 * Semáforo de salud del negocio con referencias habituales de talleres
 * mecánicos independientes. Son orientativas: ajusta `UMBRALES` si el negocio
 * maneja otras metas.
 */
const props = defineProps({
  ingresos: { type: Number, default: 0 },
  margenBruto: { type: Number, default: 0 },
  gastos: { type: Number, default: 0 },
  utilidad: { type: Number, default: 0 },
});

const UMBRALES = {
  // % de lo cobrado que queda libre al final (utilidad / ingresos).
  gananciaReal: { bien: 15, atencion: 5 },
  // % de lo cobrado que queda tras repuestos y mano de obra (margen bruto / ingresos).
  gananciaTrabajos: { bien: 45, atencion: 30 },
  // % de lo cobrado que se va en gastos fijos (gastos / ingresos); menos es mejor.
  pesoGastos: { bien: 30, atencion: 45 },
};

const NIVELES = {
  bien: { label: 'Bien', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', barra: 'bg-emerald-500' },
  atencion: { label: 'Atención', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', barra: 'bg-amber-500' },
  riesgo: { label: 'En riesgo', badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', barra: 'bg-red-500' },
};

function nivelMayorEsMejor(valor, { bien, atencion }) {
  if (valor >= bien) return 'bien';
  return valor >= atencion ? 'atencion' : 'riesgo';
}

function nivelMenorEsMejor(valor, { bien, atencion }) {
  if (valor <= bien) return 'bien';
  return valor <= atencion ? 'atencion' : 'riesgo';
}

const hayIngresos = computed(() => props.ingresos > 0);

function porcentaje(parte) {
  return Math.round(parte / props.ingresos * 100);
}

const indicadores = computed(() => {
  if (!hayIngresos.value) return [];
  const real = porcentaje(props.utilidad);
  const trabajos = porcentaje(props.margenBruto);
  const gastos = porcentaje(props.gastos);
  return [
    {
      clave: 'real',
      titulo: 'Ganancia real',
      valor: real,
      nivel: nivelMayorEsMejor(real, UMBRALES.gananciaReal),
      texto: real >= 0
        ? `De cada $100 que cobras te quedan $${real} libres.`
        : `De cada $100 que cobras pierdes $${Math.abs(real)}.`,
      referencia: `Un taller sano deja ${UMBRALES.gananciaReal.bien}% o más.`,
    },
    {
      clave: 'trabajos',
      titulo: 'Ganancia en los trabajos',
      valor: trabajos,
      nivel: nivelMayorEsMejor(trabajos, UMBRALES.gananciaTrabajos),
      texto: `De cada $100, te quedan $${trabajos} después de pagar repuestos y mano de obra.`,
      referencia: `Meta: ${UMBRALES.gananciaTrabajos.bien}% o más. Si es baja, revisa tu precio por hora y el recargo a repuestos.`,
    },
    {
      clave: 'gastos',
      titulo: 'Peso de los gastos fijos',
      valor: gastos,
      nivel: nivelMenorEsMejor(gastos, UMBRALES.pesoGastos),
      texto: `Arriendo, sueldos y servicios se llevan $${gastos} de cada $100.`,
      referencia: `Conviene que no pase de ${UMBRALES.pesoGastos.bien}%.`,
    },
  ];
});

/** Ancho de la barra (0–100) proporcional a la meta de cada indicador. */
function anchoBarra(indicador) {
  if (indicador.clave === 'gastos') return Math.min(100, Math.max(0, indicador.valor));
  const meta = indicador.clave === 'real' ? UMBRALES.gananciaReal.bien : UMBRALES.gananciaTrabajos.bien;
  return Math.min(100, Math.max(0, indicador.valor / meta * 100));
}

/**
 * Punto de equilibrio: cuánto hay que facturar para cubrir los gastos fijos
 * con el margen actual de los trabajos (gastos / % de margen bruto).
 */
const equilibrio = computed(() => {
  if (!props.gastos) {
    return { estado: 'sin-gastos' };
  }
  if (!hayIngresos.value || props.margenBruto <= 0) {
    return { estado: 'sin-margen' };
  }
  const necesario = props.gastos / (props.margenBruto / props.ingresos);
  const diferencia = props.ingresos - necesario;
  return {
    estado: diferencia >= 0 ? 'cubierto' : 'falta',
    necesario,
    diferencia: Math.abs(diferencia),
    avance: Math.min(100, Math.round(props.ingresos / necesario * 100)),
  };
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3">
      <HeartPulse class="w-5 h-5 mr-2 text-brand-500" aria-hidden="true" />
      Salud del negocio
    </h3>

    <p v-if="!hayIngresos" class="text-sm text-gray-600 dark:text-gray-300">
      No hay trabajos entregados en este periodo, así que aún no se puede medir la salud del negocio.
    </p>

    <ul v-else class="space-y-4">
      <li v-for="indicador in indicadores" :key="indicador.clave">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ indicador.titulo }}</p>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="NIVELES[indicador.nivel].badge">
            {{ indicador.valor }}% · {{ NIVELES[indicador.nivel].label }}
          </span>
        </div>
        <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div class="h-full rounded-full" :class="NIVELES[indicador.nivel].barra" :style="{ width: `${anchoBarra(indicador)}%` }"></div>
        </div>
        <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{{ indicador.texto }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ indicador.referencia }}</p>
      </li>
    </ul>

    <!-- Punto de equilibrio -->
    <div v-if="hayIngresos" class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      <p class="flex items-center text-sm font-medium text-gray-900 dark:text-white">
        <Scale class="w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        Punto de equilibrio
      </p>

      <template v-if="equilibrio.estado === 'cubierto' || equilibrio.estado === 'falta'">
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Para no perder dinero necesitas facturar <strong class="text-gray-900 dark:text-white">{{ formatCurrency(equilibrio.necesario) }}</strong> en trabajos.
        </p>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            class="h-full rounded-full"
            :class="equilibrio.estado === 'cubierto' ? 'bg-emerald-500' : 'bg-amber-500'"
            :style="{ width: `${equilibrio.avance}%` }"
          ></div>
        </div>
        <p
          class="mt-1.5 text-sm font-medium"
          :class="equilibrio.estado === 'cubierto' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'"
        >
          <template v-if="equilibrio.estado === 'cubierto'">
            Ya lo superaste por {{ formatCurrency(equilibrio.diferencia) }}: todo eso es ganancia.
          </template>
          <template v-else>
            Te faltan {{ formatCurrency(equilibrio.diferencia) }} en trabajos para cubrir tus gastos.
          </template>
        </p>
      </template>

      <p v-else-if="equilibrio.estado === 'sin-margen'" class="mt-1 text-sm text-red-700 dark:text-red-300">
        Con los precios actuales ningún volumen de trabajo cubre los gastos: los trabajos cuestan más de lo que cobras.
      </p>

      <p v-else class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Registra tus gastos fijos en el módulo Gastos para saber cuánto necesitas facturar para no perder.
      </p>
    </div>
  </div>
</template>
