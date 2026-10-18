<script setup>
import { computed, ref } from 'vue';
import { ChevronDown, Wrench, Building2, Clock3, Lock } from 'lucide-vue-next';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import FlowStatusBadge from '../../../shared/components/FlowStatusBadge.vue';
import { formatCurrency } from '../../../shared/utils/format';

const props = defineProps({
  visita: { type: Object, required: true },
  /** La visita más reciente lleva el único acento de la línea de tiempo. */
  reciente: { type: Boolean, default: false },
});

const emit = defineEmits(['foto']);

const abierta = ref(false);

const ETIQUETAS_DOCUMENTO = {
  cita: 'Cita',
  recepcion: 'REC',
  inspeccion: 'INS',
  cotizacion: 'COT',
  orden: 'OT',
};

const documentos = computed(() =>
  Object.entries(props.visita.documentos || {}).flatMap(([tipo, lista]) =>
    lista.map((doc) => ({ ...doc, tipo, etiqueta: tipo === 'cita' ? ETIQUETAS_DOCUMENTO.cita : doc.numero })),
  ),
);

const detalle = computed(() => props.visita.detalle || {});

const tieneDetalle = computed(() => {
  const d = detalle.value;
  return Boolean(
    d.diagnostico || d.codigos_dtc || d.recomendaciones
    || (d.testigos && d.testigos.length) || (d.repuestos && d.repuestos.length) || (d.fotos && d.fotos.length),
  );
});

const diasEnTaller = computed(() => {
  const dias = props.visita.dias_en_taller;
  if (dias == null) return null;
  if (dias <= 0) return 'Mismo día';
  return `${dias} día${dias === 1 ? '' : 's'} en taller`;
});
</script>

<template>
  <article
    class="rounded-xl border bg-white shadow-sm transition-colors dark:bg-gray-800"
    :class="reciente
      ? 'border-brand-300 ring-1 ring-brand-200 dark:border-brand-500 dark:ring-brand-700'
      : 'border-gray-200 dark:border-gray-700'"
  >
    <div class="space-y-3 p-4 sm:p-5">
      <!-- Fila 1: por qué entró, dónde y en qué estado está -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div class="flex min-w-0 basis-full items-center gap-3 sm:basis-auto sm:flex-1">
          <TipoTrabajoBadge :tipo="visita.tipo_trabajo" size="sm" />
          <h4 class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white" :title="visita.motivo">
            {{ visita.motivo || visita.tipo_trabajo_display }}
          </h4>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="visita.taller" class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Building2 class="h-3.5 w-3.5" aria-hidden="true" />
            {{ visita.taller.nombre }}
          </span>
          <FlowStatusBadge
            v-if="visita.estado"
            :tipo="visita.estado.documento"
            :estado="visita.estado.valor"
            :estado-display="visita.estado.display"
          />
        </div>
      </div>

      <!-- Fila 2: qué se hizo y cuánto costó -->
      <div class="flex items-start justify-between gap-4">
        <p v-if="visita.servicios && visita.servicios.length" class="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
          {{ visita.servicios.join(' · ') }}
        </p>
        <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin servicios registrados.</p>
        <span v-if="visita.total != null" class="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
          {{ formatCurrency(visita.total) }}
        </span>
      </div>

      <!-- Fila 3: documentos de la visita, técnico y estadía -->
      <div class="flex flex-wrap items-center gap-2">
        <template v-for="doc in documentos" :key="`${doc.tipo}-${doc.id}`">
          <a
            v-if="doc.accesible"
            :href="doc.url"
            class="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-gray-600 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-brand-800 dark:hover:text-white"
            :title="`${doc.etiqueta} · ${doc.estadoDisplay}`"
          >{{ doc.etiqueta }}</a>
          <span
            v-else
            class="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-200 px-2 py-0.5 font-mono text-xs text-gray-400 dark:border-gray-600 dark:text-gray-500"
            title="Documento de un taller al que no tienes acceso"
          >
            <Lock class="h-3 w-3" aria-hidden="true" />{{ doc.etiqueta }}
          </span>
        </template>
        <span class="ms-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span v-if="visita.tecnico" class="inline-flex items-center gap-1">
            <Wrench class="h-3.5 w-3.5" aria-hidden="true" />{{ visita.tecnico }}
          </span>
          <span v-if="diasEnTaller" class="inline-flex items-center gap-1">
            <Clock3 class="h-3.5 w-3.5" aria-hidden="true" />{{ diasEnTaller }}
          </span>
        </span>
      </div>
    </div>

    <template v-if="tieneDetalle">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2 text-xs font-medium text-brand-700 hover:bg-gray-50 dark:border-gray-700 dark:text-brand-200 dark:hover:bg-gray-700/50"
        :aria-expanded="String(abierta)"
        @click="abierta = !abierta"
      >
        {{ abierta ? 'Ocultar detalle' : 'Ver detalle' }}
        <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': abierta }" aria-hidden="true" />
      </button>

      <div v-if="abierta" class="grid gap-4 border-t border-gray-100 p-4 text-sm sm:grid-cols-2 sm:p-5 dark:border-gray-700">
        <div v-if="detalle.diagnostico" class="sm:col-span-2">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Diagnóstico</h5>
          <p class="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{{ detalle.diagnostico }}</p>
        </div>
        <div v-if="detalle.codigos_dtc">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Códigos DTC</h5>
          <p class="mt-1 font-mono text-gray-700 dark:text-gray-300">{{ detalle.codigos_dtc }}</p>
        </div>
        <div v-if="detalle.testigos && detalle.testigos.length">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Testigos encendidos</h5>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <span
              v-for="testigo in detalle.testigos"
              :key="testigo"
              class="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
            >{{ testigo }}</span>
          </div>
        </div>
        <div v-if="detalle.repuestos && detalle.repuestos.length">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Repuestos</h5>
          <ul class="mt-1 space-y-0.5 text-gray-700 dark:text-gray-300">
            <li v-for="(repuesto, i) in detalle.repuestos" :key="i">
              <span class="tabular-nums text-gray-500 dark:text-gray-400">{{ repuesto.cantidad }} ×</span> {{ repuesto.descripcion }}
            </li>
          </ul>
        </div>
        <div v-if="detalle.recomendaciones">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Recomendaciones</h5>
          <p class="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{{ detalle.recomendaciones }}</p>
        </div>
        <div v-if="detalle.fotos && detalle.fotos.length" class="sm:col-span-2">
          <h5 class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Fotos <span v-if="detalle.total_fotos > detalle.fotos.length">({{ detalle.fotos.length }} de {{ detalle.total_fotos }})</span>
          </h5>
          <div class="mt-2 flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="foto in detalle.fotos"
              :key="foto.id"
              type="button"
              class="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-gray-600 dark:bg-gray-900"
              :title="foto.descripcion || 'Ampliar foto'"
              @click="emit('foto', foto.imagen)"
            >
              <img :src="foto.miniatura" :alt="foto.descripcion || 'Foto de la visita'" class="h-full w-full object-cover" loading="lazy" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </article>
</template>
