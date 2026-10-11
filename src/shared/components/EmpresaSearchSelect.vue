<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { Building2, Check, ChevronDown, IdCard, Search } from 'lucide-vue-next';

const props = defineProps({
  /** Id de la empresa seleccionada. */
  modelValue: { type: [Number, String], default: null },
  /** Lista de empresas a mostrar (búsqueda en memoria). */
  empresas: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Selecciona una empresa' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

const MAX_VISIBLES = 6;

const abierto = ref(false);
const termino = ref('');
const indiceActivo = ref(-1);

const raizRef = ref(null);
const inputRef = ref(null);

function normalizar(texto) {
  return (texto ?? '').toString().toLowerCase();
}

function nombreDe(empresa) {
  return empresa?.nombre_comercial || empresa?.nombre || '';
}

const fuente = computed(() => {
  const q = normalizar(termino.value).trim();
  if (!q) return props.empresas;
  return props.empresas.filter((empresa) =>
    [nombreDe(empresa), empresa.ruc].some((campo) => normalizar(campo).includes(q))
  );
});

const visibles = computed(() => fuente.value.slice(0, MAX_VISIBLES));

const restantes = computed(() => Math.max(fuente.value.length - visibles.value.length, 0));

const empresaActual = computed(
  () => props.empresas.find((e) => String(e.id) === String(props.modelValue)) || null
);

const etiqueta = computed(() => nombreDe(empresaActual.value) || props.placeholder);

function seleccionar(empresa) {
  if (String(empresa.id) === String(props.modelValue)) {
    cerrar(true);
    return;
  }
  emit('update:modelValue', empresa.id);
  emit('change', empresa);
  cerrar(true);
}

function abrir() {
  abierto.value = true;
  indiceActivo.value = -1;
  nextTick(() => inputRef.value?.focus());
}

function cerrar(enfocar = false) {
  abierto.value = false;
  termino.value = '';
  indiceActivo.value = -1;
  if (enfocar) raizRef.value?.querySelector('[data-disparador]')?.focus();
}

function alternar() {
  abierto.value ? cerrar() : abrir();
}

function mover(delta) {
  if (!visibles.value.length) return;
  const siguiente = indiceActivo.value + delta;
  indiceActivo.value = Math.min(Math.max(siguiente, 0), visibles.value.length - 1);
}

function onTeclado(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    mover(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    mover(-1);
  } else if (event.key === 'Enter') {
    const empresa = visibles.value[indiceActivo.value] || visibles.value[0];
    if (empresa) {
      event.preventDefault();
      seleccionar(empresa);
    }
  } else if (event.key === 'Escape') {
    cerrar(true);
  }
}

function onClickFuera(event) {
  if (abierto.value && raizRef.value && !raizRef.value.contains(event.target)) {
    cerrar();
  }
}

onMounted(() => {
  document.addEventListener('click', onClickFuera);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickFuera);
});
</script>

<template>
  <div ref="raizRef" class="relative">
    <button
      data-disparador
      type="button"
      class="flex h-[52px] w-full items-center justify-between gap-3 rounded-xl border-[1.5px] border-brand-line bg-white px-3.5 text-base text-brand-ink outline-none transition-colors focus:border-brand-ink focus:ring-4 focus:ring-brand-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      aria-haspopup="listbox"
      :aria-expanded="String(abierto)"
      aria-controls="empresa-select-panel"
      :title="etiqueta"
      :disabled="disabled"
      @click="alternar"
      @keydown.down.prevent="abrir()"
    >
      <Building2 class="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-100" aria-hidden="true" />
      <span class="flex-1 truncate text-left font-medium">{{ etiqueta }}</span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-muted transition-transform"
        :class="abierto && 'rotate-180'"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="abierto"
      id="empresa-select-panel"
      class="absolute left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900"
      role="listbox"
      aria-label="Empresas disponibles"
    >
      <!-- Buscador -->
      <div class="border-b border-brand-100 p-2 dark:border-brand-700">
        <div class="relative">
          <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="termino"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Buscar empresa o RUC…"
            aria-label="Buscar empresa"
            class="w-full rounded-lg border border-brand-100 bg-brand-50 py-1.5 pl-8 pr-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-brand-700 dark:bg-brand-800 dark:text-white dark:placeholder:text-brand-300"
            @keydown="onTeclado"
          >
        </div>
      </div>

      <div v-if="!visibles.length" class="px-4 py-5 text-sm text-ink-soft dark:text-brand-300">
        {{ termino ? `Sin coincidencias para «${termino}».` : 'No hay empresas disponibles.' }}
      </div>

      <template v-else>
        <ul class="max-h-64 overflow-y-auto py-1.5">
          <li v-for="(empresa, indice) in visibles" :key="empresa.id">
            <button
              type="button"
              role="option"
              :aria-selected="String(String(empresa.id) === String(modelValue))"
              class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
              :class="indice === indiceActivo
                ? 'bg-surface dark:bg-brand-800'
                : 'hover:bg-surface dark:hover:bg-brand-800'"
              @mouseenter="indiceActivo = indice"
              @click="seleccionar(empresa)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-100">
                <Building2 class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink dark:text-white">
                  {{ nombreDe(empresa) }}
                </span>
                <span v-if="empresa.ruc" class="flex items-center gap-1.5 text-xs text-ink-soft dark:text-brand-300">
                  <IdCard class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ empresa.ruc }}</span>
                </span>
              </span>
              <Check
                v-if="String(empresa.id) === String(modelValue)"
                class="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-100"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>

        <div
          v-if="restantes > 0"
          class="border-t border-brand-100 px-3 py-1.5 text-center text-[11px] text-muted dark:border-brand-700"
        >
          y {{ restantes }} empresa{{ restantes === 1 ? '' : 's' }} más…
        </div>
      </template>
    </div>
  </div>
</template>
