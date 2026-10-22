<script setup>
import { computed, onMounted, ref } from 'vue';
import { Ban, Megaphone, Plus, Send, Trash2, Users } from 'lucide-vue-next';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { formatDateTime } from '../../../shared/utils/datetime';
import { useCampanas } from '../composables/useCampanas';
import { notificacionesService } from '../services/notificacionesService';
import { ESTADOS_NOTIFICACION, canalLabel } from '../constants/notificaciones';
import EstadoNotificacionBadge from './EstadoNotificacionBadge.vue';
import CampanaModal from './CampanaModal.vue';
import AudienciaModal from './AudienciaModal.vue';

/**
 * Campañas masivas: borradores, lanzadas y canceladas. Lanzar exige además
 * administrar la empresa (`puedeLanzar`), igual que en el backend.
 */
const props = defineProps({
  puedeModificar: { type: Boolean, default: false },
  puedeLanzar: { type: Boolean, default: false },
});

const emit = defineEmits(['aviso']);

const {
  items, estado, currentPage, total, nextUrl, previousUrl, isLoading, errorMessage, fetchCampanas,
} = useCampanas();

useFiltrosReactivos({
  filtros: [estado],
  firma: () => [estado.value],
  aplicar: () => fetchCampanas(1),
});

const editando = ref(null);
const showModal = ref(false);
const audienciaDe = ref(null);
const showAudiencia = ref(false);

/** Confirmación genérica: `{ accion: 'lanzar' | 'cancelar' | 'eliminar', campana }`. */
const confirmacion = ref(null);
const showConfirmacion = ref(false);
const procesando = ref(false);

const CONFIRMACIONES = {
  lanzar: {
    title: 'Lanzar campaña',
    icon: Send,
    variant: 'primary',
    confirmText: 'Sí, lanzar',
    confirmingText: 'Lanzando...',
    message: (c) => `Se encolará un mensaje por cada destinatario de «${c.nombre}». Revisa la audiencia antes si no lo hiciste. ¿Continuar?`,
  },
  cancelar: {
    title: 'Cancelar campaña',
    icon: Ban,
    variant: 'danger',
    confirmText: 'Sí, cancelar',
    confirmingText: 'Cancelando...',
    message: (c) => `Los mensajes de «${c.nombre}» que aún no salieron no se enviarán. Los ya enviados no se pueden deshacer.`,
  },
  eliminar: {
    title: 'Eliminar campaña',
    icon: Trash2,
    variant: 'danger',
    confirmText: 'Sí, eliminar',
    confirmingText: 'Eliminando...',
    message: (c) => `¿Eliminar el borrador «${c.nombre}»?`,
  },
};

const configConfirmacion = computed(() => CONFIRMACIONES[confirmacion.value?.accion] || CONFIRMACIONES.eliminar);

function abrirCrear() {
  editando.value = null;
  showModal.value = true;
}

function abrirEditar(campana) {
  editando.value = campana;
  showModal.value = true;
}

function verAudiencia(campana) {
  audienciaDe.value = campana;
  showAudiencia.value = true;
}

function pedir(accion, campana) {
  confirmacion.value = { accion, campana };
  showConfirmacion.value = true;
}

async function onGuardada(mensaje) {
  showModal.value = false;
  emit('aviso', { type: 'success', message: mensaje });
  await fetchCampanas(currentPage.value);
}

async function confirmar() {
  const { accion, campana } = confirmacion.value || {};
  if (!campana) return;
  procesando.value = true;
  try {
    if (accion === 'lanzar') {
      const lanzada = await notificacionesService.lanzarCampana(campana.id);
      emit('aviso', {
        type: 'success',
        message: lanzada.total_destinatarios
          ? `Campaña lanzada: ${lanzada.total_destinatarios} mensaje(s) en cola.`
          : 'Campaña lanzada, pero ningún cliente cumplía el segmento.',
      });
    } else if (accion === 'cancelar') {
      const cancelada = await notificacionesService.cancelarCampana(campana.id);
      emit('aviso', { type: 'success', message: `Campaña cancelada: ${cancelada.canceladas} mensaje(s) no se enviarán.` });
    } else {
      await notificacionesService.eliminarCampana(campana.id);
      emit('aviso', { type: 'success', message: 'Campaña eliminada.' });
    }
    const pagina = accion === 'eliminar' && items.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchCampanas(pagina);
  } catch (error) {
    emit('aviso', { type: 'error', message: error.message || 'No se pudo completar la operación.' });
  } finally {
    procesando.value = false;
    showConfirmacion.value = false;
    confirmacion.value = null;
  }
}

const SELECT = 'block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
const BOTON_FILA = 'inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white';

onMounted(() => fetchCampanas(1));
</script>

<template>
  <div>
    <div class="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
        <div class="w-full sm:w-48">
          <label for="campana-estado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
          <select id="campana-estado" v-model="estado" :class="SELECT">
            <option value="">Todos</option>
            <option v-for="valor in ['BORRADOR', 'LANZADA', 'CANCELADA']" :key="valor" :value="valor">{{ ESTADOS_NOTIFICACION[valor].label }}</option>
          </select>
        </div>
        <button
          v-if="props.puedeModificar"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded bg-brand-900 hover:bg-brand-800 focus:ring-4 focus:ring-brand-medium shrink-0"
          @click="abrirCrear"
        >
          <Plus class="w-4 h-4" />
          Nueva campaña
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="mb-3 text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <div class="relative overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <EntityTable
        :columns="['Campaña', 'Canal', 'Destinatarios', 'Envío', 'Estado', 'Acciones']"
        :items="items"
        :loading="isLoading"
        loading-text="Cargando campañas..."
        :empty-text="props.puedeModificar ? 'Aún no hay campañas. Crea la primera con «Nueva campaña».' : 'Aún no hay campañas.'"
        :wrapper-class="'w-full'"
      >
        <template #row="{ item }">
          <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
            <td class="px-4 py-3 text-sm">
              <span class="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                <Megaphone class="w-4 h-4 text-brand-500 dark:text-brand-300" />
                {{ item.nombre }}
              </span>
              <span class="block max-w-xs truncate text-xs text-gray-500 dark:text-gray-400" :title="item.mensaje">{{ item.mensaje }}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{{ canalLabel(item.canal) }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              <template v-if="item.estado === 'BORRADOR'">—</template>
              <template v-else>
                <span class="font-medium text-gray-900 dark:text-white tabular-nums">{{ item.total_destinatarios }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {{ item.enviadas }} enviados · {{ item.pendientes }} pendientes<template v-if="item.errores"> · {{ item.errores }} con error</template>
                </span>
              </template>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              <template v-if="item.fecha_lanzamiento">Lanzada {{ formatDateTime(item.fecha_lanzamiento) }}</template>
              <template v-else-if="item.fecha_programada">Desde {{ formatDateTime(item.fecha_programada) }}</template>
              <template v-else>Al lanzarla</template>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <EstadoNotificacionBadge :estado="item.estado" :estado-display="item.estado_display" />
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center gap-1">
                <button type="button" :class="BOTON_FILA" title="Ver audiencia" aria-label="Ver audiencia" @click="verAudiencia(item)">
                  <Users class="w-5 h-5" />
                </button>
                <button
                  v-if="props.puedeLanzar && item.estado === 'BORRADOR'"
                  type="button"
                  :class="BOTON_FILA"
                  title="Lanzar campaña"
                  aria-label="Lanzar campaña"
                  @click="pedir('lanzar', item)"
                >
                  <Send class="w-5 h-5" />
                </button>
                <button
                  v-if="props.puedeModificar && item.estado === 'LANZADA' && item.pendientes"
                  type="button"
                  :class="BOTON_FILA"
                  title="Cancelar los mensajes pendientes"
                  aria-label="Cancelar campaña"
                  @click="pedir('cancelar', item)"
                >
                  <Ban class="w-5 h-5" />
                </button>
                <EntityRowActions
                  v-if="props.puedeModificar && item.estado === 'BORRADOR'"
                  entity="campaña"
                  :show-edit="true"
                  :show-delete="true"
                  @edit="abrirEditar(item)"
                  @delete="pedir('eliminar', item)"
                />
              </div>
            </td>
          </tr>
        </template>
        <template #pagination>
          <Pagination
            :total="total"
            :current-page="currentPage"
            :next-url="nextUrl"
            :previous-url="previousUrl"
            :disabled="isLoading"
            item-word="campaña"
            empty-text="Aún no hay campañas."
            @page="fetchCampanas"
          />
        </template>
      </EntityTable>
    </div>

    <CampanaModal
      v-model="showModal"
      :campana="editando"
      @created="onGuardada('Campaña creada en borrador. Revisa la audiencia y lánzala cuando esté lista.')"
      @updated="onGuardada('Campaña actualizada correctamente.')"
    />
    <AudienciaModal v-model="showAudiencia" :campana="audienciaDe" />
    <ConfirmModal
      v-model="showConfirmacion"
      :title="configConfirmacion.title"
      :message="confirmacion ? configConfirmacion.message(confirmacion.campana) : ''"
      :icon="configConfirmacion.icon"
      :variant="configConfirmacion.variant"
      :confirm-text="configConfirmacion.confirmText"
      :confirming-text="configConfirmacion.confirmingText"
      :is-deleting="procesando"
      @confirm="confirmar"
      @cancel="confirmacion = null"
    />
  </div>
</template>
