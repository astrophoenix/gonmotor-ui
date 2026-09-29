<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { X, Save, FileText, UserRoundPlus, UserRoundPen } from 'lucide-vue-next';
import {
  sanitizeIdentificacion,
  sanitizeNombreUpper,
  sanitizeEmail,
  sanitizeTelefono,
  sanitizeDireccion,
  sanitizeText,
  validateTelefono,
} from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import { proveedoresService } from '../services/proveedoresService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  proveedorId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.proveedorId));

const form = reactive({
  tipo_identificacion: 'R',
  identificacion: '',
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  contacto: '',
});

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const proveedorErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    tipo_identificacion: form.tipo_identificacion,
    identificacion: form.identificacion,
    nombre: form.nombre,
    email: form.email,
    telefono: form.telefono,
    direccion: form.direccion,
    contacto: form.contacto,
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

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

  if (!form.nombre || !form.nombre.trim()) errors.nombre = 'El nombre o razón social es obligatorio.';

  if (!form.email || !form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  const telefonoError = validateTelefono(form.telefono);
  if (telefonoError) errors.telefono = telefonoError;

  if (!form.direccion || !form.direccion.trim()) errors.direccion = 'La dirección es obligatoria.';

  proveedorErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function resetForm() {
  form.tipo_identificacion = 'R';
  form.identificacion = '';
  form.nombre = '';
  form.email = '';
  form.telefono = '';
  form.direccion = '';
  form.contacto = '';
  proveedorErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await proveedoresService.getById(props.proveedorId);
      Object.assign(form, {
        tipo_identificacion: data.tipo_identificacion || 'R',
        identificacion: data.identificacion || '',
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        contacto: data.contacto || '',
      });
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

async function reactivateInactiveProveedor(inactiveId) {
  isSaving.value = true;
  try {
    const response = await proveedoresService.update(inactiveId, {
      ...buildPayload(),
      is_active: true,
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
  proveedorErrors.value = {};
  isSaving.value = true;

  try {
    if (!validateForm()) {
      errorMessage.value = 'Completa correctamente los campos de: Información General';
      isSaving.value = false;
      return;
    }

    if (isEditMode.value) {
      const response = await proveedoresService.update(props.proveedorId, buildPayload());
      emit('updated', response);
    } else {
      const response = await proveedoresService.create(buildPayload());
      emit('created', response);
    }
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El proveedor "${inactive.nombre}" (${inactive.identificacion}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactiveProveedor(inactive.id);
      } else {
        errorMessage.value = `El proveedor "${inactive.nombre}" no se agregó. El registro permanece desactivado.`;
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
watch(() => form.contacto, (val) => {
  const clean = sanitizeText(val);
  if (clean !== val) form.contacto = clean;
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-5xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          <span class="inline-flex items-center gap-2">
            <UserRoundPlus v-if="!isEditMode" class="w-5 h-5 inline-block me-2" />
            <UserRoundPen v-if="isEditMode" class="w-5 h-5 inline-block me-2" />
            {{ isEditMode ? 'Editar proveedor' : 'Nuevo proveedor' }}
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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando proveedor...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-800 dark:text-white" />
              Información General
            </span>
          </h4>
          <div class="grid grid-cols-6 gap-4">
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_tipo_identificacion" class="block mb-2.5 text-sm font-medium text-heading">Tipo de identificación</label>
              <select id="modal_tipo_identificacion" v-model="form.tipo_identificacion" required class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                <option value="C">Cédula</option>
                <option value="R">RUC</option>
                <option value="P">Pasaporte</option>
              </select>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_identificacion" :class="['block mb-2.5 text-sm font-medium', proveedorErrors.identificacion ? 'text-fg-danger-strong' : 'text-gray-900 dark:text-white']">Identificación</label>
              <input id="modal_identificacion" v-model="form.identificacion" required maxlength="20" :class="proveedorErrors.identificacion ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong' : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body'">
              <p v-if="proveedorErrors.identificacion" class="mt-2.5 text-sm text-fg-danger-strong">{{ proveedorErrors.identificacion }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_nombre" :class="['block mb-2.5 text-sm font-medium', proveedorErrors.nombre ? 'text-fg-danger-strong' : 'text-heading']">Nombre o razón social</label>
              <input id="modal_nombre" v-model="form.nombre" required maxlength="200" :class="proveedorErrors.nombre ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong' : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body'">
              <p v-if="proveedorErrors.nombre" class="mt-2.5 text-sm text-fg-danger-strong">{{ proveedorErrors.nombre }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_email" :class="['block mb-2.5 text-sm font-medium', proveedorErrors.email ? 'text-fg-danger-strong' : 'text-heading']">Correo electrónico</label>
              <input id="modal_email" v-model="form.email" type="email" required maxlength="100" :class="proveedorErrors.email ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong' : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body'">
              <p v-if="proveedorErrors.email" class="mt-2.5 text-sm text-fg-danger-strong">{{ proveedorErrors.email }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_telefono" :class="['block mb-2.5 text-sm font-medium', proveedorErrors.telefono ? 'text-fg-danger-strong' : 'text-heading']">Teléfono</label>
              <input id="modal_telefono" v-model="form.telefono" maxlength="15" :class="proveedorErrors.telefono ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong' : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body'">
              <p v-if="proveedorErrors.telefono" class="mt-2.5 text-sm text-fg-danger-strong">{{ proveedorErrors.telefono }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_contacto" class="block mb-2.5 text-sm font-medium text-heading">Persona de contacto</label>
              <input id="modal_contacto" v-model="form.contacto" maxlength="100" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body">
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_direccion" :class="['block mb-2.5 text-sm font-medium', proveedorErrors.direccion ? 'text-fg-danger-strong' : 'text-heading']">Dirección</label>
              <textarea id="modal_direccion" v-model="form.direccion" rows="2" maxlength="150" :class="proveedorErrors.direccion ? 'bg-danger-soft border border-danger-subtle text-fg-danger-strong text-sm rounded focus:ring-danger focus:border-danger block w-full px-3 py-2.5 shadow-xs placeholder:text-fg-danger-strong' : 'bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body'"></textarea>
              <p v-if="proveedorErrors.direccion" class="mt-2.5 text-sm text-fg-danger-strong">{{ proveedorErrors.direccion }}</p>
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
