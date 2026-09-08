<script setup>
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, SquarePen } from 'lucide-vue-next';
import { ordenesService } from '../services/ordenesService';
import Alert from '../../../shared/components/Alert.vue';

const orden = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const success = ref(false);

const ordenId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const form = ref({
  estado: 'INGRESADO',
  prioridad: 'MEDIA',
  mecanico_principal: '',
  fecha_entrega: '',
  observaciones_internas: '',
});

const ESTADOS = [
  { value: 'INGRESADO', label: 'En Recepción / Diagnóstico' },
  { value: 'EN_PROCESO', label: 'En Trabajo / Ejecución' },
  { value: 'COMPLETADO', label: 'Trabajo Listo' },
  { value: 'ENTREGADO', label: 'Entregado y Cerrado' },
  { value: 'CANCELADO', label: 'Anulado / Cancelado' },
];

const PRIORIDADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente / Emergencia' },
];

function goTo(path) {
  window.location.assign(path);
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

onMounted(async () => {
  if (!ordenId.value) {
    error.value = 'Falta el identificador de la orden de trabajo.';
    loading.value = false;
    return;
  }
  try {
    orden.value = await ordenesService.getById(ordenId.value);
    form.value = {
      estado: orden.value.estado || 'INGRESADO',
      prioridad: orden.value.prioridad || 'MEDIA',
      mecanico_principal: orden.value.mecanico_principal || '',
      fecha_entrega: toDateTimeLocal(orden.value.fecha_entrega),
      observaciones_internas: orden.value.observaciones_internas || '',
    };
  } catch (err) {
    error.value = err.message || 'Error al cargar la orden de trabajo.';
  } finally {
    loading.value = false;
  }
});

async function handleSubmit() {
  if (!orden.value) return;
  saving.value = true;
  error.value = '';
  success.value = false;

  const payload = {
    estado: form.value.estado,
    prioridad: form.value.prioridad,
    observaciones_internas: form.value.observaciones_internas,
  };
  if (form.value.mecanico_principal) {
    payload.mecanico_principal = form.value.mecanico_principal;
  }
  if (form.value.fecha_entrega) {
    payload.fecha_entrega = new Date(form.value.fecha_entrega).toISOString();
  } else {
    payload.fecha_entrega = null;
  }

  try {
    await ordenesService.update(orden.value.id, payload);
    success.value = true;
    setTimeout(() => goTo(`/crud/ordenes/ver/?id=${orden.value.id}`), 1200);
  } catch (err) {
    error.value = err.message || 'No se pudo guardar la orden de trabajo.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400">/ <a href="/crud/ordenes/" class="hover:text-primary-600">Órdenes</a></li>
        <li class="text-gray-400">/ Editar orden {{ orden?.numero_orden || '' }}</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        title="Volver al detalle"
        class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        @click="goTo(`/crud/ordenes/ver/?id=${ordenId}`)"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
        Editar Orden de Trabajo {{ orden?.numero_orden || '' }}
      </h1>
    </div>
  </div>

  <div class="p-4">
    <div class="relative mx-auto max-w-3xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="success" type="success" title="Guardado correctamente" message="Redirigiendo al detalle..." dismissible @dismiss="success = false" />
      <Alert v-if="error" type="error" title="Error" :message="error" dismissible @dismiss="error = ''" />

      <div v-if="loading" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Cargando orden de trabajo...
      </div>

      <div v-else-if="!orden && !error" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Orden de trabajo no encontrada.
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <SquarePen class="w-6 h-6 text-gray-800 dark:text-white" />
            Datos de la Orden
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="estado" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Estado</label>
            <select id="estado" v-model="form.estado" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option v-for="estado in ESTADOS" :key="estado.value" :value="estado.value">{{ estado.label }}</option>
            </select>
          </div>
          <div>
            <label for="prioridad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Prioridad</label>
            <select id="prioridad" v-model="form.prioridad" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option v-for="prioridad in PRIORIDADES" :key="prioridad.value" :value="prioridad.value">{{ prioridad.label }}</option>
            </select>
          </div>
          <div>
            <label for="fecha_entrega" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Entrega</label>
            <input id="fecha_entrega" v-model="form.fecha_entrega" type="datetime-local" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </div>
          <div>
            <label for="mecanico_principal" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Mecánico Principal (ID)</label>
            <input id="mecanico_principal" v-model="form.mecanico_principal" type="number" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Id del usuario mecánico">
          </div>
          <div class="md:col-span-2">
            <label for="observaciones_internas" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones Internas</label>
            <textarea id="observaciones_internas" v-model="form.observaciones_internas" rows="3" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Notas no visibles para el cliente"></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            class="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            @click="goTo(`/crud/ordenes/ver/?id=${ordenId}`)"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700"
          >
            <SquarePen class="w-4 h-4 mr-2" />
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>