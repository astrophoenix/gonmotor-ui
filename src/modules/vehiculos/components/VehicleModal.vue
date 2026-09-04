<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { request } from '../../../shared/services/httpClient';
import {
  formatPlaca,
  stripPlacaDash,
  validatePlaca,
  sanitizeVin,
  sanitizeMotor,
  sanitizeText,
  sanitizeColor,
  sanitizeObservaciones,
} from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import VehicleImageField from '../../../shared/components/VehicleImageField.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  vehicleId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.vehicleId));

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
  cliente_id: null,
  imagen: '',
});
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const vehicleErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    placa: form.placa,
    vin: form.vin,
    numero_motor: form.numero_motor,
    marca: form.marca,
    modelo: form.modelo,
    anio: form.anio,
    color: form.color,
    transmision: form.transmision,
    combustible: form.combustible,
    tipo: form.tipo,
    pais_origen: form.pais_origen,
    kilometraje_actual: form.kilometraje_actual,
    observaciones: form.observaciones,
    cliente_id: form.cliente_id,
    imagen: form.imagen,
    tieneArchivo: Boolean(imagenFile.value),
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const imagenFile = ref(null);
const clienteSearch = ref('');
const clienteOptions = ref([]);
const showClienteDropdown = ref(false);

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
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

function createEmptyForm() {
  return {
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
    cliente_id: null,
    imagen: '',
  };
}

async function searchClientes() {
  const term = clienteSearch.value.trim();
  if (!term) {
    clienteOptions.value = [];
    return;
  }
  try {
    const params = new URLSearchParams({ search: term, ordering: 'nombre', page: '1' });
    const data = await request(`/api/clientes/?${params.toString()}`);
    clienteOptions.value = Array.isArray(data && data.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar clientes:', error);
  }
}

function selectCliente(cliente) {
  form.cliente_id = cliente.id;
  clienteSearch.value = cliente.nombre;
  showClienteDropdown.value = false;
  clienteOptions.value = [];
}

function clearCliente() {
  form.cliente_id = null;
  clienteSearch.value = '';
  clienteOptions.value = [];
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  imagenFile.value = null;
  vehicleErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();
  loadChoices();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await request(`/api/vehiculos/${props.vehicleId}/`);
      Object.assign(form, createEmptyForm(), data);
      if (data.cliente_id) {
        form.cliente_id = data.cliente_id;
        clienteSearch.value = data.cliente_nombre || '';
      } else {
        form.cliente_id = null;
        clienteSearch.value = '';
      }
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function validateVehicle() {
  vehicleErrors.value = {};
  const errors = {};
  const currentYear = new Date().getFullYear() + 1;

  const placaValue = (form.placa || '').replace(/-/g, '').trim();
  if (!placaValue) {
    errors.placa = 'La placa es obligatoria.';
  } else {
    const placaError = validatePlaca(form.placa);
    if (placaError) errors.placa = placaError;
  }

  if (!form.marca || !form.marca.trim()) errors.marca = 'La marca es obligatoria.';
  if (!form.modelo || !form.modelo.trim()) errors.modelo = 'El modelo es obligatorio.';
  if (!form.vin || !form.vin.trim()) errors.vin = 'El VIN / Chasis es obligatorio.';

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
    if (Number.isNaN(km) || km < 0) {
      errors.kilometraje_actual = 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
    } else if (km === 0) {
      errors.kilometraje_actual = 'El kilometraje debe ser mayor a 0.';
    } else if (!Number.isInteger(km)) {
      errors.kilometraje_actual = 'El kilometraje debe ser un número entero mayor a 0.';
    }
  }

  vehicleErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const fieldMap = {
    placa: 'placa',
    vin: 'vin',
    numero_motor: 'numero_motor',
    marca: 'marca',
    modelo: 'modelo',
    anio: 'anio',
    color: 'color',
    transmision: 'transmision',
    combustible: 'combustible',
    tipo: 'tipo',
    pais_origen: 'pais_origen',
    kilometraje_actual: 'kilometraje_actual',
    observaciones: 'observaciones',
    cliente_id: 'cliente_id',
  };
  const newErrors = { ...vehicleErrors.value };
  Object.keys(fieldMap).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[fieldMap[key]] = val[0];
    } else if (typeof val === 'string') {
      newErrors[fieldMap[key]] = val;
    }
  });
  vehicleErrors.value = newErrors;
}

function buildFormData() {
  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (key === 'imagen') return;
    if (key === 'cliente_id') {
      formData.append(key, value === null || value === undefined || value === '' ? '' : String(value));
      return;
    }
    if (key === 'anio' && (value === null || value === undefined || value === '')) return;
    if (key === 'kilometraje_actual') {
      const num = parseInt(value, 10);
      formData.append(key, Number.isNaN(num) ? '0' : String(num));
      return;
    }
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value);
    }
  });
  formData.set('placa', stripPlacaDash(form.placa).toUpperCase());
  if (imagenFile.value) {
    formData.append('imagen', imagenFile.value);
  } else if (!form.imagen) {
    formData.append('imagen', '');
  }
  return formData;
}

async function reactivateInactiveVehicle(inactiveId) {
  const formData = buildFormData();
  formData.append('is_active', 'true');
  isSaving.value = true;
  try {
    const response = await request(`/api/vehiculos/${inactiveId}/`, {
      method: 'PATCH',
      body: formData,
    });
    emit('reactivated', response);
  } catch (error) {
    showError(error);
    if (error.data) {
      applyBackendErrors(error.data);
    }
  } finally {
    isSaving.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  vehicleErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validateVehicle();
    if (!valid) {
      errorMessage.value = 'Completa correctamente los campos del vehículo.';
      isSaving.value = false;
      return;
    }

    const formData = buildFormData();

    if (isEditMode.value) {
      const response = await request(`/api/vehiculos/${props.vehicleId}/`, {
        method: 'PATCH',
        body: formData,
      });
      emit('updated', response);
    } else {
      const response = await request('/api/vehiculos/', {
        method: 'POST',
        body: formData,
      });
      emit('created', response);
    }
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El vehículo con placa "${inactive.placa}" (${inactive.marca} ${inactive.modelo}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactiveVehicle(inactive.id);
      } else {
        errorMessage.value = `El vehículo "${inactive.placa}" no se agregó. El registro permanece desactivado.`;
      }
      return;
    }
    showError(error);
    if (error.data) {
      applyBackendErrors(error.data);
    }
  } finally {
    isSaving.value = false;
  }
}

function close() {
  if (hasChanges.value && !isSaving.value) {
    if (!showDiscardWarning.value) {
      showDiscardWarning.value = true;
      return;
    }
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (val) => {
  if (val) open();
});

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
watch(() => clienteSearch.value, () => {
  if (!clienteSearch.value.trim()) {
    clearCliente();
    return;
  }
  searchClientes();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-5xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar vehículo' : 'Nuevo vehículo' }}
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
        </button>
      </div>

      <div class="px-6 py-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando vehículo...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">Información General</h4>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1 md:col-span-4">
              <label for="modal_veh_cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente Propietario</label>
              <input
                id="modal_veh_cliente"
                v-model="clienteSearch"
                autocomplete="off"
                placeholder="Buscar cliente por nombre o identificación..."
                class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                @focus="showClienteDropdown = true"
                @blur="async () => { await wait(150); showClienteDropdown = false; }"
              />
              <div v-if="showClienteDropdown && clienteOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600" style="position: relative;">
                <button
                  v-for="item in clienteOptions"
                  :key="item.id"
                  type="button"
                  class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  @mousedown="selectCliente(item)"
                >
                  {{ item.nombre }} <span class="text-gray-400 text-xs">({{ item.identificacion }})</span>
                </button>
              </div>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_placa" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
              <input id="modal_veh_placa" v-model="form.placa" required maxlength="10" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.placa ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.placa" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.placa }}</p>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_vin" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">VIN / Chasis</label>
              <input id="modal_veh_vin" v-model="form.vin" maxlength="17" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.vin ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.vin" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.vin }}</p>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_motor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de Motor</label>
              <input id="modal_veh_motor" v-model="form.numero_motor" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="modal_veh_tipo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
              <select id="modal_veh_tipo" v-model="form.tipo" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
              <input id="modal_veh_marca" v-model="form.marca" required maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.marca ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.marca" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.marca }}</p>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
              <input id="modal_veh_modelo" v-model="form.modelo" required maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.modelo ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.modelo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.modelo }}</p>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_anio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año de Fabricación</label>
              <input id="modal_veh_anio" v-model="form.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.anio ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.anio" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.anio }}</p>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
              <input id="modal_veh_color" v-model="form.color" maxlength="30" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="modal_veh_transmision" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
              <select id="modal_veh_transmision" v-model="form.transmision" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option value="M">Manual / Mecánica</option>
                <option value="A">Automática</option>
                <option value="C">CVT</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
              <select id="modal_veh_combustible" v-model="form.combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option value="GAS">Gasolina</option>
                <option value="DIE">Diésel</option>
                <option value="HIB">Híbrido</option>
                <option value="ELE">Eléctrico</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_pais" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de Origen</label>
              <select id="modal_veh_pais" v-model="form.pais_origen" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="modal_veh_km" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje Actual</label>
              <input id="modal_veh_km" v-model="form.kilometraje_actual" type="number" min="0" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', vehicleErrors.kilometraje_actual ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="vehicleErrors.kilometraje_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.kilometraje_actual }}</p>
            </div>
            <div class="col-span-1">
              <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Imagen</p>
              <VehicleImageField
                :image-url="form.imagen"
                :disabled="isLoadingChoices"
                :max-size="2 * 1024 * 1024"
                :allowed-types="['image/jpeg', 'image/jpg', 'image/png', 'image/webp']"
                @upload="(file) => { imagenFile = file; }"
                @remove="() => { imagenFile = null; form.imagen = ''; }"
              />
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="modal_veh_obs" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
              <textarea id="modal_veh_obs" v-model="form.observaciones" rows="6" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || isLoading"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear vehículo') }}
        </button>
      </div>
    </div>
  </div>
</template>
