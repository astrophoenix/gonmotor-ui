<script setup>
import { onMounted, ref } from 'vue';
import { Ban, CalendarPlus, Eye, PencilLine, Send } from 'lucide-vue-next';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { formatDateTime } from '../../../shared/utils/datetime';
import { useProgramadas } from '../composables/useProgramadas';
import { notificacionesService } from '../services/notificacionesService';
import {
  CANALES, ESTADOS_COLA, ESTADOS_NOTIFICACION, TIPOS_NOTIFICACION, canalLabel, tipoNotificacionLabel,
} from '../constants/notificaciones';
import EstadoNotificacionBadge from './EstadoNotificacionBadge.vue';
import NotificacionModal from './NotificacionModal.vue';
import MantenimientoModal from './MantenimientoModal.vue';

/**
 * Cola de avisos al cliente: pendientes, enviados, con error y cancelados.
 * Emite `aviso` ({ type, message }) para que la vista muestre el Alert bajo
 * el encabezado.
 */
const props = defineProps({
  puedeModificar: { type: Boolean, default: false },
});

const emit = defineEmits(['aviso']);

const {
  items, estado, tipo, canal, currentPage, total, nextUrl, previousUrl, isLoading, errorMessage, fetchProgramadas,
} = useProgramadas();

const seleccionada = ref(null);
const showDetalle = ref(false);
const showMantenimiento = ref(false);
const aCancelar = ref(null);
const showCancelar = ref(false);
const procesando = ref(null);

const { marcarAplicado } = useFiltrosReactivos({
  filtros: [estado, tipo, canal],
  firma: () => [estado.value, tipo.value, canal.value],
  aplicar: () => fetchProgramadas(1),
});

function limpiarFiltros() {
  estado.value = '';
  tipo.value = '';
  canal.value = '';
  marcarAplicado();
  fetchProgramadas(1);
}

function abrir(item) {
  seleccionada.value = item;
  showDetalle.value = true;
}

function reemplazar(actualizada) {
  const indice = items.value.findIndex((n) => n.id === actualizada.id);
  if (indice !== -1) items.value.splice(indice, 1, actualizada);
}

function onActualizada(actualizada) {
  showDetalle.value = false;
  reemplazar(actualizada);
  emit('aviso', { type: 'success', message: 'Notificación actualizada correctamente.' });
}

async function onMantenimientoCreado() {
  showMantenimiento.value = false;
  emit('aviso', { type: 'success', message: 'Próximo mantenimiento programado correctamente.' });
  await fetchProgramadas(currentPage.value);
}

async function enviarAhora(item) {
  procesando.value = item.id;
  try {
    const respuesta = await notificacionesService.enviarProgramadaAhora(item.id);
    reemplazar(respuesta.notificacion);
    emit('aviso', { type: 'success', message: respuesta.resultado?.descripcion || 'Notificación enviada.' });
  } catch (error) {
    if (error.data?.notificacion) reemplazar(error.data.notificacion);
    emit('aviso', {
      type: 'error',
      message: error.data?.resultado?.error || error.data?.resultado?.descripcion || error.message || 'No se pudo enviar la notificación.',
    });
  } finally {
    procesando.value = null;
  }
}

function pedirCancelar(item) {
  aCancelar.value = item;
  showCancelar.value = true;
}

async function confirmarCancelar() {
  if (!aCancelar.value) return;
  procesando.value = aCancelar.value.id;
  try {
    reemplazar(await notificacionesService.cancelarProgramada(aCancelar.value.id));
    emit('aviso', { type: 'success', message: 'Notificación cancelada.' });
  } catch (error) {
    emit('aviso', { type: 'error', message: error.message || 'No se pudo cancelar la notificación.' });
  } finally {
    procesando.value = null;
    aCancelar.value = null;
    showCancelar.value = false;
  }
}

const SELECT = 'block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
const BOTON_FILA = 'inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed';

onMounted(() => fetchProgramadas(1));
</script>

<template>
  <div>
    <div class="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full sm:w-44">
            <label for="cola-estado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select id="cola-estado" v-model="estado" :class="SELECT">
              <option value="">Todos</option>
              <option v-for="valor in ESTADOS_COLA" :key="valor" :value="valor">{{ ESTADOS_NOTIFICACION[valor].label }}</option>
            </select>
          </div>
          <div class="w-full sm:w-52">
            <label for="cola-tipo" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select id="cola-tipo" v-model="tipo" :class="SELECT">
              <option value="">Todos</option>
              <option v-for="(config, valor) in TIPOS_NOTIFICACION" :key="valor" :value="valor">{{ config.label }}</option>
            </select>
          </div>
          <div class="w-full sm:w-40">
            <label for="cola-canal" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Canal</label>
            <select id="cola-canal" v-model="canal" :class="SELECT">
              <option value="">Todos</option>
              <option v-for="opcion in CANALES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
            </select>
          </div>
          <FilterActions :loading="isLoading" :show-search="false" @clear="limpiarFiltros" />
        </div>
        <button
          v-if="puedeModificar"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shrink-0"
          @click="showMantenimiento = true"
        >
          <CalendarPlus class="w-4 h-4" />
          Programar mantenimiento
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="mb-3 text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <div class="relative overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <EntityTable
        :columns="['Tipo', 'Cliente / vehículo', 'Canal', 'Envío', 'Estado', 'Acciones']"
        :items="items"
        :loading="isLoading"
        loading-text="Cargando notificaciones..."
        empty-text="No hay notificaciones con estos filtros."
        :wrapper-class="'w-full'"
      >
        <template #row="{ item }">
          <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              <span class="inline-flex items-center gap-1.5">
                <component :is="TIPOS_NOTIFICACION[item.tipo]?.icon" class="w-4 h-4 text-brand-500 dark:text-brand-300" />
                {{ tipoNotificacionLabel(item.tipo, item.tipo_display) }}
              </span>
              <span v-if="item.origen === 'MANUAL'" class="block text-xs text-gray-500 dark:text-gray-400">Manual</span>
            </td>
            <td class="px-4 py-3 text-sm">
              <span class="block font-medium text-gray-900 dark:text-white">{{ item.cliente_nombre || '—' }}</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">
                {{ item.vehiculo_resumen || item.campana_nombre || item.orden_numero || '' }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{{ canalLabel(item.canal) }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              {{ formatDateTime(item.fecha_envio || item.fecha_programada) }}
              <span v-if="item.km_objetivo" class="block text-xs text-gray-500 dark:text-gray-400">
                Objetivo: {{ Number(item.km_objetivo).toLocaleString('es-EC') }} km
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <EstadoNotificacionBadge :estado="item.estado" :estado-display="item.estado_display" />
              <span v-if="item.estado === 'ERROR' || (item.estado === 'PENDIENTE' && item.intentos)" class="block mt-1 max-w-[14rem] truncate text-xs text-red-600 dark:text-red-400" :title="item.ultimo_error">
                {{ item.ultimo_error }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  :class="BOTON_FILA"
                  :title="puedeModificar && item.estado === 'PENDIENTE' ? 'Editar notificación' : 'Ver notificación'"
                  :aria-label="puedeModificar && item.estado === 'PENDIENTE' ? 'Editar notificación' : 'Ver notificación'"
                  @click="abrir(item)"
                >
                  <PencilLine v-if="puedeModificar && item.estado === 'PENDIENTE'" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
                <button
                  v-if="puedeModificar && ['PENDIENTE', 'ERROR'].includes(item.estado)"
                  type="button"
                  :class="BOTON_FILA"
                  :disabled="procesando === item.id"
                  :title="item.estado === 'ERROR' ? 'Reintentar el envío ahora' : 'Enviar ahora'"
                  :aria-label="item.estado === 'ERROR' ? 'Reintentar el envío ahora' : 'Enviar ahora'"
                  @click="enviarAhora(item)"
                >
                  <Send class="w-5 h-5" />
                </button>
                <button
                  v-if="puedeModificar && item.estado === 'PENDIENTE'"
                  type="button"
                  :class="BOTON_FILA"
                  :disabled="procesando === item.id"
                  title="Cancelar notificación"
                  aria-label="Cancelar notificación"
                  @click="pedirCancelar(item)"
                >
                  <Ban class="w-5 h-5" />
                </button>
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
            item-word="notificación"
            item-plural="notificaciones"
            empty-text="No hay notificaciones con estos filtros."
            @page="fetchProgramadas"
          />
        </template>
      </EntityTable>
    </div>

    <NotificacionModal
      v-model="showDetalle"
      :notificacion="seleccionada"
      :solo-lectura="!props.puedeModificar"
      @updated="onActualizada"
    />
    <MantenimientoModal v-model="showMantenimiento" @created="onMantenimientoCreado" />
    <ConfirmModal
      v-model="showCancelar"
      title="Cancelar notificación"
      :message="`¿Cancelar el aviso «${tipoNotificacionLabel(aCancelar?.tipo, aCancelar?.tipo_display)}» para ${aCancelar?.cliente_nombre || 'el cliente'}? No se enviará.`"
      :icon="Ban"
      confirm-text="Sí, cancelar"
      confirming-text="Cancelando..."
      :is-deleting="procesando === aCancelar?.id"
      @confirm="confirmarCancelar"
      @cancel="aCancelar = null"
    />
  </div>
</template>
