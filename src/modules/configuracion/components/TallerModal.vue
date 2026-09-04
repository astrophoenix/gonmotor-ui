<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { talleresService } from '../services/talleresService';
import {
  sanitizeTaller,
  sanitizeText,
  sanitizeNombre,
  sanitizeObservaciones,
  sanitizeTelefono,
} from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tallerId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const isEditMode = computed(() => Boolean(props.tallerId));

const form = reactive({
  nombre: '',
  codigo_sucursal: '',
  ciudad: '',
  direccion: '',
  telefono: '',
  is_active: true,
});

const isLoading = ref(false);
const isSaving = ref(false);
const showDiscardWarning = ref(false);
const errorMessage = ref('');
const tallerErrors = ref({});
const formSnapshot = ref(null);

function getComparableState() {
  return {
    nombre: form.nombre,
    codigo_sucursal: form.codigo_sucursal,
    ciudad: form.ciudad,
    direccion: form.direccion,
    telefono: form.telefono,
    is_active: form.is_active,
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function createEmptyForm() {
  return {
    nombre: '',
    codigo_sucursal: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    is_active: true,
  };
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  tallerErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
  formSnapshot.value = getComparableState();
}

async function open() {
  resetForm();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await talleresService.getTaller(props.tallerId);
      Object.assign(form, createEmptyForm(), data);
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function validateTaller() {
  tallerErrors.value = {};
  const errors = {};

  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre del taller es obligatorio.';
  }

  if (!form.codigo_sucursal || !form.codigo_sucursal.trim()) {
    errors.codigo_sucursal = 'El código del taller es obligatorio.';
  }

  if (!form.direccion || !form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }

  tallerErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const fieldMap = {
    nombre: 'nombre',
    codigo_sucursal: 'codigo_sucursal',
    ciudad: 'ciudad',
    direccion: 'direccion',
    telefono: 'telefono',
  };
  const newErrors = { ...tallerErrors.value };
  Object.keys(fieldMap).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[fieldMap[key]] = val[0];
    } else if (typeof val === 'string') {
      newErrors[fieldMap[key]] = val;
    }
  });
  tallerErrors.value = newErrors;
}

function buildPayload() {
  return {
    nombre: form.nombre.trim(),
    codigo_sucursal: form.codigo_sucursal.trim(),
    ciudad: form.ciudad.trim(),
    direccion: form.direccion.trim(),
    telefono: form.telefono,
    is_active: form.is_active,
  };
}

async function submit() {
  errorMessage.value = '';
  tallerErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validateTaller();
    if (!valid) {
      errorMessage.value = 'Completa correctamente los campos del taller.';
      isSaving.value = false;
      return;
    }

    const payload = buildPayload();

    if (isEditMode.value) {
      const response = await talleresService.updateTaller(props.tallerId, payload);
      emit('updated', response);
    } else {
      const response = await talleresService.createTaller(payload);
      emit('created', response);
    }
  } catch (error) {
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
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar taller' : 'Nuevo taller' }}
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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando taller...</div>
        <template v-else>
          <div class="space-y-4">
            <div>
              <label for="modal_taller_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre *</label>
              <input
                id="modal_taller_nombre"
                v-model="form.nombre"
                maxlength="150"
                @input="form.nombre = sanitizeTaller(form.nombre)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', tallerErrors.nombre ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="tallerErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerErrors.nombre }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="modal_taller_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código del taller *</label>
                <input
                  id="modal_taller_codigo"
                  v-model="form.codigo_sucursal"
                  maxlength="10"
                  @input="form.codigo_sucursal = sanitizeText(form.codigo_sucursal)"
                  :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', tallerErrors.codigo_sucursal ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
                >
                <p v-if="tallerErrors.codigo_sucursal" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerErrors.codigo_sucursal }}</p>
              </div>
              <div>
                <label for="modal_taller_ciudad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ciudad</label>
                <input
                  id="modal_taller_ciudad"
                  v-model="form.ciudad"
                  maxlength="100"
                  @input="form.ciudad = sanitizeNombre(form.ciudad)"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
              </div>
            </div>

            <div>
              <label for="modal_taller_direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección *</label>
              <textarea
                id="modal_taller_direccion"
                v-model="form.direccion"
                rows="2"
                maxlength="300"
                @input="form.direccion = sanitizeObservaciones(form.direccion)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', tallerErrors.direccion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              ></textarea>
              <p v-if="tallerErrors.direccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerErrors.direccion }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="modal_taller_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
                <input
                  id="modal_taller_telefono"
                  v-model="form.telefono"
                  inputmode="numeric"
                  maxlength="20"
                  @input="form.telefono = sanitizeTelefono(form.telefono)"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
              </div>
              <div>
                <label for="modal_taller_activo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Estado</label>
                <label class="inline-flex items-center cursor-pointer">
                  <input id="modal_taller_activo" v-model="form.is_active" type="checkbox" class="sr-only peer">
                  <div class="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  <span class="ms-3 text-sm text-gray-900 dark:text-white">{{ form.is_active ? 'Activo' : 'Inactivo' }}</span>
                </label>
              </div>
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear taller') }}
        </button>
      </div>
    </div>
  </div>
</template>