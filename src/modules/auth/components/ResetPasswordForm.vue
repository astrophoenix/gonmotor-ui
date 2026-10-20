<script setup>
import { ref, computed, onMounted } from 'vue';
import { Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, Circle, Loader2, KeyRound, ShieldCheck, Link2Off, UserRound } from 'lucide-vue-next';
import { authService } from '../services/authService';
import Alert from '../../../shared/components/Alert.vue';
import { PASSWORD_MIN_LENGTH, validatePassword, validatePasswordStrength } from '../../../shared/utils/sanitize';
import AuthShell from './AuthShell.vue';
import PasosRecuperacion from './PasosRecuperacion.vue';

const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const actualizada = ref(false);
const confirmTouched = ref(false);

// uid, token y (opcional) correo llegan en el enlace del correo.
const params = new URLSearchParams(window.location.search);
const uid = params.get('uid');
const token = params.get('token');
const correo = params.get('email') || '';
const enlaceInvalido = ref(!uid || !token);

const CAMPO_NORMAL = 'border-brand-200 focus:border-brand-900 focus:ring-brand-focus-ring dark:border-brand-600 dark:focus:border-brand-300';
const CAMPO_ERROR = 'border-brand-red focus:border-brand-red focus:ring-brand-red/15';
const CAMPO_OK = 'border-success focus:border-success focus:ring-success/15';

const fortaleza = computed(() => validatePasswordStrength(password.value));
const requisitos = computed(() => [
  { clave: 'largo', texto: `${PASSWORD_MIN_LENGTH} o más caracteres`, ok: fortaleza.value.checks.length },
  { clave: 'mayus', texto: 'Mayúscula y minúscula', ok: fortaleza.value.checks.upper && fortaleza.value.checks.lower },
  { clave: 'numero', texto: 'Un número', ok: fortaleza.value.checks.number },
  { clave: 'simbolo', texto: 'Un símbolo', ok: fortaleza.value.checks.symbol },
]);
const cumplidos = computed(() => requisitos.value.filter((r) => r.ok).length);
const NIVELES = [
  { texto: 'Muy débil', barra: 'bg-brand-red', color: 'text-brand-red' },
  { texto: 'Débil', barra: 'bg-brand-red', color: 'text-brand-red' },
  { texto: 'Aceptable', barra: 'bg-warning', color: 'text-warning' },
  { texto: 'Casi lista', barra: 'bg-warning', color: 'text-warning' },
  { texto: 'Segura', barra: 'bg-success', color: 'text-success' },
];
const nivel = computed(() => NIVELES[cumplidos.value]);

const coinciden = computed(() => confirmPassword.value !== '' && confirmPassword.value === password.value);
const confirmError = computed(() => {
  if (!confirmTouched.value || confirmPassword.value === '') return '';
  return coinciden.value ? '' : 'Las contraseñas no coinciden.';
});
const isFormValid = computed(() => validatePassword(password.value, confirmPassword.value) === '');

const correoOculto = computed(() => {
  const [local, dominio] = correo.split('@');
  if (!dominio) return correo;
  return local.length <= 2 ? `${local[0]}•••@${dominio}` : `${local[0]}•••${local.slice(-1)}@${dominio}`;
});

async function submit() {
  confirmTouched.value = true;
  if (isLoading.value || !isFormValid.value) return;
  errorMessage.value = '';
  isLoading.value = true;
  try {
    await authService.resetPassword({ uid, token, new_password: password.value });
    actualizada.value = true;
  } catch (error) {
    // uid o token rechazados = enlace alterado, usado o vencido; el resto son reglas de la contraseña.
    if (error.data?.uid || error.data?.token) enlaceInvalido.value = true;
    else errorMessage.value = error.message || 'No se pudo guardar la contraseña. Intenta nuevamente.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => document.getElementById('reset-password')?.focus());
</script>

<template>
  <AuthShell>
    <template #titulo>Una llave nueva<br>para tu taller.</template>
    <template #detalle>
      <p class="mt-4.5 max-w-[480px] text-[17px] leading-relaxed text-brand-subtitle">
        Elige una contraseña que no uses en otros sitios. La pediremos cada vez que entres.
      </p>
      <PasosRecuperacion :actual="actualizada ? 4 : 3" />
    </template>

    <!-- Contraseña guardada -->
    <div v-if="actualizada" role="status">
      <span class="flex h-13 w-13 items-center justify-center rounded-[14px] bg-success/10 text-success">
        <ShieldCheck class="h-6.5 w-6.5" aria-hidden="true" />
      </span>
      <h1 class="mt-5 text-[30px] font-extrabold tracking-[-0.015em]">Contraseña actualizada</h1>
      <p class="mt-2 text-[15.5px] leading-relaxed text-brand-500 dark:text-brand-200">
        Ya puedes entrar con tu nueva contraseña.
      </p>
      <a
        href="/authentication/sign-in/"
        class="mt-7 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[10px] bg-brand-red px-5 text-[17px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(200,16,46,0.7)] transition-colors hover:bg-brand-red-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-red/40"
      >
        <KeyRound class="h-5 w-5" aria-hidden="true" />
        Entrar al taller
        <ArrowRight class="h-5 w-5" aria-hidden="true" />
      </a>
    </div>

    <!-- Enlace vencido o incompleto -->
    <div v-else-if="enlaceInvalido" role="alert">
      <span class="flex h-13 w-13 items-center justify-center rounded-[14px] bg-accent-50 text-brand-red dark:bg-brand-950 dark:text-brand-coral">
        <Link2Off class="h-6.5 w-6.5" aria-hidden="true" />
      </span>
      <h1 class="mt-5 text-[30px] font-extrabold leading-tight tracking-[-0.015em]">Este enlace ya no funciona</h1>
      <p class="mt-2 text-[15.5px] leading-relaxed text-brand-500 dark:text-brand-200">
        Los enlaces para restablecer vencen en 1 hora y solo se pueden usar una vez. Pide uno nuevo y ábrelo desde el último correo.
      </p>
      <a
        href="/authentication/forgot-password/"
        class="mt-7 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[10px] bg-brand-red px-5 text-[17px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(200,16,46,0.7)] transition-colors hover:bg-brand-red-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-red/40"
      >
        Pedir un enlace nuevo
        <ArrowRight class="h-5 w-5" aria-hidden="true" />
      </a>
    </div>

    <!-- Formulario -->
    <template v-else>
      <p class="text-[15px] font-bold text-brand-500 dark:text-brand-300">Último paso</p>
      <h1 class="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.015em]">Crea tu nueva contraseña</h1>

      <span
        v-if="correo"
        class="mt-3.5 inline-flex h-8 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 pe-3.5 ps-2.5 text-[13.5px] font-semibold text-brand-500 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
      >
        <UserRound class="h-4 w-4" aria-hidden="true" />
        {{ correoOculto }}
      </span>

      <div v-if="errorMessage" class="mt-5">
        <Alert type="error" :message="errorMessage" />
      </div>

      <form autocomplete="off" novalidate @submit.prevent="submit">
        <!-- Nueva contraseña -->
        <label for="reset-password" class="mb-2.5 mt-6 block text-[14.5px] font-bold">Nueva contraseña</label>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          <input
            id="reset-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="new-password"
            :placeholder="`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`"
            aria-describedby="reset-requisitos"
            required
            class="block h-[54px] w-full rounded-[10px] border-[1.5px] bg-white pe-12 ps-12 text-[15.5px] text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:ring-4 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-300"
            :class="CAMPO_NORMAL"
          >
          <button
            type="button"
            class="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-brand-400 transition-colors hover:text-brand-900 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-300 dark:hover:text-white"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-5 w-5" aria-hidden="true" />
            <Eye v-else class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Medidor: 4 segmentos (uno por requisito) y lista en vivo -->
        <div id="reset-requisitos" class="mt-3.5">
          <div class="flex items-center gap-3">
            <div class="flex flex-1 gap-1.5" aria-hidden="true">
              <span
                v-for="n in 4"
                :key="n"
                class="h-1.5 flex-1 rounded-full transition-colors"
                :class="n <= cumplidos ? nivel.barra : 'bg-brand-100 dark:bg-brand-700'"
              ></span>
            </div>
            <span v-if="password" class="w-[72px] text-right text-[12.5px] font-bold" :class="nivel.color">{{ nivel.texto }}</span>
          </div>
          <ul class="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 text-[13px]" aria-label="Requisitos de la contraseña">
            <li
              v-for="req in requisitos"
              :key="req.clave"
              class="flex items-center gap-2 font-medium"
              :class="req.ok ? 'text-success' : 'text-brand-400 dark:text-brand-300'"
            >
              <span
                class="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full"
                :class="req.ok ? 'bg-success text-white' : ''"
              >
                <Check v-if="req.ok" class="h-3 w-3" stroke-width="3" aria-hidden="true" />
                <Circle v-else class="h-4 w-4" aria-hidden="true" />
              </span>
              {{ req.texto }}
              <span class="sr-only">{{ req.ok ? '(cumplido)' : '(pendiente)' }}</span>
            </li>
          </ul>
        </div>

        <!-- Confirmación -->
        <label for="reset-confirm-password" class="mb-2.5 mt-6 block text-[14.5px] font-bold">Repite la contraseña</label>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          <input
            id="reset-confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            name="confirm_password"
            autocomplete="new-password"
            placeholder="Escríbela otra vez"
            :aria-invalid="Boolean(confirmError)"
            :aria-describedby="confirmError ? 'reset-confirm-error' : undefined"
            required
            class="block h-[54px] w-full rounded-[10px] border-[1.5px] bg-white pe-12 ps-12 text-[15.5px] text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:ring-4 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-300"
            :class="confirmError ? CAMPO_ERROR : coinciden ? CAMPO_OK : CAMPO_NORMAL"
            @blur="confirmTouched = true"
          >
          <button
            type="button"
            class="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-brand-400 transition-colors hover:text-brand-900 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-300 dark:hover:text-white"
            :aria-label="showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <EyeOff v-if="showConfirmPassword" class="h-5 w-5" aria-hidden="true" />
            <Eye v-else class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p v-if="confirmError" id="reset-confirm-error" class="mt-2 text-sm font-medium text-brand-red" role="alert">{{ confirmError }}</p>
        <p v-else-if="coinciden" class="mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
          <Check class="h-4 w-4" stroke-width="3" aria-hidden="true" />
          Las contraseñas coinciden
        </p>

        <button
          type="submit"
          :disabled="isLoading || !isFormValid"
          class="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[10px] bg-brand-red px-5 text-[17px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(200,16,46,0.7)] transition-colors hover:bg-brand-red-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-red/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          <template v-if="isLoading">
            <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
            Guardando…
          </template>
          <template v-else>
            <KeyRound class="h-5 w-5" aria-hidden="true" />
            Guardar contraseña
          </template>
        </button>
      </form>
    </template>

    <template #pie>
      <PasosRecuperacion :actual="actualizada ? 4 : 3" variante="barra" />
      <a
        v-if="!actualizada"
        href="/authentication/sign-in/"
        class="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-brand-red-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-brand-coral"
      >
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        <span class="sm:hidden">Iniciar sesión</span>
        <span class="hidden sm:inline">Volver al inicio de sesión</span>
      </a>
    </template>
  </AuthShell>
</template>
