<script setup>
import { computed, reactive, ref, watch } from 'vue';
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileSearchCorner,
  Link2,
  Receipt,
  Trash2,
  Wrench,
} from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import FlowStatusBadge from './FlowStatusBadge.vue';
import CitaSearchSelect from './CitaSearchSelect.vue';
import RecepcionSearchSelect from './RecepcionSearchSelect.vue';
import InspeccionSearchSelect from './InspeccionSearchSelect.vue';
import CotizacionSearchSelect from './CotizacionSearchSelect.vue';
import OrdenSearchSelect from './OrdenSearchSelect.vue';

const props = defineProps({
  tipoEntidad: { type: String, required: true },
  entidadId: { type: [Number, String], required: true },
  relaciones: { type: Object, default: () => ({}) },
  puedeAgregar: { type: Object, default: () => ({}) },
  alVincular: { type: Function, required: true },
  alDesvincular: { type: Function, required: true },
});

// `multiple`: el grupo admite más de una entidad a la vez.
// `buscarConItems`: el buscador sigue visible aunque el grupo ya tenga elementos.
// Cita, recepción, inspección y orden son de una sola pieza, así que su buscador
// solo aparece cuando el grupo está vacío; la cotización es el único caso
// donde se pueden seguir agregando documentos.
const CONFIGURACION = [
  { tipo: 'cita', label: 'Cita', icono: CalendarDays, color: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800', selector: CitaSearchSelect, multiple: true, buscarConItems: false },
  { tipo: 'recepcion', label: 'Recepción', icono: ClipboardList, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800', selector: RecepcionSearchSelect, multiple: false, buscarConItems: false },
  { tipo: 'inspeccion', label: 'Inspección', icono: FileSearchCorner, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800', selector: InspeccionSearchSelect, multiple: false, buscarConItems: false },
  { tipo: 'cotizacion', label: 'Cotización', icono: Receipt, color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800', selector: CotizacionSearchSelect, multiple: true, buscarConItems: true },
  { tipo: 'orden', label: 'Orden', icono: Wrench, color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800', selector: OrdenSearchSelect, multiple: false, buscarConItems: false },
];

const grupos = ref([]);
const busquedas = reactive({});
const modalVisible = ref(false);
const procesando = ref(false);
const errorMessage = ref('');
const relacionPendiente = ref(null);
const abierto = reactive({});

watch(
  () => [props.tipoEntidad, props.relaciones, props.puedeAgregar],
  () => {
    grupos.value = CONFIGURACION
      .filter((grupo) => grupo.tipo !== props.tipoEntidad)
      .map((grupo) => ({
        ...grupo,
        items: [...(props.relaciones?.[grupo.tipo] || [])],
        puedeAgregar: props.puedeAgregar?.[grupo.tipo] ?? true,
      }));
    grupos.value.forEach((grupo) => {
      if (abierto[grupo.tipo] === undefined) abierto[grupo.tipo] = true;
    });
  },
  { immediate: true, deep: true }
);

const relacionPendienteLabel = computed(() => {
  const grupo = grupos.value.find((item) => item.tipo === relacionPendiente.value?.tipo);
  return `${grupo?.label || 'relación'} ${relacionPendiente.value?.item?.numero || relacionPendiente.value?.item?.label || ''}`.trim();
});

function urlItem(item) {
  if (item.url) return item.url;
  const paths = {
    cita: `/crud/citas/?id=${encodeURIComponent(item.id)}`,
    recepcion: `/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`,
    inspeccion: `/crud/inspecciones/ver/?id=${encodeURIComponent(item.id)}`,
    cotizacion: `/crud/cotizaciones/ver/?id=${encodeURIComponent(item.id)}`,
    orden: `/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`,
  };
  return paths[item.tipo] || '#';
}

function nombreItem(item) {
  if (item.label) return item.label;
  if (item.tipo === 'cita') return `Cita #${item.id}`;
  return item.numero || `#${item.id}`;
}

function fechaCotizacion(item) {
  if (!item?.created_at) return '';
  const fecha = new Date(item.created_at);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-EC');
}

function totalCotizacion(item) {
  return Number(item?.total || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
}

function toggleGrupo(grupo) {
  abierto[grupo.tipo] = !abierto[grupo.tipo];
}

function normalizarSeleccion(grupo, item) {
  const numero = item.numero
    || item.numero_recepcion
    || item.numero_inspeccion
    || item.numero_cotizacion
    || item.numero_orden
    || `#${item.id}`;
  return {
    ...item,
    tipo: grupo.tipo,
    label: item.label || (grupo.tipo === 'cita' ? `Cita #${item.id}` : numero),
    numero,
    estadoDisplay: item.estadoDisplay || item.estado_display || '',
    url: item.url || urlItem({ ...item, tipo: grupo.tipo }),
    canDelete: item.canDelete !== false,
  };
}

async function vincular(grupo, item) {
  if (!item?.id || procesando.value) return;
  procesando.value = true;
  errorMessage.value = '';
  try {
    await props.alVincular({ tipo: grupo.tipo, id: item.id });
    if (!grupo.items.some((actual) => String(actual.id) === String(item.id))) {
      grupo.items.push(normalizarSeleccion(grupo, item));
    }
    if (!grupo.multiple) {
      grupo.puedeAgregar = false;
    }
    busquedas[grupo.tipo] = '';
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo crear la relación.';
  } finally {
    procesando.value = false;
  }
}

function pedirDesvinculacion(grupo, item) {
  relacionPendiente.value = { tipo: grupo.tipo, item };
  errorMessage.value = '';
  modalVisible.value = true;
}

async function confirmarDesvinculacion() {
  if (!relacionPendiente.value || procesando.value) return;
  procesando.value = true;
  errorMessage.value = '';
  try {
    await props.alDesvincular({
      tipo: relacionPendiente.value.tipo,
      id: relacionPendiente.value.item.id,
    });
    const grupo = grupos.value.find((item) => item.tipo === relacionPendiente.value.tipo);
    if (grupo) {
      grupo.items = grupo.items.filter(
        (item) => String(item.id) !== String(relacionPendiente.value.item.id)
      );
      if (!grupo.items.length) {
        grupo.puedeAgregar = true;
      }
    }
    modalVisible.value = false;
    relacionPendiente.value = null;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo eliminar la relación.';
    modalVisible.value = false;
  } finally {
    procesando.value = false;
  }
}

</script>

<template>
  <section class="relative rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div class="mb-3 flex items-center gap-2">
      <Link2 class="h-4 w-4 text-brand-700 dark:text-brand-300" />
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Relaciones de flujo</h3>
    </div>

    <p v-if="errorMessage" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </p>

    <div :id="`accordion-relaciones-${tipoEntidad}-${entidadId}`" data-accordion="open" class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <section v-for="(grupo, index) in grupos" :key="grupo.tipo">
        <h2 :id="`relacion-heading-${tipoEntidad}-${entidadId}-${grupo.tipo}`">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700/50"
            :class="index < grupos.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''"
            :data-accordion-target="`#relacion-body-${tipoEntidad}-${entidadId}-${grupo.tipo}`"
            :aria-expanded="abierto[grupo.tipo]"
            :aria-controls="`relacion-body-${tipoEntidad}-${entidadId}-${grupo.tipo}`"
            @click="toggleGrupo(grupo)"
          >
            <span class="inline-flex items-center gap-2">
              <component :is="grupo.icono" class="h-4 w-4 shrink-0" />
              {{ grupo.label }}
              <span v-if="grupo.items.length" class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {{ grupo.items.length }}
              </span>
            </span>
            <ChevronDown data-accordion-icon class="h-4 w-4 shrink-0 transition-transform" :class="abierto[grupo.tipo] ? 'rotate-180' : ''" />
          </button>
        </h2>
        <div
          :id="`relacion-body-${tipoEntidad}-${entidadId}-${grupo.tipo}`"
          :class="abierto[grupo.tipo] ? 'block' : 'hidden'"
          :aria-labelledby="`relacion-heading-${tipoEntidad}-${entidadId}-${grupo.tipo}`"
          role="region"
        >
          <div class="space-y-3 border-b border-gray-200 p-3 dark:border-gray-700">
            <div v-if="grupo.items.length" class="space-y-2">
              <div
                v-for="item in grupo.items"
                :key="item.id"
                class="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40"
              >
                <a :href="urlItem({ ...item, tipo: grupo.tipo })"
                  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium hover:brightness-95"
                  :class="grupo.color" >
                  <component :is="grupo.icono" class="h-3.5 w-3.5 shrink-0" />
                  {{ nombreItem(item) }}
                </a>
                <FlowStatusBadge :tipo="grupo.tipo" :estado="item.estado" :estado-display="item.estadoDisplay" />
                <!--template v-if="grupo.tipo === 'cita'">
                  <span v-if="item.fecha" class="text-xs text-gray-500 dark:text-gray-400">{{ item.fecha }} {{ item.hora }}</span>
                </template>
                <template v-else-if="grupo.tipo === 'cotizacion'">
                  <span v-if="fechaCotizacion(item)" class="text-xs text-gray-500 dark:text-gray-400">{{ fechaCotizacion(item) }}</span>
                  <span class="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-200">{{ totalCotizacion(item) }}</span>
                </template-->
                <button
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                  :disabled="procesando || item.canDelete === false"
                  :title="item.deleteReason || `Quitar relación de ${grupo.label.toLowerCase()}`"
                  :aria-label="`Quitar relación de ${grupo.label.toLowerCase()}`"
                  @click="pedirDesvinculacion(grupo, item)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>

            <component
              :is="grupo.selector"
              v-if="grupo.selector && grupo.puedeAgregar && (grupo.buscarConItems || !grupo.items.length)"
              :id="`relacion-${entidadId}-${grupo.tipo}`"
              v-model="busquedas[grupo.tipo]"
              :disabled="procesando"
              :exclude-ids="grupo.items.map((item) => item.id)"
              solo-sin-relacion
              @select="vincular(grupo, $event)"
            />
            <p v-if="!grupo.items.length && !grupo.selector" class="text-sm text-gray-500 dark:text-gray-400">
              No hay una recepción relacionada.
            </p>
          </div>
        </div>
      </section>
    </div>

    <ConfirmModal
      v-model="modalVisible"
      title="Quitar relación"
      :message="`Se quitará el vínculo con ${relacionPendienteLabel}. La entidad permanecerá en el sistema.`"
      entity-name="relación"
      confirm-text="Quitar relación"
      confirming-text="Quitando..."
      :is-deleting="procesando"
      @confirm="confirmarDesvinculacion"
    />
  </section>
</template>