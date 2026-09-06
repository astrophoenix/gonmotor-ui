<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { serviciosService } from '../services/serviciosService';
import Alert from '../../../../shared/components/Alert.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  servicioId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.servicioId));

const CATEGORIAS = [
  { value: 'MECANICA', label: 'Mecánica General' },
  { value: 'ELECTRICO', label: 'Eléctrico / Electrónica' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento Preventivo' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico / Escaneo' },
  { value: 'ENDEREZADA', label: 'Enderezada / Pintura' },
  { value: 'GARANTIA', label: 'Garantía' },
];

function createEmptyForm() {
  return {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'MECANICA',
    tiempo_estimado_minutos: 60,
    tareas_estandar: '',
    precio_referencial: '0.00',
    contifico_producto_id: '',
  };
}

const form = reactive(createEmptyForm());
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const servicioErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    descripcion: form.descripcion,
    categoria: form.categoria,
    tiempo_estimado_minutos: form.tiempo_estimado_minutos,
    tareas_estandar: form.tareas_estandar,
    precio_referencial: form.precio_referencial,
    contifico_producto_id: form.contifico_producto_id,
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  servicioErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await serviciosService.getById(props.servicioId);
      Object.assign(form, createEmptyForm(), data);
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function validate() {
  servicioErrors.value = {};
  const errors = {};

  if (!form.codigo || !form.codigo.trim()) {
    errors.codigo = 'El código es obligatorio.';
  }
  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre del servicio es obligatorio.';
  }

  const tiempo = Number(form.tiempo_estimado_minutos);
  if (Number.isNaN(tiempo) || tiempo < 0) {
    errors.tiempo_estimado_minutos = 'Debe ser un número mayor o igual a 0.';
  }

  const precio = Number(form.precio_referencial);
  if (Number.isNaN(precio) || precio < 0) {
    errors.precio_referencial = 'Debe ser un número mayor o igual a 0.';
  }

  servicioErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...servicioErrors.value };
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[key] = val[0];
    } else if (typeof val === 'string') {
      newErrors[key] = val;
    }
  });
  servicioErrors.value = newErrors;
}

function buildPayload() {
  return {
    codigo: (form.codigo || '').trim().toUpperCase(),
    nombre: (form.nombre || '').trim(),
    descripcion: form.descripcion || '',
    categoria: form.categoria,
    tiempo_estimado_minutos: Number(form.tiempo_estimado_minutos ?? 60),
    tareas_estandar: form.tareas_estandar || '',
    precio_referencial: String(form.precio_referencial ?? '0.00'),
    contifico_producto_id: form.contifico_producto_id || '',
  };
}

async function reactivateInactive(inactiveId) {
  isSaving.value = true;
  try {
    const response = await serviciosService.update(inactiveId, { ...buildPayload(), is_active: true });
    emit('reactivated', response);
  } catch (error) {
    showError(error);
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  servicioErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validate();
    if (!valid) {
      errorMessage.value = 'Completa correctamente los campos del servicio.';
      isSaving.value = false;
      return;
    }

    const payload = buildPayload();

    if (isEditMode.value) {
      const response = await serviciosService.update(props.servicioId, payload);
      emit('updated', response);
    } else {
      const response = await serviciosService.create(payload);
      emit('created', response);
    }
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El servicio con código "${inactive.codigo}" (${inactive.nombre}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactive(inactive.id);
      } else {
        errorMessage.value = `El servicio "${inactive.codigo}" no se agregó. El registro permanece desactivado.`;
      }
      return;
    }
    showError(error);
    if (error.data) applyBackendErrors(error.data);
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

watch(() => form.codigo, (val) => {
  form.codigo = (val || '').trim().toUpperCase();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-4xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar servicio' : 'Nuevo servicio' }}
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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando servicio...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">Mano de Obra / Servicio</h4>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1">
              <label for="ser_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código</label>
              <input id="ser_codigo" v-model="form.codigo" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.codigo ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: MO-001">
              <p v-if="servicioErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.codigo }}</p>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="ser_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del Servicio</label>
              <input id="ser_nombre" v-model="form.nombre" maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.nombre ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: Cambio de aceite y filtro">
              <p v-if="servicioErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.nombre }}</p>
            </div>
            <div class="col-span-1">
              <label for="ser_categoria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoría</label>
              <select id="ser_categoria" v-model="form.categoria" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="ser_tiempo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tiempo Estimado (minutos)</label>
              <input id="ser_tiempo" v-model="form.tiempo_estimado_minutos" type="number" min="0" step="5" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.tiempo_estimado_minutos ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.tiempo_estimado_minutos" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.tiempo_estimado_minutos }}</p>
            </div>
            <div class="col-span-2">
              <label for="ser_precio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Precio Referencial de Mano de Obra</label>
              <input id="ser_precio" v-model="form.precio_referencial" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.precio_referencial ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.precio_referencial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.precio_referencial }}</p>
            </div>
            <div class="col-span-2">
              <label for="ser_contifico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto/Servicio Contífico</label>
              <input id="ser_contifico" v-model="form.contifico_producto_id" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1 md:col-span-4">
              <label for="ser_tareas" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tareas Estándar Incluidas</label>
              <textarea id="ser_tareas" v-model="form.tareas_estandar" rows="3" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white" placeholder="Ej: Drenar aceite, reemplazar filtro, verificar niveles y fugas..."></textarea>
            </div>
            <div class="col-span-1 md:col-span-4">
              <label for="ser_descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
              <textarea id="ser_descripcion" v-model="form.descripcion" rows="3" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear servicio') }}
        </button>
      </div>
    </div>
  </div>
</template>