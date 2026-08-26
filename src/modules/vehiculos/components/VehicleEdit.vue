<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { vehiclesService } from '../services/vehiclesService';
import { request } from '../../../shared/services/httpClient';
import Alert from '../../../shared/components/Alert.vue';
import VehicleImageField from '../../../shared/components/VehicleImageField.vue';
import {
  formatPlaca,
  sanitizeVin,
  sanitizeMotor,
  sanitizeText,
  sanitizeColor,
  sanitizeObservaciones,
  stripPlacaDash,
  validatePlaca,
} from '../../../shared/utils/sanitize';

const vehicleId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(vehicleId);
const form = reactive({
  placa: '',
  vin: '',
  numero_motor: '',
  marca: '',
  modelo: '',
  anio: null,
  color: '',
  transmision: 'M',
  combustible: 'GAS',
  tipo: 'AUTO',
  pais_origen: 'EC',
  kilometraje_actual: 0,
  observaciones: '',
});
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const vehicleErrors = ref({});
const imageFieldRef = ref(null);
const imagenFile = ref(null);

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

async function loadVehicle() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await vehiclesService.getById(vehicleId);
    Object.assign(form, data);
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function loadChoices() {
  isLoadingChoices.value = true;
  try {
    const data = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(data?.tipo) ? data.tipo : [];
    paises.value = Array.isArray(data?.paises) ? data.paises : [];
  } catch (error) {
    console.error('No se pudieron cargar las opciones:', error);
  } finally {
    isLoadingChoices.value = false;
  }
}

function onImageUpload(file) {
  imagenFile.value = file;
}

function onImageRemove() {
  imagenFile.value = null;
  form.imagen = '';
}

function validateVehicle() {
  const errors = {};
  const currentYear = new Date().getFullYear() + 1;

  const placaValue = (form.placa || '').replace(/-/g, '').trim();
  if (!placaValue) {
    errors.placa = 'La placa es obligatoria.';
  } else {
    const placaError = validatePlaca(form.placa);
    if (placaError) {
      errors.placa = placaError;
    }
  }

  if (!form.marca || !form.marca.trim()) {
    errors.marca = 'La marca es obligatoria.';
  }

  if (!form.modelo || !form.modelo.trim()) {
    errors.modelo = 'El modelo es obligatorio.';
  }

  if (!form.vin || !form.vin.trim()) {
    errors.vin = 'El VIN / Chasis es obligatorio.';
  }

  if (form.anio != null && form.anio !== '') {
    const anioNum = Number(form.anio);
    if (Number.isNaN(anioNum) || anioNum < 1900 || anioNum > currentYear) {
      errors.anio = `El año debe estar entre 1900 y ${currentYear}.`;
    }
  }

  const kmRaw = form.kilometraje_actual;
  const kmStr = kmRaw == null ? '' : String(kmRaw).trim();
  if (kmStr === '') {
    errors.kilometraje_actual = 'El kilometraje es obligatorio y debe ser mayor a 0.';
  } else {
    const km = Number(kmStr);
    if (Number.isNaN(km)) {
      errors.kilometraje_actual = 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
    } else if (km < 0) {
      errors.kilometraje_actual = 'El kilometraje no puede ser negativo. Por favor ingresa un valor mayor a 0.';
    } else if (km === 0) {
      errors.kilometraje_actual = 'El kilometraje debe ser mayor a 0.';
    } else if (!Number.isInteger(km)) {
      errors.kilometraje_actual = 'El kilometraje debe ser un número entero mayor a 0.';
    }
  }

  vehicleErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  vehicleErrors.value = {};
  isSaving.value = true;

  try {
    const vehicleValid = validateVehicle();
    if (!vehicleValid) {
      errorMessage.value = 'Completa correctamente los campos del vehículo.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const placaError = validatePlaca(form.placa);
    if (placaError) {
      errorMessage.value = placaError;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }
    const payload = { ...form, placa: stripPlacaDash(form.placa) };
    let formData = null;

    if (imagenFile.value) {
      formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'imagen') return;
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      formData.append('imagen', imagenFile.value);
    } else {
      if (!form.imagen) {
        payload.imagen = null;
      } else {
        delete payload.imagen;
      }
    }

    if (isEditMode) {
      await vehiclesService.update(vehicleId, payload, formData);
      successMessage.value = 'Vehículo actualizado correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await vehiclesService.create(payload, formData);
      const nuevoId = response && response.id;
      if (nuevoId) {
        window.location.assign(`/crud/vehiculos/editar/?id=${encodeURIComponent(nuevoId)}`);
      } else {
        successMessage.value = 'Vehículo creado correctamente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

watch(() => form.placa, (val) => {
  const clean = formatPlaca(val);
  if (clean !== val) form.placa = clean;
});

watch(() => form.vin, (val) => {
  const clean = sanitizeVin(val);
  if (clean !== val) form.vin = clean;
});

watch(() => form.numero_motor, (val) => {
  const clean = sanitizeMotor(val);
  if (clean !== val) form.numero_motor = clean;
});

watch(() => form.marca, (val) => {
  const clean = sanitizeText(val);
  if (clean !== val) form.marca = clean;
});

watch(() => form.modelo, (val) => {
  const clean = sanitizeText(val);
  if (clean !== val) form.modelo = clean;
});

watch(() => form.color, (val) => {
  const clean = sanitizeColor(val);
  if (clean !== val) form.color = clean;
});

watch(() => form.observaciones, (val) => {
  const clean = sanitizeObservaciones(val);
  if (clean !== val) form.observaciones = clean;
});

onMounted(() => {
  loadVehicle();
  loadChoices();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/vehiculos/" class="hover:text-primary-600">Vehículos</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Agregar' }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ isEditMode ? 'Editar vehículo' : 'Nuevo vehículo' }}</h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
          </svg>
          Información General
        </span>
      </h4>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando vehículo...</div>
      <form v-else class="grid grid-cols-1 md:grid-cols-4 gap-6" novalidate @submit.prevent="submit">
          <div class="col-span-1">
            <label for="placa" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
            <input id="placa" v-model="form.placa" required maxlength="10" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.placa ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.placa" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.placa }}</p>
          </div>
          <div class="col-span-1">
            <label for="marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
            <input id="marca" v-model="form.marca" required maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.marca ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.marca" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.marca }}</p>
          </div>
          <div class="col-span-1">
            <label for="modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
            <input id="modelo" v-model="form.modelo" required maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.modelo ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.modelo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.modelo }}</p>
          </div>
          <div class="col-span-1">
            <label for="anio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año de Fabricación</label>
            <input id="anio" v-model="form.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.anio ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.anio" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.anio }}</p>
          </div>
          <div class="col-span-1">
            <label for="tipo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
            <select id="tipo" v-model="form.tipo" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="transmision" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
            <select id="transmision" v-model="form.transmision" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="M">Manual / Mecánica</option>
              <option value="A">Automática</option>
              <option value="C">CVT</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
            <select id="combustible" v-model="form.combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="GAS">Gasolina</option>
              <option value="DIE">Diésel</option>
              <option value="HIB">Híbrido</option>
              <option value="ELE">Eléctrico</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
            <input id="color" v-model="form.color" maxlength="30" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
          </div>
          <div class="col-span-1">
            <label for="vin" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">VIN / Chasis</label>
            <input id="vin" v-model="form.vin" maxlength="17" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.vin ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.vin" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.vin }}</p>
          </div>
          <div class="col-span-1">
            <label for="numero_motor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de Motor</label>
            <input id="numero_motor" v-model="form.numero_motor" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
          </div>
          <div class="col-span-1">
            <label for="pais_origen" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de Origen</label>
            <select id="pais_origen" v-model="form.pais_origen" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="kilometraje_actual" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje Actual</label>
            <input id="kilometraje_actual" v-model="form.kilometraje_actual" type="number" min="0" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.kilometraje_actual ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="vehicleErrors.kilometraje_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.kilometraje_actual }}</p>
          </div>
          <div class="col-span-1 md:col-span-2">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Imagen</p>
            <VehicleImageField
              :image-url="form.imagen"
              :disabled="isLoadingChoices"
              @upload="onImageUpload"
              @remove="onImageRemove"
              ref="imageFieldRef"
            />
          </div>
          <div class="col-span-1 md:col-span-2">
            <label for="observaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
            <textarea id="observaciones" v-model="form.observaciones" rows="8" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
          </div>
         <div class="col-span-1 md:col-span-4 flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
           <a href="/crud/vehiculos/" class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300">Cancelar</a>
           <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-50">{{ isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Guardar') }}</button>
         </div>
      </form>
    </div>
  </div>
</template>
