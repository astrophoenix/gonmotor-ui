<script setup>
import { ref, watch } from 'vue';
import { Search, UserPlus, IdCard, Phone } from 'lucide-vue-next';
import { request } from '../services/httpClient';

const props = defineProps({
  id: { type: String, default: 'cliente' },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar cliente' },
  error: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  showCreate: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'select', 'clear', 'create']);

const options = ref([]);
const showDropdown = ref(false);
const activeIndex = ref(-1);
const dropdownRef = ref(null);
const inputRef = ref(null);

let searchTimer = null;
let suppressNextSearch = false;

function closeSoon() {
  window.setTimeout(() => { showDropdown.value = false; }, 150);
}

async function searchClientes() {
  const term = (props.modelValue || '').trim();
  if (!term) {
    options.value = [];
    return;
  }
  try {
    const params = new URLSearchParams({ search: term, ordering: 'nombre', page: '1' });
    const data = await request(`/api/clientes/?${params.toString()}`);
    options.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar clientes:', error);
  }
}

watch(() => props.modelValue, (val) => {
  clearTimeout(searchTimer);
  if (suppressNextSearch) {
    suppressNextSearch = false;
    return;
  }
  if (!(val || '').trim()) {
    options.value = [];
    showDropdown.value = false;
    emit('clear');
    return;
  }
  searchTimer = setTimeout(searchClientes, 250);
});

function selectCliente(cliente) {
  options.value = [];
  showDropdown.value = false;
  activeIndex.value = -1;
  suppressNextSearch = true;
  emit('select', cliente);
  emit('update:modelValue', cliente.nombre || '');
}

function onKeydown(event) {
  if (!options.value.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    showDropdown.value = true;
    activeIndex.value = moveActiveIndex(activeIndex.value, options.value.length, 1);
    scrollActiveIntoView(activeIndex.value);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    showDropdown.value = true;
    activeIndex.value = moveActiveIndex(activeIndex.value, options.value.length, -1);
    scrollActiveIntoView(activeIndex.value);
  } else if (event.key === 'Enter') {
    const item = options.value[activeIndex.value];
    if (item) {
      event.preventDefault();
      selectCliente(item);
    }
  } else if (event.key === 'Escape') {
    showDropdown.value = false;
  }
}

function moveActiveIndex(active, length, direction) {
  if (!length) return 0;
  return (active + direction + length) % length;
}

function scrollActiveIntoView(activeIndex) {
  const container = dropdownRef.value;
  if (!container) return;
  const el = container.querySelector(`[data-option-index="${activeIndex}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function focusInput() {
  inputRef.value?.focus();
}

function clearAll() {
  suppressNextSearch = true;
  emit('update:modelValue', '');
  options.value = [];
  showDropdown.value = false;
}

defineExpose({ focusInput, clearAll });
</script>

<template>
  <div class="relative">
    <div class="relative">
      <Search class="absolute w-4 h-4 text-gray-400 left-3 top-3" />
      <input
        :id="id"
        ref="inputRef"
        :value="modelValue"
        :disabled="disabled"
        autocomplete="off"
        :placeholder="placeholder"
        :class="[
          'block w-full p-2.5 pl-9 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
          showCreate ? 'pr-16' : 'pr-3',
          error ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '',
        ]"
        @input="emit('update:modelValue', $event.target.value)"
        @focus="showDropdown = true"
        @blur="closeSoon"
        @keydown="onKeydown"
      />
      <button
        v-if="showCreate"
        type="button"
        title="Crear cliente nuevo"
        aria-label="Crear cliente nuevo"
        class="absolute right-2 top-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-blue-700 rounded-md hover:bg-primary-blue-50 dark:text-primary-blue-400"
        @click="emit('create')"
      >
        <UserPlus class="w-3.5 h-3.5" />
        Crear
      </button>
    </div>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMessage }}</p>
    <div
      v-if="showDropdown && options.length"
      ref="dropdownRef"
      class="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600"
    >
      <button
        v-for="(item, index) in options"
        :key="item.id"
        :data-option-index="index"
        type="button"
        class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
        :class="index === activeIndex ? 'bg-primary-blue-50 dark:bg-gray-600' : ''"
        @mouseenter="activeIndex = index"
        @mousedown.prevent="selectCliente(item)"
      >
        <span class="block font-medium">{{ item.nombre }}</span>
        <span class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span class="inline-flex items-center gap-1">
            <IdCard class="w-3.5 h-3.5" />
            {{ item.identificacion || '--' }}
          </span>
          <span v-if="item.identificacion && item.telefono">-</span>
          <span v-if="item.telefono" class="inline-flex items-center gap-1">
            <Phone class="w-3.5 h-3.5" />
            {{ item.telefono }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>