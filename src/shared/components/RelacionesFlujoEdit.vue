<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  CalendarDays,
  ClipboardList,
  FileSearchCorner,
  Link2,
  Plus,
  Receipt,
  Trash2,
  Wrench,
} from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import FlowStatusBadge from './FlowStatusBadge.vue';
import CitaSearchSelect from './CitaSearchSelect.vue';
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

const CONFIGURACION = [
  { tipo: 'cita', label: 'Cita', icono: CalendarDays, color: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800', selector: CitaSearchSelect, multiple: true },
  { tipo: 'recepcion', label: 'Recepción', icono: ClipboardList, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800', selector: null, multiple: false },
  { tipo: 'inspeccion', label: 'Inspección', icono: FileSearchCorner, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800', selector: InspeccionSearchSelect, multiple: false },
  { tipo: 'cotizacion', label: 'Cotización', icono: Receipt, color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800', selector: CotizacionSearchSelect, multiple: true },
  { tipo: 'orden', label: 'Orden', icono: Wrench, color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800', selector: OrdenSearchSelect, multiple: false },
];

const grupos = ref([]);
const busquedas = reactive({});
const abierto = ref('');
const modalVisible = ref(false);
const procesando = ref(false);
const errorMessage = ref('');
const relacionPendiente = ref(null);
const rootRef = ref(null);

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
  },
  { immediate: true, deep: true }
);

const relacionPendienteLabel = computed(() => {
  const grupo = grupos.value.find((item) => item.tipo === relacionPendiente.value?.tipo);
  return `${grupo?.label || 'relación'} ${relacionPendiente.value?.item?.numero || relacionPendiente.value?.item?.label || ''}`.trim();
});

function clavePopover(grupo) {
  return `relacion-${props.tipoEntidad}-${props.entidadId}-${grupo.tipo}`;
}

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

function togglePopover(grupo) {
  const key = clavePopover(grupo);
  abierto.value = abierto.value === key ? '' : key;
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
    if (!grupo.multiple || (grupo.tipo === 'cotizacion' && ['PENDIENTE', 'ENVIADA', 'ACEPTADA'].includes(item.estado))) {
      grupo.puedeAgregar = false;
    }
    busquedas[grupo.tipo] = '';
    abierto.value = '';
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
      if (!grupo.items.length || (grupo.tipo === 'cotizacion' && !grupo.items.some((item) => ['PENDIENTE', 'ENVIADA', 'ACEPTADA'].includes(item.estado)))) {
        grupo.puedeAgregar = true;
      }
    }
    modalVisible.value = false;
    relacionPendiente.value = null;
    abierto.value = '';
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo eliminar la relación.';
    modalVisible.value = false;
  } finally {
    procesando.value = false;
  }
}

function onClickOutside(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) abierto.value = '';
}

function onKeydown(event) {
  if (event.key === 'Escape') abierto.value = '';
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <section ref="rootRef" class="relative rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div class="mb-3 flex items-center gap-2">
      <Link2 class="h-4 w-4 text-brand-700 dark:text-brand-300" />
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Relaciones de flujo</h3>
    </div>

    <p v-if="errorMessage" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </p>

    <div class="flex flex-col items-start gap-3">
      <div v-for="grupo in grupos" :key="grupo.tipo" class="relative flex min-w-0 flex-wrap items-center gap-2">
        <template v-if="grupo.items.length">
          <div class="hidden items-center gap-1 md:inline-flex">
            <a
              :href="urlItem({ ...grupo.items[0], tipo: grupo.tipo })"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium hover:brightness-95"
              :class="grupo.color"
            >
              <component :is="grupo.icono" class="h-3.5 w-3.5 shrink-0" />
              {{ grupo.label }} · {{ nombreItem(grupo.items[0]) }}
            </a>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
              :disabled="procesando || grupo.items[0].canDelete === false"
              :title="grupo.items[0].deleteReason || `Quitar relación de ${grupo.label.toLowerCase()}`"
              :aria-label="`Quitar relación de ${grupo.label.toLowerCase()}`"
              @click="pedirDesvinculacion(grupo, grupo.items[0])"
            >
              <Trash2 class="h-4 w-4" />
            </button>
            <button
              v-if="grupo.items.length > 1"
              type="button"
              :data-popover-target="clavePopover(grupo)"
              data-popover-trigger="click"
              class="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold"
              :class="grupo.color"
              :aria-expanded="abierto === clavePopover(grupo)"
              @click="togglePopover(grupo)"
            >
              +{{ grupo.items.length - 1 }}
            </button>
          </div>

          <button
            type="button"
            :data-popover-target="clavePopover(grupo)"
            data-popover-trigger="click"
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium md:hidden"
            :class="grupo.color"
            :aria-expanded="abierto === clavePopover(grupo)"
            @click="togglePopover(grupo)"
          >
            <component :is="grupo.icono" class="h-3.5 w-3.5 shrink-0" />
            {{ grupo.label }}<span v-if="grupo.items.length > 1" class="font-semibold">+{{ grupo.items.length - 1 }}</span>
          </button>
        </template>

        <component
          :is="grupo.selector"
          v-if="grupo.selector && grupo.puedeAgregar && !grupo.items.length"
          :id="`relacion-${entidadId}-${grupo.tipo}`"
          v-model="busquedas[grupo.tipo]"
          :disabled="procesando"
          solo-sin-relacion
          @select="vincular(grupo, $event)"
        />

        <div
          v-if="abierto === clavePopover(grupo)"
          :id="clavePopover(grupo)"
          data-popover
          role="dialog"
          class="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          <div class="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            {{ grupo.label }} relacionadas
          </div>
          <ul class="max-h-64 overflow-y-auto p-1">
            <li v-for="item in grupo.items" :key="item.id" class="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <a :href="urlItem({ ...item, tipo: grupo.tipo })" class="min-w-0 flex-1 text-sm text-gray-800 hover:text-brand-700 dark:text-gray-100 dark:hover:text-brand-300">
                <span class="block truncate font-medium">{{ nombreItem(item) }}</span>
                <span v-if="item.estadoDisplay || item.estado" class="mt-1 block">
                  <FlowStatusBadge :tipo="grupo.tipo" :estado="item.estado" :estado-display="item.estadoDisplay" />
                </span>
              </a>
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                :disabled="procesando || item.canDelete === false"
                :title="item.deleteReason || `Quitar relación de ${grupo.label.toLowerCase()}`"
                :aria-label="`Quitar ${nombreItem(item)} de la relación`"
                @click="pedirDesvinculacion(grupo, item)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </li>
          </ul>
          <div data-popper-arrow class="absolute h-2 w-2 rotate-45 border-l border-t border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"></div>
        </div>
      </div>
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