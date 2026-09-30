<script setup>
import { ArrowDown, ArrowUp, Eye, Flame, Minus, Siren } from 'lucide-vue-next';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EstadoOrdenBadge from '../../ordenes/components/EstadoOrdenBadge.vue';
import { formatCurrency } from '../../../shared/utils/format';

defineProps({
  ordenes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  /** Texto del periodo aplicado (para el mensaje de vacío). */
  periodo: { type: String, default: '' },
});

const COLUMNAS = ['N.º', 'Vehículo', 'Prioridad', 'Estado', 'Responsable', 'En taller desde', 'Subtotal', 'Acciones'];

function prioridadConfig(prioridad) {
  const mapa = {
    BAJA: { label: 'Baja', icon: ArrowDown, color: 'text-gray-500 dark:text-gray-400' },
    MEDIA: { label: 'Media', icon: Minus, color: 'text-blue-600 dark:text-blue-400' },
    ALTA: { label: 'Alta', icon: ArrowUp, color: 'text-amber-600 dark:text-amber-400' },
    URGENTE: { label: 'Urgente', icon: Flame, color: 'text-accent-600 dark:text-accent-400' },
  };
  return mapa[prioridad] || { label: prioridad || '—', icon: Minus, color: 'text-gray-500 dark:text-gray-400' };
}

function horasTranscurridas(horas) {
  if (horas === null || horas === undefined) return '—';
  const total = Number(horas);
  if (total < 24) return `${total.toFixed(1)} h`;
  const dias = Math.floor(total / 24);
  const resto = total - dias * 24;
  return `${dias} d ${Math.round(resto)} h`;
}

function responsable(item) {
  const asesor = item.asesor || '—';
  const mecanico = item.mecanico || '—';
  if (asesor === mecanico) return asesor;
  return `${asesor} / ${mecanico}`;
}
</script>

<template>
  <section class="bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Siren class="w-5 h-5 text-accent-500" aria-hidden="true" />
          Órdenes críticas abiertas
        </h2>
        <p class="mt-0.5 text-xs text-body">
          Trabajos pendientes, en espera o en proceso · prioridad y estado primero
        </p>
      </div>
      <a
        href="/crud/ordenes/"
        class="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-primary-600 hover:underline dark:text-primary-400"
      >
        Ver todas
      </a>
    </div>

    <div class="p-4">
      <EntityTable
        :columns="COLUMNAS"
        :items="ordenes"
        :loading="cargando"
        loading-text="Cargando órdenes..."
        :empty-text="periodo ? `Sin órdenes abiertas en ${periodo}.` : 'No hay órdenes abiertas en el taller.'"
        :empty-colspan="8"
        :wrapper-class="'overflow-hidden'"
      >
        <template #row="{ item }">
          <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
            <td class="p-4 text-sm font-medium whitespace-nowrap text-heading">
              <a
                :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
                class="hover:text-primary-600 dark:hover:text-primary-400"
                :title="`Ver orden ${item.numero_orden}`"
              >
                {{ item.numero_orden }}
              </a>
              <span class="block text-xs text-body">{{ item.cliente }}</span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              <span class="font-semibold text-heading">{{ item.placa }}</span>
              <span class="block text-xs">{{ item.vehiculo }}</span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap">
              <span
                class="inline-flex items-center gap-1 font-medium"
                :class="prioridadConfig(item.prioridad).color"
                :title="`Prioridad: ${prioridadConfig(item.prioridad).label}`"
              >
                <component :is="prioridadConfig(item.prioridad).icon" class="w-3.5 h-3.5 shrink-0" />
                {{ prioridadConfig(item.prioridad).label }}
              </span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <EstadoOrdenBadge :estado="item.estado" :estado-display="item.estado_display" size="sm" />
              <span v-if="item.motivo_espera" class="block mt-1 text-xs text-amber-600 dark:text-amber-400">
                {{ item.motivo_espera }}
              </span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body" :title="responsable(item)">
              {{ responsable(item) }}
            </td>
            <td class="p-4 text-sm whitespace-nowrap tabular-nums text-body">
              {{ horasTranscurridas(item.horas_transcurridas) }}
            </td>
            <td class="p-4 text-sm font-semibold whitespace-nowrap tabular-nums text-heading">
              {{ formatCurrency(item.subtotal_neto) }}
              <span class="block text-xs font-normal text-body">Total {{ formatCurrency(item.total) }}</span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <a
                :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
                class="inline-flex items-center p-1.5 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
                :aria-label="`Ver orden ${item.numero_orden}`"
                title="Ver orden de trabajo"
              >
                <Eye class="w-4 h-4" />
              </a>
            </td>
          </tr>
        </template>
      </EntityTable>
    </div>

    <div class="px-4 pb-4">
      <a
        href="/crud/ordenes/agregar/"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
      >
        <Siren class="w-4 h-4" aria-hidden="true" />
        Abrir una nueva orden de trabajo
      </a>
    </div>
  </section>
</template>
