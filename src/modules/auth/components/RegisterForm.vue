<script setup>
import { ref } from 'vue';
  import { authService } from '../services/authService';

const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const acceptedTerms = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!email.value.trim() || !password.value || !passwordConfirmation.value) {
    errorMessage.value = 'Debes completar todos los campos.';
    return;
  }

  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  if (!acceptedTerms.value) {
    errorMessage.value = 'Debes aceptar los términos y condiciones.';
    return;
  }

  isLoading.value = true;

  try {
     await authService.register({
      email: email.value.trim(),
      password: password.value,
      password_confirmation: passwordConfirmation.value,
      accepted_terms: acceptedTerms.value
    });

    successMessage.value = 'Tu cuenta fue creada correctamente. Redirigiendo al inicio de sesión...';
    window.setTimeout(() => {
      window.location.assign('/authentication/sign-in/');
    }, 1200);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo crear la cuenta.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="w-full p-6 space-y-8 sm:p-8 bg-white rounded-lg shadow dark:bg-gray-800">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      Crear una cuenta
    </h2>

    <form class="mt-8 space-y-6" novalidate @submit.prevent="submit">
      <div>
        <label for="register-email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Correo electrónico
        </label>
        <input
          id="register-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
          placeholder="nombre@empresa.com"
          required
        >
      </div>

      <div>
        <label for="register-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Contraseña
        </label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          placeholder="••••••••"
          class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
          required
        >
      </div>

      <div>
        <label for="register-password-confirmation" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Confirmar contraseña
        </label>
        <input
          id="register-password-confirmation"
          v-model="passwordConfirmation"
          type="password"
          name="password_confirmation"
          autocomplete="new-password"
          placeholder="••••••••"
          class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
          required
        >
      </div>

      <div class="flex items-start">
        <div class="flex items-center h-5">
          <input
            id="accepted-terms"
            v-model="acceptedTerms"
            name="accepted_terms"
            type="checkbox"
            class="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
          >
        </div>
        <div class="ml-3 text-sm">
          <label for="accepted-terms" class="font-medium text-gray-900 dark:text-white">
            Acepto los <a href="#" class="text-primary-700 hover:underline dark:text-primary-500">términos y condiciones</a>
          </label>
        </div>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        role="status"
        class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
      >
        {{ successMessage }}
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full px-5 py-3 text-base font-medium text-center text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 sm:w-auto dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}
      </button>

      <div class="text-sm font-medium text-gray-500 dark:text-gray-400">
        ¿Ya tienes una cuenta? <a href="/authentication/sign-in/" class="text-primary-700 hover:underline dark:text-primary-500">Inicia sesión</a>
      </div>
    </form>
  </div>
</template>
