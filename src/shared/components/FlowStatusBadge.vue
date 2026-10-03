<script setup>
import { computed } from 'vue';
import { CalendarClock, CheckCircle2, CircleX, Clock3, LoaderCircle, UserRoundX } from 'lucide-vue-next';

const props = defineProps({
  tipo: { type: String, required: true },
  estado: { type: String, default: '' },
  estadoDisplay: { type: String, default: '' },
});

const config = computed(() => {
  const estado = props.estado || '';
  const label = props.estadoDisplay || estado.replaceAll('_', ' ').toLowerCase();
  if (['ACEPTADA', 'COMPLETADA', 'FINALIZADA', 'ENTREGADO', 'CONVERTIDA'].includes(estado)) {
    return { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', label };
  }
  if (['EN_PROGRESO', 'EN_PROCESO'].includes(estado)) {
    return { icon: LoaderCircle, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', label };
  }
  if (['RECHAZADA', 'NO_ACEPTADA', 'CANCELADA', 'CANCELADO'].includes(estado)) {
    return { icon: CircleX, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', label };
  }
  if (estado === 'NO_ASISTIO') {
    return { icon: UserRoundX, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', label };
  }
  if (estado === 'PROGRAMADA') {
    return { icon: CalendarClock, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', label };
  }
  return { icon: Clock3, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', label: label || 'Pendiente' };
});
</script>

<template>
  <span class="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" :class="config.color">
    <component :is="config.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {{ config.label }}
  </span>
</template>