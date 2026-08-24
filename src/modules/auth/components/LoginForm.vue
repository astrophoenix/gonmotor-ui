<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const remember = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

// Variables para el flujo multi-empresa
const showCompanyModal = ref(false);
const userCompanies = ref([]);
const selectedCompanyId = ref(null);
const tempUserId = ref(null);

async function submit() {
  errorMessage.value = '';

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Debes completar email/usuario y contraseña.';
    return;
  }

  try {
    const response = await authStore.authenticate(
      { username: username.value.trim(), password: password.value },
      remember.value
    );

    // 🟢 CASO 1: Si tiene 1 sola empresa (o el backend autoseleccionó)
    if (!response?.requires_company_selection) {
      window.location.assign('/');
      return;
    }

    // 🟡 CASO 2: Si tiene MÚLTIPLES empresas
    userCompanies.value = response.empresas;
    tempUserId.value = response.user_id;
    showCompanyModal.value = true;

  } catch (error) {
    errorMessage.value = error.message || 'No se pudo iniciar sesión.';
  }
}

// Confirmar selección del modal
async function confirmCompany() {
  if (!selectedCompanyId.value) return;

  try {
    await authStore.selectCompany(
      {
        user_id: tempUserId.value,
        empresa_id: selectedCompanyId.value,
      },
      remember.value
    );
    window.location.assign('/');
  } catch (error) {
    errorMessage.value = error.message || 'Error al seleccionar la empresa.';
    showCompanyModal.value = false;
  }
}
</script>

<template>
  <div class="w-full p-6 space-y-8 sm:p-8 bg-white rounded-lg shadow dark:bg-gray-800 relative">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      Iniciar sesión
    </h2>

    <form autocomplete="on" class="mt-8 space-y-6" novalidate @submit.prevent="submit">
      <div>
        <label for="login" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Correo electrónico o Usuario
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3.5 5.5 7.893 6.036a1 1 0 0 0 1.214 0L20.5 5.5M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/></svg>
          </div>
          <input
            id="login"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="usuario@ejemplo.com"
            class="block w-full p-2.5 ps-9 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            required
          >
        </div>
      </div>

      <div>
        <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Contraseña
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
          </div>
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            placeholder="••••••••"
            class="block w-full p-2.5 ps-9 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            required
          >
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          >
            <svg v-if="showPassword" class="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
            <svg v-else class="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l16 16"/></svg>
          </button>
        </div>
      </div>

      <div class="flex items-start">
        <div class="flex items-center h-5">
          <input
            id="remember"
            v-model="remember"
            name="remember"
            type="checkbox"
            class="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
          >
        </div>
        <div class="ml-3 text-sm">
          <label for="remember" class="font-medium text-gray-900 dark:text-white">Recordarme</label>
        </div>
        <a href="#" class="ml-auto text-sm text-primary-700 hover:underline dark:text-primary-500">¿Olvidaste tu contraseña?</a>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ errorMessage }}
      </div>

      <button
        type="submit"
        :disabled="authStore.isLoading"
        class="w-full px-5 py-3 text-base font-medium text-center text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 sm:w-auto dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ authStore.isLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
      </button>
    </form>

    <div 
      v-if="showCompanyModal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">
          Selecciona Empresa
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Tu cuenta está asociada a más de una empresa. Elige con cuál deseas trabajar hoy:
        </p>

        <div>
          <label for="company_select" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Empresa Activa
          </label>
          <select
            id="company_select"
            v-model="selectedCompanyId"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
          >
            <option :value="null" disabled>-- Selecciona un empresa --</option>
            <option v-for="emp in userCompanies" :key="emp.id" :value="emp.id">
              {{ emp.nombre_comercial || emp.nombre }} (RUC: {{ emp.ruc }})
            </option>
          </select>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="showCompanyModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!selectedCompanyId || authStore.isLoading"
            @click="confirmCompany"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700"
          >
            {{ authStore.isLoading ? 'Guardando...' : 'Ingresar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>