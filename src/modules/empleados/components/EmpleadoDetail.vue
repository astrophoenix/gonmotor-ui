<script setup>
import { computed, onMounted, ref } from 'vue';
import { FilePen, Mail, Phone, Warehouse, KeyRound } from 'lucide-vue-next';
import { empleadosService } from '../services/empleadosService';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EmpleadoModal from './EmpleadoModal.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();

const empleado = ref(null);
const loading = ref(true);
const error = ref('');
const showEmpleadoModal = ref(false);
const empleadoModalId = ref(null);

const params = new URLSearchParams(window.location.search);
const empleadoId = params.get('id');

const nombreCompleto = computed(() => {
  const user = empleado.value?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Empleado';
});

const iniciales = computed(() => {
  const user = empleado.value?.user || {};
  const partes = [user.first_name, user.last_name].map((parte) => (parte || '').trim()).filter(Boolean);
  if (!partes.length) return (user.username || '?').slice(0, 1).toUpperCase();
  return partes.map((parte) => parte[0].toUpperCase()).join('').slice(0, 2);
});

const rolLabel = computed(() => empleado.value?.rol_display || empleado.value?.rol || '');

const talleres = computed(() => empleado.value?.talleres || []);

const datosPersonales = computed(() => {
  const user = empleado.value?.user || {};
  return [
    { label: 'Nombres', value: user.first_name },
    { label: 'Apellidos', value: user.last_name },
    { label: 'Identificación', value: user.identificacion, mono: true },
    { label: 'Teléfono', value: user.telefono, href: user.telefono ? `tel:${user.telefono}` : null },
    { label: 'Correo electrónico', value: user.email, href: user.email ? `mailto:${user.email}` : null },
    { label: 'Dirección', value: user.direccion },
  ];
});

function abrirEditar() {
  if (!empleado.value) return;
  empleadoModalId.value = empleado.value.id;
  showEmpleadoModal.value = true;
}

async function onEmpleadoUpdated() {
  showEmpleadoModal.value = false;
  loading.value = true;
  try {
    empleado.value = await empleadosService.getById(empleadoId);
    error.value = '';
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo recargar el empleado.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('empleados')) {
    loading.value = false;
    return;
  }
  if (!empleadoId) {
    error.value = 'Falta el identificador del empleado.';
    loading.value = false;
    return;
  }
  try {
    empleado.value = await empleadosService.getById(empleadoId);
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el empleado.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('empleados')" seccion="Empleados" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Empleado"
    :title="empleado ? nombreCompleto : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Empleados', href: '/crud/empleados/' },
      { label: 'Ver' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="empleado && soloConsulta('empleados')" objeto="los datos de este empleado" acciones="editarlos" />
    </template>
    <template #actions>
      <button
        v-if="empleado && puede('empleados')"
        type="button"
        title="Editar empleado"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="abrirEditar">
        <FilePen class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
        Editar
      </button>
    </template>
  </EntityHeader>

  <div class="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
    <Alert
      v-if="error"
      type="error"
      :title="error"
      message=""
      dismissible
      @dismiss="error = ''"
    />

    <!-- Carga -->
    <div v-if="loading" class="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando empleado">
      <div class="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700 lg:col-span-2"></div>
        <div class="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>

    <template v-else-if="empleado">
      <!-- Resumen: identidad, estado y contacto -->
      <section class="shadow-sm rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center lg:p-8">
          <span
            class="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-800 dark:bg-brand-800 dark:text-brand-100 lg:h-20 lg:w-20 lg:text-2xl"
            aria-hidden="true"
          >
            {{ iniciales }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-4">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {{ rolLabel || 'Empleado' }}
              </p>
              <span
                v-if="empleado.is_active !== false"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-900/30 dark:text-green-300 dark:ring-green-400/30"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true"></span>
                Activo
              </span>
              <span
                v-else
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-500/20 ring-inset dark:bg-gray-700 dark:text-gray-300"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
                Inactivo
              </span>
            </div>
            <h2 class="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-white lg:text-3xl">
              {{ nombreCompleto }}
            </h2>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span
                v-if="empleado.user?.identificacion"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                title="Identificación"
              >
                {{ empleado.user.identificacion }}
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                <KeyRound class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                {{ empleado.tiene_acceso ? 'Con acceso al sistema' : 'Sin acceso al sistema' }}
              </span>
            </div>
          </div>
        </div>

        <dl class="grid grid-cols-1 gap-6 border-t border-gray-100 px-6 py-5 dark:border-gray-700 sm:grid-cols-3 lg:px-8">
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Phone class="h-3.5 w-3.5" aria-hidden="true" />
              Teléfono
            </dt>
            <dd class="mt-2 text-base font-semibold tabular-nums text-gray-900 dark:text-white">
              <a v-if="empleado.user?.telefono" :href="`tel:${empleado.user.telefono}`" class="hover:text-brand-700 hover:underline dark:hover:text-brand-200">
                {{ empleado.user.telefono }}
              </a>
              <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Mail class="h-3.5 w-3.5" aria-hidden="true" />
              Correo
            </dt>
            <dd class="mt-2 truncate text-base font-semibold text-gray-900 dark:text-white">
              <a v-if="empleado.user?.email" :href="`mailto:${empleado.user.email}`" class="hover:text-brand-700 hover:underline dark:hover:text-brand-200" :title="empleado.user.email">
                {{ empleado.user.email }}
              </a>
              <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Warehouse class="h-3.5 w-3.5" aria-hidden="true" />
              Talleres
            </dt>
            <dd class="mt-2 text-base font-semibold tabular-nums text-gray-900 dark:text-white">
              {{ talleres.length }} {{ talleres.length === 1 ? 'asignado' : 'asignados' }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="grid items-start gap-6 lg:grid-cols-3">
        <!-- Datos personales -->
        <section class="shadow-sm rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h3 class="px-6 pt-5 pb-3 text-sm font-semibold text-gray-900 dark:text-white">Datos personales</h3>
          <dl class="grid grid-cols-1 px-6 pb-3 sm:grid-cols-2 sm:gap-x-10">
            <div
              v-for="campo in datosPersonales"
              :key="campo.label"
              class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-3 dark:border-gray-700"
            >
              <dt class="shrink-0 text-sm text-gray-500 dark:text-gray-400">{{ campo.label }}</dt>
              <dd
                class="min-w-0 text-right text-sm font-medium break-words text-gray-900 dark:text-white"
                :class="{ 'font-mono text-[13px] tracking-wide': campo.mono }"
              >
                <template v-if="campo.value">
                  <a v-if="campo.href" :href="campo.href" class="break-all hover:text-brand-700 hover:underline dark:hover:text-brand-200">{{ campo.value }}</a>
                  <span v-else>{{ campo.value }}</span>
                </template>
                <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
              </dd>
            </div>
          </dl>
        </section>

        <div class="space-y-6">
          <!-- Acceso al sistema -->
          <section class="shadow-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Acceso al sistema</h3>
            <dl class="mt-3">
              <div class="flex items-baseline justify-between gap-4 py-2">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Rol</dt>
                <dd class="text-right text-sm font-medium text-gray-900 dark:text-white">{{ rolLabel || '—' }}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 dark:border-gray-700">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Inicio de sesión</dt>
                <dd class="inline-flex items-center gap-1.5 text-right text-sm font-medium text-gray-900 dark:text-white">
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="empleado.tiene_acceso ? 'bg-green-500' : 'bg-gray-400'"
                    aria-hidden="true"
                  ></span>
                  {{ empleado.tiene_acceso ? 'Permitido' : 'Sin acceso' }}
                </dd>
              </div>
              <div v-if="empleado.user?.username" class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 dark:border-gray-700">
                <dt class="shrink-0 text-sm text-gray-500 dark:text-gray-400">Usuario</dt>
                <dd class="min-w-0 truncate text-right font-mono text-[13px] text-gray-900 dark:text-white" :title="empleado.user.username">{{ empleado.user.username }}</dd>
              </div>
            </dl>
          </section>

          <!-- Talleres asignados -->
          <section class="shadow-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 class="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
              Talleres asignados
              <span v-if="talleres.length" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {{ talleres.length }}
              </span>
            </h3>
            <ul v-if="talleres.length" class="mt-3 space-y-1">
              <li
                v-for="taller in talleres"
                :key="taller.id"
                class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  <Warehouse class="h-4 w-4" aria-hidden="true" />
                </span>
                <span class="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">{{ taller.nombre }}</span>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">No tiene talleres asignados.</p>
          </section>
        </div>
      </div>
    </template>
  </div>

  <EmpleadoModal
    v-model="showEmpleadoModal"
    :empleado-id="empleadoModalId"
    @updated="onEmpleadoUpdated"
  />
  </template>
</template>
