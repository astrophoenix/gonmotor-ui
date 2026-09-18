<script setup>
import { ref, watch } from 'vue';
import { Search, IdCard } from 'lucide-vue-next';
import { request } from '../services/httpClient';

const props = defineProps({
  id: { type: String, default: 'empleado' },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar empleado' },
  error: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'select', 'clear']);

const options = ref([]);
const showDropdown = ref(false);
const isSearching = ref(false);
const activeIndex = ref(-1);
const dropdownRef = ref(null);
const inputRef = ref(null);

let searchTimer = null;
let changedByUser = false;

function nombreCompleto(empleado) {
  const user = empleado?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

function closeSoon() {
  window.setTimeout(() => { showDropdown.value = false; }, 150);
}

async function searchEmpleados() {
  const term = (props.modelValue || '').trim();
  if (!term) {
    options.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const params = new URLSearchParams({ search: term, ordering: 'user__first_name', page: '1' });
    const data = await request(`/api/auth/empleados/?${params.toString()}`);
    options.value = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('No se pudieron buscar empleados:', error);
    options.value = [];
  } finally {
    isSearching.value = false;
  }
}

watch(() => props.modelValue, (val) => {
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
  searchTimer = setTimeout(searchEmpleados, 250);
  showDropdown.value = true;
});

function selectEmpleado(empleado) {
  options.value = [];
  showDropdown.value = false;
  activeIndex.value = -1;
  emit('select', empleado);
  emit('update:modelValue', nombreCompleto(empleado));
}

function onTyping(event) {
  changedByUser = true;
  emit('update:modelValue', event.target.value);
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
      selectEmpleado(item);
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

function onFocus() {
  showDropdown.value = true;
  clearTimeout(searchTimer);
  if ((props.modelValue || '').trim()) searchEmpleados();
}

function clearAll() {
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
          'block w-full p-2.5 pl-9 pr-3 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
          error ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '',
        ]"
        @input="onTyping"
        @focus="onFocus"
        @blur="closeSoon"
        @keydown="onKeydown"
      />
    </div>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMessage }}</p>
    <div
      v-if="showDropdown && (options.length || isSearching || (modelValue || '').trim())"
      ref="dropdownRef"
      class="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600"
    >
      <div v-if="isSearching" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
      <div v-else-if="!options.length" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin coincidencias.</div>
      <template v-else>
        <button
          v-for="(item, index) in options"
          :key="item.id"
          :data-option-index="index"
          type="button"
          class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          :class="index === activeIndex ? 'bg-primary-50 dark:bg-gray-600' : ''"
          @mouseenter="activeIndex = index"
          @mousedown.prevent="selectEmpleado(item)"
        >
          <span class="block font-medium">{{ nombreCompleto(item) || item.user?.username }}</span>
          <span class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <IdCard class="w-3.5 h-3.5" />
            {{ item.user?.identificacion || '--' }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
