<script setup>
import { onMounted, ref } from 'vue';
import { ChevronRight, Check, Lock, Eye, EyeOff } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';
import Alert from '../../../shared/components/Alert.vue';
import PersonImageField from '../../../shared/components/PersonImageField.vue';
import { sanitizeTelefono } from '../../../shared/utils/sanitize';

const authStore = useAuthStore();

const AVATAR_FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 1024 * 1024;

const FIELD_MAX = {
  first_name: 150,
  last_name: 150,
  email: 254,
  username: 150,
  telefono: 20,
  password: 128,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeNames(value) {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '').replace(/\s+/g, ' ');
}

function sanitizeEmail(value) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function sanitizeUsername(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

function formattedTelefono(value) {
  return sanitizeTelefono(value, FIELD_MAX.telefono, true);
}

function onSanitizedInput(event, key, sanitizer) {
  const el = event.target;
  const clean = sanitizer(el.value);
  if (el.value !== clean) {
    el.value = clean;
  }
  form.value[key] = clean;
}

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

const avatarFile = ref(null);
const avatarRemoved = ref(false);
const avatarPreview = ref('');
const profileImageKey = ref(0);

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

onMounted(() => {
  const user = authStore.user || {};
  form.value = {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    username: user.username || '',
    telefono: user.telefono || '',
  };
  avatarPreview.value = user.avatar || '';
  avatarFile.value = null;
  avatarRemoved.value = false;
  isLoading.value = false;
});

function hideAlert() {
  errorMessage.value = '';
  successMessage.value = '';
}

function onAvatarUpload(file) {
  if (!file) return;
  if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreview.value);
  }
  avatarFile.value = file;
  avatarRemoved.value = false;
  avatarPreview.value = URL.createObjectURL(file);
  successMessage.value = '';
}

function removeAvatar() {
  if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreview.value);
  }
  avatarFile.value = null;
  avatarRemoved.value = true;
  avatarPreview.value = '';
  successMessage.value = '';
  errorMessage.value = '';
}

function validateProfile() {
  const errores = [];
  if (!form.value.first_name.trim()) errores.push('El campo Nombres es obligatorio.');
  if (!form.value.last_name.trim()) errores.push('El campo Apellidos es obligatorio.');
  if (!form.value.email.trim()) {
    errores.push('El campo Correo electrónico es obligatorio.');
  } else if (!EMAIL_REGEX.test(form.value.email.trim())) {
    errores.push('Ingresa un correo electrónico válido.');
  }
  if (!form.value.username.trim()) errores.push('El campo Nombre de usuario es obligatorio.');
  return errores;
}

async function submitProfile() {
  errorMessage.value = '';
  successMessage.value = '';

  const errores = validateProfile();
  if (errores.length > 0) {
    errorMessage.value = errores.join(' ');
    return;
  }

  isSavingProfile.value = true;

  try {
    const hasAvatarChange = avatarFile.value || avatarRemoved.value;
    let payload = {
      ...form.value,
      first_name: form.value.first_name.trim(),
      last_name: form.value.last_name.trim(),
      email: form.value.email.trim(),
      username: form.value.username.trim(),
      telefono: form.value.telefono.trim(),
    };

    if (hasAvatarChange) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      if (avatarFile.value) {
        formData.append('avatar', avatarFile.value);
      } else if (avatarRemoved.value) {
        formData.append('remove_avatar', 'true');
      }
      payload = formData;
    }

    await authStore.updateProfile(payload);
    successMessage.value = 'Perfil actualizado correctamente.';

    const user = authStore.user || {};
    form.value = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      username: user.username || '',
      telefono: user.telefono || '',
    };
    if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview.value);
    }
    avatarFile.value = null;
    avatarRemoved.value = false;
    avatarPreview.value = user.avatar || '';
    profileImageKey.value += 1;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo actualizar el perfil.';
  } finally {
    isSavingProfile.value = false;
  }
}

async function submitPassword() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!passwordForm.value.old_password) {
    errorMessage.value = 'Debes ingresar tu contraseña actual.';
    return;
  }
  if (!passwordForm.value.new_password) {
    errorMessage.value = 'Debes ingresar una nueva contraseña.';
    return;
  }
  if (!passwordForm.value.confirm_password) {
    errorMessage.value = 'Debes confirmar la nueva contraseña.';
    return;
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }
  if (passwordForm.value.new_password.length < 8) {
    errorMessage.value = 'La nueva contraseña debe tener al menos 8 caracteres.';
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
                <ChevronRight class="w-3 h-3 text-gray-400 mx-1" />
                <a href="/" class="ml-1 text-gray-700 hover:text-primary-600 md:ml-2 dark:text-gray-300 dark:hover:text-white">Perfil</a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <ChevronRight class="w-3 h-3 text-gray-400 mx-1" />
                <span class="ml-1 text-gray-400 md:ml-2 dark:text-gray-500" aria-current="page">Editar</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">Editar perfil</h1>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 w-full max-w-4xl mx-auto px-4 pt-6 xl:gap-4 dark:bg-gray-900">
    <!-- Sección: Información General (foto de perfil al lado derecho) -->
    <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <h3 class="mb-4 text-xl font-semibold dark:text-white">Información General</h3>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
      <form v-else novalidate @submit.prevent="submitProfile">
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
          <div class="col-span-6 sm:col-span-4">
            <div class="grid grid-cols-6 gap-6">
              <div class="col-span-6 sm:col-span-3">
                <label for="first_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombres <span class="text-accent-500">*</span></label>
                <input
                  id="first_name"
                  :value="form.first_name"
                  @input="onSanitizedInput($event, 'first_name', sanitizeNames)"
                  type="text"
                  :maxlength="FIELD_MAX.first_name"
                  required
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <div class="col-span-6 sm:col-span-3">
                <label for="last_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Apellidos <span class="text-accent-500">*</span></label>
                <input
                  id="last_name"
                  :value="form.last_name"
                  @input="onSanitizedInput($event, 'last_name', sanitizeNames)"
                  type="text"
                  :maxlength="FIELD_MAX.last_name"
                  required
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <div class="col-span-6 sm:col-span-3">
                <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico <span class="text-accent-500">*</span></label>
                <input
                  id="email"
                  :value="form.email"
                  @input="onSanitizedInput($event, 'email', sanitizeEmail)"
                  type="email"
                  :maxlength="FIELD_MAX.email"
                  required
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <div class="col-span-6 sm:col-span-3">
                <label for="username" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre de usuario <span class="text-accent-500">*</span></label>
                <input
                  id="username"
                  :value="form.username"
                  @input="onSanitizedInput($event, 'username', sanitizeUsername)"
                  type="text"
                  :maxlength="FIELD_MAX.username"
                  required
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <div class="col-span-6 sm:col-span-3">
                <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
                <input
                  id="telefono"
                  :value="form.telefono"
                  @input="onSanitizedInput($event, 'telefono', formattedTelefono)"
                  type="tel"
                  :maxlength="FIELD_MAX.telefono"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                >
              </div>
            </div>
          </div>

          <div class="col-span-6 sm:col-span-2 w-full max-w-xs">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Foto de perfil</label>
            <PersonImageField
              :key="profileImageKey"
              :image-url="avatarPreview || ''"
              :max-size="MAX_AVATAR_BYTES"
              :allowed-types="AVATAR_FORMATOS"
              hint="JPG, PNG o WebP. Máximo 1 MB"
              @upload="onAvatarUpload"
              @remove="removeAvatar"
            />
          </div>

          <div class="flex items-center justify-end col-span-6 gap-3">
            <button type="submit" :disabled="isSavingProfile" class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 dark:focus:ring-primary-blue-800 disabled:opacity-50">
              <Check class="w-4 h-4 mr-2 -ml-1" />
              {{ isSavingProfile ? 'Guardando...' : 'Guardar perfil' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Sección: Password information -->
    <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-xl font-semibold dark:text-white">Cambiar Contraseña</h3>
        <form @submit.prevent="submitPassword">
          <div class="grid grid-cols-6 gap-6">
            <div class="col-span-6 sm:col-span-3">
              <label for="current-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Contraseña actual <span class="text-accent-500">*</span></label>
              <div class="relative">
                <input
                  :type="showCurrentPassword ? 'text' : 'password'"
                  name="current-password"
                  id="current-password"
                  v-model="passwordForm.old_password"
                  :maxlength="FIELD_MAX.password"
                  class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="••••••••"
                  required
                >
                <div class="absolute inset-y-0 end-0 flex items-center pe-3">
                  <button
                    type="button"
                    @click="showCurrentPassword = !showCurrentPassword"
                    class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    :aria-label="showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    <Eye v-if="showCurrentPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                ¿No recuerdas la contraseña actual? <br/><a href="/authentication/forgot-password/" class="text-primary-700 hover:underline dark:text-primary-500">Recuperar contraseña</a>
              </p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nueva contraseña <span class="text-accent-500">*</span></label>
              <div class="relative">
                <input
                  :type="showNewPassword ? 'text' : 'password'"
                  id="password"
                  v-model="passwordForm.new_password"
                  :maxlength="FIELD_MAX.password"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="••••••••"
                  required
                >
                <div class="absolute inset-y-0 end-0 flex items-center pe-3">
                  <button
                    type="button"
                    @click="showNewPassword = !showNewPassword"
                    class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    :aria-label="showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    <Eye v-if="showNewPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="confirm-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Confirmar contraseña <span class="text-accent-500">*</span></label>
              <div class="relative">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  name="confirm-password"
                  id="confirm-password"
                  v-model="passwordForm.confirm_password"
                  :maxlength="FIELD_MAX.password"
                  class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="••••••••"
                  required
                >
                <div class="absolute inset-y-0 end-0 flex items-center pe-3">
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    :aria-label="showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    <Eye v-if="showConfirmPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-end col-span-6 gap-3">
              <button type="submit" :disabled="isSavingPassword" class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 dark:focus:ring-primary-blue-800 disabled:opacity-50">
                <Lock class="w-4 h-4 mr-2 -ml-1" />
                {{ isSavingPassword ? 'Guardando...' : 'Guardar contraseña' }}
              </button>
            </div>
          </div>
        </form>
      </div>
  </div>
</template>
