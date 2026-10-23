<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Mail, MailCheck, ArrowLeft, ArrowRight, Loader2, RotateCw } from 'lucide-vue-next';
import { authService } from '../services/authService';
import { sanitizeEmail, validateEmail } from '../../../shared/utils/sanitize';
import AuthShell from './AuthShell.vue';
import PasosRecuperacion from './PasosRecuperacion.vue';

const email = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const enviado = ref(false);
const reenviado = ref(false);
const resendCooldown = ref(0);
let resendTimer = null;

const hasError = computed(() => Boolean(errorMessage.value));
const CAMPO_NORMAL = 'border-brand-200 focus:border-primary-700 focus:ring-brand-focus-ring dark:border-brand-600 dark:focus:border-primary-300';
const CAMPO_ERROR = 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/15';

const cuentaAtras = computed(() =>
  `${Math.floor(resendCooldown.value / 60)}:${String(resendCooldown.value % 60).padStart(2, '0')}`
);

/** j•••z@taller.com: confirma a qué correo se envió sin mostrarlo completo. */
const correoOculto = computed(() => {
  const [local, dominio] = email.value.split('@');
  if (!dominio) return email.value;
  return local.length <= 2 ? `${local[0]}•••@${dominio}` : `${local[0]}•••${local.slice(-1)}@${dominio}`;
});

function startResendCooldown() {
  window.clearInterval(resendTimer);
  resendCooldown.value = 120;
  resendTimer = window.setInterval(() => {
    resendCooldown.value -= 1;
    if (resendCooldown.value <= 0) window.clearInterval(resendTimer);
  }, 1000);
}

async function enviar() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await authService.forgotPassword(email.value.trim());
    return true;
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo enviar el enlace. Intenta nuevamente.';
    return false;
  } finally {
    isLoading.value = false;
  }
}

async function submit() {
  if (isLoading.value) return;
  email.value = sanitizeEmail(email.value);
  const validationError = validateEmail(email.value);
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }
  if (await enviar()) {
    enviado.value = true;
    startResendCooldown();
  }
}

async function resendCode() {
  if (isLoading.value || resendCooldown.value > 0) return;
  if (await enviar()) {
    reenviado.value = true;
    startResendCooldown();
  }
}

function usarOtroCorreo() {
  enviado.value = false;
  reenviado.value = false;
  errorMessage.value = '';
}

onMounted(() => document.getElementById('forgot-email')?.focus());
onUnmounted(() => window.clearInterval(resendTimer));

watch(email, () => {
  if (errorMessage.value && email.value.trim()) errorMessage.value = '';
});
</script>

<template>
  <AuthShell escena="recuperar">
    <template #titulo>Recupera el acceso<br>a tu taller.</template>
    <template #detalle>
      <p class="mt-4.5 max-w-[480px] text-[17px] leading-relaxed text-brand-subtitle">
        En tres pasos vuelves a tus órdenes, clientes y repuestos.
      </p>
      <PasosRecuperacion :actual="enviado ? 2 : 1" />
    </template>

    <!-- Paso 2: enlace enviado -->
    <div v-if="enviado" role="status" aria-live="polite">
      <span class="flex h-13 w-13 items-center justify-center rounded-[14px] border border-brand-100 bg-brand-50 text-brand-900 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-50">
        <MailCheck class="h-6.5 w-6.5" aria-hidden="true" />
      </span>
      <h1 class="mt-5 text-[30px] font-extrabold tracking-[-0.015em]">Revisa tu correo</h1>
      <p class="mt-2 text-[15.5px] leading-relaxed text-brand-500 dark:text-brand-200">
        Si <strong class="font-bold text-brand-900 dark:text-white">{{ correoOculto }}</strong> tiene una cuenta,
        te llegará un enlace para crear tu nueva contraseña. Vence en 1 hora.
      </p>

      <ul class="mt-5 space-y-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3.5 text-sm text-brand-500 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200">
        <li class="flex gap-2.5"><span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 dark:bg-accent-400" aria-hidden="true"></span>Puede tardar unos minutos en llegar.</li>
        <li class="flex gap-2.5"><span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 dark:bg-accent-400" aria-hidden="true"></span>Si no lo ves, busca en spam o promociones.</li>
      </ul>

      <p v-if="errorMessage" class="mt-4 text-sm font-medium text-accent-500 dark:text-accent-400" role="alert">{{ errorMessage }}</p>
      <p v-else-if="reenviado" class="mt-4 text-sm font-medium text-success">Te enviamos un enlace nuevo.</p>

      <button
        type="button"
        :disabled="resendCooldown > 0 || isLoading"
        class="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-primary-700 bg-white px-5 text-base font-bold text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-focus-ring disabled:cursor-not-allowed disabled:border-brand-200 disabled:text-brand-400 dark:border-brand-300 dark:bg-brand-900 dark:text-brand-50 dark:hover:bg-brand-800"
        @click="resendCode"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" aria-hidden="true" />
        <RotateCw v-else class="h-[18px] w-[18px]" aria-hidden="true" />
        <span v-if="resendCooldown > 0">Reenviar en <span class="tabular-nums">{{ cuentaAtras }}</span></span>
        <span v-else>Reenviar enlace</span>
      </button>

      <p class="mt-5 text-center text-sm text-brand-400 dark:text-brand-300">
        ¿Te equivocaste de correo?
        <button
          type="button"
          class="font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
          @click="usarOtroCorreo"
        >
          Usar otro
        </button>
      </p>
    </div>

    <!-- Paso 1: pedir el enlace -->
    <template v-else>
      <p class="text-[15px] font-bold text-brand-500 dark:text-brand-300">Recuperar acceso</p>
      <h1 class="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.015em]">¿Olvidaste tu contraseña?</h1>
      <p class="mt-2 text-[15.5px] leading-relaxed text-brand-500 dark:text-brand-200">
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
      </p>

      <form autocomplete="on" novalidate @submit.prevent="submit">
        <label for="forgot-email" class="mb-2.5 mt-6 block text-[14.5px] font-bold">Correo electrónico</label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="usuario@taller.com"
            :aria-invalid="hasError"
            :aria-describedby="hasError ? 'forgot-email-error' : undefined"
            required
            class="block h-[54px] w-full rounded-lg border-[1.5px] bg-white pe-4 ps-12 text-[15.5px] text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:ring-4 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-300"
            :class="hasError ? CAMPO_ERROR : CAMPO_NORMAL"
          >
        </div>
        <p v-if="hasError" id="forgot-email-error" class="mt-2 text-sm font-medium text-accent-500 dark:text-accent-400" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-primary-700 px-5 text-[17px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(36,74,143,0.55)] transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <template v-if="isLoading">
            <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
            Enviando…
          </template>
          <template v-else>
            <Mail class="h-5 w-5" aria-hidden="true" />
            Enviar enlace
            <ArrowRight class="h-5 w-5" aria-hidden="true" />
          </template>
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-brand-400 dark:text-brand-300">
        ¿Ya no usas ese correo?
        <a
          href="#"
          class="font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
        >
          Habla con soporte
        </a>
      </p>
    </template>

    <template #pie>
      <PasosRecuperacion :actual="enviado ? 2 : 1" variante="barra" />
      <a
        href="/authentication/sign-in/"
        class="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
      >
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        <span class="sm:hidden">Iniciar sesión</span>
        <span class="hidden sm:inline">Volver al inicio de sesión</span>
      </a>
    </template>
  </AuthShell>
</template>
