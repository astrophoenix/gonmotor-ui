<script setup>
import { ref, onMounted } from 'vue';
import { useRecepciones } from '../composables/useRecepciones';

const { loading, error, loadRecepcion } = useRecepciones();
const recepcion = ref(null);

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

onMounted(async () => {
  const id = getIdFromUrl();
  if (id) {
    recepcion.value = await loadRecepcion(id);
  }
});

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getAccesorioLabel(key, value) {
  const labels = {
    tiene_radio: 'Radio / Mascarilla',
    tiene_llanta_repuesto: 'Llanta de repuesto',
    tiene_gata_palanca: 'Gata y palanca',
    tiene_extintor: 'Extintor',
    tiene_botiquin: 'Botiquín',
    tiene_antena: 'Antena',
    tiene_copas_ruedas: 'Copas / tapacubos',
    tiene_herramientas: 'Juego de herramientas',
  };
  return labels[key] || key;
}

function goTo(path) {
  window.location.assign(path);
}

const tieneInspeccion = () => (recepcion.value?.inspecciones?.length ?? 0) > 0;

function irADiagnostico(recepcion) {
  goTo(`/crud/inspecciones/nuevo/?recepcion=${recepcion.id}`);
}

function irAInspeccion(recepcion) {
  const inspeccion = recepcion.inspecciones?.[0];
  if (inspeccion) {
    goTo(`/crud/inspecciones/editar/?id=${inspeccion.id}`);
  }
}

</script>

<template>
  <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
    <div v-if="error" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-200">
      {{ error }}
    </div>

    <div v-if="loading" class="p-4 text-center text-gray-500 dark:text-gray-400">
      Cargando recepción...
    </div>

    <div v-else-if="!recepcion" class="p-4 text-center text-gray-500 dark:text-gray-400">
      Recepción no encontrada.
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
          Recepción #{{ recepcion.id }}
        </h1>
        <div class="flex items-center gap-2">
          <button
            v-if="!tieneInspeccion()"
            type="button"
            title="Crear Diagnóstico"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 rounded-lg border border-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-gray-800"
            @click="irADiagnostico(recepcion)"
          >
            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13.5h14M12 6.5v14"/>
            </svg>
            Crear Diagnóstico
          </button>
          <button
            v-else
            type="button"
            title="Ver / Editar Diagnóstico"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 rounded-lg border border-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-400 dark:hover:bg-gray-800"
            @click="irAInspeccion(recepcion)"
          >
            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 4.8 2.9 2.9M7 17l-1 4 4-1 9.3-9.3a2 2 0 0 0-2.8-2.8L7 17Z"/>
            </svg>
            Ver / Editar Diagnóstico
          </button>
          <button
            v-if="recepcion.cotizaciones_generadas?.length"
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-700 rounded-lg border border-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
            @click="goTo(`/crud/cotizaciones/ver/${recepcion.cotizaciones_generadas[0]?.id}/`)"
          >
            Ver Cotización
          </button>
          <button
            v-if="recepcion.orden_trabajo_id"
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-800"
            @click="goTo(`/crud/ordenes/ver/${recepcion.orden_trabajo_id}/`)"
          >
            Ver Orden
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Información del ingreso</h2>
            <dl class="grid grid-cols-1 gap-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Vehículo</dt>
                <dd class="text-gray-900 dark:text-white font-medium">
                  {{ recepcion.vehiculo?.placa || '-' }} - {{ recepcion.vehiculo?.marca }} {{ recepcion.vehiculo?.modelo }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Cliente</dt>
                <dd class="text-gray-900 dark:text-white font-medium">
                  {{ recepcion.vehiculo?.cliente?.nombre || '-' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Fecha ingreso</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{{ formatDate(recepcion.created_at) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Kilometraje</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{{ recepcion.kilometraje_ingreso }} km</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Combustible</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{{ recepcion.nivel_combustible }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Ingreso en grúa</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{{ recepcion.ingreso_en_grua ? 'Sí' : 'No' }}</dd>
              </div>
              <div v-if="recepcion.datos_grua" class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Datos grúa</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{{ recepcion.datos_grua }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Accesorios</h2>
            <ul class="space-y-1 text-sm">
              <li v-for="(value, key) in {
                tiene_radio: recepcion.tiene_radio,
                tiene_llanta_repuesto: recepcion.tiene_llanta_repuesto,
                tiene_gata_palanca: recepcion.tiene_gata_palanca,
                tiene_extintor: recepcion.tiene_extintor,
                tiene_botiquin: recepcion.tiene_botiquin,
                tiene_antena: recepcion.tiene_antena,
                tiene_copas_ruedas: recepcion.tiene_copas_ruedas,
                tiene_herramientas: recepcion.tiene_herramientas,
              }" :key="key" class="flex items-center">
                <span :class="value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ value ? '✔' : '✖' }}
                </span>
                <span class="ml-2 text-gray-700 dark:text-gray-300">{{ getAccesorioLabel(key, value) }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Carrocería</h2>
            <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {{ recepcion.detalles_carroceria || 'Sin observaciones.' }}
            </p>
          </div>

          <div v-if="recepcion.fotos?.length">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Fotos</h2>
            <div class="grid grid-cols-2 gap-2">
              <img
                v-for="foto in recepcion.fotos"
                :key="foto.id"
                :src="foto.imagen"
                :alt="foto.descripcion || 'Foto de recepción'"
                class="rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
