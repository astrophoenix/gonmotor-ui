<script setup>
import { ref, watch } from 'vue';
import { ChevronDown, IdCard, Loader2, Search } from 'lucide-vue-next';
import { request } from '../services/httpClient';
import { isSearchable } from '../utils/search';

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
const isLoadingMore = ref(false);
const hasMore = ref(false);
const listOpen = ref(false); // lista abierta con el botón, aunque no haya texto
const activeIndex = ref(-1);
const dropdownRef = ref(null);
const inputRef = ref(null);

let searchTimer = null;
let changedByUser = false;
let page = 1;
let consulta = 0; // descarta respuestas de búsquedas anteriores

function nombreCompleto(empleado) {
  const user = empleado?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

function closeSoon() {
  window.setTimeout(() => { showDropdown.value = false; }, 150);
}

// La API pagina de 10 en 10: cada página trae como máximo 10 empleados.
async function fetchPage(term, numero) {
  const params = new URLSearchParams({ ordering: 'user__first_name', page: String(numero) });
  if (term) params.set('search', term);
  const data = await request(`/api/auth/empleados/?${params.toString()}`);
  return {
    results: Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []),
    next: Boolean(data?.next),
  };
}

async function searchEmpleados() {
  const term = (props.modelValue || '').trim();
  const id = ++consulta;
  page = 1;
  hasMore.value = false;
  if ((!term && !listOpen.value) || (term && !isSearchable(term))) {
    options.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const { results, next } = await fetchPage(term, 1);
    if (id !== consulta) return;
    options.value = results;
    hasMore.value = next;
  } catch (error) {
    if (id !== consulta) return;
    console.error('No se pudieron buscar empleados:', error);
    options.value = [];
  } finally {
    if (id === consulta) isSearching.value = false;
  }
}

async function loadMore() {
  if (isLoadingMore.value || isSearching.value || !hasMore.value) return;
  const term = (props.modelValue || '').trim();
  const id = consulta;
  isLoadingMore.value = true;
  try {
    const { results, next } = await fetchPage(term, page + 1);
    if (id !== consulta) return;
    page += 1;
    options.value = [...options.value, ...results];
    hasMore.value = next;
  } catch (error) {
    console.error('No se pudieron cargar más empleados:', error);
  } finally {
    isLoadingMore.value = false;
  }
}

function toggleList() {
  if (props.disabled) return;
  if (showDropdown.value) {
    showDropdown.value = false;
    return;
  }
  listOpen.value = true;
  showDropdown.value = true;
  searchEmpleados();
  inputRef.value?.focus();
}

watch(() => props.modelValue, (val) => {
  clearTimeout(searchTimer);
  if (!(val || '').trim()) {
    consulta += 1;
    options.value = [];
    hasMore.value = false;
    isSearching.value = false;
    showDropdown.value = false;
    listOpen.value = false;
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
  hasMore.value = false;
  showDropdown.value = false;
  listOpen.value = false;
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
  if ((props.modelValue || '').trim() && !isSearching.value) searchEmpleados();
}

function onBlur() {
  listOpen.value = false;
  closeSoon();
}

function clearAll() {
  emit('update:modelValue', '');
  options.value = [];
  hasMore.value = false;
  showDropdown.value = false;
  listOpen.value = false;
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
          'block w-full p-2.5 pl-9 pr-10 text-sm rounded-base shadow-xs bg-white border border-default-medium dark:bg-gray-700 text-heading placeholder:text-body focus:ring-brand focus:border-brand',
          error
            ? 'bg-danger-soft! border-danger-subtle! text-fg-danger-strong! placeholder:text-fg-danger-strong! focus:ring-danger! focus:border-danger!'
            : '',
        ]"
        @input="onTyping"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <button
        type="button"
        :disabled="disabled"
        :aria-expanded="showDropdown"
        :aria-controls="`${id}-lista`"
        aria-label="Ver lista de empleados"
        title="Ver lista de empleados"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-gray-200"
        @mousedown.prevent="toggleList">
        <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="showDropdown ? 'rotate-180' : ''" />
      </button>
    </div>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMessage }}</p>
    <div
      v-if="showDropdown && (options.length || isSearching || listOpen || (modelValue || '').trim())"
      :id="`${id}-lista`"
      ref="dropdownRef"
      class="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
      <div v-if="isSearching" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
      <div v-else-if="!options.length" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        {{ (modelValue || '').trim() ? 'Sin coincidencias.' : 'No hay empleados registrados.' }}
      </div>
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
        <button
          v-if="hasMore"
          type="button"
          :disabled="isLoadingMore"
          class="flex items-center justify-center w-full gap-1.5 px-3 py-2 text-sm font-medium border-t border-gray-100 text-brand-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-brand-200 dark:hover:bg-gray-600"
          @mousedown.prevent="loadMore">
          <Loader2 v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          {{ isLoadingMore ? 'Cargando...' : 'Ver más' }}
        </button>
      </template>
    </div>
  </div>
</template>
