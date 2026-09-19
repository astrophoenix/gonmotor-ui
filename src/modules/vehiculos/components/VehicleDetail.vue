<script setup>
import { computed, ref, onMounted } from 'vue';
import { ArrowLeft, Pencil, Image as ImageIcon, X, UserRound, Gauge, CalendarClock } from 'lucide-vue-next';
import { CarChassisIcon } from 'gonmotor-icons';
import { vehiclesService } from '../services/vehiclesService';
import { request } from '../../../shared/services/httpClient';
import { formatPlate } from '../../../shared/utils/formatPlate';
import Alert from '../../../shared/components/Alert.vue';
import VehicleModal from './VehicleModal.vue';

const vehicle = ref(null);
const loading = ref(true);
const error = ref('');
const tipos = ref([]);
const paises = ref([]);
const previewImg = ref('');
const showImageModal = ref(false);
const showVehicleModal = ref(false);
const vehicleModalId = ref(null);

const TRANSMISION_LABELS = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };

const COMBUSTIBLE_LABELS = {
  GAS: 'Gasolina',
  DIE: 'Diésel',
  HIB: 'Híbrido',
  ELE: 'Eléctrico',
  GNV: 'Gas Natural Vehicular (GNV)',
};

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get('id');

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFecha(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function labelFor(list, value, key) {
  if (value == null || value === '') return '—';
  const item = list.value.find((entry) => entry[key] === value);
  return item ? (item.label || item.name) : value;
}

const tipoLabel = (value) => labelFor(tipos, value, 'value');
const paisLabel = (value) => labelFor(paises, value, 'code');

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

function abrirEditar() {
  if (!vehicle.value) return;
  vehicleModalId.value = vehicle.value.id;
  showVehicleModal.value = true;
}

async function onVehicleUpdated() {
  showVehicleModal.value = false;
  loading.value = true;
  try {
    vehicle.value = await vehiclesService.getById(vehicleId);
    error.value = '';
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo recargar el vehículo.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!vehicleId) {
    error.value = 'Falta el identificador del vehículo.';
    loading.value = false;
    return;
  }
  try {
    vehicle.value = await vehiclesService.getById(vehicleId);
    const choices = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(choices && choices.tipo) ? choices.tipo : [];
    paises.value = Array.isArray(choices && choices.paises) ? choices.paises : [];
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el vehículo.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400 dark:text-gray-500">/</li>
        <li class="inline-flex items-center">
          <a href="/crud/vehiculos/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Vehículos</a>
        </li>
        <li class="text-gray-400 dark:text-gray-500" aria-current="page">/ Ver</li>
      </ol>
    </nav>

    <template v-if="vehicle">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          {{ formatPlate(vehicle.placa) }}
        </h1>
        <span
          v-if="vehicle.is_active !== false"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        >
          Activo
        </span>
        <a
          href="/crud/vehiculos/"
          class="inline-flex items-center gap-2 px-3 py-2 ml-auto text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ArrowLeft class="w-4 h-4" />
          Volver
        </a>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300"
          @click="abrirEditar"
        >
          <Pencil class="w-4 h-4" />
          Editar
        </button>
      </div>
    </template>
  </div>

  <div class="p-4">
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert
        v-if="error"
        type="error"
        :title="error"
        message=""
        dismissible
        @dismiss="error = ''"
      />

      <div v-if="loading" class="p-6 text-center text-gray-500 dark:text-gray-400">
        Cargando vehículo...
      </div>

      <template v-else-if="vehicle">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div class="lg:col-span-1">
            <div
              class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gray-300 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-800"
              :class="{ 'cursor-zoom-in': vehicle.imagen }"
              @click="abrirFoto(vehicle.imagen)"
            >
              <img
                v-if="vehicle.imagen"
                :src="vehicle.imagen"
                :alt="`Vehículo ${vehicle.placa}`"
                class="h-full w-full rounded-lg object-contain"
              />
              <span v-else class="flex flex-col items-center justify-center gap-2 px-4 text-center">
                <ImageIcon class="w-10 h-10 text-gray-400 dark:text-gray-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>
              </span>
            </div>
          </div>

          <div class="lg:col-span-3">
            <h4 class="mb-4 text-xl font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <CarChassisIcon class="w-6 h-6 text-gray-800 dark:text-white" />
                Información del Vehículo
              </span>
            </h4>
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
                <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatPlate(vehicle.placa) || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
                <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehicle.marca || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
                <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehicle.modelo || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Año</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehicle.anio || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ tipoLabel(vehicle.tipo) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Transmisión</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ TRANSMISION_LABELS[vehicle.transmision] || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Combustible</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ COMBUSTIBLE_LABELS[vehicle.combustible] || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehicle.color || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">VIN / Chasis</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehicle.vin || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Número de Motor</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehicle.numero_motor || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">País de Origen</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ paisLabel(vehicle.pais_origen) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje Actual</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehicle.kilometraje_actual != null ? `${vehicle.kilometraje_actual} km` : '—' }}</dd>
              </div>
            </dl>

            <h4 class="mt-8 mb-4 text-lg font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <CalendarClock class="w-5 h-5 text-gray-800 dark:text-white" />
                Próximo Mantenimiento
              </span>
            </h4>
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Por kilometraje</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                  <span class="inline-flex items-center gap-1">
                    <Gauge class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    {{ vehicle.proximo_mantenimiento_km != null ? `${vehicle.proximo_mantenimiento_km} km` : '—' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Por fecha</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatFecha(vehicle.proxima_mantenimiento_fecha) }}</dd>
              </div>
            </dl>

            <h4 class="mt-8 mb-4 text-lg font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <UserRound class="w-5 h-5 text-gray-800 dark:text-white" />
                Propietario / Cliente
              </span>
            </h4>
            <template v-if="vehicle.cliente_id">
              <a
                :href="`/crud/clientes/ver/?id=${encodeURIComponent(vehicle.cliente_id)}`"
                class="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {{ vehicle.cliente_nombre || 'Ver cliente' }}
              </a>
            </template>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">El vehículo no tiene un propietario asignado.</p>

            <div v-if="vehicle.observaciones" class="mt-8">
              <h4 class="mb-2 text-lg font-semibold dark:text-white">Observaciones</h4>
              <p class="text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ vehicle.observaciones }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <div
    v-if="showImageModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click="cerrarFoto"
  >
    <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl" @click.stop>
      <button
        type="button"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Cerrar"
        @click="cerrarFoto"
      >
        <X class="w-5 h-5" />
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Imagen ampliada del vehículo" />
    </div>
  </div>

  <VehicleModal
    v-model="showVehicleModal"
    :vehicle-id="vehicleModalId"
    @updated="onVehicleUpdated"
  />
</template>