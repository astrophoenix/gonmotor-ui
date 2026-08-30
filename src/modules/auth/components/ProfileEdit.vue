<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import Alert from '../../../shared/components/Alert.vue';

const authStore = useAuthStore();

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  telefono: '',
});

const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: '',
});

const isLoading = ref(true);
const isSavingProfile = ref(false);
const isSavingPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

onMounted(() => {
  const user = authStore.user || {};
  form.value = {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    username: user.username || '',
    telefono: user.telefono || '',
  };
  isLoading.value = false;
});

function hideAlert() {
  errorMessage.value = '';
  successMessage.value = '';
}

async function submitProfile() {
  errorMessage.value = '';
  successMessage.value = '';
  isSavingProfile.value = true;

  try {
    await authStore.updateProfile(form.value);
    successMessage.value = 'Perfil actualizado correctamente.';

    const user = authStore.user || {};
    form.value = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      username: user.username || '',
      telefono: user.telefono || '',
    };
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo actualizar el perfil.';
  } finally {
    isSavingProfile.value = false;
  }
}

async function submitPassword() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!passwordForm.value.new_password || !passwordForm.value.confirm_password) {
    errorMessage.value = 'Completá los campos de contraseña.';
    return;
  }

  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  isSavingPassword.value = true;

  try {
    await authStore.changePassword({
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password,
    });
    successMessage.value = 'Contraseña actualizada correctamente.';
    passwordForm.value = {
      old_password: '',
      new_password: '',
      confirm_password: '',
    };
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo actualizar la contraseña.';
  } finally {
    isSavingPassword.value = false;
  }
}
</script>

<template>
  <div class="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full mb-1">
      <div class="mb-4">
        <nav class="flex mb-5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
                </svg>
                <a href="/" class="ml-1 text-gray-700 hover:text-primary-600 md:ml-2 dark:text-gray-300 dark:hover:text-white">Perfil</a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span class="ml-1 text-gray-400 md:ml-2 dark:text-gray-500" aria-current="page">Editar</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">Editar perfil</h1>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 px-4 pt-6 xl:grid-cols-3 xl:gap-4 dark:bg-gray-900">
    <!-- Izquierda: Profile picture -->
    <div class="mb-4 col-span-full xl:mb-2 xl:col-auto">
      <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div class="items-center sm:flex xl:block 2xl:flex sm:space-x-4 xl:space-x-0 2xl:space-x-4">
          <img class="mb-4 rounded-lg w-28 h-28 sm:mb-0 xl:mb-4 2xl:mb-0" src="/images/users/bonnie-green-2x.png" alt="Profile picture">
          <div>
            <h3 class="mb-1 text-xl font-bold text-gray-900 dark:text-white">Profile picture</h3>
            <div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              JPG, GIF or PNG. Max size of 800K
            </div>
            <div class="flex items-center space-x-4">
              <button type="button" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 dark:focus:ring-primary-blue-800">
                <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path><path d="M9 13h2v5a1 1 0 11-2 0v-5z"></path></svg>
                Upload picture
              </button>
              <button type="button" class="py-2 px-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Derecha: Información General y Password -->
    <div class="col-span-2">
      <!-- Sección: Información General -->
      <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm 2xl:col-span-2 dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-xl font-semibold dark:text-white">Información General</h3>
        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
        <form v-else @submit.prevent="submitProfile">
          <Alert
            v-if="errorMessage"
            type="error"
            title=""
            :message="errorMessage"
            dismissible
            @dismiss="hideAlert"
          />
          <Alert
            v-if="successMessage"
            type="success"
            title=""
            :message="successMessage"
            dismissible
            @dismiss="hideAlert"
          />

          <div class="grid grid-cols-6 gap-6">
            <div class="col-span-6 sm:col-span-3">
              <label for="first_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombres</label>
              <input id="first_name" v-model="form.first_name" type="text" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="last_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Apellidos</label>
              <input id="last_name" v-model="form.last_name" type="text" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
              <input id="email" v-model="form.email" type="email" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="username" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre de usuario</label>
              <input id="username" v-model="form.username" type="text" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
              <input id="telefono" v-model="form.telefono" type="text" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <div class="flex items-center justify-end col-span-6 gap-3">
              <button type="submit" :disabled="isSavingProfile" class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 dark:focus:ring-primary-blue-800 disabled:opacity-50">
                <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                {{ isSavingProfile ? 'Guardando...' : 'Guardar perfil' }}
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- Sección: Password information -->
      <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm 2xl:col-span-2 dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-xl font-semibold dark:text-white">Cambiar Contraseña</h3>
        <form @submit.prevent="submitPassword">
          <div class="grid grid-cols-6 gap-6">
            <div class="col-span-6 sm:col-span-3">
              <label for="current-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Contraseña actual</label>
              <input type="text" name="current-password" id="current-password" v-model="passwordForm.old_password" class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500" placeholder="••••••••" required>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                ¿No recuerdas la contraseña actual? <br/><a href="/authentication/forgot-password/" class="text-primary-700 hover:underline dark:text-primary-500">Recuperar contraseña</a>
              </p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nueva contraseña</label>
              <input type="password" id="password" v-model="passwordForm.new_password" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500" placeholder="••••••••" required>
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="confirm-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Confirmar contraseña</label>
              <input type="password" name="confirm-password" id="confirm-password" v-model="passwordForm.confirm_password" class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500" placeholder="••••••••" required>
            </div>
            <div class="flex items-center justify-end col-span-6 gap-3">
              <button type="submit" :disabled="isSavingPassword" class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 dark:focus:ring-primary-blue-800 disabled:opacity-50">
                <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
                {{ isSavingPassword ? 'Guardando...' : 'Guardar contraseña' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
