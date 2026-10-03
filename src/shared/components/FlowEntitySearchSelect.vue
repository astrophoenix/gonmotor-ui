<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Plus, Search, X } from 'lucide-vue-next';
import FlowStatusBadge from './FlowStatusBadge.vue';

const props = defineProps({
  tipo: { type: String, required: true },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar...' },
  id: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  soloSinRelacion: { type: Boolean, default: false },
  createUrl: { type: String, default: '' },
  buscar: { type: Function, required: true },
});

const emit = defineEmits(['update:modelValue', 'select', 'clear']);
const query = ref(props.modelValue);
const options = ref([]);
const open = ref(false);
const loading = ref(false);
const error = ref('');
const activeIndex = ref(-1);
let searchTimer;
let requestSequence = 0;

const esCotizacion = computed(() => props.tipo === 'cotizacion');
const createPath = computed(() => props.createUrl || {
  cita: '/crud/citas/?crear=1',
  recepcion: '/crud/recepciones/editar/',
  inspeccion: '/crud/inspecciones/editar/',
  cotizacion: '/crud/cotizaciones/editar/',
  orden: '/crud/ordenes/editar/',
}[props.tipo]);

watch(() => props.modelValue, (value) => {
  if (value !== query.value) query.value = value || '';
});

watch([query, () => props.soloSinRelacion], () => {
  clearTimeout(searchTimer);
  const term = query.value.trim();
  if (!term) {
    options.value = [];
    return;
  }
  open.value = true;
  searchTimer = setTimeout(loadOptions, 220);
});

async function loadOptions() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = '';
  const filters = {};
  if (props.soloSinRelacion && ['cita', 'inspeccion', 'cotizacion'].includes(props.tipo)) {
    filters.sin_recepcion = '1';
  }
  try {
    const response = await props.buscar({ search: query.value.trim(), page: 1, pageSize: 10, filters });
    if (sequence !== requestSequence) return;
    options.value = Array.isArray(response) ? response : (response?.results || []);
    activeIndex.value = -1;
  } catch (cause) {
    if (sequence !== requestSequence) return;
    options.value = [];
    error.value = cause.message || 'No se pudieron cargar resultados.';
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

function onInput(event) {
  query.value = event.target.value;
  emit('update:modelValue', query.value);
  open.value = true;
}

function seleccionar(item) {
  query.value = itemLabel(item);
  emit('update:modelValue', query.value);
  emit('select', item);
  options.value = [];
  open.value = false;
}

function limpiar() {
  query.value = '';
  options.value = [];
  open.value = false;
  emit('update:modelValue', '');
  emit('clear');
}

function abrirCrear() {
  if (!createPath.value) return;
  window.open(createPath.value, '_blank', 'noopener,noreferrer');
}

function itemLabel(item) {
  return itemNumber(item);
}

function itemNumber(item) {
  if (props.tipo === 'cita') return `Cita #${item.id}`;
  return item.numero_recepcion || item.numero_inspeccion || item.numero_cotizacion || item.numero_orden || `#${item.id}`;
}

function itemClient(item) {
  return item.cliente?.nombre || item.cliente_nombre || item.recepcion?.cliente?.nombre || 'Cliente sin nombre';
}

function itemPlate(item) {
  return item.vehiculo?.placa || item.vehiculo_placa || item.recepcion?.vehiculo?.placa || 'Sin placa';
}

function emissionDate(item) {
  if (!item.created_at) return 'Fecha no disponible';
  const date = new Date(item.created_at);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-EC');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false;
    return;
  }
  if (!options.value.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % options.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + options.value.length) % options.value.length;
  } else if (event.key === 'Enter' && options.value[activeIndex.value]) {
    event.preventDefault();
    seleccionar(options.value[activeIndex.value]);
  }
}

function onBlur() {
  window.setTimeout(() => { open.value = false; }, 160);
}

onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  requestSequence += 1;
});
</script>

<template>
  <div class="relative min-w-0">
    <div class="relative">
      <Search class="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
      <input
        :id="id || `flujo-${tipo}`"
        :value="query"
        :disabled="disabled"
        :placeholder="placeholder"
        autocomplete="off"
        class="block w-full rounded-base border border-default-medium bg-neutral-secondary-medium py-2.5 pl-9 pr-24 text-sm text-heading shadow-xs placeholder:text-body focus:border-brand focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
        @input="onInput"
        @focus="open = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <button
        v-if="query && !disabled"
        type="button"
        class="absolute right-[4.5rem] top-2.5 rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Limpiar búsqueda"
        @mousedown.prevent
        @click="limpiar"
      >
        <X class="h-4 w-4" />
      </button>
      <button
        v-if="!disabled"
        type="button"
        class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-gray-700"
        title="Crear en una pestaña nueva"
        @mousedown.prevent
        @click="abrirCrear"
      >
        <Plus class="h-3.5 w-3.5" /> Crear
      </button>
    </div>

    <div
      v-if="open && (loading || error || options.length || query.trim())"
      class="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
    >
      <div v-if="loading" class="px-3 py-3 text-sm text-gray-500">Buscando...</div>
      <div v-else-if="error" class="px-3 py-3 text-sm text-red-600">{{ error }}</div>
      <div v-else-if="!options.length" class="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">Sin coincidencias.</div>
      <button
        v-for="(item, index) in options"
        :key="item.id"
        type="button"
        class="block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
        :class="index === activeIndex ? 'bg-brand-50 dark:bg-gray-700' : ''"
        @mouseenter="activeIndex = index"
        @mousedown.prevent="seleccionar(item)"
      >
        <div class="flex min-w-0 items-start justify-between gap-2">
          <span class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ itemNumber(item) }}</span>
          <FlowStatusBadge :tipo="tipo" :estado="item.estado" :estado-display="item.estado_display" />
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span>{{ itemClient(item) }}</span>
          <template v-if="tipo === 'cotizacion'">
            <span>{{ emissionDate(item) }}</span>
            <span class="font-medium tabular-nums">{{ formatMoney(item.total) }}</span>
          </template>
          <span v-else-if="tipo !== 'cita'">{{ itemPlate(item) }}</span>
          <span v-else>{{ itemPlate(item) }} · {{ item.fecha_cita }} {{ String(item.hora_cita || '').slice(0, 5) }}</span>
        </div>
      </button>
    </div>
  </div>
</template>