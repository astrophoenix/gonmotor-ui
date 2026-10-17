<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Car, X, Save, UserRound, IdCard, Gauge, BellRing, Camera, NotebookPen, Wand2, Loader2, CarFront } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import {
  formatPlaca,
  stripPlacaDash,
  validatePlaca,
  sanitizeVin,
  sanitizeMotor,
  sanitizeText,
  recortarEspacios,
  sanitizeColor,
  sanitizeObservaciones,
} from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import VehicleImageField from '../../../shared/components/VehicleImageField.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  vehicleId: { type: [Number, String], default: null },
  // Al crear: propietario ya elegido ({ id, nombre }), p. ej. desde la ficha del cliente.
  cliente: { type: Object, default: null },
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
  proximo_mantenimiento_km: null,
  proxima_mantenimiento_fecha: null,
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
    proximo_mantenimiento_km: form.proximo_mantenimiento_km,
    proxima_mantenimiento_fecha: form.proxima_mantenimiento_fecha,
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

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';

// Clases de un input/select según tenga o no error de validación.
function inputClass(campo, extra = '') {
  return [BASE_INPUT, vehicleErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
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
    proximo_mantenimiento_km: null,
    proxima_mantenimiento_fecha: null,
    observaciones: '',
    cliente_id: null,
    imagen: '',
  };
}

function selectCliente(cliente) {
  form.cliente_id = cliente.id;
  clienteSearch.value = cliente.nombre;
}

function clearCliente() {
  form.cliente_id = null;
  clienteSearch.value = '';
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
  if (!isEditMode.value && props.cliente) selectCliente(props.cliente);
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
    if (key === 'proximo_mantenimiento_km') {
      const num = parseInt(value, 10);
      formData.append(key, Number.isNaN(num) ? '' : String(num));
      return;
    }
    if (key === 'proxima_mantenimiento_fecha') {
      formData.append(key, value ? String(value) : '');
      return;
    }
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
  formData.set('marca', recortarEspacios(form.marca));
  formData.set('modelo', recortarEspacios(form.modelo));
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
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/70 p-2 sm:p-4">
    <div class="relative flex flex-col w-full max-w-6xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] my-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
      <!-- Cabecera -->
      <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
            <Car class="w-5 h-5" />
          </span>
          <div>
            <h3 class="text-lg font-semibold leading-tight text-gray-900 dark:text-white">
              {{ isEditMode ? 'Editar vehículo' : 'Nuevo vehículo' }}
            </h3>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {{ isEditMode ? 'Actualiza los datos del vehículo y su próximo mantenimiento.' : 'Registra los datos del vehículo y, si quieres, su próximo mantenimiento.' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Cuerpo con scroll propio: cabecera y botones siempre visibles -->
      <div class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-gray-50/60 dark:bg-gray-900/30">
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
        <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <!-- Columna principal -->
          <div class="space-y-5 lg:col-span-2">
            <!-- Propietario -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <UserRound class="w-4 h-4" />
                Propietario
              </h4>
              <label for="modal_veh_cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</label>
              <ClienteSearchSelect
                id="modal_veh_cliente"
                v-model="clienteSearch"
                placeholder="Buscar por nombre, cédula o teléfono"
                @select="selectCliente"
                @clear="clearCliente"
              />
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Opcional. Puedes asignarlo después desde la ficha del vehículo.</p>
            </section>

            <!-- Identificación -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <IdCard class="w-4 h-4" />
                Identificación
              </h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label for="modal_veh_placa" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa <span class="text-accent-500">*</span></label>
                  <input id="modal_veh_placa" v-model="form.placa" required maxlength="10" placeholder="ABC-1234" :class="inputClass('placa', 'font-mono text-base font-semibold uppercase tracking-widest')">
                  <p v-if="vehicleErrors.placa" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.placa }}</p>
                </div>
                <div>
                  <label for="modal_veh_vin" class="flex items-center justify-between mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    <span>VIN / Chasis <span class="text-accent-500">*</span></span>
                    <span class="text-xs font-normal tabular-nums text-gray-400">{{ (form.vin || '').length }}/17</span>
                  </label>
                  <input id="modal_veh_vin" v-model="form.vin" maxlength="17" placeholder="17 caracteres" :class="inputClass('vin', 'font-mono uppercase placeholder:normal-case placeholder:font-sans')">
                  <p v-if="vehicleErrors.vin" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.vin }}</p>
                </div>
                <div>
                  <label for="modal_veh_motor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de motor</label>
                  <input id="modal_veh_motor" v-model="form.numero_motor" maxlength="50" :class="inputClass('numero_motor', 'font-mono uppercase placeholder:normal-case placeholder:font-sans')">
                </div>
              </div>
            </section>

            <!-- Características -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <CarFront class="w-4 h-4" />
                Características
              </h4>
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label for="modal_veh_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca <span class="text-accent-500">*</span></label>
                  <input id="modal_veh_marca" v-model="form.marca" required maxlength="50" placeholder="Toyota" :class="inputClass('marca')" @blur="form.marca = recortarEspacios(form.marca)">
                  <p v-if="vehicleErrors.marca" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.marca }}</p>
                </div>
                <div>
                  <label for="modal_veh_modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo <span class="text-accent-500">*</span></label>
                  <input id="modal_veh_modelo" v-model="form.modelo" required maxlength="50" placeholder="Hilux" :class="inputClass('modelo')" @blur="form.modelo = recortarEspacios(form.modelo)">
                  <p v-if="vehicleErrors.modelo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.modelo }}</p>
                </div>
                <div>
                  <label for="modal_veh_anio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año</label>
                  <input id="modal_veh_anio" v-model="form.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" placeholder="2024" :class="inputClass('anio')">
                  <p v-if="vehicleErrors.anio" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.anio }}</p>
                </div>
                <div>
                  <label for="modal_veh_color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
                  <input id="modal_veh_color" v-model="form.color" maxlength="30" placeholder="Blanco" :class="inputClass('color')">
                </div>
                <div>
                  <label for="modal_veh_tipo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
                  <select id="modal_veh_tipo" v-model="form.tipo" :disabled="isLoadingChoices" :class="inputClass('tipo')">
                    <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>
                <div>
                  <label for="modal_veh_transmision" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
                  <select id="modal_veh_transmision" v-model="form.transmision" :class="inputClass('transmision')">
                    <option value="M">Manual / Mecánica</option>
                    <option value="A">Automática</option>
                    <option value="C">CVT</option>
                  </select>
                </div>
                <div>
                  <label for="modal_veh_combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
                  <select id="modal_veh_combustible" v-model="form.combustible" :class="inputClass('combustible')">
                    <option value="GAS">Gasolina</option>
                    <option value="DIE">Diésel</option>
                    <option value="HIB">Híbrido</option>
                    <option value="ELE">Eléctrico</option>
                  </select>
                </div>
                <div>
                  <label for="modal_veh_pais" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de origen</label>
                  <select id="modal_veh_pais" v-model="form.pais_origen" :disabled="isLoadingChoices" :class="inputClass('pais_origen')">
                    <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Observaciones -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <TextImprover
                v-model="form.observaciones"
                contexto="observaciones de un vehículo en un taller mecánico"
                v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <h4 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                    <NotebookPen class="w-4 h-4" />
                    <label for="modal_veh_obs">Observaciones</label>
                  </h4>
                  <button
                    type="button"
                    title="Mejorar el texto con IA"
                    :disabled="mejorando || !form.observaciones"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="mejorar">
                    <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                    <Wand2 v-else class="w-4 h-4" />
                    {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                  </button>
                </div>
                <textarea id="modal_veh_obs" v-model="form.observaciones" rows="3" placeholder="Golpes, accesorios, detalles a tener en cuenta..." :class="inputClass('observaciones')"></textarea>
                <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
                <div v-if="mejorado && !errorMejora" class="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <p>Texto mejorado. Revisa antes de guardar.</p>
                  <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                </div>
              </TextImprover>
            </section>
          </div>

          <!-- Columna lateral -->
          <div class="space-y-5">
            <!-- Foto -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Camera class="w-4 h-4" />
                Foto del vehículo
              </h4>
              <VehicleImageField
                :image-url="form.imagen"
                :disabled="isLoadingChoices"
                @upload="(file) => { imagenFile = file; }"
                @remove="() => { imagenFile = null; form.imagen = ''; }"
              />
            </section>

            <!-- Kilometraje y mantenimiento -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Gauge class="w-4 h-4" />
                Kilometraje
              </h4>
              <label for="modal_veh_km" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje actual <span class="text-accent-500">*</span></label>
              <div class="relative">
                <input id="modal_veh_km" v-model="form.kilometraje_actual" type="number" min="0" :class="inputClass('kilometraje_actual', 'pe-12 tabular-nums')">
                <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">km</span>
              </div>
              <p v-if="vehicleErrors.kilometraje_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ vehicleErrors.kilometraje_actual }}</p>

              <div class="mt-5 p-4 rounded-lg border border-brand-100 bg-brand-50/70 dark:border-gray-600 dark:bg-gray-700/40">
                <p class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <BellRing class="w-4 h-4 text-brand-700 dark:text-brand-200" />
                  Próximo mantenimiento
                  <span class="ms-auto px-2 py-0.5 text-xs font-medium rounded-sm bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Opcional</span>
                </p>
                <p class="mt-1 mb-4 text-xs text-gray-500 dark:text-gray-400">
                  Con uno de estos datos le recordaremos al cliente por WhatsApp.
                </p>
                <div class="space-y-3">
                  <div>
                    <label for="modal_veh_prox_km" class="block mb-1.5 text-sm font-medium text-gray-900 dark:text-white">Al llegar a</label>
                    <div class="relative">
                      <input id="modal_veh_prox_km" v-model="form.proximo_mantenimiento_km" type="number" min="0" placeholder="50000" :class="inputClass('proximo_mantenimiento_km', 'pe-12 tabular-nums bg-white dark:bg-gray-700')">
                      <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">km</span>
                    </div>
                  </div>
                  <div>
                    <label for="modal_veh_prox_fecha" class="block mb-1.5 text-sm font-medium text-gray-900 dark:text-white">O en la fecha</label>
                    <input id="modal_veh_prox_fecha" v-model="form.proxima_mantenimiento_fecha" type="date" :class="inputClass('proxima_mantenimiento_fecha', 'bg-white dark:bg-gray-700')">
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- Pie fijo -->
      <div class="flex flex-col-reverse gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700">
        <p class="hidden text-xs text-gray-500 sm:block dark:text-gray-400"><span class="text-accent-500">*</span> Campos obligatorios</p>
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
            @click="close">
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isSaving || isLoading"
            class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-300 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus:ring-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submit"
          >
            <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
            <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear vehículo') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
