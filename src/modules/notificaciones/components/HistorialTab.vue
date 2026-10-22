<script setup>
import { onMounted, ref } from 'vue';
import { Mail, MessageCircle, RefreshCw } from 'lucide-vue-next';
import EntityTable from '../../../shared/components/EntityTable.vue';
import { formatDateTime } from '../../../shared/utils/datetime';
import { useNotificaciones } from '../composables/useNotificaciones';
import EstadoNotificacionBadge from './EstadoNotificacionBadge.vue';

/** Historial de envíos (WhatsApp y correo): los últimos 50 de la empresa. */
const { isLoadingRegistros, registros, totalRegistros, fetchRegistros } = useNotificaciones();

const estado = ref('');
const origen = ref('');

function cargar() {
  fetchRegistros({ estado: estado.value, origen: origen.value }).catch(() => {});
}

const SELECT = 'block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';

onMounted(cargar);
</script>

<template>
  <div>
    <div class="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full sm:w-44">
            <label for="hist-estado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select id="hist-estado" v-model="estado" :class="SELECT" @change="cargar">
              <option value="">Todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="SIMULADO">Simulado</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
          <div class="w-full sm:w-48">
            <label for="hist-origen" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Origen</label>
            <select id="hist-origen" v-model="origen" :class="SELECT" @change="cargar">
              <option value="">Todos</option>
              <option value="PROGRAMADO">Automático</option>
              <option value="MANUAL">Manual</option>
              <option value="PRUEBA">Prueba</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-700 rounded-lg hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-gray-700"
          :disabled="isLoadingRegistros"
          @click="cargar"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingRegistros }" />
          Refrescar
        </button>
      </div>
    </div>

    <div class="relative overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <EntityTable
        :columns="['Estado', 'Canal', 'Cliente', 'Destino', 'Vehículo', 'Fecha']"
        :items="registros"
        :loading="isLoadingRegistros"
        loading-text="Cargando historial..."
        empty-text="Aún no hay mensajes enviados."
        :wrapper-class="'w-full'"
      >
        <template #row="{ item }">
          <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40" :title="item.error || item.mensaje">
            <td class="px-4 py-3 whitespace-nowrap">
              <EstadoNotificacionBadge :estado="item.estado" :estado-display="item.estado_display" />
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              <span class="inline-flex items-center gap-1.5">
                <Mail v-if="item.canal === 'correo'" class="w-4 h-4" />
                <MessageCircle v-else class="w-4 h-4" />
                {{ item.canal === 'correo' ? 'Correo' : 'WhatsApp' }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">{{ item.cliente_nombre || '—' }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{{ item.correo || item.celular || '—' }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{{ item.vehiculo_resumen || '—' }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{{ formatDateTime(item.created_at) }}</td>
          </tr>
        </template>
      </EntityTable>
      <p class="px-4 py-3 text-xs text-gray-500 border-t border-gray-200 dark:text-gray-400 dark:border-gray-700">
        Mostrando {{ registros.length }} de {{ totalRegistros }}. En modo de prueba los mensajes no salen: quedan como «Simulado».
      </p>
    </div>
  </div>
</template>
