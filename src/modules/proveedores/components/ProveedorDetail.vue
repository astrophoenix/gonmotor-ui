<script setup>
import { computed, ref, onMounted } from 'vue';
import { IdCard, Pencil, Truck } from 'lucide-vue-next';

import { proveedoresService } from '../services/proveedoresService';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ProveedorModal from './ProveedorModal.vue';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificarProveedores = computed(() => puede('proveedores', 'modificar'));

const TIPOS_IDENTIFICACION = {
  C: 'Cédula',
  R: 'RUC',
  P: 'Pasaporte',
};

const proveedor = ref(null);
const loading = ref(true);
const error = ref('');
const showProveedorModal = ref(false);
const proveedorModalId = ref(null);

const params = new URLSearchParams(window.location.search);
const proveedorId = params.get('id') || '';

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tipoIdentificacionLabel(value) {
  return TIPOS_IDENTIFICACION[value] || '—';
}

function abrirEditar() {
  if (!proveedor.value) return;
  proveedorModalId.value = proveedor.value.id;
  showProveedorModal.value = true;
}

async function onProveedorUpdated() {
  showProveedorModal.value = false;
  loading.value = true;
  try {
    proveedor.value = await proveedoresService.getById(proveedorId);
    error.value = '';
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo recargar el proveedor.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('proveedores')) {
    loading.value = false;
    return;
  }
  if (!proveedorId) {
    error.value = 'Falta el identificador del proveedor.';
    loading.value = false;
    return;
  }
  try {
    proveedor.value = await proveedoresService.getById(proveedorId);
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el proveedor.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('proveedores')" seccion="Proveedores" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Proveedor"
    :title="proveedor ? proveedor.nombre : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Proveedores', href: '/crud/proveedores/' },
      { label: 'Ver' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="proveedor && soloConsulta('proveedores')" objeto="los datos de este proveedor" acciones="editarlos" />
    </template>
    <template #badges>
      <EstadoActivoBadge v-if="proveedor" :activo="proveedor.is_active !== false" />
    </template>

    <template #actions>
      <button
        v-if="proveedor && puedeModificarProveedores"
        type="button"
        title="Editar proveedor"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-700 rounded-base border border-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 dark:text-brand-300 dark:border-brand-300 dark:hover:bg-gray-700"
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
      Cargando proveedor...
    </div>

    <template v-else-if="proveedor">
      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <Truck class="w-6 h-6 text-gray-800 dark:text-white" />
          Información General
        </span>
      </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {{ proveedor.identificacion || '—' }}
              <span class="ml-2 font-normal text-gray-500 dark:text-gray-400">({{ tipoIdentificacionLabel(proveedor.tipo_identificacion) }})</span>
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre / Razón Social</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ proveedor.nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo electrónico</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ proveedor.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono / WhatsApp</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ proveedor.telefono || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Persona de contacto</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ proveedor.contacto || '—' }}</dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-1">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Dirección</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ proveedor.direccion || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de registro</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(proveedor.created_at) }}</dd>
          </div>
        </dl>
      </template>
    </div>
  </div>

  <ProveedorModal
    v-model="showProveedorModal"
    :proveedor-id="proveedorModalId"
    @updated="onProveedorUpdated"
  />
  </template>
</template>
