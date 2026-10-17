<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Lock, Eye, EyeOff, ArrowLeft, Check, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import Alert from '../../../shared/components/Alert.vue';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { validatePassword, validatePasswordStrength } from '../../../shared/utils/sanitize';

const authStore = useAuthStore();

// Estado del formulario
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const showSuccessState = ref(false);
const passwordTouched = ref(false);
const confirmTouched = ref(false);

// Datos del correo (vienen de la URL o se pasan por props)
const emailFromUrl = ref('');

// Leer uid y token de la URL
const urlParams = new URLSearchParams(window.location.search);
const uid = urlParams.get('uid');
const token = urlParams.get('token');

// Computados
const hasError = computed(() => Boolean(errorMessage.value));

const passwordStrength = computed(() => validatePasswordStrength(password.value));

const passwordError = computed(() => {
  if (!passwordTouched.value && !isLoading.value) return '';
  return validatePassword(password.value, confirmPassword.value);
});

const confirmError = computed(() => {
  if (!confirmTouched.value && !isLoading.value) return '';
  if (confirmPassword.value === '') return 'Confirma tu contraseña.';
  if (password.value !== confirmPassword.value) return 'Las contraseñas no coinciden.';
  return '';
});

const isFormValid = computed(() => {
  return !!uid && !!token &&
         passwordError.value === '' &&
         confirmError.value === '' &&
         password.value.length >= 8 &&
         passwordStrength.value.isValid;
});

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}•••@${domain}`;
  return `${local[0]}•••${local.slice(-1)}@${domain}`;
}

function getEmailFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  if (email) {
    emailFromUrl.value = decodeURIComponent(email);
  }
}

async function submit() {
  if (isLoading.value || !isFormValid.value) return;

  errorMessage.value = '';
  successMessage.value = '';

  // Validaciones finales
  const finalPasswordError = validatePassword(password.value, confirmPassword.value);
  if (finalPasswordError) {
    errorMessage.value = finalPasswordError;
    passwordTouched.value = true;
    confirmTouched.value = true;
    return;
  }

  // Log para debug
  console.log('ResetPassword: Enviando payload', { uid: uid?.slice(0, 20) + '...', token: token?.slice(0, 10) + '...' });

  isLoading.value = true;

  try {
    const payload = {
      uid,
      token,
      new_password: password.value,
    };

    await authService.resetPassword(payload);

    showSuccessState.value = true;
    successMessage.value = 'Tu contraseña fue actualizada correctamente.';
  } catch (error) {
    console.error('ResetPassword error:', error);
    errorMessage.value = error.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.';
  } finally {
    isLoading.value = false;
  }
}

function goToLogin() {
  window.location.assign('/authentication/sign-in/');
}

function goToForgotPassword() {
  window.location.assign('/authentication/forgot-password/');
}

function onPasswordBlur() {
  passwordTouched.value = true;
}

function onConfirmBlur() {
  confirmTouched.value = true;
}

onMounted(() => {
  getEmailFromUrl();
  
  // Debug: log URL params
  const params = new URLSearchParams(window.location.search);
  console.log('ResetPassword: URL params:', {
    uid: params.get('uid'),
    token: params.get('token')?.slice(0, 10) + '...',
    email: params.get('email')
  });

  const passwordInput = document.getElementById('reset-password');
  if (passwordInput) {
    passwordInput.focus();
  }
});

onUnmounted(() => {});

// Validar que tenemos uid y token al montar
if (!uid || !token) {
  errorMessage.value = 'Enlace no válido o vencido. Solicita uno nuevo.';
}
</script>

<template>
  <div class="font-brand min-h-screen w-full bg-brand-surface text-brand-ink dark:bg-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-10 sm:px-6">
    <div class="w-full max-w-md">
      <!-- Logo centrado sobre el card -->
      <div class="flex justify-center mb-6">
        <a href="/" class="inline-flex items-center gap-1">
          <span class="flex h-13 w-auto shrink-0 items-center justify-center">
            <img :src="assetUrl('/images/logo.svg')" alt="gonmotor Logo" class="h-full w-full" />
          </span>
          <!--span class="text-3xl font-extrabold leading-none tracking-tight">
            <span class="text-white">gon</span><span class="text-brand-coral">motor</span>
          </span-->
        </a>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl border border-brand-line shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <!-- Estado de éxito -->
        <div v-if="showSuccessState" class="text-center space-y-6" role="status">
          <div class="flex justify-center mb-4">
            <div class="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
              <svg class="h-7 w-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-semibold text-brand-900 dark:text-white">Tu contraseña fue actualizada</h2>
          <p class="text-brand-ink-soft dark:text-slate-400">{{ successMessage }}</p>
          <button
            type="button"
            class="w-full h-[54px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-[17px] font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/40"
            @click="goToLogin"
          >
            Ir a iniciar sesión
            <ArrowLeft class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Estado de error: token inválido/vencido -->
        <div v-else-if="errorMessage && (errorMessage.includes('inválido') || errorMessage.includes('expir') || errorMessage.includes('vencido'))" class="text-center space-y-6" role="alert">
          <div class="flex justify-center mb-4">
            <div class="w-14 h-14 rounded-xl bg-brand-red/10 flex items-center justify-center">
              <AlertCircle class="h-7 w-7 text-brand-red" aria-hidden="true" />
            </div>
          </div>
          <h2 class="text-2xl font-semibold text-brand-900 dark:text-white">Enlace no válido o vencido</h2>
          <p class="text-brand-ink-soft dark:text-slate-400">{{ errorMessage }}</p>
          <button
            type="button"
            class="w-full h-[54px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-[17px] font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/40"
            @click="goToForgotPassword"
          >
            Solicitar uno nuevo
          </button>
        </div>

        <!-- Formulario -->
        <form v-else autocomplete="off" novalidate @submit.prevent="submit" class="space-y-6">
          <div class="text-center space-y-2">
            <h1 class="text-[32px] font-extrabold leading-tight text-brand-ink dark:text-white">
              Restablecer contraseña
            </h1>
            <p class="text-base text-brand-ink-soft dark:text-slate-400">
              Crea una contraseña nueva para tu cuenta.
            </p>
          </div>

          <!-- Correo enmascarado (solo lectura) -->
          <div v-if="emailFromUrl" class="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800" role="group" aria-label="Correo asociado">
            <Lock class="h-5 w-5 text-brand-500 dark:text-brand-400 shrink-0" aria-hidden="true" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-brand-muted dark:text-slate-500">Correo verificado</p>
              <p class="text-sm font-mono text-brand-ink dark:text-slate-200 truncate" aria-label="Correo enmascarado">{{ maskEmail(emailFromUrl) }}</p>
            </div>
          </div>

          <div v-if="errorMessage && !(errorMessage.includes('inválido') || errorMessage.includes('expir') || errorMessage.includes('vencido'))" class="mt-2" role="alert">
            <Alert type="error" :message="errorMessage" />
          </div>

          <!-- Campo: Nueva contraseña -->
          <div>
            <label for="reset-password" class="mb-2 block text-sm font-bold text-brand-ink dark:text-slate-200">
              Nueva contraseña
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                <Lock class="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input
                id="reset-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="new-password"
                placeholder="••••••••"
                :aria-invalid="passwordError !== ''"
                :aria-describedby="passwordError ? 'reset-password-error' : 'password-hints'"
                required
                @blur="onPasswordBlur"
                class="block h-[52px] w-full rounded-xl border-[1.5px] bg-white ps-11 pe-11 text-base text-brand-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                :class="passwordError
                  ? 'border-brand-red focus:border-brand-red focus:ring-brand-red/15'
                  : 'border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring'"
                style="-webkit-text-fill-color: inherit;"
              >
              <button
                type="button"
                class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-brand-ink focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:hover:text-slate-200"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="showPassword" class="h-5 w-5" aria-hidden="true" />
                <EyeOff v-else class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <!-- Medidor de fortaleza y checklist -->
            <div v-if="password.value && (passwordTouched || password.value.length > 0)" class="mt-3 space-y-2" id="password-hints">
              <!-- Barra de 4 segmentos -->
              <div class="flex gap-1.5" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="4" aria-label="Fortaleza de la contraseña">
                <div v-for="(check, index) in [
                  { key: 'length', label: '8+ caracteres', met: passwordStrength.checks.length },
                  { key: 'upper', label: 'Mayúscula y minúscula', met: passwordStrength.checks.upper && passwordStrength.checks.lower },
                  { key: 'number', label: 'Un número', met: passwordStrength.checks.number },
                  { key: 'symbol', label: 'Un símbolo', met: passwordStrength.checks.symbol }
                ]" :key="check.key" class="flex-1 h-2 rounded-full transition-colors"
                  :class="check.met ? 'bg-success' : 'bg-brand-line dark:bg-brand-700'">
                </div>
              </div>

              <!-- Checklist en vivo -->
              <ul class="flex flex-wrap gap-3 text-xs" role="list" aria-label="Requisitos de contraseña">
                <li v-for="check in [
                  { key: 'length', label: '8 o más caracteres', met: passwordStrength.checks.length },
                  { key: 'upper', label: 'Mayúscula y minúscula', met: passwordStrength.checks.upper && passwordStrength.checks.lower },
                  { key: 'number', label: 'Un número', met: passwordStrength.checks.number },
                  { key: 'symbol', label: 'Un símbolo', met: passwordStrength.checks.symbol }
                ]" :key="check.key" class="flex items-center gap-1.5" :class="check.met ? 'text-success' : 'text-brand-muted dark:text-slate-500'">
                  <Check v-if="check.met" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <svg v-else class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span>{{ check.label }}</span>
                </li>
              </ul>
            </div>

            <p v-if="passwordError" id="reset-password-error" class="mt-1.5 text-sm text-brand-red" role="alert" aria-live="polite">
              {{ passwordError }}
            </p>
          </div>

          <!-- Campo: Confirmar contraseña -->
          <div>
            <label for="reset-confirm-password" class="mb-2 block text-sm font-bold text-brand-ink dark:text-slate-200">
              Confirmar contraseña
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                <Lock class="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input
                id="reset-confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                name="confirm_password"
                autocomplete="new-password"
                placeholder="••••••••"
                :aria-invalid="confirmError !== ''"
                :aria-describedby="confirmError ? 'reset-confirm-error' : undefined"
                required
                @blur="onConfirmBlur"
                class="block h-[52px] w-full rounded-xl border-[1.5px] bg-white ps-11 pe-11 text-base text-brand-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                :class="confirmError
                  ? 'border-brand-red focus:border-brand-red focus:ring-brand-red/15'
                  : 'border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring'"
                style="-webkit-text-fill-color: inherit;"
              >
              <button
                type="button"
                class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-brand-ink focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:hover:text-slate-200"
                :aria-label="showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <Eye v-if="showConfirmPassword" class="h-5 w-5" aria-hidden="true" />
                <EyeOff v-else class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p v-if="confirmError" id="reset-confirm-error" class="mt-1.5 text-sm text-brand-red" role="alert" aria-live="polite">
              {{ confirmError }}
            </p>
          </div>

          <!-- Botón principal -->
          <button
            type="submit"
            :disabled="isLoading || !isFormValid"
            class="w-full h-[54px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-[17px] font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <template v-if="isLoading">
              <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
              Guardando…
            </template>
            <template v-else>
              Restablecer contraseña
            </template>
          </button>

          <!-- Enlace volver a login -->
          <p class="text-center text-sm text-brand-ink-soft dark:text-slate-400">
            <a href="/authentication/sign-in/" class="font-semibold text-brand-700 underline underline-offset-[3px] transition-colors hover:text-brand-red-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:text-brand-coral flex items-center justify-center gap-1">
              <ArrowLeft class="h-4 w-4" aria-hidden="true" />
              Volver a iniciar sesión
            </a>
          </p>
        </form>
      </div>

      <p class="mt-8 text-center text-sm text-brand-muted dark:text-slate-500">
        &copy; 2026 Gonmotor
      </p>
    </div>
  </div>
</template>