<script setup>
import { computed, ref, watch } from 'vue';
import { X, CalendarPlus, ExternalLink, Download, Link2, Check } from 'lucide-vue-next';
import {
  copiarAlPortapapeles,
  fechaLegibleCita,
  googleCalendarUrl,
  resumenCita,
  rangoHorarioCita,
} from '../../../shared/utils/calendarLinks';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cita: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue']);

const copiado = ref(false);
const mensajeError = ref('');
let copiadoTimer = null;

const enlaceIcs = computed(() => (props.cita && props.cita.enlace_ics) || '');
const enlaceGoogle = computed(() => (props.cita ? googleCalendarUrl(props.cita) : ''));
const titulo = computed(() => (props.cita ? resumenCita(props.cita) : ''));

function cerrar() {
  emit('update:modelValue', false);
}

async function copiar() {
  if (!enlaceIcs.value) return;
  mensajeError.value = '';
  try {
    await copiarAlPortapapeles(enlaceIcs.value);
    copiado.value = true;
    clearTimeout(copiadoTimer);
    copiadoTimer = setTimeout(() => { copiado.value = false; }, 2500);
  } catch (error) {
    mensajeError.value = error.message || 'No se pudo copiar el enlace.';
  }
}

watch(
  () => props.modelValue,
  (abierto) => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    if (abierto) {
      copiado.value = false;
      mensajeError.value = '';
    }
  },
);

watch(
  () => props.cita,
  () => {
    copiado.value = false;
    mensajeError.value = '';
  },
);
</script>

<template>
  <div v-if="modelValue && cita" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="fixed inset-0 bg-black/50"></div>
    <div class="relative w-full max-w-lg mx-auto">
      <div class="relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
        <button
          type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-9 h-9 inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
          @click="cerrar"
        >
          <X class="w-5 h-5" />
          <span class="sr-only">Cerrar modal</span>
        </button>

        <div class="flex items-start gap-3 pr-10">
          <CalendarPlus class="w-8 h-8 flex-shrink-0 text-primary-600 dark:text-primary-400" />
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Agregar al calendario</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ titulo }}</p>
          </div>
        </div>

        <dl class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex justify-between gap-3 py-0.5">
            <dt class="text-gray-500 dark:text-gray-400">Fecha</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ fechaLegibleCita(cita) }}</dd>
          </div>
          <div class="flex justify-between gap-3 py-0.5">
            <dt class="text-gray-500 dark:text-gray-400">Hora</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ rangoHorarioCita(cita) }}</dd>
          </div>
          <div class="flex justify-between gap-3 py-0.5">
            <dt class="text-gray-500 dark:text-gray-400">Cliente</dt>
            <dd class="font-medium text-right text-gray-900 dark:text-white">{{ (cita.cliente && cita.cliente.nombre) || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-3 py-0.5">
            <dt class="text-gray-500 dark:text-gray-400">Vehículo</dt>
            <dd class="font-medium text-right text-gray-900 dark:text-white">
              {{ (cita.vehiculo && cita.vehiculo.placa) || '—' }}
              <span v-if="cita.vehiculo" class="block text-xs font-normal text-gray-500 dark:text-gray-400">
                {{ cita.vehiculo.marca }} {{ cita.vehiculo.modelo }}
              </span>
            </dd>
          </div>
          <div class="flex justify-between gap-3 py-0.5">
            <dt class="text-gray-500 dark:text-gray-400">Taller</dt>
            <dd class="font-medium text-right text-gray-900 dark:text-white">{{ cita.taller_nombre || '—' }}</dd>
          </div>
        </dl>

        <ul class="mt-4 space-y-2">
          <li>
            <a
              :href="enlaceGoogle"
              target="_blank"
              rel="noopener noreferrer"
              class="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ExternalLink class="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span class="flex-1">Abrir en Google Calendar</span>
            </a>
          </li>
          <li>
            <a
              v-if="enlaceIcs"
              :href="enlaceIcs"
              target="_blank"
              rel="noopener noreferrer"
              class="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Download class="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span class="flex-1">Descargar archivo .ics</span>
              <span class="text-xs font-normal text-gray-500 dark:text-gray-400">Apple, Outlook</span>
            </a>
          </li>
          <li>
            <button
              type="button"
              :disabled="!enlaceIcs"
              class="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              @click="copiar"
            >
              <Check v-if="copiado" class="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <Link2 v-else class="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span class="flex-1">{{ copiado ? 'Enlace copiado' : 'Copiar enlace para el cliente' }}</span>
            </button>
          </li>
        </ul>

        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          El enlace del cliente permite descargar la cita en su calendario sin iniciar sesión.
          Compártelo por WhatsApp o correo.
        </p>
        <p v-if="mensajeError" class="mt-2 text-xs text-accent-600 dark:text-accent-400">
          {{ mensajeError }}
        </p>
      </div>
    </div>
  </div>
</template>
