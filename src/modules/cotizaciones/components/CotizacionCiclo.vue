<script setup>
// Ciclo de vida de la cotización: Creada → Enviada → Respuesta del cliente → Orden.
// Muestra en qué paso está y deja a la derecha (slot #accion) el siguiente paso
// que puede dar el usuario. Lo usan CotizacionEdit y CotizacionDetail.
import { computed } from 'vue';
import { Check, CircleSlash, Clock, FilePlus2, Send, UserCheck, Wrench } from 'lucide-vue-next';
import { formatDateTime } from '../../../shared/utils/datetime';

const props = defineProps({
  estado: { type: String, default: 'PENDIENTE' },
  creada: { type: String, default: '' },
  enviada: { type: String, default: '' },
  aceptada: { type: String, default: '' },
  ordenNumero: { type: String, default: '' },
  ordenHref: { type: String, default: '' },
});

const ENVIADA_O_DESPUES = ['ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA'];

const pasos = computed(() => {
  const e = props.estado || 'PENDIENTE';
  const aceptada = ['ACEPTADA', 'CONVERTIDA'].includes(e);
  const tieneOrden = Boolean(props.ordenNumero) || e === 'CONVERTIDA';

  let respuesta = { estado: 'futuro', titulo: 'Respuesta del cliente', detalle: 'Aprueba o rechaza', icon: UserCheck };
  if (aceptada) respuesta = { estado: 'completo', titulo: 'Aceptada', detalle: fecha(props.aceptada), icon: UserCheck };
  else if (e === 'RECHAZADA') respuesta = { estado: 'error', titulo: 'Rechazada', detalle: 'El cliente no aprobó', icon: CircleSlash };
  else if (e === 'VENCIDA') respuesta = { estado: 'aviso', titulo: 'Vencida', detalle: 'Sin respuesta a tiempo', icon: Clock };
  else if (e === 'ENVIADA') respuesta = { estado: 'actual', titulo: 'Esperando respuesta', detalle: 'Aprueba o rechaza', icon: UserCheck };

  return [
    { key: 'creada', estado: 'completo', titulo: 'Creada', detalle: fecha(props.creada) || 'Borrador', icon: FilePlus2 },
    {
      key: 'enviada',
      estado: ENVIADA_O_DESPUES.includes(e) ? 'completo' : 'actual',
      titulo: ENVIADA_O_DESPUES.includes(e) ? 'Enviada' : 'Por enviar',
      detalle: ENVIADA_O_DESPUES.includes(e) ? fecha(props.enviada) || 'Al cliente' : 'Aún en borrador',
      icon: Send,
    },
    { key: 'respuesta', ...respuesta },
    {
      key: 'orden',
      estado: tieneOrden ? 'completo' : aceptada ? 'actual' : 'futuro',
      titulo: 'Orden de trabajo',
      detalle: tieneOrden ? props.ordenNumero || 'Generada' : aceptada ? 'Lista para generar' : 'Tras la aceptación',
      icon: Wrench,
      href: tieneOrden ? props.ordenHref : '',
    },
  ];
});

function fecha(valor) {
  return valor ? formatDateTime(valor) : '';
}

const CIRCULO = {
  completo: 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900',
  actual: 'bg-white text-brand-900 ring-2 ring-brand-900 dark:bg-gray-800 dark:text-brand-200 dark:ring-brand-300',
  error: 'bg-red-600 text-white dark:bg-red-500',
  aviso: 'bg-amber-500 text-white',
  futuro: 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
};

const LINEA = {
  completo: 'bg-brand-900 dark:bg-brand-300',
  actual: 'bg-gray-200 dark:bg-gray-700',
  error: 'bg-gray-200 dark:bg-gray-700',
  aviso: 'bg-gray-200 dark:bg-gray-700',
  futuro: 'bg-gray-200 dark:bg-gray-700',
};
</script>

<template>
  <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <ol class="grid flex-1 grid-cols-2 gap-y-4 sm:grid-cols-4" aria-label="Ciclo de la cotización">
        <li v-for="(paso, index) in pasos" :key="paso.key" class="relative flex items-start gap-3 pe-3">
          <!-- Conector hacia el paso siguiente (solo en pantallas anchas) -->
          <span
            v-if="index < pasos.length - 1"
            class="absolute hidden h-0.5 top-4 start-11 end-1 sm:block"
            :class="LINEA[paso.estado]"
            aria-hidden="true"
          ></span>
          <span
            class="relative z-10 inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full"
            :class="CIRCULO[paso.estado]"
            :aria-current="paso.estado === 'actual' ? 'step' : undefined"
          >
            <Check v-if="paso.estado === 'completo'" class="w-4 h-4" />
            <component :is="paso.icon" v-else class="w-4 h-4" />
          </span>
          <span class="relative z-10 min-w-0 pt-0.5 pe-2 bg-white dark:bg-gray-800">
            <span
              class="block text-sm font-semibold"
              :class="{
                'text-gray-900 dark:text-white': ['completo', 'actual'].includes(paso.estado),
                'text-red-700 dark:text-red-400': paso.estado === 'error',
                'text-amber-700 dark:text-amber-400': paso.estado === 'aviso',
                'text-gray-400 dark:text-gray-500': paso.estado === 'futuro',
              }"
            >{{ paso.titulo }}</span>
            <a
              v-if="paso.href"
              :href="paso.href"
              class="block text-xs font-mono font-semibold truncate text-brand-700 hover:text-accent-500 dark:hover:text-accent-400 dark:text-brand-200"
            >{{ paso.detalle }}</a>
            <span v-else class="block text-xs truncate tabular-nums text-gray-500 dark:text-gray-400">{{ paso.detalle }}</span>
          </span>
        </li>
      </ol>
      <div v-if="$slots.accion" class="flex flex-wrap items-center gap-2 xl:ps-4 xl:border-s xl:border-gray-200 xl:dark:border-gray-700">
        <slot name="accion" />
      </div>
    </div>
  </section>
</template>
