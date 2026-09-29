<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { ArrowLeft, CirclePlus, FileText, Truck } from 'lucide-vue-next';
import { proveedoresService } from '../services/proveedoresService';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import {
  sanitizeIdentificacion,
  sanitizeNombreUpper,
  sanitizeEmail,
  sanitizeTelefono,
  sanitizeDireccion,
  sanitizeText,
  validateTelefono,
} from '../../../shared/utils/sanitize';

const proveedorId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(proveedorId);

const form = reactive({
  tipo_identificacion: 'R',
  identificacion: '',
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  contacto: '',
});

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const proveedorErrors = ref({});

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function validateForm() {
  proveedorErrors.value = {};
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

  if (!form.email || !form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  const telefonoError = validateTelefono(form.telefono);
  if (telefonoError) {
    errors.telefono = telefonoError;
  }

  if (!form.direccion || !form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }

  proveedorErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const fieldMap = {
    identificacion: 'identificacion',
    nombre: 'nombre',
    email: 'email',
    telefono: 'telefono',
    direccion: 'direccion',
    contacto: 'contacto',
  };
  const newErrors = { ...proveedorErrors.value };
  Object.keys(fieldMap).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[fieldMap[key]] = val[0];
    } else if (typeof val === 'string') {
      newErrors[fieldMap[key]] = val;
    }
  });
  proveedorErrors.value = newErrors;
}

async function loadProveedor(clearMessages = true) {
  if (clearMessages) {
    errorMessage.value = '';
    successMessage.value = '';
  }

  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await proveedoresService.getById(proveedorId);
    Object.assign(form, {
      tipo_identificacion: data.tipo_identificacion || 'R',
      identificacion: data.identificacion || '',
      nombre: data.nombre || '',
      email: data.email || '',
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      contacto: data.contacto || '',
    });
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

function buildPayload() {
  return {
    tipo_identificacion: form.tipo_identificacion,
    identificacion: form.identificacion,
    nombre: form.nombre,
    email: form.email || '',
    telefono: form.telefono || '',
    direccion: form.direccion || '',
    contacto: form.contacto || '',
  };
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  proveedorErrors.value = {};
  isSaving.value = true;

  try {
    if (!validateForm()) {
      errorMessage.value = 'Completa correctamente los campos de: Información General';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    if (isEditMode) {
      await proveedoresService.update(proveedorId, buildPayload());
      successMessage.value = 'Proveedor actualizado correctamente.';
      await loadProveedor(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await proveedoresService.create(buildPayload());
      const nuevoId = response && response.id;
      if (nuevoId) {
        window.location.assign(`/crud/proveedores/editar/?id=${encodeURIComponent(nuevoId)}`);
      } else {
        successMessage.value = 'Proveedor creado correctamente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (error) {
    showError(error);
    if (error.data) {
      applyBackendErrors(error.data);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

function goToAdd() {
  window.location.assign('/crud/proveedores/agregar/');
}

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

watch(() => form.contacto, (val) => {
  const clean = sanitizeText(val);
  if (clean !== val) form.contacto = clean;
});

onMounted(() => {
  loadProveedor();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/proveedores/" class="hover:text-primary-600">Proveedores</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Agregar' }}</li>
      </ol>
    </nav>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/crud/proveedores/" title="Volver al listado" class="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
          <ArrowLeft class="w-5 h-5" />
        </a>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ isEditMode ? 'Editar proveedor' : 'Nuevo proveedor' }}</h1>
      </div>
      <button
        v-if="isEditMode"
        type="button"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-100 active:bg-primary-200 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
        @click="goToAdd"
      >
        <CirclePlus class="w-5 h-5" />
        Nuevo
      </button>
    </div>
  </div>

  <div class="p-4">
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
          Información General
        </span>
      </h4>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando proveedor...</div>
      <form v-else class="grid grid-cols-6 gap-6" novalidate @submit.prevent="submit">
        <div class="col-span-6 sm:col-span-3">
          <label for="tipo_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de identificación</label>
          <select id="tipo_identificacion" v-model="form.tipo_identificacion" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"><option value="C">Cédula</option><option value="R">RUC</option><option value="P">Pasaporte</option></select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</label>
          <input id="identificacion" v-model="form.identificacion" required maxlength="20" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', proveedorErrors.identificacion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="proveedorErrors.identificacion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ proveedorErrors.identificacion }}</p>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre o razón social</label>
          <input id="nombre" v-model="form.nombre" required maxlength="200" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', proveedorErrors.nombre ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="proveedorErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ proveedorErrors.nombre }}</p>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
          <input id="email" v-model="form.email" type="email" required :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', proveedorErrors.email ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="proveedorErrors.email" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ proveedorErrors.email }}</p>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
          <input id="telefono" v-model="form.telefono" maxlength="15" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', proveedorErrors.telefono ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="proveedorErrors.telefono" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ proveedorErrors.telefono }}</p>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="contacto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Persona de contacto</label>
          <input id="contacto" v-model="form.contacto" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección</label>
          <textarea id="direccion" v-model="form.direccion" rows="1" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', proveedorErrors.direccion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="proveedorErrors.direccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ proveedorErrors.direccion }}</p>
        </div>

        <div class="col-span-6">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/proveedores/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
