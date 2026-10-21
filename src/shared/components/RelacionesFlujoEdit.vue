<script setup>
import { computed, markRaw, reactive, ref, watch } from 'vue';
import {
  CalendarDays,
  ClipboardList,
  FileSearchCorner,
  Workflow,
  Receipt,
  Trash2,
  Wrench,
} from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import RelacionesFlujo from './RelacionesFlujo.vue';
import FlowStatusBadge from './FlowStatusBadge.vue';
import CitaSearchSelect from './CitaSearchSelect.vue';
import RecepcionSearchSelect from './RecepcionSearchSelect.vue';
import InspeccionSearchSelect from './InspeccionSearchSelect.vue';
import OrdenSearchSelect from './OrdenSearchSelect.vue';
import { etiquetaCita, referenciaCorta } from '../utils/format';
import { usePermisos } from '../composables/usePermisos';
import { RECURSO_POR_TIPO } from '../config/flujoPasos';

const props = defineProps({
  tipoEntidad: { type: String, required: true },
  entidadId: { type: [Number, String], required: true },
  relaciones: { type: Object, default: () => ({}) },
  puedeAgregar: { type: Object, default: () => ({}) },
  puedeEditar: { type: Object, default: () => ({}) },
  contexto: { type: Object, default: () => ({}) },
  motivoBloqueo: { type: String, default: '' },
  alVincular: { type: Function, required: true },
  alDesvincular: { type: Function, required: true },
  disabled: { type: Boolean, default: false },
});

const CONFIGURACION = [
  { tipo: 'cita', label: 'Cita', icono: markRaw(CalendarDays), selector: markRaw(CitaSearchSelect), multiple: true },
  { tipo: 'recepcion', label: 'Recepción', icono: markRaw(ClipboardList), selector: markRaw(RecepcionSearchSelect) },
  { tipo: 'inspeccion', label: 'Inspección', icono: markRaw(FileSearchCorner), selector: markRaw(InspeccionSearchSelect) },
  { tipo: 'cotizacion', label: 'Cotización', icono: markRaw(Receipt) },
  { tipo: 'orden', label: 'Orden', icono: markRaw(Wrench), selector: markRaw(OrdenSearchSelect) },
];

// Vincular o quitar un vínculo modifica también el documento relacionado: el
// backend exige `modificar` sobre su recurso. Sin ese permiso el grupo se
// muestra solo para consulta (sin buscador ni botón de quitar).
const { puede } = usePermisos();
function editable(grupo) {
  return props.puedeEditar[grupo.tipo] === true && puede(RECURSO_POR_TIPO[grupo.tipo]);
}

const grupos = ref([]);
const busquedas = reactive({});
const modalVisible = ref(false);
const procesando = ref(false);
const errorMessage = ref('');
const relacionPendiente = ref(null);
const vinculoPendiente = ref(null);
const modalVincular = ref(false);

watch(
  () => [props.tipoEntidad, props.relaciones, props.puedeAgregar, props.puedeEditar],
  () => {
    grupos.value = CONFIGURACION
      .filter((grupo) => grupo.tipo !== props.tipoEntidad)
      .map((grupo) => ({
        ...grupo,
        items: [...(props.relaciones?.[grupo.tipo] || [])],
        puedeAgregar: props.puedeAgregar?.[grupo.tipo] === true,
      }));
  },
  { immediate: true, deep: true }
);

const soloConsulta = computed(() => props.disabled || !grupos.value.some(editable));
const gruposEditables = computed(() => soloConsulta.value ? [] : grupos.value.filter(editable));
const pasos = computed(() => grupos.value.filter((grupo) => soloConsulta.value || !editable(grupo)).flatMap((grupo) => grupo.items.map((item) => ({
  key: `${grupo.tipo}-${item.id}`, label: grupo.label, icon: grupo.icono,
  numero: nombreItem(item), estado: item.estadoDisplay || item.estado,
  url: urlItem({ ...item, tipo: grupo.tipo }),
}))));

function esCompatible(tipo, item) {
  const id = (valor) => String(valor?.id || valor || '');
  for (const campo of ['empresa', 'sucursal', 'cliente', 'vehiculo']) {
    const valor = item[campo] || (campo === 'sucursal' ? item.taller : null) || item.recepcion?.[campo];
    if (valor && props.contexto[campo] && id(valor) !== id(props.contexto[campo])) return false;
  }
  if (tipo === 'cita') return !['CANCELADA', 'NO_ASISTIO'].includes(item.estado) && !item.recepcion_generada;
  if (tipo === 'orden') {
    if (!['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO'].includes(item.estado)) return false;
    const recepciones = [...(item.recepciones || []), item.inspeccion?.recepcion].filter(Boolean);
    if (props.contexto.recepcion && recepciones.length
        && !recepciones.some((recepcion) => id(recepcion) === id(props.contexto.recepcion))) return false;
  }
  if (tipo === 'recepcion' && props.tipoEntidad === 'inspeccion' && (item.orden_trabajo || item.estado === 'NO_ACEPTADA')) return false;
  if (tipo === 'recepcion' && props.contexto.recepcion && id(item) !== id(props.contexto.recepcion)) return false;
  if (tipo === 'inspeccion' && props.contexto.recepcion && item.recepcion
      && id(props.contexto.recepcion) !== id(item.recepcion)) return false;
  return true;
}

function pedirVinculacion(grupo, item) {
  if (props.disabled || procesando.value || !editable(grupo) || !item?.id) return;
  vinculoPendiente.value = { grupo, item };
  modalVincular.value = true;
}

async function confirmarVinculacion() {
  const pendiente = vinculoPendiente.value;
  if (!pendiente || procesando.value) return;
  if (await vincular(pendiente.grupo, pendiente.item)) {
    modalVincular.value = false;
    vinculoPendiente.value = null;
  }
}

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
  if (item.tipo === 'cita') return etiquetaCita(item);
  return item.numero || referenciaCorta(item.id);
}

function normalizarSeleccion(grupo, item) {
  const numero = item.numero
    || item.numero_recepcion
    || item.numero_inspeccion
    || item.numero_cotizacion
    || item.numero_orden
    || referenciaCorta(item.id);
  return {
    ...item,
    tipo: grupo.tipo,
    label: item.label || (grupo.tipo === 'cita' ? etiquetaCita(item) : numero),
    numero,
    estadoDisplay: item.estadoDisplay || item.estado_display || '',
    url: item.url || urlItem({ ...item, tipo: grupo.tipo }),
    canDelete: item.canDelete !== false,
  };
}

async function vincular(grupo, item) {
  if (props.disabled || !item?.id || procesando.value) return;
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
    return true;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo crear la relación.';
    modalVincular.value = false;
    return false;
  } finally {
    procesando.value = false;
  }
}

function pedirDesvinculacion(grupo, item) {
  if (props.disabled || procesando.value || !editable(grupo) || item.canDelete === false) return;
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
      <Workflow class="h-4 w-4 text-brand-700 dark:text-brand-300" />
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Relaciones de flujo</h3>
    </div>

    <p v-if="errorMessage" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </p>

    <RelacionesFlujo :pasos="pasos" />
    <p v-if="soloConsulta && !pasos.length" class="text-sm text-brand-500">Sin documentos relacionados.</p>
    <p v-if="motivoBloqueo && tipoEntidad !== 'orden'" class="mt-2 text-xs text-brand-500">{{ motivoBloqueo }}</p>
    <a v-if="tipoEntidad === 'orden' && puede('cotizaciones')" :href="`/crud/ordenes/ver/?id=${encodeURIComponent(entidadId)}`" class="mt-3 inline-block text-sm text-primary-700 underline dark:text-primary-300">Gestionar cotizaciones en la ficha de la OT</a>

    <div v-for="grupo in gruposEditables" :key="grupo.tipo" class="mt-3 space-y-2 border-t border-brand-100 pt-3 dark:border-brand-700">
      <h4 class="text-sm font-medium text-brand-900 dark:text-brand-100">{{ grupo.label }}</h4>
      <div v-for="item in grupo.items" :key="item.id" class="flex flex-wrap items-center gap-2">
        <a :href="urlItem({ ...item, tipo: grupo.tipo })" class="text-sm text-primary-700 underline dark:text-primary-300">{{ nombreItem(item) }}</a>
        <FlowStatusBadge :tipo="grupo.tipo" :estado="item.estado" :estado-display="item.estadoDisplay" />
        <button type="button" class="rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
          :disabled="procesando || item.canDelete === false"
          :title="item.deleteReason || 'Quitar vínculo (conserva el documento)'"
          :aria-label="`Quitar relación de ${grupo.label.toLowerCase()}`"
          @click="pedirDesvinculacion(grupo, item)">
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
      <template v-if="grupo.puedeAgregar">
        <p class="text-xs text-brand-500">
          {{ grupo.tipo === 'orden' ? 'Asociar OT para presupuestar trabajos adicionales. La incorporación se realiza después de aceptar la cotización.' : `Vincular ${grupo.label.toLowerCase()} existente` }}
        </p>
        <component :is="grupo.selector"
          :id="`relacion-${entidadId}-${grupo.tipo}`"
          v-model="busquedas[grupo.tipo]"
          :disabled="procesando"
          :exclude-ids="grupo.items.map((item) => item.id)"
          :solo-sin-relacion="grupo.tipo === 'cita'"
          :es-compatible="(item) => esCompatible(grupo.tipo, item)"
          @select="pedirVinculacion(grupo, $event)" />
      </template>
    </div>

    <ConfirmModal
      v-model="modalVincular"
      title="Vincular documento existente"
      :message="`¿Vincular ${vinculoPendiente ? nombreItem(normalizarSeleccion(vinculoPendiente.grupo, vinculoPendiente.item)) : ''}? Esta acción solo relaciona documentos; no incorpora servicios ni repuestos a una OT.`"
      variant="primary"
      confirm-text="Vincular"
      confirming-text="Vinculando..."
      :is-deleting="procesando"
      @confirm="confirmarVinculacion" />
    <ConfirmModal
      v-model="modalVisible"
      title="Quitar relación"
      :message="`Se quitará el vínculo con ${relacionPendienteLabel}. El registro permanecerá en el sistema.`"
      entity-name="relación"
      confirm-text="Quitar relación"
      confirming-text="Quitando..."
      :is-deleting="procesando"
      @confirm="confirmarDesvinculacion"/>
  </section>
</template>