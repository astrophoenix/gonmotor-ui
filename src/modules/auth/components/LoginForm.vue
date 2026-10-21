<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Building2, ChevronRight, KeyRound, ShieldCheck } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';
import Alert from '../../../shared/components/Alert.vue';
import { assetUrl } from '../../../shared/utils/assetUrl';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import EmpresaSearchSelect from '../../../shared/components/EmpresaSearchSelect.vue';
import { escenaMarca, escenaFormulario } from '../utils/piezasPlano';

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

// Fondos de plano técnico (SVG generado por código propio, sin datos del usuario).
const planoMarca = escenaMarca();
const planoFormulario = escenaFormulario();

// Reloj de la tarjeta: saludo, hora y semana en curso con el día de hoy marcado.
const ahora = ref(new Date());
let relojId = null;
onMounted(() => {
  relojId = window.setInterval(() => { ahora.value = new Date(); }, 15000);
});
onBeforeUnmount(() => window.clearInterval(relojId));

const saludo = computed(() => {
  const hora = ahora.value.getHours();
  if (hora < 12) return '¡Buenos días!';
  if (hora < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
});
const horas = computed(() => String(ahora.value.getHours()).padStart(2, '0'));
const minutos = computed(() => String(ahora.value.getMinutes()).padStart(2, '0'));
const fechaLarga = computed(() =>
  new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(ahora.value)
);
const semana = computed(() => {
  const lunes = new Date(ahora.value);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letra, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return { letra, numero: dia.getDate(), hoy: dia.toDateString() === ahora.value.toDateString() };
  });
});

const hasError = computed(() => Boolean(errorMessage.value));
const CAMPO_NORMAL = 'border-brand-200 focus:border-brand-900 focus:ring-brand-focus-ring dark:border-brand-600 dark:focus:border-brand-300';
const CAMPO_ERROR = 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/15';

// Variables para el flujo multi-empresa
const showCompanyModal = ref(false);
const userCompanies = ref([]);
const selectedCompanyId = ref(null);
const selectedTallerId = ref(null);
// Token firmado y de vida corta del login; se canjea en select-company.
const selectionToken = ref(null);

// Admin SaaS: el modal arranca en «opciones» (ir a empresa / administrar empresas);
// el resto de usuarios va directo al paso «empresa».
const esAdminSaas = ref(false);
const adminSaasSesion = ref(null);
const pasoModal = ref('empresa');

const selectedCompany = computed(
  () => userCompanies.value.find((emp) => String(emp.id) === String(selectedCompanyId.value)) || null
);

const selectedCompanyTalleres = computed(() => selectedCompany.value?.talleres || []);

/** Solo la administración puede ingresar sin taller activo («Todos»). */
const ROLES_TODOS = ['ADMIN_EMPRESA', 'ADMIN_SISTEMA'];
const permiteTodosEmpresa = computed(() =>
  ROLES_TODOS.includes(selectedCompany.value?.rol)
);

watch(selectedCompany, (empresa) => {
  if (ROLES_TODOS.includes(empresa?.rol)) {
    selectedTallerId.value = null;
    return;
  }
  const talleres = empresa?.talleres || [];
  const predeterminado = talleres.find((taller) => taller.predeterminado);
  selectedTallerId.value = predeterminado?.id ?? talleres[0]?.id ?? null;
});

async function submit() {
  if (authStore.isLoading) return;

  errorMessage.value = '';

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Debes completar correo | usuario y contraseña.';
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
    userCompanies.value = response.empresas || [];
    selectionToken.value = response.selection_token;
    esAdminSaas.value = Boolean(response.es_admin_saas);
    adminSaasSesion.value = esAdminSaas.value ? response : null;
    pasoModal.value = esAdminSaas.value ? 'opciones' : 'empresa';
    showCompanyModal.value = true;

  } catch (error) {
    errorMessage.value = error.message || 'Usuario o contraseña incorrectos';
  }
}

function irAEmpresa() {
  if (!userCompanies.value.length) return;
  pasoModal.value = 'empresa';
}

function registrarEmpresa() {
  try {
    authStore.iniciarSesionAdminSaaS(adminSaasSesion.value, remember.value);
    window.location.assign('/crud/empresas/');
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo iniciar la sesión.';
    cerrarModal();
  }
}

function cerrarModal() {
  showCompanyModal.value = false;
  selectedCompanyId.value = null;
  pasoModal.value = esAdminSaas.value ? 'opciones' : 'empresa';
}

// Confirmar selección del modal
async function confirmCompany() {
  if (!selectedCompanyId.value) return;

  try {
    await authStore.selectCompany(
      {
        selection_token: selectionToken.value,
        empresa_id: selectedCompanyId.value,
      },
      remember.value
    );

    const taller =
      selectedCompanyTalleres.value.find(
        (t) => String(t.id) === String(selectedTallerId.value)
      ) || null;
    authStore.setTaller(taller);

    window.location.assign('/');
  } catch (error) {
    errorMessage.value = error.message || 'Error al seleccionar la empresa.';
    cerrarModal();
  }
}
</script>

<template>
  <div class="login font-brand min-h-screen w-full bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-50 lg:grid lg:grid-cols-2">
    <!-- ===== Panel de marca: plano técnico con el motor ===== -->
    <aside class="marca relative z-10 flex flex-col overflow-hidden rounded-b-[40px] bg-brand-900 px-5 pb-8 pt-7 text-white lg:rounded-b-none lg:px-16 lg:pb-11 lg:pt-13 lg:bajo:pb-8 lg:bajo:pt-9">
      <!-- En escritorio el motor y las piezas son una sola composición anclada abajo a la derecha
           que escala con la altura del panel, así se mantienen alineados en cualquier pantalla. -->
      <svg
        class="plano plano-marca pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMaxYMax meet"
        aria-hidden="true"
      >
        <g class="piezas" v-html="planoMarca"></g>
        <image :href="assetUrl('/images/login/motor-plano.png')" x="302" y="482" width="392" height="349" />
      </svg>
      <img
        :src="assetUrl('/images/login/motor-plano.png')"
        alt=""
        class="pointer-events-none absolute -right-8 top-2.5 z-[1] w-[180px] opacity-35 lg:hidden"
      >

      <!-- Logo: en el login no es enlace (sin sesión, «/» solo devolvería aquí) -->
      <div class="relative z-[2] inline-flex items-center gap-3 self-start">
        <img :src="assetUrl('/images/login/isotipo-piston-negativo.svg')" alt="" class="h-11 w-11 lg:h-13 lg:w-13">
        <span>
          <span class="block text-[26px] font-extrabold leading-[1] tracking-tight lg:text-[31px]">
            gon<span class="text-accent-400">motor</span>
          </span>
          <span class="mt-1.5 block text-[9.5px] font-bold tracking-[0.32em] text-brand-300 lg:text-[11px]">GESTIÓN DE TALLERES</span>
        </span>
      </div>

      <!-- Mensaje -->
      <div class="relative z-[2] mt-6 lg:mb-auto lg:mt-26 lg:bajo:mt-12 lg:muy-bajo:mt-8">
        <p class="max-w-[520px] text-[30px] font-extrabold leading-[1.08] tracking-[-0.015em] lg:text-[46px] lg:bajo:text-[38px]">
          Tu taller, siempre<br>bajo control.
        </p>
        <p class="mt-4.5 hidden max-w-[480px] text-[17px] leading-relaxed text-brand-subtitle lg:block">
          Ingresa para gestionar órdenes, clientes y repuestos desde un solo lugar.
        </p>
        <ul class="mt-6.5 hidden lg:block lg:bajo:mt-4 lg:muy-bajo:hidden">
          <li
            v-for="beneficio in beneficios"
            :key="beneficio"
            class="mt-3.5 flex items-center gap-3 text-base font-semibold"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-accent-400" aria-hidden="true"></span>
            {{ beneficio }}
          </li>
        </ul>
      </div>

      <!-- Pie -->
      <div class="relative z-[2] hidden gap-4 text-[15px] font-medium text-white/90 lg:flex">
        <span>&copy; 2026 gonmotor</span>
        <span class="w-px bg-white/40" aria-hidden="true"></span>
        <span>Hecho para talleres de verdad</span>
      </div>
    </aside>

    <!-- ===== Panel del formulario ===== -->
    <section class="formulario relative flex w-full flex-col items-center justify-start overflow-hidden px-4 pb-7 pt-6 lg:min-h-screen lg:justify-center lg:px-6 lg:py-10 lg:bajo:py-6">
      <svg
        class="plano plano-formulario pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        v-html="planoFormulario"
      ></svg>

      <!-- Tarjeta de acceso -->
      <div class="relative z-[1] w-full max-w-[460px] rounded-[18px] border border-brand-100 bg-white shadow-[0_1px_2px_rgba(17,28,46,0.04),0_10px_28px_-14px_rgba(17,28,46,0.16)] dark:border-brand-700 dark:bg-brand-900 dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]">
        <span
          class="absolute left-1/2 top-[18px] h-6 w-28 -translate-x-1/2 rounded-xl border border-brand-200 bg-brand-50 shadow-[inset_0_2px_3px_rgba(17,28,46,0.14)] dark:border-brand-600 dark:bg-brand-950"
          aria-hidden="true"
        ></span>

        <div class="px-5 pb-5.5 pt-15 sm:px-9.5 sm:pb-7 sm:pt-17 lg:bajo:pb-5 lg:bajo:pt-13">
          <p class="text-[15px] font-bold text-brand-500 dark:text-brand-300">{{ saludo }}</p>
          <h1 class="mt-1.5 text-[30px] font-extrabold tracking-[-0.015em] lg:bajo:mt-1 lg:bajo:text-[26px]">Entra a tu taller</h1>

          <div v-if="errorMessage" class="mt-5">
            <Alert type="error" :message="errorMessage" />
          </div>

          <form autocomplete="on" novalidate @submit.prevent="submit">
            <!-- Usuario / correo -->
            <label for="login" class="mb-2.5 mt-6 block text-[14.5px] font-bold lg:bajo:mb-2 lg:bajo:mt-4">Correo | usuario</label>
            <div class="relative">
              <User class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400 dark:text-brand-300" aria-hidden="true" />
              <input
                id="login"
                v-model="username"
                type="text"
                name="username"
                autocomplete="username"
                placeholder="usuario@taller.com"
                :aria-invalid="hasError"
                required
                class="block h-[54px] lg:bajo:h-12 w-full rounded-[10px] border-[1.5px] bg-white ps-12 text-[15.5px] text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:ring-4 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-300 pe-4"
                :class="hasError ? CAMPO_ERROR : CAMPO_NORMAL"
              >
            </div>

            <!-- Contraseña -->
            <label for="password" class="mb-2.5 mt-6 block text-[14.5px] font-bold lg:bajo:mb-2 lg:bajo:mt-4">Contraseña</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400 dark:text-brand-300" aria-hidden="true" />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                :aria-invalid="hasError"
                required
                class="block h-[54px] lg:bajo:h-12 w-full rounded-[10px] border-[1.5px] bg-white ps-12 text-[15.5px] text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:ring-4 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-300 pe-12"
                :class="hasError ? CAMPO_ERROR : CAMPO_NORMAL"
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

            <!-- Opciones -->
            <div class="mt-5 flex items-center justify-between gap-2 text-[13px] sm:text-sm lg:bajo:mt-2">
              <label for="remember" class="flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap font-medium text-brand-500 dark:text-brand-200">
                <input
                  id="remember"
                  v-model="remember"
                  name="remember"
                  type="checkbox"
                  class="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[4px] border-brand-200 bg-white text-brand-900 accent-brand-900 dark:border-brand-600 dark:bg-brand-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 dark:ring-offset-brand-900"
                >
                Recordarme
              </label>
              <a
                href="/authentication/forgot-password/"
                class="whitespace-nowrap font-semibold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <!-- Botón principal -->
            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 lg:bajo:mt-3 lg:bajo:h-12 rounded-[10px] bg-accent-500 px-5 text-[17px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(200,16,46,0.7)] transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <template v-if="authStore.isLoading">
                <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
                Ingresando…
              </template>
              <template v-else>
                <KeyRound class="h-5 w-5" aria-hidden="true" />
                Entrar al taller
                <ArrowRight class="h-5 w-5" aria-hidden="true" />
              </template>
            </button>
          </form>

          <p class="mt-5 text-center text-sm text-brand-400 dark:text-brand-300 lg:bajo:mt-4">
            ¿No puedes entrar?
            <a
              href="#"
              class="font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
            >
              Habla con soporte
            </a>
          </p>
        </div>

        <!-- Reloj y semana -->
        <div class="flex flex-col items-start gap-3 border-t border-brand-100 px-5 pb-4.5 pt-4 dark:border-brand-700 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-9.5 sm:pb-5 sm:pt-4.5 lg:bajo:py-3 lg:muy-bajo:hidden">
          <div>
            <p class="text-[30px] lg:bajo:text-[26px] font-extrabold leading-[1] tracking-[-0.02em] tabular-nums">
              {{ horas }}<span class="mx-px text-accent-500 dark:text-accent-400">:</span>{{ minutos }}
            </p>
            <p class="mt-1.5 whitespace-nowrap text-[13px] font-medium text-brand-400 dark:text-brand-300">{{ fechaLarga }}</p>
          </div>
          <ol class="flex w-full justify-between gap-[3px] sm:w-auto sm:justify-start" aria-label="Semana en curso">
            <li
              v-for="dia in semana"
              :key="dia.numero"
              class="flex-1 text-center text-[11.5px] font-bold leading-tight sm:w-[29px] sm:flex-none"
              :class="dia.hoy ? 'text-brand-900 dark:text-white' : 'text-brand-400 dark:text-brand-300'"
              :aria-current="dia.hoy ? 'date' : undefined"
            >
              {{ dia.letra }}
              <span
                class="mt-1 block h-[26px] rounded-[7px] text-[13px] font-semibold leading-[26px]"
                :class="dia.hoy ? 'bg-brand-700 text-white dark:bg-brand-500' : 'text-brand-500 dark:text-brand-200'"
              >{{ dia.numero }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ===== Modal multi-empresa / admin SaaS: misma tarjeta con ranura que el login ===== -->
    <div
      v-if="showCompanyModal"
      class="font-brand fixed inset-0 z-50 flex items-end justify-center bg-brand-950/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        class="relative w-full rounded-t-[22px] border border-brand-100 bg-white text-brand-900 shadow-[0_24px_60px_-20px_rgba(11,18,32,0.55)] dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50 sm:max-w-[480px] sm:rounded-[18px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-empresa-titulo"
      >
        <span
          class="absolute left-1/2 top-[18px] h-6 w-28 -translate-x-1/2 rounded-xl border border-brand-200 bg-brand-50 shadow-[inset_0_2px_3px_rgba(17,28,46,0.14)] dark:border-brand-600 dark:bg-brand-950"
          aria-hidden="true"
        ></span>

        <div class="px-5 pb-1 pt-14.5 sm:px-8 sm:pt-16">
          <span
            v-if="esAdminSaas"
            class="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 pe-3 ps-2.5 text-[12.5px] font-bold text-brand-500 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
          >
            <ShieldCheck class="h-[15px] w-[15px] text-accent-500 dark:text-accent-400" aria-hidden="true" />
            Administrador del sistema
          </span>

          <!-- Paso 1 (solo admin SaaS): elegir qué hacer -->
          <template v-if="pasoModal === 'opciones'">
            <h3 id="modal-empresa-titulo" class="mt-3.5 text-2xl font-extrabold tracking-[-0.015em] sm:text-[27px]">
              ¿Qué deseas hacer?
            </h3>
            <p class="mt-1.5 text-[15px] text-brand-400 dark:text-brand-300">Elige por dónde quieres continuar.</p>

            <div class="mt-5.5 grid gap-3">
              <button
                type="button"
                :disabled="!userCompanies.length"
                class="group flex w-full items-center gap-4 rounded-[14px] border-[1.5px] border-brand-900 bg-[#F7F9FC] p-4 text-left transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-focus-ring disabled:cursor-not-allowed disabled:border-brand-100 disabled:opacity-60 dark:border-brand-300 dark:bg-brand-950 dark:hover:bg-brand-800"
                @click="irAEmpresa"
              >
                <span class="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white dark:bg-brand-50 dark:text-brand-900">
                  <Building2 class="h-6 w-6" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-base font-extrabold">Entrar a una empresa</span>
                  <span class="mt-0.5 block text-[13.5px] leading-snug text-brand-400 dark:text-brand-300">
                    {{ userCompanies.length ? 'Elige la empresa y el taller con los que trabajarás hoy.' : 'Aún no hay empresas activas registradas.' }}
                  </span>
                  <span
                    v-if="userCompanies.length"
                    class="mt-2 inline-flex rounded-md border border-brand-100 bg-white px-2 py-0.5 text-xs font-bold text-brand-500 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-200"
                  >
                    {{ userCompanies.length }} {{ userCompanies.length === 1 ? 'empresa activa' : 'empresas activas' }}
                  </span>
                </span>
                <ArrowRight class="h-[22px] w-[22px] shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                class="group flex w-full items-center gap-4 rounded-[14px] border-[1.5px] border-brand-100 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-focus-ring dark:border-brand-700 dark:bg-brand-900 dark:hover:bg-brand-800"
                @click="registrarEmpresa"
              >
                <span class="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M10 12h4"/><path d="M10 21v-3a2 2 0 013.05-1.702"/>
                    <path d="M10 8h4"/><path d="M16 19h6"/>
                    <path d="M18 7h2a2 2 0 012 2v4.355"/>
                    <path d="M19 16v6"/>
                    <path d="M6 10H4a2 2 0 00-2 2v7a2 2 0 002 2h8.535"/>
                    <path d="M6 21V5a2 2 0 012-2h8a2 2 0 012 2v7.126"/>
                  </svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-base font-extrabold">Administrar empresas</span>
                  <span class="mt-0.5 block text-[13.5px] leading-snug text-brand-400 dark:text-brand-300">
                    Registra nuevas empresas, edita sus datos o desactívalas.
                  </span>
                </span>
                <ChevronRight class="h-5 w-5 shrink-0 text-brand-300" aria-hidden="true" />
              </button>
            </div>
          </template>

          <!-- Paso 2: empresa y taller -->
          <template v-else>
            <h3 id="modal-empresa-titulo" class="text-2xl font-extrabold tracking-[-0.015em] sm:text-[27px]" :class="esAdminSaas ? 'mt-3.5' : ''">
              Elige empresa y taller
            </h3>
            <p class="mt-1.5 text-[15px] text-brand-400 dark:text-brand-300">
              {{ esAdminSaas
                ? 'Elige la empresa y el taller con los que deseas trabajar.'
                : 'Tu cuenta está asociada a más de una empresa. Elige con cuál deseas trabajar hoy.' }}
            </p>

            <label class="mb-2.5 mt-5.5 block text-[14.5px] font-bold">Empresa</label>
            <EmpresaSearchSelect
              v-model="selectedCompanyId"
              :empresas="userCompanies"
              placeholder="Selecciona una empresa"
            />

            <label class="mb-2.5 mt-5 block text-[14.5px] font-bold">Taller</label>
            <TallerSelect
              v-model="selectedTallerId"
              :talleres="selectedCompanyTalleres"
              :permitir-todos="permiteTodosEmpresa"
              variante="campo"
              placeholder="Selecciona un taller"
            />

            <button
              type="button"
              :disabled="!selectedCompanyId || authStore.isLoading"
              class="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-brand-900 px-5 text-base font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-focus-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-50 dark:text-brand-900 dark:hover:bg-white"
              @click="confirmCompany"
            >
              <Loader2 v-if="authStore.isLoading" class="h-5 w-5 animate-spin" aria-hidden="true" />
              {{ authStore.isLoading ? 'Ingresando…' : 'Entrar al taller' }}
              <ArrowRight v-if="!authStore.isLoading" class="h-5 w-5" aria-hidden="true" />
            </button>
          </template>
        </div>

        <!-- Pie: avance (solo admin SaaS) y salida -->
        <div class="mt-6 flex items-center justify-between gap-3 border-t border-brand-100 px-5 pb-6 pt-4 dark:border-brand-700 sm:px-8 sm:pb-4.5">
          <span v-if="esAdminSaas" class="flex items-center gap-2 text-[12.5px] font-bold text-brand-400 dark:text-brand-300">
            <span class="flex gap-1" aria-hidden="true">
              <span class="h-1 w-[18px] rounded-sm bg-brand-900 dark:bg-brand-50"></span>
              <span class="h-1 w-[18px] rounded-sm" :class="pasoModal === 'opciones' ? 'bg-brand-200 dark:bg-brand-600' : 'bg-brand-900 dark:bg-brand-50'"></span>
            </span>
            Paso {{ pasoModal === 'opciones' ? 1 : 2 }} de 2
          </span>
          <span v-else></span>

          <button
            v-if="esAdminSaas && pasoModal !== 'opciones'"
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
            @click="pasoModal = 'opciones'"
          >
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            Volver
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 underline underline-offset-[3px] transition-colors hover:text-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 dark:text-brand-200 dark:hover:text-accent-400"
            @click="cerrarModal"
          >
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Trazos de las piezas de plano (el SVG se inserta con v-html, por eso :deep). */
.plano :deep(.pz) { fill: none; stroke: var(--plano); stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; }
.plano :deep(.fino) { fill: none; stroke: var(--plano); stroke-width: 0.8; opacity: 0.8; }
.plano :deep(.som) { fill: none; stroke: var(--plano); stroke-width: 0.6; opacity: 0.45; }
.plano-marca { --plano: #78ACDE; }
.plano-marca .piezas { opacity: 0.85; }
.plano-formulario { --plano: #94A6BF; }
.dark .plano-formulario { --plano: #3A4F6E; }

/* Retícula de puntos: en la marca se desvanece en diagonal; junto a la tarjeta se abre un hueco. */
.marca::before,
.formulario::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-size: 24px 24px;
}
.marca::before {
  background-image: radial-gradient(circle, rgba(120, 172, 222, 0.3) 1.2px, transparent 1.7px);
  mask-image: linear-gradient(160deg, #000 0%, rgba(0, 0, 0, 0.35) 45%, rgba(0, 0, 0, 0.15) 65%, rgba(0, 0, 0, 0.6) 100%);
}
.formulario::before {
  background-image: radial-gradient(circle, #D5DDE8 1.3px, transparent 1.8px);
  mask-image: radial-gradient(ellipse 44% 48% at 50% 48%, transparent 62%, #000 100%);
}
.dark .formulario::before {
  background-image: radial-gradient(circle, #16233A 1.3px, transparent 1.8px);
}
</style>
