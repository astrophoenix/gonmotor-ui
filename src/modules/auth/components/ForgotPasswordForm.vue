<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Mail, Key, ArrowLeft, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import Alert from '../../../shared/components/Alert.vue';
import { sanitizeEmail, validateEmail } from '../../../shared/utils/sanitize';

const authStore = useAuthStore();
const email = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const showSuccessState = ref(false);
const resendCooldown = ref(0);
const resendTimer = ref(null);

const hasError = computed(() => Boolean(errorMessage.value));

function startResendCooldown() {
  resendCooldown.value = 120; // 2 minutos
  resendTimer.value = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer.value);
      resendTimer.value = null;
    }
  }, 1000);
}

function validateAndSanitizeEmail() {
  const sanitized = sanitizeEmail(email.value);
  email.value = sanitized;
  const validationError = validateEmail(sanitized);
  return validationError;
}

async function submit() {
  if (isLoading.value) return;

  errorMessage.value = '';
  successMessage.value = '';

  const validationError = validateAndSanitizeEmail();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isLoading.value = true;

  try {
    await authService.forgotPassword(email.value.trim());

    showSuccessState.value = true;
    successMessage.value = 'Si el correo está registrado, te enviamos un código. Puede tardar unos minutos.';
    startResendCooldown();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo enviar el código. Intenta nuevamente.';
  } finally {
    isLoading.value = false;
  }
}

async function resendCode() {
  if (isLoading.value || resendCooldown.value > 0) return;

  isLoading.value = true;
  errorMessage.value = '';

  try {
    await authService.forgotPassword(email.value.trim());
    successMessage.value = 'Se ha reenviado el código. Revisa tu bandeja de entrada.';
    startResendCooldown();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo reenviar el código.';
  } finally {
    isLoading.value = false;
  }
}

function goBackToLogin() {
  window.location.assign('/authentication/sign-in/');
}

onMounted(() => {
  const emailInput = document.getElementById('forgot-email');
  if (emailInput) {
    emailInput.focus();
  }
});

onUnmounted(() => {
  if (resendTimer.value) {
    clearInterval(resendTimer.value);
  }
});

watch(email, () => {
  if (errorMessage.value && email.value.trim()) {
    errorMessage.value = '';
  }
});
</script>

<template>
  <div class="font-brand min-h-screen w-full bg-brand-surface text-brand-ink dark:bg-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-10 sm:px-6">
    <div class="w-full max-w-md">
      <!-- Logo centrado sobre el card -->
      <div class="flex justify-center mb-6">
        <a href="/" class="inline-flex items-center gap-1">
          <span class="flex h-13 w-auto shrink-0 items-center justify-center">
            <img src="/images/logo.svg" alt="gonmotor Logo" class="h-full w-full" />
          </span>
          <!--span class="text-3xl font-extrabold leading-none tracking-tight">
            <span class="text-white">gon</span><span class="text-brand-coral">motor</span>
          </span-->
        </a>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl border border-brand-line shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <!-- Ícono decorativo de llave -->
        <div class="flex justify-center mb-4">
          <div class="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center dark:bg-brand-900/30">
            <Key class="h-7 w-7 text-brand-900 dark:text-brand-300" aria-hidden="true" />
          </div>
        </div>

        <!-- Estado de éxito -->
        <div v-if="showSuccessState" class="text-center space-y-4" role="status">
          <h2 class="text-2xl font-semibold text-brand-900 dark:text-white">Revisa tu correo</h2>
          <p class="text-brand-ink-soft dark:text-slate-400">{{ successMessage }}</p>
          <button
            type="button"
            :disabled="resendCooldown > 0 || isLoading"
            class="w-full px-5 py-3 text-base font-medium text-brand-700 bg-brand-100 rounded-xl hover:bg-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            @click="resendCode"
          >
            <template v-if="resendCooldown > 0">
              Reenviar código ({{ Math.floor(resendCooldown / 60) }}:{{ String(resendCooldown % 60).padStart(2, '0') }})
            </template>
            <template v-else>
              Reenviar código
            </template>
          </button>
          <p class="mt-4 text-sm text-brand-ink-soft dark:text-slate-400">
            <a href="/authentication/sign-in/" class="font-semibold text-brand-700 underline underline-offset-[3px] transition-colors hover:text-brand-red-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:text-brand-coral">
              Volver a iniciar sesión
              <ArrowLeft class="inline h-4 w-4 ml-1" aria-hidden="true" />
            </a>
          </p>
        </div>

        <!-- Formulario -->
        <form v-else autocomplete="on" novalidate @submit.prevent="submit" class="space-y-6">
          <div class="text-center space-y-2">
            <h1 class="text-[32px] font-extrabold leading-tight text-brand-ink dark:text-white">
              ¿Olvidaste tu contraseña?
            </h1>
            <p class="text-base text-brand-ink-soft dark:text-slate-400">
              Ingresa tu correo y te enviaremos un código para restablecerla.
            </p>
          </div>

          <div v-if="errorMessage" class="mt-4" role="alert">
            <Alert type="error" :message="errorMessage" />
          </div>

          <!-- Campo: Correo electrónico -->
          <div>
            <label for="forgot-email" class="mb-2 block text-sm font-bold text-brand-ink dark:text-slate-200">
              Correo electrónico
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                <Mail class="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input
                id="forgot-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="nombre@empresa.com"
                :aria-invalid="hasError"
                :aria-describedby="hasError ? 'forgot-email-error' : undefined"
                required
                class="block h-[52px] w-full rounded-xl border-[1.5px] bg-white ps-11 pe-3.5 text-base text-brand-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                :class="hasError
                  ? 'border-brand-red focus:border-brand-red focus:ring-brand-red/15'
                  : 'border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring'"
                style="-webkit-text-fill-color: inherit;"
              >
            </div>
            <p id="forgot-email-help" class="mt-1.5 text-sm text-brand-muted dark:text-slate-500">
              Si el correo está registrado, recibirás las instrucciones.
            </p>
            <p v-if="hasError" id="forgot-email-error" class="mt-1.5 text-sm text-brand-red" role="alert" aria-live="polite">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Botón principal -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-[54px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-[17px] font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <template v-if="isLoading">
              <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
              Enviando…
            </template>
            <template v-else>
              Enviar código
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