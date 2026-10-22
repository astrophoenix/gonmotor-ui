<script setup>
import { onMounted, ref } from 'vue';
import { BellRing } from 'lucide-vue-next';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { formatDateTime } from '../../../shared/utils/datetime';
import { notificacionesService } from '../services/notificacionesService';
import { canalLabel, tipoNotificacionLabel } from '../constants/notificaciones';
import EstadoNotificacionBadge from './EstadoNotificacionBadge.vue';

/**
 * Avisos al cliente ligados a una cita (recordatorios 24 h / 2 h y avisos
 * manuales). Solo lectura; no se muestra sin permiso de ver notificaciones.
 */
const props = defineProps({
  citaId: { type: [String, Number], required: true },
});

const { puede } = usePermisos();

const avisos = ref([]);
const cargado = ref(false);

onMounted(async () => {
  if (!puede('notificaciones', 'ver')) return;
  try {
    const data = await notificacionesService.listarProgramadas({ filtros: { cita: props.citaId } });
    avisos.value = data.results || [];
  } catch {
    avisos.value = [];
  } finally {
    cargado.value = true;
  }
});
</script>

<template>
  <section
    v-if="cargado"
    class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700"
  >
    <h4 class="flex items-center gap-2 mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
      <BellRing class="w-4 h-4" />
      Avisos al cliente
    </h4>
    <p v-if="!avisos.length" class="text-sm text-gray-500 dark:text-gray-400">
      Sin avisos programados. Los recordatorios de 24 h y 2 h se crean solos para las citas programadas o confirmadas.
    </p>
    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
      <li v-for="aviso in avisos" :key="aviso.id" class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span class="text-gray-900 dark:text-white">
          {{ tipoNotificacionLabel(aviso.tipo, aviso.tipo_display) }}
          <span class="text-gray-500 dark:text-gray-400">· {{ canalLabel(aviso.canal) }} · {{ formatDateTime(aviso.fecha_envio || aviso.fecha_programada) }}</span>
        </span>
        <EstadoNotificacionBadge :estado="aviso.estado" :estado-display="aviso.estado_display" size="sm" />
      </li>
    </ul>
  </section>
</template>
