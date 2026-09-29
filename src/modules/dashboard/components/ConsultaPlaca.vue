<script setup>
import { ref } from 'vue';
import { ExternalLink, Loader2, Search } from 'lucide-vue-next';
import { vehiclesService } from '../../vehiculos/services/vehiclesService';
import { MIN_SEARCH_LENGTH } from '../../../shared/utils/search';

const placa = ref('');
const cargando = ref(false);
const error = ref(null);
const resultados = ref([]);
const consultado = ref(false);

function normalizar(valor) {
  return (valor || '').trim().toUpperCase();
}

function puedeConsultar() {
  return normalizar(placa.value).length >= MIN_SEARCH_LENGTH;
}

async function consultar() {
  const termino = normalizar(placa.value);
  if (termino.length < MIN_SEARCH_LENGTH) {
    error.value = `Ingresa al menos ${MIN_SEARCH_LENGTH} caracteres de la placa.`;
    resultados.value = [];
    consultado.value = true;
    return;
  }

  cargando.value = true;
  error.value = null;
  consultado.value = true;

  try {
    const data = await vehiclesService.list({ search: termino, page: 1, ordering: 'placa' });
    resultados.value = Array.isArray(data) ? data.slice(0, 5) : (data.results || []).slice(0, 5);
    if (!resultados.value.length) {
      error.value = `No se encontró ningún vehículo con la placa "${termino}".`;
    }
  } catch (err) {
    resultados.value = [];
    error.value = err?.message || 'No fue posible consultar la placa.';
  } finally {
    cargando.value = false;
  }
}

function onKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    consultar();
  }
}
</script>

<template>
  <div class="pt-4 mt-4 border-t border-default-medium">
    <label for="dashboard-consulta-placa" class="block mb-1 text-sm font-medium text-heading">
      Consultar placa
    </label>

    <div class="flex flex-col gap-2 sm:flex-row">
      <div class="relative flex-1">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search class="w-4 h-4 text-gray-400" aria-hidden="true" />
        </span>
        <input
          id="dashboard-consulta-placa"
          v-model="placa"
          type="search"
          maxlength="20"
          autocomplete="off"
          placeholder="Ej. ABC-1234"
          class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800"
          @keydown="onKeyDown"
        />
      </div>
      <button
        type="button"
        :disabled="cargando || !puedeConsultar()"
        class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        @click="consultar"
      >
        <Loader2 v-if="cargando" class="w-4 h-4 animate-spin" aria-hidden="true" />
        <Search v-else class="w-4 h-4" aria-hidden="true" />
        {{ cargando ? 'Consultando…' : 'Consultar' }}
      </button>
    </div>

    <p v-if="error" class="mt-2 text-sm text-accent-500" role="alert">{{ error }}</p>

    <ul
      v-if="resultados.length"
      class="mt-3 space-y-2"
      aria-label="Resultados de la consulta de placa"
    >
      <li
        v-for="vehiculo in resultados"
        :key="vehiculo.id"
        class="flex flex-col gap-2 p-3 border rounded-base border-default bg-neutral-secondary-medium sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="flex flex-wrap items-center gap-2 text-sm font-semibold text-heading">
            {{ vehiculo.placa }}
            <span class="font-normal text-body">
              {{ vehiculo.marca }} {{ vehiculo.modelo }}{{ vehiculo.anio ? ` · ${vehiculo.anio}` : '' }}
            </span>
          </p>
          <p class="text-xs text-body">
            {{ vehiculo.cliente_nombre || 'Sin propietario registrado' }}
            <template v-if="vehiculo.kilometraje_actual !== undefined && vehiculo.kilometraje_actual !== null">
              · {{ Number(vehiculo.kilometraje_actual).toLocaleString('es-EC') }} km
            </template>
          </p>
        </div>
        <a
          :href="`/crud/vehiculos/ver/?id=${encodeURIComponent(vehiculo.id)}`"
          class="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-primary-600 hover:underline dark:text-primary-400"
        >
          Ver ficha
          <ExternalLink class="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </li>
    </ul>

    <p
      v-else-if="consultado && !cargando && !error"
      class="mt-2 text-sm text-body"
    >
      Sin resultados para esa placa.
    </p>
  </div>
</template>
