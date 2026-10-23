<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Car, Trash2, Save, IdCard, Phone, Mail, MapPin, Contact, Plus, ChevronDown, CarFront, Gauge, NotebookPen, Wand2, Loader2, CircleAlert, UserRoundPlus, UserRoundPen } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { sanitizeIdentificacion, sanitizeNombreUpper, sanitizeEmail, sanitizeTelefono, formatPlaca, sanitizeVin, sanitizeText, recortarEspacios, sanitizeColor, sanitizeMotor, sanitizeObservaciones, sanitizeDireccion, sanitizeAnio, sanitizeKilometraje, getItemKey as getVehicleKey, validatePlaca, validateTelefono } from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import VehicleImageField from '../../../shared/components/VehicleImageField.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  clientId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.clientId));

const form = reactive({
  tipo_identificacion: 'C',
  identificacion: '',
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  acepta_promociones: false,
});
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const vehiculos = ref([]);
let nextVehicleUid = 1;
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const vehiculoErrors = ref({});
const clientErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);
// Vehículos desplegados, por clave (_uid o id). Fuera del objeto para no ensuciar el payload.
const vehiculosAbiertos = ref({});
const cuerpo = ref(null);

const TIPOS_IDENTIFICACION = [
  { value: 'C', label: 'Cédula', largo: 10 },
  { value: 'R', label: 'RUC', largo: 13 },
  { value: 'P', label: 'Pasaporte', largo: null },
];
const largoIdentificacion = computed(() => (TIPOS_IDENTIFICACION.find((t) => t.value === form.tipo_identificacion) || {}).largo);

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';

// Clases de un input/select del cliente según tenga o no error de validación.
function inputClass(campo, extra = '') {
  return [BASE_INPUT, clientErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
}

function errorVehiculo(vehiculo, campo) {
  const errores = vehiculoErrors.value[getVehicleKey(vehiculo)];
  return errores ? errores[campo] : '';
}

function vehiculoClass(vehiculo, campo, extra = '') {
  return [BASE_INPUT, errorVehiculo(vehiculo, campo) ? INPUT_ERROR : INPUT_OK, extra];
}

function vehiculoTieneErrores(vehiculo) {
  const errores = vehiculoErrors.value[getVehicleKey(vehiculo)];
  return Boolean(errores && Object.keys(errores).length);
}

function resumenVehiculo(vehiculo) {
  return [[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' '), vehiculo.anio].filter(Boolean).join(' · ');
}

function estaAbierto(vehiculo) {
  return Boolean(vehiculosAbiertos.value[getVehicleKey(vehiculo)]);
}

function toggleVehiculo(vehiculo) {
  const key = getVehicleKey(vehiculo);
  vehiculosAbiertos.value = { ...vehiculosAbiertos.value, [key]: !vehiculosAbiertos.value[key] };
}

function getComparableState() {
  return {
    tipo_identificacion: form.tipo_identificacion,
    identificacion: form.identificacion,
    nombre: form.nombre,
    email: form.email,
    telefono: form.telefono,
    direccion: form.direccion,
    acepta_promociones: form.acepta_promociones,
    vehiculos: vehiculos.value.map((v) => {
      const { _uid, imagenFile, imagenPreview, ...rest } = v;
      return { ...rest, _tieneArchivo: Boolean(imagenFile) };
    }),
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

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
    if (placaError) errors.placa = placaError;
  }

  if (!vehiculo.marca || !vehiculo.marca.trim()) errors.marca = 'La marca es obligatoria.';
  if (!vehiculo.modelo || !vehiculo.modelo.trim()) errors.modelo = 'El modelo es obligatorio.';
  if (!vehiculo.vin || !vehiculo.vin.trim()) errors.vin = 'El VIN / Chasis es obligatorio.';

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
    if (Number.isNaN(km) || km < 0) {
      errors.kilometraje_actual = 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
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
    if (!validateVehiculo(vehiculo)) isValid = false;
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

  if (!form.nombre || !form.nombre.trim()) errors.nombre = 'El nombre o razón social es obligatorio.';

  if (!form.email || !form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }
  const telefonoError = validateTelefono(form.telefono);
  if (telefonoError) errors.telefono = telefonoError;
  if (!form.direccion || !form.direccion.trim()) errors.direccion = 'La dirección es obligatoria.';

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
    _teniaImagen: false,
  };
}

function addVehiculo() {
  const nuevo = createEmptyVehiculo();
  vehiculos.value.push(nuevo);
  // Solo el nuevo queda desplegado: los anteriores se resumen en su cabecera.
  vehiculosAbiertos.value = { [getVehicleKey(nuevo)]: true };
  const index = vehiculos.value.length - 1;
  nextTick(() => {
    const placa = document.getElementById(`modal_cli_veh${index}_placa`);
    if (!placa) return;
    placa.focus({ preventScroll: true });
    // Desplaza solo el cuerpo del modal (scrollIntoView movería también el fondo).
    const tarjeta = placa.closest('article');
    if (cuerpo.value && tarjeta) {
      const desplazamiento = tarjeta.getBoundingClientRect().top - cuerpo.value.getBoundingClientRect().top - 16;
      cuerpo.value.scrollBy({ top: desplazamiento, behavior: 'smooth' });
    }
  });
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
  form.acepta_promociones = false;
  vehiculos.value = [];
  vehiculoErrors.value = {};
  vehiculosAbiertos.value = {};
  clientErrors.value = {};
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
      const data = await request(`/api/clientes/${props.clientId}/`);
      Object.assign(form, {
        tipo_identificacion: data.tipo_identificacion || 'C',
        identificacion: data.identificacion || '',
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        acepta_promociones: Boolean(data.acepta_promociones),
      });
      if (data.vehiculos && Array.isArray(data.vehiculos)) {
        vehiculos.value = data.vehiculos.map((v) => ({ ...v, _teniaImagen: Boolean(v.imagen) }));
      }
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const fieldMap = {
    identificacion: 'identificacion',
    nombre: 'nombre',
    email: 'email',
    telefono: 'telefono',
    direccion: 'direccion',
  };
  const newErrors = { ...clientErrors.value };
  Object.keys(fieldMap).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[fieldMap[key]] = val[0];
    } else if (typeof val === 'string') {
      newErrors[fieldMap[key]] = val;
    }
  });
  clientErrors.value = newErrors;
}

function buildFormData() {
  const formData = new FormData();
  formData.append('tipo_identificacion', form.tipo_identificacion);
  formData.append('identificacion', form.identificacion);
  formData.append('nombre', recortarEspacios(form.nombre));
  formData.append('email', form.email || '');
  formData.append('telefono', form.telefono || '');
  formData.append('direccion', form.direccion || '');
  formData.append('acepta_promociones', form.acepta_promociones ? 'true' : 'false');

  const vehiculosPayload = vehiculos.value.map((v, index) => {
    const { _uid, imagenFile, imagenPreview, imagen, _teniaImagen, ...rest } = v;
    const item = {
      ...rest,
      placa: (v.placa || '').replace(/-/g, '').trim().toUpperCase(),
      marca: recortarEspacios(v.marca),
      modelo: recortarEspacios(v.modelo),
      anio: v.anio ? Number(v.anio) : null,
      kilometraje_actual: v.kilometraje_actual ? parseInt(v.kilometraje_actual, 10) : 0,
    };
    if (imagenFile) {
      formData.append(`vehiculo_${index}_imagen`, imagenFile);
    } else if (_teniaImagen && !v.imagen) {
      item.eliminar_imagen = true;
    }
    return item;
  });
  formData.append('vehiculos', JSON.stringify(vehiculosPayload));
  return formData;
}

async function reactivateInactiveClient(inactiveId) {
  const formData = buildFormData();
  formData.append('is_active', 'true');
  isSaving.value = true;
  try {
    const response = await request(`/api/clientes/${inactiveId}/`, {
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
  vehiculoErrors.value = {};
  clientErrors.value = {};
  isSaving.value = true;

  try {
    const formValid = validateForm();
    const vehiculosValid = validateVehiculos();

    if (!formValid || !vehiculosValid) {
      const parts = [];
      if (!formValid) parts.push('datos del cliente');
      if (!vehiculosValid) {
        parts.push('vehículos');
        // Despliega los vehículos con errores para que se vean los campos marcados.
        const abiertos = { ...vehiculosAbiertos.value };
        vehiculos.value.forEach((v) => { if (vehiculoTieneErrores(v)) abiertos[getVehicleKey(v)] = true; });
        vehiculosAbiertos.value = abiertos;
      }
      errorMessage.value = 'Revisa los campos marcados en ' + parts.join(' y ') + '.';
      isSaving.value = false;
      return;
    }

    const formData = buildFormData();

    if (isEditMode.value) {
      const response = await request(`/api/clientes/${props.clientId}/`, {
        method: 'PATCH',
        body: formData,
      });
      emit('updated', response);
    } else {
      const response = await request('/api/clientes/', {
        method: 'POST',
        body: formData,
      });
      emit('created', response);
    }
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El cliente "${inactive.nombre}" (${inactive.identificacion}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactiveClient(inactive.id);
      } else {
        errorMessage.value = `El cliente "${inactive.nombre}" no se agregó. El registro permanece desactivado.`;
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

watch(() => form.tipo_identificacion, () => {
  form.identificacion = sanitizeIdentificacion(form.identificacion, form.tipo_identificacion);
});
watch(() => form.identificacion, (val) => {
  const clean = sanitizeIdentificacion(val, form.tipo_identificacion);
  if (clean !== val) form.identificacion = clean;
});
watch(() => form.nombre, (val) => {
  const clean = sanitizeNombreUpper(val);
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
watch(() => form.direccion, (val) => {
  const clean = sanitizeDireccion(val);
  if (clean !== val) form.direccion = clean;
});
watch(vehiculos, (list) => {
  list.forEach((v) => {
    if (v.placa !== undefined && formatPlaca(v.placa) !== v.placa) v.placa = formatPlaca(v.placa);
    if (v.vin !== undefined && sanitizeVin(v.vin) !== v.vin) v.vin = sanitizeVin(v.vin);
    if (v.marca !== undefined && sanitizeText(v.marca) !== v.marca) v.marca = sanitizeText(v.marca);
    if (v.modelo !== undefined && sanitizeText(v.modelo) !== v.modelo) v.modelo = sanitizeText(v.modelo);
    if (v.color !== undefined && sanitizeColor(v.color) !== v.color) v.color = sanitizeColor(v.color);
    if (v.numero_motor !== undefined && sanitizeMotor(v.numero_motor) !== v.numero_motor) v.numero_motor = sanitizeMotor(v.numero_motor);
    if (v.anio !== undefined && v.anio !== null && v.anio !== '' && sanitizeAnio(String(v.anio)) !== String(v.anio)) v.anio = sanitizeAnio(String(v.anio));
    if (v.kilometraje_actual !== undefined && v.kilometraje_actual !== null && v.kilometraje_actual !== '' && sanitizeKilometraje(String(v.kilometraje_actual)) !== String(v.kilometraje_actual)) v.kilometraje_actual = sanitizeKilometraje(String(v.kilometraje_actual));
    if (v.observaciones !== undefined && sanitizeObservaciones(v.observaciones) !== v.observaciones) v.observaciones = sanitizeObservaciones(v.observaciones).slice(0, 500);
  });
}, { deep: true });
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/70 p-2 sm:p-4">
    <div class="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] my-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
      <!-- Cabecera -->
      <ModalCabecera
        :icono="isEditMode ? UserRoundPen : UserRoundPlus"
        :titulo="isEditMode ? 'Editar cliente' : 'Nuevo cliente'"
        :subtitulo="isEditMode ? 'Actualiza los datos del cliente y sus vehículos.' : 'Registra los datos del cliente y, si quieres, sus vehículos.'"
        @cerrar="close"
      />

      <!-- Cuerpo con scroll propio: cabecera y botones siempre visibles -->
      <div ref="cuerpo" class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-gray-50/60 dark:bg-gray-900/30">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando cliente...</div>
        <div v-else class="space-y-5">
          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <!-- Identificación -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <IdCard class="w-4 h-4" />
                Identificación
              </h4>
              <div class="space-y-4">
                <div>
                  <span id="modal_tipo_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de identificación</span>
                  <div role="radiogroup" aria-labelledby="modal_tipo_identificacion" class="grid grid-cols-3 gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <button
                      v-for="tipo in TIPOS_IDENTIFICACION"
                      :key="tipo.value"
                      type="button"
                      role="radio"
                      :aria-checked="form.tipo_identificacion === tipo.value"
                      :class="[
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300',
                        form.tipo_identificacion === tipo.value
                          ? 'bg-white text-brand-900 shadow-xs dark:bg-gray-800 dark:text-white'
                          : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
                      ]"
                      @click="form.tipo_identificacion = tipo.value"
                    >
                      {{ tipo.label }}
                    </button>
                  </div>
                </div>
                <div>
                  <label for="modal_identificacion" class="flex items-center justify-between mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    <span>Número de identificación <span class="text-accent-500 dark:text-accent-400">*</span></span>
                    <span v-if="largoIdentificacion" class="text-xs font-normal tabular-nums text-gray-400">{{ (form.identificacion || '').length }}/{{ largoIdentificacion }}</span>
                  </label>
                  <input id="modal_identificacion" v-model="form.identificacion" required :maxlength="largoIdentificacion || 20" :inputmode="largoIdentificacion ? 'numeric' : 'text'" :placeholder="form.tipo_identificacion === 'R' ? '13 dígitos' : (form.tipo_identificacion === 'C' ? '10 dígitos' : '')" :class="inputClass('identificacion', 'font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal')">
                  <p v-if="clientErrors.identificacion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.identificacion }}</p>
                </div>
                <div>
                  <label for="modal_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre o razón social <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <input id="modal_nombre" v-model="form.nombre" required maxlength="200" placeholder="Como aparece en la factura" :class="inputClass('nombre')" @blur="form.nombre = recortarEspacios(form.nombre)">
                  <p v-if="clientErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.nombre }}</p>
                </div>
              </div>
            </section>

            <!-- Contacto -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Contact class="w-4 h-4" />
                Contacto
              </h4>
              <div class="space-y-4">
                <div>
                  <label for="modal_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <div class="relative">
                    <Phone class="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none top-1/2 start-3" />
                    <input id="modal_telefono" v-model="form.telefono" type="tel" maxlength="15" placeholder="0991234567" :class="inputClass('telefono', 'ps-9 tabular-nums')">
                  </div>
                  <p v-if="clientErrors.telefono" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.telefono }}</p>
                  <p v-else class="mt-2 text-xs text-gray-500 dark:text-gray-400">Lo usamos para los recordatorios por WhatsApp.</p>
                </div>
                <div>
                  <label for="modal_email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <div class="relative">
                    <Mail class="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none top-1/2 start-3" />
                    <input id="modal_email" v-model="form.email" type="email" required maxlength="100" placeholder="cliente@correo.com" :class="inputClass('email', 'ps-9')">
                  </div>
                  <p v-if="clientErrors.email" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.email }}</p>
                </div>
                <div>
                  <label for="modal_direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <div class="relative">
                    <MapPin class="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none top-1/2 start-3" />
                    <input id="modal_direccion" v-model="form.direccion" maxlength="150" placeholder="Calle, número y ciudad" :class="inputClass('direccion', 'ps-9')">
                  </div>
                  <p v-if="clientErrors.direccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ clientErrors.direccion }}</p>
                </div>
                <label class="flex items-start gap-2 text-sm text-gray-900 dark:text-white">
                  <input v-model="form.acepta_promociones" type="checkbox" class="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600">
                  <span>
                    Acepta mensajes promocionales
                    <span class="block text-xs text-gray-500 dark:text-gray-400">Solo los clientes con esta casilla reciben las campañas masivas.</span>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <!-- Vehículos -->
          <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <div class="flex items-center justify-between gap-3 mb-4">
              <h4 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Car class="w-4 h-4" />
                Vehículos
                <span v-if="vehiculos.length" class="px-2 py-0.5 text-xs font-semibold normal-case tracking-normal rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{{ vehiculos.length }}</span>
              </h4>
              <button
                v-if="vehiculos.length"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 focus:ring-4 focus:ring-brand-100 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                @click="addVehiculo"
              >
                <Plus class="w-4 h-4" />
                Agregar vehículo
              </button>
            </div>

            <!-- Sin vehículos -->
            <div v-if="!vehiculos.length" class="flex flex-col items-center px-4 py-8 text-center border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-600">
              <span class="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                <Car class="w-6 h-6" />
              </span>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Este cliente aún no tiene vehículos</p>
              <p class="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">Regístralos ahora o más tarde desde su ficha.</p>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 focus:ring-4 focus:ring-brand-100 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                @click="addVehiculo"
              >
                <Plus class="w-4 h-4" />
                Agregar vehículo
              </button>
            </div>

            <div v-else class="space-y-3">
              <article
                v-for="(vehiculo, index) in vehiculos"
                :key="vehiculo._uid || vehiculo.id"
                :class="[
                  'rounded-lg border transition-colors',
                  vehiculoTieneErrores(vehiculo) ? 'border-red-300 dark:border-red-500/60' : (estaAbierto(vehiculo) ? 'border-brand-200 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700'),
                ]"
              >
                <!-- Resumen del vehículo: siempre visible -->
                <div :class="['flex items-center gap-3 px-3 py-2.5 sm:px-4', estaAbierto(vehiculo) ? 'border-b border-gray-200 bg-gray-50 rounded-t-lg dark:bg-gray-700/40 dark:border-gray-700' : '']">
                  <button
                    type="button"
                    class="flex items-center flex-1 min-w-0 gap-3 text-start focus:outline-none"
                    :aria-expanded="estaAbierto(vehiculo)"
                    @click="toggleVehiculo(vehiculo)"
                  >
                    <span class="inline-flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-full shrink-0 bg-brand-900 text-white dark:bg-brand-600">{{ index + 1 }}</span>
                    <span class="min-w-0">
                      <span v-if="vehiculo.placa" class="block font-mono text-sm font-semibold tracking-widest text-gray-900 uppercase truncate dark:text-white">{{ vehiculo.placa }}</span>
                      <span v-else class="block text-sm font-semibold text-gray-900 dark:text-white">Vehículo nuevo</span>
                      <span class="block text-xs text-gray-500 truncate dark:text-gray-400">{{ resumenVehiculo(vehiculo) || 'Completa placa, marca y modelo' }}</span>
                    </span>
                    <span v-if="vehiculoTieneErrores(vehiculo)" class="inline-flex items-center gap-1 px-2 py-0.5 ms-auto text-xs font-medium rounded-full shrink-0 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                      <CircleAlert class="w-3.5 h-3.5" />
                      <span class="hidden sm:inline">Revisar</span>
                    </span>
                    <ChevronDown :class="['w-5 h-5 shrink-0 text-gray-400 transition-transform', vehiculoTieneErrores(vehiculo) ? '' : 'ms-auto', estaAbierto(vehiculo) ? 'rotate-180' : '']" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    :title="`Quitar vehículo ${index + 1}`"
                    :aria-label="`Quitar vehículo ${index + 1}`"
                    @click="removeVehiculo(index)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>

                <!-- Formulario del vehículo -->
                <div v-show="estaAbierto(vehiculo)" class="p-3 space-y-5 sm:p-4">
                  <div>
                    <p class="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><IdCard class="w-3.5 h-3.5" /> Identificación</p>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label :for="`modal_cli_veh${index}_placa`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa <span class="text-accent-500 dark:text-accent-400">*</span></label>
                        <input :id="`modal_cli_veh${index}_placa`" v-model="vehiculo.placa" maxlength="10" placeholder="ABC-1234" :class="vehiculoClass(vehiculo, 'placa', 'font-mono text-base font-semibold uppercase tracking-widest placeholder:font-normal')">
                        <p v-if="errorVehiculo(vehiculo, 'placa')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'placa') }}</p>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_vin`" class="flex items-center justify-between mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          <span>VIN / Chasis <span class="text-accent-500 dark:text-accent-400">*</span></span>
                          <span class="text-xs font-normal tabular-nums text-gray-400">{{ (vehiculo.vin || '').length }}/17</span>
                        </label>
                        <input :id="`modal_cli_veh${index}_vin`" v-model="vehiculo.vin" maxlength="17" placeholder="17 caracteres" :class="vehiculoClass(vehiculo, 'vin', 'font-mono uppercase placeholder:normal-case placeholder:font-sans')">
                        <p v-if="errorVehiculo(vehiculo, 'vin')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'vin') }}</p>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_motor`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de motor</label>
                        <input :id="`modal_cli_veh${index}_motor`" v-model="vehiculo.numero_motor" maxlength="50" :class="vehiculoClass(vehiculo, 'numero_motor', 'font-mono uppercase')">
                      </div>
                    </div>
                  </div>

                  <div>
                    <p class="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><CarFront class="w-3.5 h-3.5" /> Características</p>
                    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <label :for="`modal_cli_veh${index}_marca`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca <span class="text-accent-500 dark:text-accent-400">*</span></label>
                        <input :id="`modal_cli_veh${index}_marca`" v-model="vehiculo.marca" maxlength="50" placeholder="Toyota" :class="vehiculoClass(vehiculo, 'marca')" @blur="vehiculo.marca = recortarEspacios(vehiculo.marca)">
                        <p v-if="errorVehiculo(vehiculo, 'marca')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'marca') }}</p>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_modelo`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo <span class="text-accent-500 dark:text-accent-400">*</span></label>
                        <input :id="`modal_cli_veh${index}_modelo`" v-model="vehiculo.modelo" maxlength="50" placeholder="Hilux" :class="vehiculoClass(vehiculo, 'modelo')" @blur="vehiculo.modelo = recortarEspacios(vehiculo.modelo)">
                        <p v-if="errorVehiculo(vehiculo, 'modelo')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'modelo') }}</p>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_anio`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año</label>
                        <input :id="`modal_cli_veh${index}_anio`" v-model="vehiculo.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" placeholder="2024" :class="vehiculoClass(vehiculo, 'anio')">
                        <p v-if="errorVehiculo(vehiculo, 'anio')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'anio') }}</p>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_color`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
                        <input :id="`modal_cli_veh${index}_color`" v-model="vehiculo.color" maxlength="30" placeholder="Blanco" :class="vehiculoClass(vehiculo, 'color')">
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_tipo`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
                        <select :id="`modal_cli_veh${index}_tipo`" v-model="vehiculo.tipo" :disabled="isLoadingChoices" :class="vehiculoClass(vehiculo, 'tipo')">
                          <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
                        </select>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_transmision`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
                        <select :id="`modal_cli_veh${index}_transmision`" v-model="vehiculo.transmision" :class="vehiculoClass(vehiculo, 'transmision')">
                          <option value="M">Manual / Mecánica</option>
                          <option value="A">Automática</option>
                          <option value="C">CVT</option>
                        </select>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_combustible`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
                        <select :id="`modal_cli_veh${index}_combustible`" v-model="vehiculo.combustible" :class="vehiculoClass(vehiculo, 'combustible')">
                          <option value="GAS">Gasolina</option>
                          <option value="DIE">Diésel</option>
                          <option value="HIB">Híbrido</option>
                          <option value="ELE">Eléctrico</option>
                        </select>
                      </div>
                      <div>
                        <label :for="`modal_cli_veh${index}_pais`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de origen</label>
                        <select :id="`modal_cli_veh${index}_pais`" v-model="vehiculo.pais_origen" :disabled="isLoadingChoices" :class="vehiculoClass(vehiculo, 'pais_origen')">
                          <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <p class="flex items-center h-8 gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><Gauge class="w-3.5 h-3.5" /> Kilometraje y foto</p>
                      <label :for="`modal_cli_veh${index}_km`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje actual <span class="text-accent-500 dark:text-accent-400">*</span></label>
                      <div class="relative">
                        <input :id="`modal_cli_veh${index}_km`" v-model="vehiculo.kilometraje_actual" type="number" min="0" :class="vehiculoClass(vehiculo, 'kilometraje_actual', 'pe-12 tabular-nums')">
                        <span class="absolute inset-y-0 flex items-center text-sm text-gray-500 pointer-events-none end-0 pe-3 dark:text-gray-400">km</span>
                      </div>
                      <p v-if="errorVehiculo(vehiculo, 'kilometraje_actual')" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorVehiculo(vehiculo, 'kilometraje_actual') }}</p>
                      <div class="mt-4">
                        <VehicleImageField
                          :image-url="vehiculo.imagen"
                          :disabled="isLoadingChoices"
                          @upload="(file) => { vehiculo.imagenFile = file; }"
                          @remove="() => { vehiculo.imagenFile = null; vehiculo.imagenPreview = ''; vehiculo.imagen = ''; }"
                        />
                      </div>
                    </div>
                    <div class="md:col-span-2">
                      <TextImprover
                        v-model="vehiculo.observaciones"
                        contexto="observaciones de un vehículo en un taller mecánico"
                        v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }">
                        <div class="flex items-center justify-between h-8 gap-2 mb-2">
                          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            <NotebookPen class="w-3.5 h-3.5" />
                            <label :for="`modal_cli_veh${index}_obs`">Observaciones</label>
                          </p>
                          <button
                            type="button"
                            title="Mejorar el texto con IA"
                            :disabled="mejorando || !vehiculo.observaciones"
                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="mejorar">
                            <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                            <Wand2 v-else class="w-4 h-4" />
                            {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                          </button>
                        </div>
                        <textarea :id="`modal_cli_veh${index}_obs`" v-model="vehiculo.observaciones" rows="9" maxlength="500" placeholder="Golpes, accesorios, detalles a tener en cuenta..." :class="vehiculoClass(vehiculo, 'observaciones')"></textarea>
                        <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
                        <div v-if="mejorado && !errorMejora" class="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                          <p>Texto mejorado. Revisa antes de guardar.</p>
                          <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                        </div>
                      </TextImprover>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <!-- Pie fijo -->
      <div class="flex flex-col-reverse gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700">
        <p class="hidden text-xs text-gray-500 sm:block dark:text-gray-400"><span class="text-accent-500 dark:text-accent-400">*</span> Campos obligatorios</p>
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
            class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-500 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submit"
          >
            <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
            <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear cliente') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
