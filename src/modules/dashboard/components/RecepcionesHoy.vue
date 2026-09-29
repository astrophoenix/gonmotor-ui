<script setup>
import { computed } from 'vue';
import { CalendarDays, ClipboardList, Eye, Inbox } from 'lucide-vue-next';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EstadoRecepcionBadge from '../../recepciones/components/EstadoRecepcionBadge.vue';

const props = defineProps({
  /** Recepciones a mostrar: las de hoy o, en su defecto, los últimos ingresos. */
  recepciones: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  /** true cuando no hay recepciones registradas hoy. */
  sinRecepcionesHoy: { type: Boolean, default: false },
});

const COLUMNAS = ['Hora', 'N.º', 'Cliente', 'Vehículo', 'Tipo', 'Estado', 'Acciones'];

const mensajeFallback = computed(() => (props.sinRecepcionesHoy
  ? 'Sin recepciones registradas hoy · mostrando los últimos ingresos'
  : 'Ingresos de vehículos del día'));
</script>

<template>
  <section class="bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <CalendarDays class="w-5 h-5 text-brand-500" aria-hidden="true" />
          Recepciones de hoy
        </h2>
        <p class="flex items-center gap-1 mt-0.5 text-xs" :class="sinRecepcionesHoy ? 'text-amber-600 dark:text-amber-400' : 'text-body'">
          <Inbox v-if="sinRecepcionesHoy" class="w-3.5 h-3.5" aria-hidden="true" />
          {{ mensajeFallback }}
        </p>
      </div>
      <a
        href="/crud/recepciones/"
        class="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-primary-600 hover:underline dark:text-primary-400"
      >
        Ver todas
      </a>
    </div>

    <div class="p-4">
      <EntityTable
        :columns="COLUMNAS"
        :items="recepciones"
        :loading="cargando"
        loading-text="Cargando recepciones..."
        empty-text="Todavía no hay ingresos de vehículos registrados."
        :empty-colspan="7"
        :wrapper-class="'overflow-hidden'"
      >
        <template #row="{ item }">
          <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
            <td class="p-4 text-sm whitespace-nowrap text-body">
              {{ item.hora || '—' }}
            </td>
            <td class="p-4 text-sm font-medium whitespace-nowrap text-heading">
              <a
                :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
                class="hover:text-primary-600 dark:hover:text-primary-400"
                :title="`Ver recepción ${item.numero_recepcion}`"
              >
                {{ item.numero_recepcion }}
              </a>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body" :title="item.cliente">
              {{ item.cliente }}
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              <span class="font-semibold text-heading">{{ item.placa }}</span>
              <span class="block text-xs">{{ item.vehiculo }}</span>
            </td>
            <td class="p-4 text-sm whitespace-nowrap text-body">
              {{ item.tipo_recepcion_display || item.tipo_recepcion || '—' }}
            </td>
            <td class="p-4 whitespace-nowrap">
              <EstadoRecepcionBadge
                :estado="item.estado"
                :estado-display="item.estado_display"
                size="sm"
              />
            </td>
            <td class="p-4 whitespace-nowrap">
              <a
                :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
                class="inline-flex items-center p-1.5 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
                :aria-label="`Ver recepción ${item.numero_recepcion}`"
                title="Ver recepción"
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
        href="/crud/recepciones/agregar/"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
      >
        <ClipboardList class="w-4 h-4" aria-hidden="true" />
        Registrar una nueva recepción
      </a>
    </div>
  </section>
</template>
