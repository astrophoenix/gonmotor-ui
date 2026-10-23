<script setup>
// Vigencia de la cotización: días de validez (editable con un grupo de botones)
// y la fecha en que vence, con los días que quedan mientras espera respuesta.
// La vigencia corre desde el envío al cliente: vence = fecha de envío + días.
// Cada reenvío actualiza la fecha de envío en el backend, así que reinicia el plazo.
import { computed } from 'vue';
import { CalendarClock } from 'lucide-vue-next';

const props = defineProps({
  // Fecha de envío al cliente; vacía mientras la cotización no se ha enviado.
  desde: { type: [String, Date], default: '' },
  editable: { type: Boolean, default: false },
  opciones: { type: Array, default: () => [7, 15, 30, 60] },
  // Solo tiene sentido contar días mientras la cotización espera respuesta.
  mostrarRestante: { type: Boolean, default: true },
});

const dias = defineModel({ type: Number, default: 15 });

const DIA_MS = 24 * 60 * 60 * 1000;

const vence = computed(() => {
  if (!props.desde) return null;
  const base = new Date(props.desde);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + (Number(dias.value) || 0) * DIA_MS);
});

const venceTexto = computed(() => (
  vence.value ? vence.value.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
));

const restantes = computed(() => (vence.value ? Math.ceil((vence.value.getTime() - Date.now()) / DIA_MS) : null));

const restanteBadge = computed(() => {
  const n = restantes.value;
  if (n == null) return null;
  if (n < 0) return { texto: `Venció hace ${-n} día${n === -1 ? '' : 's'}`, clase: 'bg-accent-100 text-accent-700 dark:bg-accent-600/20 dark:text-accent-400' };
  if (n === 0) return { texto: 'Vence hoy', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
  if (n <= 3) return { texto: `Quedan ${n} día${n === 1 ? '' : 's'}`, clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
  return { texto: `Quedan ${n} días`, clase: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' };
});
</script>

<template>
  <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
    <h4 class="flex items-center gap-2 mb-3 text-sm font-semibold tracking-wide uppercase text-brand-700 dark:text-brand-200">
      <CalendarClock class="w-4 h-4" />
      Vigencia
    </h4>
    <div v-if="editable" class="inline-flex w-full rounded-lg shadow-xs" role="radiogroup" aria-label="Días de validez">
      <button
        v-for="(opcion, i) in opciones"
        :key="opcion"
        type="button"
        role="radio"
        :aria-checked="Number(dias) === opcion"
        class="flex-1 px-2 py-2 text-sm font-medium border focus:z-10 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-500/40"
        :class="[
          i === 0 ? 'rounded-s-lg' : '-ms-px',
          i === opciones.length - 1 ? 'rounded-e-lg' : '',
          Number(dias) === opcion
            ? 'z-10 bg-brand-900 border-brand-900 text-white dark:bg-brand-300 dark:border-brand-300 dark:text-brand-900'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600',
        ]"
        @click="dias = opcion"
      >
        {{ opcion }} d
      </button>
    </div>
    <p v-else class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
      {{ dias }} <span class="text-sm font-medium text-gray-500 dark:text-gray-400">días</span>
    </p>
    <p v-if="!vence" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
      El plazo empieza a contar cuando se envía al cliente.
    </p>
    <div v-else class="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm">
      <span class="text-gray-500 dark:text-gray-400">Vence el <span class="font-semibold text-gray-900 dark:text-white">{{ venceTexto }}</span></span>
      <span v-if="mostrarRestante && restanteBadge" class="px-2 py-0.5 text-xs font-medium rounded-sm" :class="restanteBadge.clase">{{ restanteBadge.texto }}</span>
    </div>
  </section>
</template>
