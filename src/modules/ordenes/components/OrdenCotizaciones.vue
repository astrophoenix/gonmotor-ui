<script setup>
import { computed, ref, watch } from 'vue';
import { Plus, ReceiptText } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EstadoCotizacionBadge from '../../cotizaciones/components/EstadoCotizacionBadge.vue';
import CotizacionesOrdenModal from '../../cotizaciones/components/CotizacionesOrdenModal.vue';
import { cotizacionesService } from '../../cotizaciones/services/cotizacionesService';
import { idDocumento } from '../../cotizaciones/utils/consolidacion';
import { formatCurrency, referenciaCorta } from '../../../shared/utils/format';

const props = defineProps({ orden: { type: Object, required: true }, puedeIncorporar: Boolean });
const emit = defineEmits(['incorporadas']);
const cotizaciones = ref([]);
const cargando = ref(false);
const error = ref('');
const mostrarSelector = ref(false);
const estadoAdmite = computed(() => ['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO'].includes(props.orden.estado));
const ids = computed(() => (props.orden.cotizaciones_aplicadas || []).map(idDocumento));
const inicialSinAplicacion = computed(() => props.orden.cotizacion_origen && !ids.value.includes(idDocumento(props.orden.cotizacion_origen)));
let version = 0;
async function cargar() {
  const actual = ++version;
  cargando.value = true;
  error.value = '';
  const resultados = await Promise.allSettled(ids.value.map((id) => cotizacionesService.getById(id)));
  if (actual !== version) return;
  cotizaciones.value = resultados.map((resultado, index) => resultado.status === 'fulfilled'
    ? resultado.value : { id: ids.value[index], numero_cotizacion: referenciaCorta(ids.value[index]) });
  if (resultados.some((r) => r.status === 'rejected')) error.value = 'No se pudieron cargar todos los detalles de las cotizaciones aplicadas.';
  cargando.value = false;
}
watch(() => [props.orden.id, ...ids.value].join(','), cargar, { immediate: true });
</script>

<template>
  <section class="space-y-4 rounded-lg border border-brand-200 bg-white p-4 shadow-xs dark:border-brand-700 dark:bg-brand-900 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200"><ReceiptText class="h-4 w-4" />Cotizaciones <span class="text-xs">({{ ids.length }})</span></h3>
      <button v-if="puedeIncorporar" type="button" :disabled="!estadoAdmite" :title="estadoAdmite ? 'Seleccionar cotizaciones aceptadas' : 'El estado de la OT no permite incorporaciones'" class="inline-flex items-center gap-2 rounded bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50" @click="mostrarSelector = true">
        <Plus class="h-4 w-4" />Agregar cotizaciones
      </button>
    </div>
    <p v-if="puedeIncorporar && !estadoAdmite" class="text-sm text-brand-500 dark:text-brand-300">Solo se incorporan cotizaciones cuando la OT está pendiente, en espera o en proceso.</p>
    <template v-if="error"><Alert type="error" :message="error" /><button type="button" class="text-sm font-medium text-brand-700 underline dark:text-brand-200" @click="cargar">Reintentar</button></template>
    <p v-if="inicialSinAplicacion" class="text-sm text-brand-500 dark:text-brand-300">Cotización inicial: <a :href="`/crud/cotizaciones/ver/?id=${encodeURIComponent(idDocumento(orden.cotizacion_origen))}`" class="underline">{{ orden.cotizacion_origen_numero || referenciaCorta(idDocumento(orden.cotizacion_origen)) }}</a>. Sin registro de incorporación de sus detalles.</p>
    <EntityTable :columns="['Cotización', 'Tipo', 'Importe', 'Estado']" :items="cotizaciones" :loading="cargando" empty-text="Esta OT aún no tiene cotizaciones incorporadas.">
      <template #row="{ item }">
        <tr>
          <td class="p-4 text-sm text-brand-900 dark:text-white"><a :href="`/crud/cotizaciones/ver/?id=${encodeURIComponent(item.id)}`" class="font-mono hover:underline">{{ item.numero_cotizacion }}</a></td>
          <td class="p-4 text-sm text-brand-700 dark:text-brand-200"><span class="rounded bg-brand-50 px-2 py-1 text-xs dark:bg-brand-700">{{ item.id === idDocumento(orden.cotizacion_origen) ? 'Inicial' : 'Adicional' }}</span></td>
          <td class="p-4 text-sm text-brand-900 dark:text-white">{{ item.total == null ? '—' : formatCurrency(item.total) }}</td>
          <td class="p-4"><EstadoCotizacionBadge v-if="item.estado" :estado="item.estado" /><span v-else>—</span></td>
        </tr>
      </template>
    </EntityTable>
    <CotizacionesOrdenModal v-model="mostrarSelector" :orden="orden" @completed="emit('incorporadas', $event)" />
  </section>
</template>
