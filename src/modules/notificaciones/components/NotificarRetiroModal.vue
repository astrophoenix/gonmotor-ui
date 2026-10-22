<script setup>
import { computed, ref, watch } from 'vue';
import { BellRing, Loader2, Send, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { formatDateTime } from '../../../shared/utils/datetime';
import { notificacionesService } from '../services/notificacionesService';
import { CANALES } from '../constants/notificaciones';

/**
 * Aviso inmediato al cliente de que su vehículo está listo para retirar.
 *
 * Solo para órdenes COMPLETADO. Si el backend responde 409 (ya se avisó), el
 * modal lo muestra y ofrece reenviar. Emite `enviado` con la respuesta del
 * backend (`{ resultado, notificacion }`) para que el padre muestre su alerta.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Orden tal como llega del listado o del detalle (`id`, `numero_orden`, `cliente`, `vehiculo`). */
  orden: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'enviado']);

const canal = ref('whatsapp');
const enviando = ref(false);
const errorMessage = ref('');
const yaAvisado = ref(null);

const clienteNombre = computed(() => {
  const cliente = props.orden?.cliente;
  return (typeof cliente === 'object' ? cliente?.nombre : '') || props.orden?.cliente_nombre || 'el cliente';
});

const vehiculoTexto = computed(() => {
  const vehiculo = props.orden?.vehiculo;
  if (!vehiculo || typeof vehiculo !== 'object') return 'su vehículo';
  return [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') + (vehiculo.placa ? ` (${vehiculo.placa})` : '');
});

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  canal.value = 'whatsapp';
  errorMessage.value = '';
  yaAvisado.value = null;
});

function cerrar() {
  if (enviando.value) return;
  emit('update:modelValue', false);
}

async function enviar() {
  if (!props.orden?.id) return;
  enviando.value = true;
  errorMessage.value = '';
  try {
    const respuesta = await notificacionesService.notificarRetiro(props.orden.id, {
      canal: canal.value,
      reenviar: Boolean(yaAvisado.value),
    });
    emit('enviado', respuesta);
    emit('update:modelValue', false);
  } catch (error) {
    if (error.status === 409) {
      yaAvisado.value = { fecha: error.data?.fecha_envio };
    } else {
      // Un 400 del envío trae el detalle del proveedor en `resultado`.
      errorMessage.value = error.data?.resultado?.error
        || error.data?.resultado?.descripcion
        || error.message
        || 'No se pudo enviar el aviso.';
    }
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <BellRing class="w-5 h-5" />
          Avisar retiro del vehículo
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="cerrar"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-4 space-y-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="yaAvisado"
          type="info"
          title="El cliente ya fue avisado"
          :message="yaAvisado.fecha ? `Último aviso: ${formatDateTime(yaAvisado.fecha)}. Puedes reenviarlo.` : 'Puedes reenviar el aviso.'"
        />

        <p class="text-sm text-gray-600 dark:text-gray-300">
          Se enviará un mensaje a <span class="font-semibold text-gray-900 dark:text-white">{{ clienteNombre }}</span>
          indicando que {{ vehiculoTexto }} está listo para retirar
          <template v-if="orden?.numero_orden">(orden <span class="font-mono">{{ orden.numero_orden }}</span>)</template>.
        </p>

        <fieldset>
          <legend class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Canal</legend>
          <div class="flex flex-wrap gap-4">
            <label v-for="opcion in CANALES" :key="opcion.value" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="canal" type="radio" name="canal-retiro" :value="opcion.value" class="w-4 h-4 text-brand-700 border-gray-300 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600" />
              {{ opcion.label }}
            </label>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Si el cliente no tiene dato de contacto para este canal, se usa el otro.
          </p>
        </fieldset>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="enviando"
          @click="cerrar"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="enviando"
          class="inline-flex items-center gap-1.5 text-white bg-brand-900 rounded hover:bg-brand-800 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="enviar"
        >
          <Loader2 v-if="enviando" class="w-5 h-5 animate-spin" />
          <Send v-else class="w-5 h-5" />
          {{ enviando ? 'Enviando...' : (yaAvisado ? 'Reenviar aviso' : 'Enviar aviso') }}
        </button>
      </div>
    </div>
  </div>
</template>
