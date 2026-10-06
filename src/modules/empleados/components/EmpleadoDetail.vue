<script setup>
import { computed, onMounted, ref } from 'vue';
import { IdCard, Pencil, Building2, UserRound, Mail, Phone, MapPin, CalendarDays, ShieldCheck } from 'lucide-vue-next';
import { empleadosService } from '../services/empleadosService';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EmpleadoModal from './EmpleadoModal.vue';

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

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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
    <template #badges>
      <template v-if="empleado">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          {{ empleado.rol_display || empleado.rol }}
        </span>
        <span
          class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
          :class="empleado.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'"
        >
          {{ empleado.is_active ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
    </template>

    <template #actions>
      <button
        v-if="empleado"
        type="button"
        title="Editar empleado"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-700 rounded-base border border-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 dark:text-brand-400 dark:border-brand-400 dark:hover:bg-gray-700"
        @click="abrirEditar"
      >
        <Pencil class="w-4 h-4" aria-hidden="true" />
        Editar
      </button>
    </template>
  </EntityHeader>

  <div class="p-4">
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert
        v-if="error"
        type="error"
        :title="error"
        message=""
        dismissible
        @dismiss="error = ''"
      />

      <div v-if="loading" class="p-6 text-center text-gray-500 dark:text-gray-400">
        Cargando empleado...
      </div>

      <template v-else-if="empleado">
        <h4 class="mb-4 text-lg font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <IdCard class="w-5 h-5 text-gray-800 dark:text-white" />
            Información General
          </span>
        </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <UserRound class="w-3.5 h-3.5" /> Nombres
            </dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ empleado.user?.first_name || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <UserRound class="w-3.5 h-3.5" /> Apellidos
            </dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ empleado.user?.last_name || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <IdCard class="w-3.5 h-3.5" /> Identificación
            </dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ empleado.user?.identificacion || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Mail class="w-3.5 h-3.5" /> Correo electrónico
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ empleado.user?.email || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Phone class="w-3.5 h-3.5" /> Teléfono
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ empleado.user?.telefono || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <MapPin class="w-3.5 h-3.5" /> Dirección
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ empleado.user?.direccion || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <ShieldCheck class="w-3.5 h-3.5" /> Rol
            </dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ empleado.rol_display || empleado.rol || '—' }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <CalendarDays class="w-3.5 h-3.5" /> Fecha de registro
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(empleado.created_at) }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Building2 class="w-3.5 h-3.5" /> Empresa
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ empleado.empresa?.nombre || '—' }}</dd>
          </div>
        </dl>

        <h4 class="mt-8 mb-4 text-lg font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Building2 class="w-5 h-5 text-gray-800 dark:text-white" />
            Talleres Asignados ({{ empleado.talleres?.length || 0 }})
          </span>
        </h4>
        <div v-if="!empleado.talleres || !empleado.talleres.length" class="p-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 dark:text-gray-400 dark:border-gray-600">
          No tiene talleres asignados.
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <span
            v-for="taller in empleado.talleres"
            :key="taller.id"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full dark:text-gray-300 dark:bg-gray-700"
          >
            <Building2 class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            {{ taller.nombre }}
          </span>
        </div>
      </template>
    </div>
  </div>

  <EmpleadoModal
    v-model="showEmpleadoModal"
    :empleado-id="empleadoModalId"
    @updated="onEmpleadoUpdated"
  />
</template>