<script setup>
import { computed, ref, watch } from 'vue';
import { AlertCircle, Loader2, MessageCircleCheck, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { notificacionesService } from '../services/notificacionesService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  vehicle: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'sent', 'done']);

const isSending = ref(false);
const result = ref(null); // { ok, descripcion, error, wa_link, omitido }
const errorMessage = ref('');

const vehicleLabel = computed(() => {
  const v = props.vehicle;
  if (!v) return '';
  const placa = v.placa || '';
  const modelo = [v.marca, v.modelo].filter(Boolean).join(' ');
  return [placa, modelo].filter(Boolean).join(' · ');
});

function close() {
  result.value = null;
  errorMessage.value = '';
  emit('update:modelValue', false);
  emit('done');
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      result.value = null;
      errorMessage.value = '';
    }
  },
);

async function enviar() {
  if (!props.vehicle?.id || isSending.value) return;
  isSending.value = true;
  result.value = null;
  errorMessage.value = '';
  try {
    const data = await notificacionesService.enviarRecordatorio(props.vehicle.id);
    result.value = data;
    emit('sent', data);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo enviar el recordatorio.';
    result.value = { ok: false, descripcion: errorMessage.value, error: true };
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90" @click.self="close"></div>
    <div class="relative w-full max-w-lg p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
      <div class="flex items-start justify-between mb-4">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <MessageCircleCheck class="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Enviar recordatorio de mantenimiento
        </h3>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="close">
          <X class="w-5 h-5" />
        </button>
      </div>

      <Alert v-if="errorMessage" type="error" title="No se pudo enviar" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <Alert
        v-else-if="result"
        :type="result.ok ? (result.omitido ? 'info' : 'success') : 'error'"
        :title="result.ok ? (result.omitido ? 'Recordatorio omitido' : 'Recordatorio procesado') : 'Error'"
        :message="result.ok ? result.descripcion : (result.descripcion || errorMessage)"
        dismissible
        @dismiss="result = null"
      />

      <template v-if="!result">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Se enviará un mensaje de WhatsApp al propietario actual del vehículo
          <strong class="text-gray-900 dark:text-white">{{ vehicleLabel || 'seleccionado' }}</strong>
          recordándole el mantenimiento preventivo.
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          En modo <code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">mock</code> el mensaje se
          simula sin costo y no sale por WhatsApp.
        </p>
        <div class="flex justify-end mt-6 space-x-3">
          <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600" @click="close">
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isSending"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-wait"
            @click="enviar"
          >
            <Loader2 v-if="isSending" class="w-4 h-4 mr-2 animate-spin" />
            <AlertCircle v-else class="w-4 h-4 mr-2" />
            Enviar recordatorio
          </button>
        </div>
      </template>

      <div v-else class="flex flex-wrap justify-end gap-3 mt-6">
        <a
          v-if="result.wa_link"
          :href="result.wa_link"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700"
        >
          Abrir en WhatsApp
        </a>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700"
          @click="enviar"
        >
          Reintentar
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          @click="close"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>