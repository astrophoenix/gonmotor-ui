<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, ref, watch } from 'vue';
import { Loader2, ReceiptText, Send } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { CANALES } from '../../notificaciones/constants/notificaciones';
import { pagosService } from '../services/pagosService';

/**
 * Envía al cliente la confirmación de un pago o devolución (mensaje de texto
 * con el monto, la forma de pago y el saldo; sin adjunto). Emite `enviado`
 * con la respuesta del backend (`{ resultado, notificacion }`).
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Movimiento de `pagosService` (`id`, `tipo`, `tipo_display`, `monto`). */
  movimiento: { type: Object, default: null },
  clienteNombre: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'enviado']);

const canal = ref('whatsapp');
const enviando = ref(false);
const errorMessage = ref('');

const montoTexto = computed(() => Number(props.movimiento?.monto || 0)
  .toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  canal.value = 'whatsapp';
  errorMessage.value = '';
});

function cerrar() {
  if (enviando.value) return;
  emit('update:modelValue', false);
}

async function enviar() {
  if (!props.movimiento?.id) return;
  enviando.value = true;
  errorMessage.value = '';
  try {
    const respuesta = await pagosService.enviarRecibo(props.movimiento.id, { canal: canal.value });
    emit('enviado', respuesta);
    emit('update:modelValue', false);
  } catch (error) {
    errorMessage.value = error.data?.resultado?.error
      || error.data?.resultado?.descripcion
      || error.message
      || 'No se pudo enviar la confirmación.';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="ReceiptText"
        :titulo="'Enviar comprobante al cliente'"
        @cerrar="cerrar"
      />

      <div class="px-6 py-4 space-y-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <p class="text-sm text-gray-600 dark:text-gray-300">
          Se enviará a <span class="font-semibold text-gray-900 dark:text-white">{{ clienteNombre || 'el cliente' }}</span>
          la confirmación de la {{ movimiento?.tipo === 'DEVOLUCION' ? 'devolución' : 'recepción del pago' }} de
          <span class="font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ montoTexto }}</span>,
          con la forma de pago y el saldo de la orden.
        </p>

        <fieldset>
          <legend class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Canal</legend>
          <div class="flex flex-wrap gap-4">
            <label v-for="opcion in CANALES" :key="opcion.value" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="canal" type="radio" name="canal-recibo" :value="opcion.value" class="w-4 h-4 text-brand-700 border-gray-300 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600" />
              {{ opcion.label }}
            </label>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Si el cliente no tiene dato de contacto para este canal, se usa el otro. El PDF del recibo se descarga aparte.
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
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="enviar"
        >
          <Loader2 v-if="enviando" class="w-5 h-5 animate-spin" />
          <Send v-else class="w-5 h-5" />
          {{ enviando ? 'Enviando...' : 'Enviar' }}
        </button>
      </div>
    </div>
  </div>
</template>
