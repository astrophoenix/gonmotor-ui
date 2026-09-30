<script setup>
import { computed, ref } from 'vue';
import { CalendarDays, ClipboardPlus, Eye, Inbox, Loader2 } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EstadoRecepcionBadge from '../../recepciones/components/EstadoRecepcionBadge.vue';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';

const props = defineProps({
  recepciones: { type: Array, default: () => [] },
  citas: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  periodo: { type: String, default: '' },
});

const pestana = ref('recepciones');
const creandoInspeccion = ref(null);
const errorInspeccion = ref('');

const COLUMNAS_RECEPCIONES = ['Hora', 'N.º', 'Vehículo', 'Cliente', 'Estado', 'Combustible', 'Acciones'];
const COLUMNAS_CITAS = ['Hora', 'Fecha', 'Cliente', 'Vehículo', 'Motivo', 'Estado', 'Acciones'];

const ESTADO_CITA_BADGES = {
  PROGRAMADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONFIRMADA: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  EN_PROGRESO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NO_ASISTIO: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const PESTANA_ACTIVA = 'px-3 py-1.5 text-sm font-medium rounded shadow-xs text-white bg-brand-500';
const PESTANA_INACTIVA = 'px-3 py-1.5 text-sm font-medium rounded shadow-xs text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium dark:bg-gray-800';

const vacioTexto = computed(() => {
  if (pestana.value === 'recepciones') {
    return props.periodo
      ? `Sin recepciones en ${props.periodo}.`
      : 'Todavía no hay ingresos de vehículos registrados.';
  }
  return props.periodo ? `Sin citas en ${props.periodo}.` : 'No hay citas agendadas.';
});

async function crearInspeccion(recepcion) {
  if (creandoInspeccion.value || !recepcion?.id) return;
  creandoInspeccion.value = recepcion.id;
  errorInspeccion.value = '';
  try {
    const inspeccion = await inspeccionesService.crearDesdeRecepcion(recepcion.id);
    if (inspeccion?.id) {
      window.location.assign(`/crud/inspecciones/editar/?id=${inspeccion.id}&creada=1`);
      return;
    }
    errorInspeccion.value = 'La inspección no se creó correctamente.';
  } catch (err) {
    errorInspeccion.value = err?.message || 'No se pudo crear la inspección.';
  } finally {
    creandoInspeccion.value = null;
  }
}
</script>

<template>
  <section class="bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Inbox class="w-5 h-5 text-brand-500" aria-hidden="true" />
          Flujo operativo
        </h2>
        <p class="mt-0.5 text-xs text-body">
          Ingresos y citas del periodo · últimas {{ Math.max(recepciones.length, citas.length) || 0 }} filas
        </p>
      </div>

      <div class="inline-flex items-center gap-1 p-1 bg-neutral-secondary-medium rounded-base" role="tablist" aria-label="Flujo operativo">
        <button
          type="button"
          role="tab"
          :aria-selected="pestana === 'recepciones'"
          :class="pestana === 'recepciones' ? PESTANA_ACTIVA : PESTANA_INACTIVA"
          @click="pestana = 'recepciones'"
        >
          Recepciones ({{ recepciones.length }})
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="pestana === 'citas'"
          :class="pestana === 'citas' ? PESTANA_ACTIVA : PESTANA_INACTIVA"
          @click="pestana = 'citas'"
        >
          Citas ({{ citas.length }})
        </button>
      </div>
    </div>

    <div v-if="errorInspeccion" class="px-4 pt-4">
      <Alert type="error" title="No se pudo crear la inspección" :message="errorInspeccion" dismissible @dismiss="errorInspeccion = ''" />
    </div>

    <div class="p-4">
      <EntityTable
        v-if="pestana === 'recepciones'"
        :columns="COLUMNAS_RECEPCIONES"
        :items="recepciones"
        :loading="cargando"
        loading-text="Cargando recepciones..."
        :empty-text="vacioTexto"
        :empty-colspan="7"
        :wrapper-class="'overflow-hidden'"
      >
        <template #row="{ item }">
          <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
            <td class="p-4 text-sm whitespace-nowrap text-body">{{ item.hora || '—' }}</td>
            <td class="p-4 text-sm font-medium whitespace-nowrap text-heading">
              <a
                :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
                class="hover:text-primary-600 dark:hover:text-primary-400"
                :title="`Ver recepción ${item.numero_recepcion}`"
              >
                {{ item.numero_recepcion }}
              </a>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              <span class="font-semibold text-heading">{{ item.placa }}</span>
              <span class="block text-xs">{{ item.vehiculo }}</span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body" :title="item.cliente">{{ item.cliente }}</td>
            <td class="p-4 whitespace-nowrap">
              <EstadoRecepcionBadge :estado="item.estado" :estado-display="item.estado_display" size="sm" />
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              {{ item.nivel_combustible_display || item.nivel_combustible || '—' }}
            </td>
            <td class="p-4 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <a
                  :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
                  class="inline-flex items-center p-1.5 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
                  :aria-label="`Ver recepción ${item.numero_recepcion}`"
                  title="Ver recepción"
                >
                  <Eye class="w-4 h-4" />
                </a>

                <a
                  v-if="item.tiene_inspeccion && item.inspeccion_id"
                  :href="`/crud/inspecciones/ver/?id=${encodeURIComponent(item.inspeccion_id)}`"
                  class="inline-flex items-center p-1.5 text-brand-600 rounded border border-brand-500/40 hover:bg-brand-500/10 dark:text-brand-100"
                  aria-label="Ver inspección"
                  title="Ver inspección"
                >
                  <ClipboardPlus class="w-4 h-4" />
                </a>

                <button
                  v-else-if="item.puede_crear_inspeccion"
                  type="button"
                  :disabled="creandoInspeccion === item.id"
                  class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white rounded bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  :title="`Crear inspección para ${item.numero_recepcion}`"
                  @click="crearInspeccion(item)"
                >
                  <Loader2 v-if="creandoInspeccion === item.id" class="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <ClipboardPlus v-else class="w-3.5 h-3.5" aria-hidden="true" />
                  Crear inspección
                </button>
              </div>
            </td>
          </tr>
        </template>
      </EntityTable>

      <EntityTable
        v-else
        :columns="COLUMNAS_CITAS"
        :items="citas"
        :loading="cargando"
        loading-text="Cargando citas..."
        :empty-text="vacioTexto"
        :empty-colspan="7"
        :wrapper-class="'overflow-hidden'"
      >
        <template #row="{ item }">
          <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
            <td class="p-4 text-sm whitespace-nowrap text-body">{{ item.hora || '—' }}</td>
            <td class="p-4 text-sm whitespace-nowrap text-body">{{ item.fecha_cita || '—' }}</td>
            <td class="p-4 text-sm whitespace-nowrap text-body" :title="item.cliente">{{ item.cliente }}</td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              <span class="font-semibold text-heading">{{ item.placa }}</span>
              <span class="block text-xs">{{ item.vehiculo }}</span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              {{ item.motivo_display || item.motivo || '—' }}
              <span v-if="item.convertida" class="block text-xs text-emerald-600 dark:text-emerald-400">
                Convertida en recepción
              </span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="ESTADO_CITA_BADGES[item.estado] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
              >
                {{ item.estado_display }}
              </span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <a
                  v-if="item.recepcion_id"
                  :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.recepcion_id)}`"
                  class="inline-flex items-center p-1.5 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
                  aria-label="Ver recepción generada"
                  title="Ver recepción generada"
                >
                  <Eye class="w-4 h-4" />
                </a>
                <a
                  href="/crud/citas/"
                  class="inline-flex items-center p-1.5 text-brand-600 rounded border border-brand-500/40 hover:bg-brand-500/10 dark:text-brand-100"
                  aria-label="Ver cita en el calendario"
                  title="Ver en el calendario de citas"
                >
                  <CalendarDays class="w-4 h-4" />
                </a>
              </div>
            </td>
          </tr>
        </template>
      </EntityTable>
    </div>
  </section>
</template>
