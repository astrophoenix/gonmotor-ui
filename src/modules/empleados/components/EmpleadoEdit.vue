<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { empleadosService } from '../services/empleadosService';
import { request } from '../../../shared/services/httpClient';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import {
  sanitizeNombre,
  sanitizeEmail,
  sanitizeTelefono,
  sanitizeText,
} from '../../../shared/utils/sanitize';

const empleadoId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(empleadoId);
const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  telefono: '',
  rol: 'MECANICO',
  talleres: [],
  is_active: true,
});
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
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

async function loadEmpleado() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await empleadosService.getById(empleadoId);
    Object.assign(form, {
      first_name: data.user?.first_name || '',
      last_name: data.user?.last_name || '',
      email: data.user?.email || '',
      telefono: data.user?.telefono || '',
      rol: data.rol || 'MECANICO',
      talleres: (data.talleres || []).map(t => t.id),
      is_active: data.is_active,
    });
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  empleadoErrors.value = {};
  isSaving.value = true;

  try {
    const formValid = validateForm();
    if (!formValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (isEditMode) {
      await empleadosService.update(empleadoId, payload);
      successMessage.value = 'Empleado actualizado correctamente.';
      await loadEmpleado();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await empleadosService.create(payload);
      const nuevoId = response && response.id;
      if (nuevoId) {
        window.location.assign(`/crud/empleados/editar/?id=${encodeURIComponent(nuevoId)}`);
      } else {
        successMessage.value = 'Empleado creado correctamente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

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

watch(() => form.rol, (val) => {
  if (val !== form.rol) form.rol = val;
});

onMounted(() => {
  loadTalleres();
  loadEmpleado();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/empleados/" class="hover:text-primary-600">Empleados</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Agregar' }}</li>
      </ol>
    </nav>
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ isEditMode ? 'Editar empleado' : 'Nuevo empleado' }}</h1>
    </div>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25A2.25 2.25 0 004.5 19.5z"/>
          </svg>
          Información del Empleado
        </span>
      </h4>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando empleado...</div>
      <form v-else class="grid grid-cols-6 gap-6" novalidate @submit.prevent="submit">
        <div class="col-span-6 sm:col-span-3">
          <label for="first_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombres</label>
          <input id="first_name" v-model="form.first_name" required maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.first_name ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="empleadoErrors.first_name" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.first_name }}</p>
        </div>

        <div class="col-span-6 sm:col-span-3">
          <label for="last_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Apellidos</label>
          <input id="last_name" v-model="form.last_name" required maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.last_name ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="empleadoErrors.last_name" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.last_name }}</p>
        </div>

        <div class="col-span-6 sm:col-span-3">
          <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
          <input id="email" v-model="form.email" type="email" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', empleadoErrors.email ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
          <p v-if="empleadoErrors.email" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ empleadoErrors.email }}</p>
        </div>

        <div class="col-span-6 sm:col-span-3">
          <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
          <input id="telefono" v-model="form.telefono" maxlength="20" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
        </div>

        <div class="col-span-6 sm:col-span-3">
          <label for="rol" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Rol</label>
          <select id="rol" v-model="form.rol" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            <option v-for="item in roles" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>

        <div class="col-span-6 sm:col-span-3" v-if="isEditMode">
          <div class="flex items-center">
            <input id="is_active" v-model="form.is_active" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
            <label for="is_active" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Acceso activo</label>
          </div>
        </div>

        <div class="col-span-6">
          <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Talleres Asignados</span>
          <div v-if="isLoadingTalleres" class="text-sm text-gray-500 dark:text-gray-400">Cargando talleres...</div>
          <div v-else-if="!talleres.length" class="text-sm text-gray-500 dark:text-gray-400">No hay talleres disponibles.</div>
          <div v-else class="space-y-2">
            <div v-for="taller in talleres" :key="taller.id" class="flex items-center">
              <input :id="`taller-${taller.id}`" v-model="form.talleres" :value="taller.id" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
              <label :for="`taller-${taller.id}`" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">{{ taller.nombre }}</label>
            </div>
          </div>
        </div>

        <div class="col-span-6">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/empleados/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
