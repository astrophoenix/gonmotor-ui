<script setup>
import { computed, ref, onMounted } from 'vue';
import { ArrowLeft, IdCard, Car, Image as ImageIcon, X } from 'lucide-vue-next';
import { clientsService } from '../services/clientesService';
import { vehiclesService } from '../../vehiculos/services/vehiclesService';
import { request } from '../../../shared/services/httpClient';
import { formatPlate } from '../../../shared/utils/formatPlate';
import Alert from '../../../shared/components/Alert.vue';

const client = ref(null);
const vehicles = ref([]);
const loading = ref(true);
const error = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const tipos = ref([]);
const paises = ref([]);

const TIPO_LABELS = { C: 'Cédula', R: 'RUC', P: 'Pasaporte' };

const TRANSMISION_LABELS = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };

const COMBUSTIBLE_LABELS = {
  GAS: 'Gasolina',
  DIE: 'Diésel',
  HIB: 'Híbrido',
  ELE: 'Eléctrico',
};

const params = new URLSearchParams(window.location.search);
const clientId = Number(params.get('id'));

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

onMounted(async () => {
  if (!clientId) {
    error.value = 'Falta el identificador del cliente.';
    loading.value = false;
    return;
  }
  try {
    const data = await clientsService.getById(clientId);
    client.value = data;
    const vehiclesData = await vehiclesService.list({ cliente: clientId });
    vehicles.value = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.results || []);
    const choices = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(choices && choices.tipo) ? choices.tipo : [];
    paises.value = Array.isArray(choices && choices.paises) ? choices.paises : [];
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el cliente.';
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
          <a href="/crud/clientes/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Clientes</a>
        </li>
        <li class="text-gray-400 dark:text-gray-500" aria-current="page">/ Ver</li>
      </ol>
    </nav>

    <template v-if="client">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          {{ client.nombre }}
        </h1>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          {{ TIPO_LABELS[client.tipo_identificacion] || client.tipo_identificacion }}
        </span>
        <span
          v-if="client.is_active !== false"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        >
          Activo
        </span>
        <a
          href="/crud/clientes/"
          class="inline-flex items-center gap-2 px-3 py-2 ml-auto text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ArrowLeft class="w-4 h-4" />
          Volver a la lista
        </a>
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
      Cargando cliente...
    </div>

    <template v-else-if="client">
      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <IdCard class="w-6 h-6 text-gray-800 dark:text-white" />
          Información del Cliente
        </span>
      </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ client.identificacion || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre / Razón Social</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ client.nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo electrónico</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ client.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono / WhatsApp</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ client.telefono || '—' }}</dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-1">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Dirección</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ client.direccion || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">ID de integración Contífico</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ client.contifico_id || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de registro</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(client.created_at) }}</dd>
          </div>
        </dl>

      <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <Car class="w-6 h-6 text-gray-800 dark:text-white" />
          Vehículos ({{ vehicles.length }})
        </span>
      </h4>
        <div v-if="!vehicles.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
          El cliente no tiene vehículos registrados.
        </div>

        <div v-else class="space-y-6">
          <div
            v-for="(veh, vehIndex) in vehicles"
            :key="veh.id"
            class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div class="lg:col-span-1">
                <div
                  class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gray-300 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-800"
                  :class="{ 'cursor-zoom-in': veh.imagen }"
                  @click="abrirFoto(veh.imagen)"
                >
                  <img
                    v-if="veh.imagen"
                    :src="veh.imagen"
                    :alt="`Vehículo ${veh.placa}`"
                    class="h-full w-full rounded-lg object-contain"
                  />
                  <span v-else class="flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <ImageIcon class="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    <span class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>
                  </span>
                </div>
              </div>

              <div class="lg:col-span-3">
                <div class="flex items-center gap-3 flex-wrap mb-4">
                  <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Vehículo {{ vehIndex + 1 }} — {{ formatPlate(veh.placa) }}
                  </h5>
                  <span
                    v-if="veh.is_active !== false"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  >
                    Activo
                  </span>
                </div>
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatPlate(veh.placa) || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ veh.marca || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ veh.modelo || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Año</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ veh.anio || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ tipoLabel(veh.tipo) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Transmisión</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ TRANSMISION_LABELS[veh.transmision] || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Combustible</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ COMBUSTIBLE_LABELS[veh.combustible] || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ veh.color || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">VIN / Chasis</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ veh.vin || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Número de Motor</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ veh.numero_motor || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">País de Origen</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ paisLabel(veh.pais_origen) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje Actual</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ veh.kilometraje_actual != null ? `${veh.kilometraje_actual} km` : '—' }}</dd>
                  </div>
                </dl>
                <div v-if="veh.observaciones" class="mt-4">
                  <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Observaciones</p>
                  <p class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ veh.observaciones }}</p>
                </div>
              </div>
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
</template>