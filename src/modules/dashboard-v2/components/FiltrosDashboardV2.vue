<script setup>
import { computed } from 'vue';
import { Building2, CalendarRange, Clock, RefreshCw } from 'lucide-vue-next';
import { RANGOS } from '../composables/useDashboardV2';

const props = defineProps({
  rango: { type: String, default: 'mes' },
  fechaDesde: { type: String, default: '' },
  fechaHasta: { type: String, default: '' },
  sucursal: { type: [Number, String], default: null },
  sucursales: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  cargandoSucursales: { type: Boolean, default: false },
  errorSucursales: { type: String, default: '' },
  actualizadoEn: { type: Date, default: null },
  etiquetaPeriodo: { type: String, default: '' },
  nombreSucursal: { type: String, default: '' },
});

const emit = defineEmits(['cambiar-rango', 'cambiar-fechas', 'cambiar-sucursal', 'refrescar']);

const SEGMENTO = 'px-3 py-1.5 text-sm font-medium rounded shadow-xs focus:ring-4 focus:ring-brand-500/20 whitespace-nowrap';
const SEGMENTO_ACTIVO = `${SEGMENTO} text-white bg-brand-500`;
const SEGMENTO_INACTIVO = `${SEGMENTO} text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium dark:bg-gray-800 dark:hover:bg-gray-700`;

const fechasInvalidas = computed(() => Boolean(
  props.fechaDesde && props.fechaHasta && props.fechaDesde > props.fechaHasta
));

const horaActualizacion = computed(() => {
  if (!props.actualizadoEn) return '';
  return props.actualizadoEn.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
});

function alCambiarFecha(campo, evento) {
  const valor = evento.target.value;
  emit('cambiar-fechas', campo === 'desde' ? valor : props.fechaDesde,
    campo === 'hasta' ? valor : props.fechaHasta);
}
</script>

<template>
  <section class="p-4 mb-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex flex-col gap-3 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 text-sm font-medium text-heading">
            <CalendarRange class="w-4 h-4 text-brand-500" aria-hidden="true" />
            Periodo
          </span>

          <div
            class="inline-flex flex-wrap items-center gap-1 p-1 bg-neutral-secondary-medium rounded-base"
            role="group"
            aria-label="Rango de fechas del tablero"
          >
            <button
              v-for="opcion in RANGOS"
              :key="opcion.clave"
              type="button"
              :class="rango === opcion.clave ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO"
              :aria-pressed="rango === opcion.clave"
              @click="emit('cambiar-rango', opcion.clave)"
            >
              {{ opcion.etiqueta }}
            </button>
          </div>
        </div>

        <div v-if="rango === 'personalizado'" class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-body">
            Desde
            <input
              type="date"
              :value="fechaDesde"
              :max="fechaHasta || undefined"
              class="text-sm bg-white border rounded shadow-xs text-heading border-default-medium focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
              @change="alCambiarFecha('desde', $event)"
            />
          </label>
          <label class="flex items-center gap-2 text-sm text-body">
            Hasta
            <input
              type="date"
              :value="fechaHasta"
              :min="fechaDesde || undefined"
              class="text-sm bg-white border rounded shadow-xs text-heading border-default-medium focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
              @change="alCambiarFecha('hasta', $event)"
            />
          </label>
          <p v-if="fechasInvalidas" class="text-xs text-accent-600 dark:text-accent-400" role="alert">
            La fecha inicial no puede ser posterior a la final.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-body">
          <Building2 class="w-4 h-4 text-brand-500" aria-hidden="true" />
          <span class="sr-only">Sucursal</span>
          <select
            :value="sucursal ?? ''"
            :disabled="cargandoSucursales"
            class="text-sm bg-white border rounded shadow-xs text-heading border-default-medium focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600"
            @change="emit('cambiar-sucursal', $event.target.value || null)"
          >
            <option value="">Toda la empresa</option>
            <option v-for="taller in sucursales" :key="taller.id" :value="taller.id">
              {{ taller.nombre }}
            </option>
          </select>
        </label>

        <span v-if="errorSucursales" class="text-xs text-accent-600 dark:text-accent-400">
          {{ errorSucursales }}
        </span>

        <div class="flex items-center gap-3 ml-auto">
          <span v-if="horaActualizacion" class="inline-flex items-center gap-1.5 text-xs text-body">
            <Clock class="w-3.5 h-3.5" aria-hidden="true" />
            Actualizado {{ horaActualizacion }}
          </span>

          <button
            type="button"
            :disabled="cargando"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-xs text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800"
            @click="emit('refrescar')"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': cargando }" aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </div>
    </div>

    <p v-if="etiquetaPeriodo" class="mt-3 text-xs text-body" role="status">
      <span class="font-medium text-heading">{{ nombreSucursal }}</span>
      · {{ etiquetaPeriodo }}
    </p>
  </section>
</template>
