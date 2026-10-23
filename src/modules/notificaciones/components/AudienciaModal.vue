<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { ref, watch } from 'vue';
import { Loader2, Mail, MessageCircle, Users } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { notificacionesService } from '../services/notificacionesService';

/**
 * Vista previa de los destinatarios de una campaña según su segmento
 * (total + hasta 50 clientes). Solo lectura.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  campana: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue']);

const cargando = ref(false);
const errorMessage = ref('');
const audiencia = ref({ total: 0, muestra: [] });

watch(() => props.modelValue, async (abierto) => {
  if (!abierto || !props.campana?.id) return;
  cargando.value = true;
  errorMessage.value = '';
  audiencia.value = { total: 0, muestra: [] };
  try {
    audiencia.value = await notificacionesService.audienciaCampana(props.campana.id);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo calcular la audiencia.';
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="Users"
        :titulo="`Audiencia de «${campana?.nombre || ''}»`"
        @cerrar="emit('update:modelValue', false)"
      />

      <div class="px-6 py-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" />
        <div v-if="cargando" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 class="w-4 h-4 animate-spin" />
          Calculando destinatarios...
        </div>
        <template v-else-if="!errorMessage">
          <p class="mb-3 text-sm text-gray-700 dark:text-gray-300">
            <span class="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{{ audiencia.total }}</span>
            {{ audiencia.total === 1 ? 'cliente recibiría' : 'clientes recibirían' }} esta campaña.
            <template v-if="audiencia.total > audiencia.muestra.length">Se muestran los primeros {{ audiencia.muestra.length }}.</template>
          </p>
          <p v-if="!audiencia.total" class="text-sm text-gray-500 dark:text-gray-400">
            Ningún cliente cumple el segmento. Recuerda que solo cuentan los clientes marcados con «Acepta mensajes promocionales».
          </p>
          <ul v-else class="max-h-80 overflow-y-auto divide-y divide-gray-200 border border-gray-200 rounded-lg dark:divide-gray-700 dark:border-gray-700">
            <li v-for="cliente in audiencia.muestra" :key="cliente.id" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span class="font-medium text-gray-900 dark:text-white">{{ cliente.nombre }}</span>
              <span class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="cliente.telefono" class="inline-flex items-center gap-1"><MessageCircle class="w-3.5 h-3.5" />{{ cliente.telefono }}</span>
                <span v-if="cliente.email" class="inline-flex items-center gap-1"><Mail class="w-3.5 h-3.5" />{{ cliente.email }}</span>
              </span>
            </li>
          </ul>
        </template>
      </div>

      <div class="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          @click="emit('update:modelValue', false)"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
