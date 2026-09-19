<script setup>
import { ref, watch } from 'vue';
import { CarIcon, Search, UserPlus } from 'lucide-vue-next';
import { request } from '../services/httpClient';

const props = defineProps({
  id: { type: String, default: 'vehiculo' },
  modelValue: { type: String, default: '' },
  clienteId: { type: [String, Number], default: null },
  placeholder: { type: String, default: 'Buscar vehículo por placa' },
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
let changedByUser = false;

function focusInput() {
  inputRef.value?.focus();
}

function clearAll() {
  emit('update:modelValue', '');
  options.value = [];
  showDropdown.value = false;
}

function onTyping(event) {
  changedByUser = true;
  emit('update:modelValue', event.target.value);
}

function closeSoon() {
  window.setTimeout(() => {
    showDropdown.value = false;
  }, 150);
}

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/[-\s]/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

async function searchVehiculos() {
  const term = (props.modelValue || '').trim();
  if (!term && !props.clienteId) {
    options.value = [];
    return;
  }
  try {
    const params = new URLSearchParams({ ordering: 'placa', page: '1' });
    const searchTerm = term.replace(/[\s-]/g, '');
    if (searchTerm) params.set('search', searchTerm);
    if (props.clienteId) params.set('cliente', props.clienteId);
    const data = await request(`/api/vehiculos/?${params.toString()}`);
    options.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar vehículos:', error);
  }
}

function onFocus() {
  showDropdown.value = true;
  clearTimeout(searchTimer);
  searchVehiculos();
}

watch(
  () => props.clienteId,
  (val) => {
    if (!val) {
      options.value = [];
      showDropdown.value = false;
      activeIndex.value = -1;
      return;
    }
    clearTimeout(searchTimer);
    searchVehiculos().then(() => {
      if (!(props.modelValue || '').trim() && options.value.length === 1) {
        selectVehiculo(options.value[0]);
      }
    });
  }
);

watch(
  () => props.modelValue,
  (val) => {
    clearTimeout(searchTimer);
    if (!(val || '').trim()) {
      options.value = [];
      showDropdown.value = false;
      changedByUser = false;
      emit('clear');
      return;
    }
    if (!changedByUser) return;
    changedByUser = false;
    searchTimer = setTimeout(searchVehiculos, 250);
    showDropdown.value = true;
  }
);

function selectVehiculo(vehiculo) {
  options.value = [];
  showDropdown.value = false;
  activeIndex.value = -1;
  emit('select', vehiculo);
  emit('update:modelValue', formatPlaca(vehiculo.placa));
}

function moveActiveIndex(active, length, direction) {
  if (!length) return 0;
  return (active + direction + length) % length;
}

function scrollActiveIntoView(activeIndexValue) {
  const container = dropdownRef.value;
  if (!container) return;
  const el = container.querySelector(`[data-option-index="${activeIndexValue}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
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
      selectVehiculo(item);
    }
  } else if (event.key === 'Escape') {
    showDropdown.value = false;
  }
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
        @input="onTyping"
        @focus="onFocus"
        @blur="closeSoon"
        @keydown="onKeydown"
      />
      <button
        v-if="showCreate"
        type="button"
        title="Crear vehículo nuevo"
        aria-label="Crear vehículo nuevo"
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
        @mousedown.prevent="selectVehiculo(item)"
      >
        <span class="block font-medium">{{ formatPlaca(item.placa) }}</span>
        <span class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span class="inline-flex items-center gap-1">
            <svg
              viewBox="0 0 374.104 374.104"
              class="w-3.5 h-3.5 shrink-0"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M310.384,114.877h14.884c13.926,0,25.255-11.329,25.255-25.255V25.255C350.523,11.329,339.194,0,325.268,0h-14.884
                c-13.927,0-25.257,11.329-25.257,25.255v23.184h-62.852c-4.015-15.704-18.282-27.35-35.22-27.35
                c-16.939,0-31.207,11.646-35.222,27.35H88.977V25.255C88.977,11.329,77.648,0,63.724,0H48.839C34.912,0,23.581,11.329,23.581,25.255
                v64.367c0,13.926,11.331,25.255,25.259,25.255h14.884c13.924,0,25.253-11.329,25.253-25.255V66.438h62.856
                c3.279,12.825,13.396,22.941,26.222,26.22v168.006c-11.573,3.794-19.958,14.692-19.958,27.518v19.482h-69.12v-23.184
                c0-13.926-11.329-25.255-25.253-25.255H48.839c-13.928,0-25.259,11.329-25.259,25.255v64.367c0,13.926,11.331,25.255,25.259,25.255
                h14.884c13.924,0,25.253-11.329,25.253-25.255v-23.184h69.12v19.483c0,15.966,12.991,28.955,28.958,28.955
                c15.965,0,28.954-12.989,28.954-28.955v-19.483h69.118v23.184c0,13.926,11.33,25.255,25.257,25.255h14.884
                c13.926,0,25.255-11.329,25.255-25.255v-64.367c0-13.926-11.329-25.255-25.255-25.255h-14.884
                c-13.927,0-25.257,11.329-25.257,25.255v23.184h-69.118v-19.482c0-12.824-8.383-23.721-19.954-27.516V92.659
                c12.825-3.279,22.941-13.396,26.22-26.22h62.852v23.184C285.127,103.548,296.457,114.877,310.384,114.877z M70.977,89.622
                c0,4-3.253,7.255-7.253,7.255H48.839c-4.002,0-7.259-3.255-7.259-7.255V25.255c0-4,3.256-7.255,7.259-7.255h14.884
                c4,0,7.253,3.255,7.253,7.255V89.622z M70.977,348.849c0,4-3.253,7.255-7.253,7.255H48.839c-4.002,0-7.259-3.255-7.259-7.255
                v-64.367c0-4,3.256-7.255,7.259-7.255h14.884c4,0,7.253,3.255,7.253,7.255V348.849z M303.127,284.481c0-4,3.255-7.255,7.257-7.255
                h14.884c4,0,7.255,3.255,7.255,7.255v64.367c0,4-3.254,7.255-7.255,7.255h-14.884c-4.001,0-7.257-3.255-7.257-7.255V284.481z
                M198.009,345.148c0,6.041-4.914,10.955-10.954,10.955h-0.002c-6.041,0-10.956-4.914-10.956-10.955v-56.966
                c0-6.041,4.916-10.956,10.958-10.956c6.04,0,10.954,4.915,10.954,10.956V345.148z M187.692,75.756
                c-0.211-0.015-0.422-0.032-0.637-0.032s-0.426,0.017-0.637,0.032c-9.823-0.34-17.714-8.414-17.714-18.317
                c0-10.118,8.232-18.35,18.352-18.35c10.118,0,18.349,8.231,18.349,18.35C205.404,67.342,197.513,75.416,187.692,75.756z
                M303.127,25.255c0-4,3.255-7.255,7.257-7.255h14.884c4,0,7.255,3.255,7.255,7.255v64.367c0,4-3.254,7.255-7.255,7.255h-14.884
                c-4.001,0-7.257-3.255-7.257-7.255V25.255z" />
            </svg>
            {{ item.vin || '--' }}
          </span>
        </span>
        <span
          v-if="item.marca || item.modelo || item.color"
          class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400"
        >
          <CarIcon class="w-3.5 h-3.5" />
          {{ [item.marca, item.modelo, item.color].filter(Boolean).join('  ') }}
        </span>
      </button>
    </div>
  </div>
</template>
