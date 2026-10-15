<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { X, Save, FileText, FilePlusCorner, FilePen } from 'lucide-vue-next';
import {
  sanitizeIdentificacion,
  sanitizeEmail,
  sanitizeTelefono,
  validateEmail,
} from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import { empresasService } from '../services/empresasService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  empresaId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const isEditMode = computed(() => Boolean(props.empresaId));

const form = reactive({
  nombre_comercial: '',
  razon_social: '',
  ruc: '',
  telefono: '',
  email_contacto: '',
  is_active: true,
});

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const empresaErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

const FIELDS = ['nombre_comercial', 'razon_social', 'ruc', 'telefono', 'email_contacto'];

function getComparableState() {
  return { ...form };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

function inputClass(field) {
  return empresaErrors.value[field]
    ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong'
    : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body';
}

function labelClass(field) {
  return ['block mb-2.5 text-sm font-medium', empresaErrors.value[field] ? 'text-fg-danger-strong' : 'text-heading'];
}

function validateForm() {
  const errors = {};

  if (!form.nombre_comercial.trim()) errors.nombre_comercial = 'El nombre comercial es obligatorio.';

  if (!form.ruc) {
    errors.ruc = 'El RUC es obligatorio.';
  } else if (form.ruc.length !== 13) {
    errors.ruc = 'El RUC debe tener exactamente 13 dígitos.';
  }

  const emailError = validateEmail(form.email_contacto);
  if (emailError) errors.email_contacto = emailError;

  if (form.telefono && (form.telefono.length < 7 || form.telefono.length > 15)) {
    errors.telefono = 'El teléfono debe tener entre 7 y 15 dígitos.';
  }

  empresaErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function resetForm() {
  Object.assign(form, {
    nombre_comercial: '',
    razon_social: '',
    ruc: '',
    telefono: '',
    email_contacto: '',
    is_active: true,
  });
  empresaErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (!isEditMode.value) return;

  isLoading.value = true;
  try {
    const data = await empresasService.getById(props.empresaId);
    Object.assign(form, {
      nombre_comercial: data.nombre_comercial || '',
      razon_social: data.razon_social || '',
      ruc: data.ruc || '',
      telefono: data.telefono || '',
      email_contacto: data.email_contacto || '',
      is_active: data.is_active !== false,
    });
    nextTick().then(() => { formSnapshot.value = getComparableState(); });
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo cargar la empresa.';
  } finally {
    isLoading.value = false;
  }
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...empresaErrors.value };
  FIELDS.forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[key] = val[0];
    } else if (typeof val === 'string') {
      newErrors[key] = val;
    }
  });
  empresaErrors.value = newErrors;
}

function buildPayload() {
  return {
    nombre_comercial: form.nombre_comercial.trim(),
    razon_social: form.razon_social.trim(),
    ruc: form.ruc,
    telefono: form.telefono,
    email_contacto: form.email_contacto,
    is_active: form.is_active,
  };
}

async function submit() {
  errorMessage.value = '';
  empresaErrors.value = {};

  if (!validateForm()) {
    errorMessage.value = 'Completa correctamente los campos marcados.';
    return;
  }

  isSaving.value = true;
  try {
    if (isEditMode.value) {
      emit('updated', await empresasService.update(props.empresaId, buildPayload()));
    } else {
      emit('created', await empresasService.create(buildPayload()));
    }
  } catch (error) {
    errorMessage.value = error.message || 'No fue posible guardar la empresa.';
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

function close() {
  if (hasChanges.value && !isSaving.value && !showDiscardWarning.value) {
    showDiscardWarning.value = true;
    return;
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (val) => {
  if (val) open();
});

watch(() => form.ruc, (val) => {
  const clean = sanitizeIdentificacion(val, 'R');
  if (clean !== val) form.ruc = clean;
});
watch(() => form.telefono, (val) => {
  const clean = sanitizeTelefono(val);
  if (clean !== val) form.telefono = clean;
});
watch(() => form.email_contacto, (val) => {
  const clean = sanitizeEmail(val);
  if (clean !== val) form.email_contacto = clean;
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FilePen v-if="isEditMode" class="w-5 h-5" />
            <FilePlusCorner v-else class="w-5 h-5" />
            {{ isEditMode ? 'Editar empresa' : 'Nueva empresa' }}
          </span>
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <X class="w-5 h-5" />
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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando empresa...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-800 dark:text-white" />
              Información General
            </span>
          </h4>
          <div class="grid grid-cols-6 gap-4">
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_nombre_comercial" :class="labelClass('nombre_comercial')">Nombre comercial</label>
              <input id="empresa_nombre_comercial" v-model="form.nombre_comercial" required maxlength="200" :class="inputClass('nombre_comercial')">
              <p v-if="empresaErrors.nombre_comercial" class="mt-2.5 text-sm text-fg-danger-strong">{{ empresaErrors.nombre_comercial }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_razon_social" :class="labelClass('razon_social')">Razón social</label>
              <input id="empresa_razon_social" v-model="form.razon_social" maxlength="200" :class="inputClass('razon_social')">
              <p v-if="empresaErrors.razon_social" class="mt-2.5 text-sm text-fg-danger-strong">{{ empresaErrors.razon_social }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_ruc" :class="labelClass('ruc')">RUC</label>
              <input id="empresa_ruc" v-model="form.ruc" required inputmode="numeric" maxlength="13" placeholder="13 dígitos" :class="inputClass('ruc')">
              <p v-if="empresaErrors.ruc" class="mt-2.5 text-sm text-fg-danger-strong">{{ empresaErrors.ruc }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_telefono" :class="labelClass('telefono')">Teléfono</label>
              <input id="empresa_telefono" v-model="form.telefono" inputmode="tel" maxlength="15" :class="inputClass('telefono')">
              <p v-if="empresaErrors.telefono" class="mt-2.5 text-sm text-fg-danger-strong">{{ empresaErrors.telefono }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_email" :class="labelClass('email_contacto')">Correo electrónico</label>
              <input id="empresa_email" v-model="form.email_contacto" type="email" required maxlength="254" :class="inputClass('email_contacto')">
              <p v-if="empresaErrors.email_contacto" class="mt-2.5 text-sm text-fg-danger-strong">{{ empresaErrors.email_contacto }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="empresa_estado" class="block mb-2.5 text-sm font-medium text-heading">Estado</label>
              <select id="empresa_estado" v-model="form.is_active" class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs">
                <option :value="true">Activa</option>
                <option :value="false">Inactiva</option>
              </select>
              <p v-if="!form.is_active" class="mt-2.5 text-xs text-body">Los usuarios de una empresa inactiva no pueden ingresar a ella.</p>
            </div>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-body bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary-soft shadow-xs font-medium leading-5 rounded text-sm px-4 py-2.5 focus:outline-none"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || isLoading"
          class="inline-flex items-center text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-sm px-4 py-2.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          @click="submit"
        >
          <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
          <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </div>
  </div>
</template>
