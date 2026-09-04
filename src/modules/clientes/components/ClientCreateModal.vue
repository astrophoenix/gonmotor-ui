<script setup>
import { reactive, ref, watch } from 'vue';
import { request } from '../../../shared/services/httpClient';
import VehicleImageField from '../../../shared/components/VehicleImageField.vue';
import {
  sanitizeIdentificacion,
  sanitizeNombre,
  sanitizeEmail,
  sanitizeTelefono,
  formatPlaca,
  sanitizeVin,
  sanitizeText,
  sanitizeColor,
  sanitizeMotor,
  sanitizeObservaciones,
  getItemKey as getVehicleKey,
  validatePlaca,
} from '../../../shared/utils/sanitize';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'created']);

const form = reactive({
  tipo_identificacion: 'C',
  identificacion: '',
  nombre: '',
  email: '',
  telefono: '',
  direccion: ''
});
const isSaving = ref(false);
const errorMessage = ref('');
const vehiculos = ref([]);
let nextVehicleUid = 1;
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const vehiculoErrors = ref({});
const clientErrors = ref({});

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function validateVehiculo(vehiculo) {
  const key = getVehicleKey(vehiculo);
  const errors = {};
  const currentYear = new Date().getFullYear() + 1;

  const placaValue = (vehiculo.placa || '').replace(/-/g, '').trim();
  if (!placaValue) {
    errors.placa = 'La placa es obligatoria.';
  } else {
    const placaError = validatePlaca(vehiculo.placa);
    if (placaError) {
      errors.placa = placaError;
    }
  }

  if (!vehiculo.marca || !vehiculo.marca.trim()) {
    errors.marca = 'La marca es obligatoria.';
  }

  if (!vehiculo.modelo || !vehiculo.modelo.trim()) {
    errors.modelo = 'El modelo es obligatorio.';
  }

  if (!vehiculo.vin || !vehiculo.vin.trim()) {
    errors.vin = 'El VIN / Chasis es obligatorio.';
  }

  if (vehiculo.anio != null && vehiculo.anio !== '') {
    const anioNum = Number(vehiculo.anio);
    if (Number.isNaN(anioNum) || anioNum < 1900 || anioNum > currentYear) {
      errors.anio = `El año debe estar entre 1900 y ${currentYear}.`;
    }
  }

  const kmRaw = vehiculo.kilometraje_actual;
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

  vehiculoErrors.value[key] = errors;
  return Object.keys(errors).length === 0;
}

function validateVehiculos() {
  vehiculoErrors.value = {};
  let isValid = true;
  vehiculos.value.forEach((vehiculo) => {
    if (!validateVehiculo(vehiculo)) {
      isValid = false;
    }
  });
  return isValid;
}

function validateForm() {
  clientErrors.value = {};
  const errors = {};

  if (!form.identificacion || !form.identificacion.trim()) {
    errors.identificacion = 'La identificación es obligatoria.';
  } else if (form.tipo_identificacion === 'C' && form.identificacion.length !== 10) {
    errors.identificacion = 'La cédula debe tener exactamente 10 dígitos.';
  } else if (form.tipo_identificacion === 'R' && form.identificacion.length !== 13) {
    errors.identificacion = 'El RUC debe tener exactamente 13 dígitos.';
  }

  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre o razón social es obligatorio.';
  }

  if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (!form.telefono || !form.telefono.trim()) {
    errors.telefono = 'El teléfono es obligatorio.';
  }

  if (!form.direccion || !form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }

  clientErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function createEmptyVehiculo() {
  return {
    _uid: nextVehicleUid++,
    placa: '',
    marca: '',
    modelo: '',
    anio: null,
    color: '',
    transmision: 'M',
    combustible: 'GAS',
    tipo: 'AUTO',
    pais_origen: 'EC',
    vin: '',
    numero_motor: '',
    kilometraje_actual: 0,
    observaciones: '',
    is_active: true,
    _teniaImagen: false
  };
}

function addVehiculo() {
  vehiculos.value.push(createEmptyVehiculo());
}

function removeVehiculo(index) {
  vehiculos.value.splice(index, 1);
}

async function loadChoices() {
  isLoadingChoices.value = true;
  try {
    const data = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(data && data.tipo) ? data.tipo : [];
    paises.value = Array.isArray(data && data.paises) ? data.paises : [];
  } catch (error) {
    console.error('No se pudieron cargar las opciones:', error);
  } finally {
    isLoadingChoices.value = false;
  }
}

function resetForm() {
  form.tipo_identificacion = 'C';
  form.identificacion = '';
  form.nombre = '';
  form.email = '';
  form.telefono = '';
  form.direccion = '';
  vehiculos.value = [];
  vehiculoErrors.value = {};
  clientErrors.value = {};
  errorMessage.value = '';
}

function open() {
  resetForm();
  loadChoices();
}

async function submit() {
  errorMessage.value = '';
  vehiculoErrors.value = {};
  clientErrors.value = {};
  isSaving.value = true;

  try {
    const formValid = validateForm();
    const vehiculosValid = validateVehiculos();

    if (!formValid || !vehiculosValid) {
      const parts = [];
      if (!formValid) parts.push('Información General');
      if (!vehiculosValid) parts.push('Vehículos');
      errorMessage.value = 'Completa correctamente los campos de: ' + parts.join(' y ');
      isSaving.value = false;
      return;
    }

    const formData = new FormData();

    formData.append('tipo_identificacion', form.tipo_identificacion);
    formData.append('identificacion', form.identificacion);
    formData.append('nombre', form.nombre);
    formData.append('email', form.email || '');
    formData.append('telefono', form.telefono || '');
    formData.append('direccion', form.direccion || '');

    const vehiculosPayload = vehiculos.value.map((v, index) => {
      const { _uid, imagenFile, imagenPreview, imagen, _teniaImagen, ...rest } = v;
      const item = {
        ...rest,
        placa: (v.placa || '').replace(/-/g, '').trim().toUpperCase(),
        anio: v.anio ? Number(v.anio) : null,
        kilometraje_actual: v.kilometraje_actual ? parseInt(v.kilometraje_actual, 10) : 0
      };
      if (imagenFile) {
        formData.append(`vehiculo_${index}_imagen`, imagenFile);
      }
      return item;
    });

    formData.append('vehiculos', JSON.stringify(vehiculosPayload));

    const response = await request('/api/clientes/', {
      method: 'POST',
      body: formData,
    });

    emit('created', response);
  } catch (error) {
    showError(error);
  } finally {
    isSaving.value = false;
  }
}

watch(() => form.tipo_identificacion, () => {
  form.identificacion = sanitizeIdentificacion(form.identificacion, form.tipo_identificacion);
});

watch(() => form.identificacion, (val) => {
  const clean = sanitizeIdentificacion(val, form.tipo_identificacion);
  if (clean !== val) form.identificacion = clean;
});

watch(() => form.nombre, (val) => {
  const clean = sanitizeNombre(val);
  if (clean !== val) form.nombre = clean;
});

watch(() => form.email, (val) => {
  const clean = sanitizeEmail(val);
  if (clean !== val) form.email = clean;
});

watch(() => form.telefono, (val) => {
  const clean = sanitizeTelefono(val);
  if (clean !== val) form.telefono = clean;
});

watch(vehiculos, (list) => {
  list.forEach((v) => {
    if (v.placa !== undefined && formatPlaca(v.placa) !== v.placa) {
      v.placa = formatPlaca(v.placa);
    }
    if (v.vin !== undefined && sanitizeVin(v.vin) !== v.vin) {
      v.vin = sanitizeVin(v.vin);
    }
    if (v.marca !== undefined && sanitizeText(v.marca) !== v.marca) {
      v.marca = sanitizeText(v.marca);
    }
    if (v.modelo !== undefined && sanitizeText(v.modelo) !== v.modelo) {
      v.modelo = sanitizeText(v.modelo);
    }
    if (v.color !== undefined && sanitizeColor(v.color) !== v.color) {
      v.color = sanitizeColor(v.color);
    }
    if (v.numero_motor !== undefined && sanitizeMotor(v.numero_motor) !== v.numero_motor) {
      v.numero_motor = sanitizeMotor(v.numero_motor);
    }
    if (v.observaciones !== undefined && sanitizeObservaciones(v.observaciones) !== v.observaciones) {
      v.observaciones = sanitizeObservaciones(v.observaciones);
    }
  });
}, { deep: true });

watch(() => props.modelValue, (val) => {
  if (val) {
    open();
  }
});
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Nuevo cliente</h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="emit('update:modelValue', false)"
        >
          
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>

          
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <p v-if="errorMessage" class="mb-4 text-sm text-red-600 dark:text-red-500">{{ errorMessage }}</p>

        <h4 class="mb-4 text-base font-semibold dark:text-white">Información General</h4>
        <div class="grid grid-cols-6 gap-4">
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_tipo_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de identificación</label>
            <select id="modal_tipo_identificacion" v-model="form.tipo_identificacion" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="C">Cédula</option>
              <option value="R">RUC</option>
              <option value="P">Pasaporte</option>
            </select>
          </div>
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</label>
            <input id="modal_identificacion" v-model="form.identificacion" required maxlength="13" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', clientErrors.identificacion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="clientErrors.identificacion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.identificacion }}</p>
          </div>
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre o razón social</label>
            <input id="modal_nombre" v-model="form.nombre" required maxlength="200" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', clientErrors.nombre ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="clientErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.nombre }}</p>
          </div>
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
            <input id="modal_email" v-model="form.email" type="email" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', clientErrors.email ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="clientErrors.email" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.email }}</p>
          </div>
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
            <input id="modal_telefono" v-model="form.telefono" maxlength="20" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', clientErrors.telefono ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            <p v-if="clientErrors.telefono" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.telefono }}</p>
          </div>
          <div class="col-span-6 sm:col-span-3">
            <label for="modal_direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección</label>
            <textarea id="modal_direccion" v-model="form.direccion" rows="1" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', clientErrors.direccion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
            <p v-if="clientErrors.direccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.direccion }}</p>
          </div>
        </div>

        <h4 class="mt-6 mb-4 text-base font-semibold dark:text-white">Vehículos del Cliente</h4>

        <div v-if="!vehiculos.length" class="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
          No hay vehículos asociados. Presiona "Agregar Vehículo" para crear uno.
        </div>

        <div v-for="(vehiculo, index) in vehiculos" :key="vehiculo._uid || vehiculo.id" class="p-4 mb-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-base font-medium text-gray-900 dark:text-white">Vehículo {{ index + 1 }}</h5>
            <button type="button" @click="removeVehiculo(index)" class="inline-flex items-center p-2 text-red-600 border border-red-500 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-600" title="Eliminar vehículo" aria-label="Eliminar vehículo">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
              <input v-model="vehiculo.placa" maxlength="10" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].placa) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].placa" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].placa }}</p>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
              <input v-model="vehiculo.marca" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].marca) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].marca" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].marca }}</p>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
              <input v-model="vehiculo.modelo" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].modelo) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].modelo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].modelo }}</p>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año</label>
              <input v-model="vehiculo.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].anio) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].anio" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].anio }}</p>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
              <select v-model="vehiculo.tipo" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
              <select v-model="vehiculo.transmision" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option value="M">Manual / Mecánica</option>
                <option value="A">Automática</option>
                <option value="C">CVT</option>
              </select>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
              <select v-model="vehiculo.combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option value="GAS">Gasolina</option>
                <option value="DIE">Diésel</option>
                <option value="HIB">Híbrido</option>
                <option value="ELE">Eléctrico</option>
              </select>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
              <input v-model="vehiculo.color" maxlength="30" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">VIN / Chasis</label>
              <input v-model="vehiculo.vin" maxlength="17" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].vin) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].vin" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].vin }}</p>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motor</label>
              <input v-model="vehiculo.numero_motor" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de Origen</label>
              <select v-model="vehiculo.pais_origen" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje</label>
              <input v-model="vehiculo.kilometraje_actual" type="number" min="0" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', (vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].kilometraje_actual) ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehiculoErrors[getVehicleKey(vehiculo)] && vehiculoErrors[getVehicleKey(vehiculo)].kilometraje_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehiculoErrors[getVehicleKey(vehiculo)].kilometraje_actual }}</p>
            </div>
            <div class="col-span-1 md:col-span-1">
              <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Imagen</p>
              <VehicleImageField
                :image-url="vehiculo.imagen"
                :disabled="isLoadingChoices"
                :max-size="2 * 1024 * 1024"
                :allowed-types="['image/jpeg', 'image/jpg', 'image/png', 'image/webp']"
                @upload="(file) => { vehiculo.imagenFile = file; }"
                @remove="() => { vehiculo.imagenFile = null; vehiculo.imagenPreview = ''; vehiculo.imagen = ''; }"
              />
            </div>
            <div class="col-span-1 md:col-span-3">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
              <textarea v-model="vehiculo.observaciones" rows="8" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button type="button" @click="addVehiculo" class="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-blue-700 border border-primary-blue-700 rounded-lg hover:bg-primary-blue-50 focus:ring-4 focus:ring-primary-blue-300">
            <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M24,16c-4.4,0-8,3.6-8,8s3.6,8,8,8s8-3.6,8-8S28.4,16,24,16z M27,25h-2v2c0,0.6-0.4,1-1,1s-1-0.4-1-1v-2h-2c-0.6,0-1-0.4-1-1s0.4-1,1-1h2v-2c0-0.6,0.4-1,1-1s1,0.4,1,1v2h2c0.6,0,1,0.4,1,1S27.6,25,27,25z"/><path d="M8.4,22l1.2-2.3c0.5-1,1.5-1.7,2.7-1.7h3.5c0.1,0,0.2,0,0.2,0c1.8-2.4,4.7-4,8-4c1.2,0,2.3,0.2,3.4,0.6C27,14,26.5,13.4,26,13h1c0.6,0,1-0.4,1-1s-0.4-1-1-1h-2.8L23,8c-0.8-1.8-2.6-3-4.6-3H9.6C7.6,5,5.8,6.2,5,8l-1.3,3H1c-0.6,0-1,0.4-1,1s0.4,1,1,1h1c-1.2,0.9-2,2.4-2,4v4c0,0.9,0.4,1.7,1,2.2V25c0,1.7,1.3,3,3,3h2c1.7,0,3-1.3,3-3v-1h5c0-0.7,0.1-1.4,0.2-2H8.4z M7,19H4c-0.6,0-1-0.4-1-1s0.4-1,1-1h3c0.6,0,1,0.4,1,1S7.6,19,7,19z M5.5,12l1.4-3.2C7.4,7.7,8.4,7,9.6,7h8.7c1.2,0,2.3,0.7,2.8,1.8l1.4,3.2H5.5z"/></svg>
            Agregar Vehículo
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
          @click="submit"
        >
          <svg v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 0 1 1-1h11.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z"/>
            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M8 4h8v4H8V4Zm7 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
          </svg>
          <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Guardando...' : 'Crear cliente' }}
        </button>
      </div>
    </div>
  </div>
</template>
