<script setup>
import { ref, computed } from 'vue';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';
import Alert from '../../../shared/components/Alert.vue';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const remember = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

// Puntos del panel de marca (fáciles de editar)
const beneficios = [
  'Órdenes de trabajo en tiempo real',
  'Historial por cliente y vehículo',
  'Inventario de repuestos',
];

const hasError = computed(() => Boolean(errorMessage.value));

// Variables para el flujo multi-empresa
const showCompanyModal = ref(false);
const userCompanies = ref([]);
const selectedCompanyId = ref(null);
const tempUserId = ref(null);

async function submit() {
  if (authStore.isLoading) return;

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
    errorMessage.value = error.message || 'Usuario o contraseña incorrectos';
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
  <div class="font-brand min-h-screen w-full bg-brand-surface text-brand-ink dark:bg-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
    <!-- ===== Panel izquierdo (marca) ===== -->
    <aside class="relative hidden overflow-hidden bg-brand-navy px-16 py-14 text-white lg:flex lg:flex-col lg:justify-between">
      <!-- Decoración: engranaje recortado en la esquina inferior derecha -->
      <svg
        class="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] text-white/[0.07]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>

      <!-- Logo -->
      <div class="relative z-10">
        <a
          href="/"
          class="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <img src="/images/mechanic_logo_icon.svg" alt="" class="h-full w-full" />
          </span>
          <span class="text-[26px] font-extrabold leading-none tracking-tight">
            <span class="text-white">gon</span><span class="text-brand-coral">motor</span>
          </span>
        </a>
      </div>

      <!-- Mensaje -->
      <div class="relative z-10 max-w-[460px]">
        <p class="text-[44px] font-extrabold leading-[1.1] text-white">
          Tu taller, siempre bajo control.
        </p>
        <p class="mt-6 text-lg leading-relaxed text-brand-subtitle">
          Ingresa para gestionar órdenes, clientes y repuestos desde un solo lugar.
        </p>
        <ul class="mt-8 space-y-3.5">
          <li
            v-for="beneficio in beneficios"
            :key="beneficio"
            class="flex items-center gap-3 text-base font-semibold text-white"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-brand-coral" aria-hidden="true"></span>
            {{ beneficio }}
          </li>
        </ul>
      </div>

      <!-- Pie -->
      <div class="relative z-10 text-sm text-brand-muted">&copy; 2026 Gonmotor</div>
    </aside>

    <!-- ===== Panel derecho (formulario) ===== -->
    <section class="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
      <div class="w-full max-w-[420px]">
        <h1 class="text-[32px] font-extrabold leading-tight text-brand-ink dark:text-white">
          Bienvenido de nuevo
        </h1>
        <p class="mt-2 text-base text-brand-ink-soft dark:text-slate-400">
          Ingresa tus credenciales para continuar.
        </p>

        <div v-if="errorMessage" class="mt-6">
          <Alert type="error" :message="errorMessage" />
        </div>

        <form autocomplete="on" class="mt-8" novalidate @submit.prevent="submit">
          <!-- Campo 1: usuario / correo -->
          <div>
            <label for="login" class="mb-2 block text-sm font-bold text-brand-ink dark:text-slate-200">
              Correo electrónico o usuario
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                <User class="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input
                id="login"
                v-model="username"
                type="text"
                name="username"
                autocomplete="username"
                placeholder="usuario@taller.com"
                :aria-invalid="hasError"
                required
                class="block h-[52px] w-full rounded-xl border-[1.5px] bg-white ps-11 pe-3.5 text-base text-brand-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                :class="hasError
                  ? 'border-brand-red focus:border-brand-red focus:ring-brand-red/15'
                  : 'border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring'"
              >
            </div>
          </div>

          <!-- Campo 2: contraseña -->
          <div class="mt-5">
            <label for="password" class="mb-2 block text-sm font-bold text-brand-ink dark:text-slate-200">
              Contraseña
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                <Lock class="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                :aria-invalid="hasError"
                required
                class="block h-[52px] w-full rounded-xl border-[1.5px] bg-white ps-11 pe-11 text-base text-brand-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                :class="hasError
                  ? 'border-brand-red focus:border-brand-red focus:ring-brand-red/15'
                  : 'border-brand-line focus:border-brand-ink focus:ring-brand-focus-ring'"
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
          </div>

          <!-- Opciones -->
          <div class="mt-7 flex items-center justify-between gap-4">
            <label
              for="remember"
              class="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-brand-ink dark:text-slate-200"
            >
              <input
                id="remember"
                v-model="remember"
                name="remember"
                type="checkbox"
                class="h-4 w-4 shrink-0 cursor-pointer rounded border-brand-line bg-white accent-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 dark:bg-slate-800 dark:ring-offset-slate-900"
              >
              <span>Mantener sesión iniciada</span>
            </label>
            <a
              href="/authentication/forgot-password/"
              class="text-sm font-semibold text-brand-ink-soft underline underline-offset-[3px] transition-colors hover:text-brand-red-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:text-slate-300 dark:hover:text-brand-coral"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <!-- Botón principal -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-5 text-[17px] font-bold text-white transition-colors hover:bg-brand-red-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-red/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <template v-if="authStore.isLoading">
              <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
              </svg>
              Ingresando…
            </template>
            <template v-else>
              Iniciar sesión
              <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </template>
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-brand-ink-soft dark:text-slate-400">
          ¿Problemas para ingresar?
          <a
            href="#"
            class="font-semibold text-brand-ink-soft underline underline-offset-[3px] transition-colors hover:text-brand-red-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink dark:text-slate-300 dark:hover:text-brand-coral"
          >
            Contacta a soporte
          </a>
        </p>
      </div>
    </section>

    <!-- ===== Modal multi-empresa (lógica intacta) ===== -->
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
