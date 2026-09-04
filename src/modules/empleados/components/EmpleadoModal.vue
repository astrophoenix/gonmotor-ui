<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { empleadosService } from '../services/empleadosService';
import { request } from '../../../shared/services/httpClient';
import Alert from '../../../shared/components/Alert.vue';
import {
  sanitizeNombre,
  sanitizeEmail,
  sanitizeTelefono,
} from '../../../shared/utils/sanitize';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  empleadoId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const isEditMode = computed(() => Boolean(props.empleadoId));

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  telefono: '',
  rol: 'MECANICO',
  talleres: [],
  is_active: true,
});
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const empleadoErrors = ref({});

const roles = [
  { value: 'ADMIN_SISTEMA', label: 'Superadmin SaaS' },
  { value: 'ADMIN_EMPRESA', label: 'Dueño / Admin de Empresa' },
  { value: 'ADMIN_TALLER', label: 'Gerente de Taller' },
  { value: 'ASESOR', label: 'Asesor de Servicio' },
  { value: 'MECANICO', label: 'Técnico / Mecánico' },
  { value: 'CAJERO', label: 'Caja / Facturación' },
];

const talleres = ref([]);
const isLoadingTalleres = ref(false);
const tallerSearch = ref('');
const showTallerDropdown = ref(false);
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    telefono: form.telefono,
    rol: form.rol,
    talleres: [...form.talleres],
    is_active: form.is_active,
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

const talleresFiltrados = computed(() => {
  const term = (tallerSearch.value || '').trim().toLowerCase();
  if (!term) return talleres.value;
  return talleres.value.filter((t) => {
    const text = [t.nombre, t.codigo_sucursal, t.ciudad, t.direccion, t.telefono]
      .filter(Boolean).join(' ').toLowerCase();
    return text.includes(term);
  });
});

function isTallerSelected(id) {
  return form.talleres.includes(id);
}

function toggleTaller(id) {
  const index = form.talleres.indexOf(id);
  if (index >= 0) {
    form.talleres.splice(index, 1);
  } else {
    form.talleres.push(id);
  }
}

function onTallerDocClick(event) {
  if (showTallerDropdown.value && event.target
    && !event.target.closest('#dropdownTalleresButton')
    && !event.target.closest('[data-taller-dropdown]')) {
    showTallerDropdown.value = false;
  }
}

function onTallerEscape(event) {
  if (event.key === 'Escape') {
    showTallerDropdown.value = false;
  }
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

async function loadTalleres() {
  isLoadingTalleres.value = true;
  try {
    const data = await request('/api/auth/empleados/talleres/');
    talleres.value = Array.isArray(data) ? data : (data.results || []);
  } catch (error) {
    console.error('No se pudieron cargar los talleres:', error);
    talleres.value = [];
  } finally {
    isLoadingTalleres.value = false;
  }
}

function resetForm() {
  form.first_name = '';
  form.last_name = '';
  form.email = '';
  form.telefono = '';
  form.rol = 'MECANICO';
  form.talleres = [];
  form.is_active = true;
  empleadoErrors.value = {};
  errorMessage.value = '';
  tallerSearch.value = '';
  showTallerDropdown.value = false;
  showDiscardWarning.value = false;
  formSnapshot.value = getComparableState();
}

function validateForm() {
  empleadoErrors.value = {};
  const errors = {};

  if (!form.first_name || !form.first_name.trim()) {
    errors.first_name = 'El nombre es obligatorio.';
  }
  if (!form.last_name || !form.last_name.trim()) {
    errors.last_name = 'El apellido es obligatorio.';
  }
  if (!form.email || !form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  empleadoErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const fieldMap = {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    telefono: 'telefono',
    rol: 'rol',
  };
  const newErrors = { ...empleadoErrors.value };
  Object.keys(fieldMap).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[fieldMap[key]] = val[0];
    } else if (typeof val === 'string') {
      newErrors[fieldMap[key]] = val;
    }
  });
  empleadoErrors.value = newErrors;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();
  loadTalleres();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await empleadosService.getById(props.empleadoId);
      Object.assign(form, {
        first_name: data.user?.first_name || '',
        last_name: data.user?.last_name || '',
        email: data.user?.email || '',
        telefono: data.user?.telefono || '',
        rol: data.rol || 'MECANICO',
        talleres: (data.talleres || []).map((t) => t.id),
        is_active: data.is_active,
      });
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

async function submit() {
  errorMessage.value = '';
  empleadoErrors.value = {};
  isSaving.value = true;

  try {
    const formValid = validateForm();
    if (!formValid) {
      errorMessage.value = 'Completa correctamente los campos obligatorios.';
      isSaving.value = false;
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono.trim(),
      rol: form.rol,
      talleres: form.talleres,
      is_active: form.is_active,
    };

    if (isEditMode.value) {
      const response = await empleadosService.update(props.empleadoId, payload);
      emit('updated', response);
    } else {
      const response = await empleadosService.create(payload);
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

watch(() => form.first_name, (val) => {
  const clean = sanitizeNombre(val);
  if (clean !== val) form.first_name = clean;
});
watch(() => form.last_name, (val) => {
  const clean = sanitizeNombre(val);
  if (clean !== val) form.last_name = clean;
});
watch(() => form.email, (val) => {
  const clean = sanitizeEmail(val);
  if (clean !== val) form.email = clean;
});
watch(() => form.telefono, (val) => {
  const clean = sanitizeTelefono(val);
  if (clean !== val) form.telefono = clean;
});

onMounted(() => {
  document.addEventListener('click', onTallerDocClick);
  document.addEventListener('keydown', onTallerEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onTallerDocClick);
  document.removeEventListener('keydown', onTallerEscape);
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar empleado' : 'Nuevo empleado' }}
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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando empleado...</div>
        <template v-else>
          <div class="grid grid-cols-6 gap-4">
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_first_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombres</label>
              <input id="modal_first_name" v-model="form.first_name" required maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.first_name ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="empleadoErrors.first_name" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.first_name }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_last_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Apellidos</label>
              <input id="modal_last_name" v-model="form.last_name" required maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.last_name ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="empleadoErrors.last_name" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.last_name }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
              <input id="modal_email" v-model="form.email" type="email" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.email ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="empleadoErrors.email" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.email }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
              <input id="modal_telefono" v-model="form.telefono" maxlength="20" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="modal_rol" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Rol</label>
              <select id="modal_rol" v-model="form.rol" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in roles" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-6 sm:col-span-3" v-if="isEditMode">
              <div class="flex items-center pt-6">
                <input id="modal_is_active" v-model="form.is_active" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                <label for="modal_is_active" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Acceso activo</label>
              </div>
            </div>

            <div class="col-span-6">
              <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Talleres Asignados</span>
              <div v-if="isLoadingTalleres" class="text-sm text-gray-500 dark:text-gray-400">Cargando talleres...</div>
              <div v-else-if="!talleres.length" class="text-sm text-gray-500 dark:text-gray-400">No hay talleres disponibles.</div>

              <div v-else-if="talleres.length <= 6" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label
                  v-for="taller in talleres"
                  :key="taller.id"
                  :for="`modal-taller-${taller.id}`"
                  class="relative flex cursor-pointer rounded-lg border transition-colors p-3"
                  :class="isTallerSelected(taller.id)
                    ? 'bg-primary-50 border-primary-500 dark:bg-primary-900/30 dark:border-primary-500'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'"
                >
                  <div class="flex-1 space-y-1.5 pr-7">
                    <div class="flex items-center gap-2">
                      <svg class="shrink-0 w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h12M6 4v16M6 4H5m13 0v16m0-16h1m-1 16H6m12 0h1M6 20H5M9 7h1v1H9V7Zm5 0h1v1h-1V7Zm-5 4h1v1H9v-1Zm5 0h1v1h-1v-1Zm-3 4h2a1 1 0 0 1 1 1v4h-4v-4a1 1 0 0 1 1-1Z"/>
                      </svg>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ taller.nombre }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <svg class="shrink-0 w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8-4-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3l-4 4Z"/>
                      </svg>
                      <span class="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {{ [taller.codigo_sucursal, taller.ciudad].filter(Boolean).join(' · ') || '—' }}
                      </span>
                    </div>
                    <div v-if="taller.direccion" class="flex items-center gap-2">
                      <svg class="shrink-0 w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.8 13.938h-.011a7 7 0 1 0-11.464.144h-.016l.14.171c.1.127.2.251.3.371L12 21l5.13-6.248c.194-.209.374-.429.54-.659l.13-.155Z"/>
                      </svg>
                      <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ taller.direccion }}</span>
                    </div>
                    <div v-if="taller.telefono" class="flex items-center gap-2">
                      <svg class="shrink-0 w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5h3l2 4-2 1a8 8 0 0 0 5 5l1-2 4 2v3a2 2 0 0 1-2 2A14 14 0 0 1 4 7a2 2 0 0 1 2-2Z"/>
                      </svg>
                      <span class="text-xs text-gray-600 dark:text-gray-400">{{ taller.telefono }}</span>
                    </div>
                  </div>
                  <input
                    :id="`modal-taller-${taller.id}`"
                    v-model="form.talleres"
                    :value="taller.id"
                    type="checkbox"
                    class="absolute top-3 right-3 w-4 h-4 rounded border border-gray-300 bg-white text-primary-600 focus:ring-2 focus:ring-primary-300 dark:bg-gray-600 dark:border-gray-500 dark:focus:ring-primary-800"
                  />
                </label>
              </div>

              <div v-else class="w-full max-w-xs sm:max-w-sm">
                <button
                  id="modal-dropdownTalleresButton"
                  type="button"
                  class="inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                  @click="showTallerDropdown = !showTallerDropdown"
                >
                  <span>{{ form.talleres.length }} taller(es) seleccionado(s)</span>
                  <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                  </svg>
                </button>
                <div v-if="showTallerDropdown" data-taller-dropdown class="z-10 w-full mt-2 bg-white rounded-lg shadow-sm dark:bg-gray-700">
                  <div class="p-3">
                    <label for="modal-talleres-search" class="sr-only">Buscar taller</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                      </div>
                      <input
                        id="modal-talleres-search"
                        v-model="tallerSearch"
                        type="text"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full ps-10 p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                        placeholder="Buscar taller..."
                        @click.stop
                      />
                    </div>
                  </div>
                  <ul class="h-48 px-3 pb-3 overflow-y-auto text-sm text-gray-700 dark:text-gray-200" aria-labelledby="modal-dropdownTalleresButton">
                    <li v-if="!talleresFiltrados.length" class="p-2 text-sm text-gray-500 dark:text-gray-400">
                      No se encontraron resultados.
                    </li>
                    <li v-for="taller in talleresFiltrados" :key="taller.id">
                      <div class="flex items-center p-2 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600">
                        <input
                          :id="`modal-taller-check-${taller.id}`"
                          :checked="isTallerSelected(taller.id)"
                          type="checkbox"
                          class="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded-sm focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                          @change="toggleTaller(taller.id)"
                        >
                        <label :for="`modal-taller-check-${taller.id}`" class="w-full ms-2 text-sm font-medium text-gray-900 rounded-sm dark:text-gray-300">{{ taller.nombre }}</label>
                      </div>
                    </li>
                  </ul>
                </div>
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear empleado') }}
        </button>
      </div>
    </div>
  </div>
</template>
