<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { sanitizeObservaciones } from '../utils/sanitize';

const props = defineProps({
  modelValue: { type: String, default: '' },
  catalogo: { type: Array, default: () => [] },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: 'Busca y selecciona...' },
  disabled: { type: Boolean, default: false },
  mostrarStock: { type: Boolean, default: false },
  maxLength: { type: Number, default: 255 },
  error: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  mensajeSinResultados: { type: String, default: 'Sin coincidencias. Puedes escribir un ítem libre.' },
});

const emit = defineEmits(['update:modelValue', 'select']);

const abierto = ref(false);
const sel = ref(0);
const rootRef = ref(null);
const estiloDropdown = ref({});

const sugerencias = computed(() => {
  const term = (props.modelValue || '').trim().toLowerCase();
  if (!term) return props.catalogo;
  return props.catalogo.filter((item) =>
    [item.codigo, item.nombre, item.marca].filter(Boolean).join(' ').toLowerCase().includes(term)
  );
});

function formatearItem(item) {
  const codigo = String(item.codigo || '').trim();
  const nombre = item.nombre || '';
  if (codigo && nombre && !nombre.startsWith(codigo)) return `${codigo} - ${nombre}`;
  return nombre || codigo;
}

function selValido() {
  return Math.min(Math.max(0, sel.value || 0), Math.max(sugerencias.value.length - 1, 0));
}

function posicionar() {
  const input = rootRef.value ? rootRef.value.querySelector('input') : null;
  if (!input) return;
  const r = input.getBoundingClientRect();
  const ALTO_MAX = 208;
  const espacioAbajo = window.innerHeight - r.bottom;
  const espacioArriba = r.top;
  const arriba = espacioAbajo < ALTO_MAX && espacioArriba > espacioAbajo;
  estiloDropdown.value = arriba
    ? { position: 'fixed', left: `${r.left}px`, width: `${r.width}px`, top: 'auto', bottom: `${window.innerHeight - r.top + 4}px`, zIndex: 50 }
    : { position: 'fixed', left: `${r.left}px`, width: `${r.width}px`, top: `${r.bottom + 4}px`, bottom: 'auto', zIndex: 50 };
}

function reposicionar() {
  const input = rootRef.value ? rootRef.value.querySelector('input') : null;
  if (!input) return;
  const r = input.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) {
    cerrar();
    return;
  }
  posicionar();
}

function agregarListeners() {
  window.addEventListener('scroll', reposicionar, true);
  window.addEventListener('resize', reposicionar);
}

function quitarListeners() {
  window.removeEventListener('scroll', reposicionar, true);
  window.removeEventListener('resize', reposicionar);
}

function abrir() {
  sel.value = 0;
  posicionar();
  abierto.value = true;
  agregarListeners();
}

function cerrar() {
  if (!abierto.value) return;
  abierto.value = false;
  quitarListeners();
}

function onInput(event) {
  const clean = sanitizeObservaciones(event.target.value).slice(0, props.maxLength);
  if (clean !== event.target.value) {
    event.target.value = clean;
  }
  emit('update:modelValue', clean);
  sel.value = 0;
}

function mover(direccion) {
  if (!abierto.value || !sugerencias.value.length) return;
  sel.value = Math.min(Math.max(0, (sel.value || 0) + direccion), sugerencias.value.length - 1);
}

function elegir() {
  if (!abierto.value || !sugerencias.value.length) return;
  seleccionar(sugerencias.value[selValido()]);
}

function seleccionar(item) {
  if (!item) return;
  emit('select', item);
  cerrar();
}

function onKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    mover(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    mover(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    elegir();
  } else if (event.key === 'Escape') {
    cerrar();
  }
}

function onBlur() {
  setTimeout(() => {
    cerrar();
  }, 120);
}

function handleOutsideClick(event) {
  const root = rootRef.value;
  if (root && !root.contains(event.target)) {
    cerrar();
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  quitarListeners();
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<template>
  <div ref="rootRef" class="relative catalogo-select">
    <input
      :id="inputId"
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxLength"
      :aria-invalid="error"
      :class="[
        'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body',
        error
          ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500'
          : 'bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white',
        { 'opacity-60 cursor-not-allowed': disabled },
      ]"
      @focus="abrir"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
    />
    <p v-if="error && errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMessage }}</p>
    <ul
      v-if="abierto && !disabled && sugerencias.length"
      :style="estiloDropdown"
      class="max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-700 dark:border-gray-600"
    >
      <li v-for="(item, index) in sugerencias" :key="item.id">
        <button
          type="button"
          :class="['block w-full px-4 py-2 text-left text-sm', index === selValido() ? 'bg-gray-100 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600']"
          @mouseover="sel = index"
          @mousedown.prevent="seleccionar(item)"
        >
          <span class="font-medium block">{{ item.codigo ? `${item.codigo} - ${item.nombre}` : item.nombre }}</span>
          <span v-if="mostrarStock && item.stock_actual != null" class="text-xs text-gray-500 dark:text-gray-400">
            stock {{ item.stock_actual }}
          </span>
        </button>
      </li>
    </ul>
    <div
      v-else-if="abierto && !disabled"
      :style="estiloDropdown"
      class="px-4 py-3 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-xl dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600"
    >
      {{ mensajeSinResultados }}
    </div>
  </div>
</template>