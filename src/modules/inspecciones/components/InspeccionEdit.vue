<script setup>
import { onMounted, reactive, ref } from 'vue';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';

const urlParams = new URLSearchParams(window.location.search);
const inspeccionId = urlParams.get('id');
const recepcionId = urlParams.get('recepcion');
const isEditMode = Boolean(inspeccionId);

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

const form = reactive({
  recepcion: recepcionId || null,
  tipo_inspeccion: 'DIAGNOSTICO',
  motivo_ingreso: '',
  codigos_dtc: '',
  diagnostico_tecnico: '',
  recomendaciones: '',
  testigo_check_engine: false,
  testigo_abs: false,
  testigo_airbag: false,
  testigo_bateria: false,
  testigo_aceite: false,
  testigo_temperatura: false,
  otros_testigos_observaciones: '',
});

const recepcion = ref(null);

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function validateForm() {
  formErrors.value = {};
  const errors = {};

  if (!form.motivo_ingreso || !form.motivo_ingreso.trim()) {
    errors.motivo_ingreso = 'El motivo de ingreso es obligatorio.';
  }

  if (!form.diagnostico_tecnico || !form.diagnostico_tecnico.trim()) {
    errors.diagnostico_tecnico = 'El diagnóstico técnico es obligatorio.';
  }

  if (!form.recomendaciones || !form.recomendaciones.trim()) {
    errors.recomendaciones = 'Las recomendaciones son obligatorias.';
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function loadRecepcion() {
  if (!recepcionId) return;

  try {
    const data = await request(`/api/recepciones/${recepcionId}/`);
    recepcion.value = data;
    if (!isEditMode) {
      const existente = data.inspecciones?.[0];
      if (existente) {
        window.location.assign(`/crud/inspecciones/editar/?id=${existente.id}`);
        return;
      }
      form.motivo_ingreso = data.motivo_ingreso || '';
      form.tipo_inspeccion = data.tipo_recepcion || 'DIAGNOSTICO';
      form.testigo_check_engine = data.testigo_check_engine || false;
      form.testigo_abs = data.testigo_abs || false;
      form.testigo_airbag = data.testigo_airbag || false;
      form.testigo_bateria = data.testigo_bateria || false;
      form.testigo_aceite = data.testigo_aceite || false;
      form.testigo_temperatura = data.testigo_temperatura || false;
      form.otros_testigos_observaciones = data.otros_testigos_observaciones || '';
    }
  } catch (error) {
    console.error('No se pudo cargar la recepción:', error);
  }
}

async function loadInspeccion() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await inspeccionesService.getById(inspeccionId);
    const recepcionIdVal = data.recepcion && typeof data.recepcion === 'object' ? data.recepcion.id : data.recepcion;
    Object.assign(form, {
      recepcion: recepcionIdVal,
      tipo_inspeccion: data.tipo_inspeccion || 'DIAGNOSTICO',
      motivo_ingreso: data.motivo_ingreso || '',
      codigos_dtc: data.codigos_dtc || '',
      diagnostico_tecnico: data.diagnostico_tecnico || '',
      recomendaciones: data.recomendaciones || '',
      testigo_check_engine: data.testigo_check_engine || false,
      testigo_abs: data.testigo_abs || false,
      testigo_airbag: data.testigo_airbag || false,
      testigo_bateria: data.testigo_bateria || false,
      testigo_aceite: data.testigo_aceite || false,
      testigo_temperatura: data.testigo_temperatura || false,
      otros_testigos_observaciones: data.otros_testigos_observaciones || '',
    });
    if (data.recepcion) {
      recepcion.value = data.recepcion;
    }
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};
  isSaving.value = true;

  try {
    if (!validateForm()) {
      errorMessage.value = 'Completa correctamente los campos obligatorios.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      recepcion: form.recepcion && typeof form.recepcion === 'object' ? form.recepcion.id : form.recepcion,
      tipo_inspeccion: form.tipo_inspeccion,
      motivo_ingreso: form.motivo_ingreso?.trim() || '',
      codigos_dtc: form.codigos_dtc?.trim() || '',
      diagnostico_tecnico: form.diagnostico_tecnico.trim(),
      recomendaciones: form.recomendaciones?.trim() || '',
      testigo_check_engine: form.testigo_check_engine,
      testigo_abs: form.testigo_abs,
      testigo_airbag: form.testigo_airbag,
      testigo_bateria: form.testigo_bateria,
      testigo_aceite: form.testigo_aceite,
      testigo_temperatura: form.testigo_temperatura,
      otros_testigos_observaciones: form.otros_testigos_observaciones?.trim() || '',
    };

    if (isEditMode) {
      await inspeccionesService.update(inspeccionId, payload);
      successMessage.value = 'Inspección actualizada correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await inspeccionesService.create(payload);
      const nuevoId = response && response.id;
      if (nuevoId) {
        window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(nuevoId)}`);
      } else {
        successMessage.value = 'Inspección creada correctamente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (error) {
    if (error.data && typeof error.data === 'object') {
      const serverErrors = {};
      Object.keys(error.data).forEach((key) => {
        const value = error.data[key];
        if (Array.isArray(value)) {
          serverErrors[key] = value[0];
        } else if (typeof value === 'string') {
          serverErrors[key] = value;
        }
      });
      if (Object.keys(serverErrors).length > 0) {
        formErrors.value = serverErrors;
      }
    }
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadRecepcion();
  loadInspeccion();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/inspecciones/" class="hover:text-primary-600">Inspecciones</a></li>
        <li v-if="recepcion" class="text-gray-400">/ <a :href="`/crud/recepciones/ver/?id=${recepcion.id}`" class="hover:text-primary-600">Recepción #{{ recepcion.id }}</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Nueva' }} Inspección</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
      {{ isEditMode ? 'Editar Inspección' : 'Nueva Inspección' }}
    </h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="recepcion" class="p-5 mb-6 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
        <div class="flex items-center mb-4">
          <svg class="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16h1a1 1 0 0 0 1-1V9.5H5V15a1 1 0 0 0 1 1h1m10 0v.5A1.5 1.5 0 0 1 15.5 18h-1A1.5 1.5 0 0 1 13 16.5V16m4 0h-4m-6 0v.5A1.5 1.5 0 0 1 7.5 18h-1A1.5 1.5 0 0 1 5 16.5V16m0-6.5h14M8 4h8l2.5 5.5H11.5l-1-2H9l-1 2H5.5L8 4Z"/>
          </svg>
          <h4 class="text-base font-semibold text-gray-900 dark:text-white">Recepción asociada</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Vehículo</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.vehiculo?.placa || recepcion.placa || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.vehiculo?.marca || recepcion.marca }} {{ recepcion.vehiculo?.modelo || recepcion.modelo }}</p>
              <p v-if="recepcion.vehiculo?.color || recepcion.color" class="mt-1 text-gray-500 dark:text-gray-400">Color: {{ recepcion.vehiculo?.color || recepcion.color }}</p>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Cliente</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.cliente?.nombre || recepcion.cliente_nombre || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.identificacion || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.telefono || '-' }}</p>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Ingreso</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="text-gray-900 dark:text-white">{{ new Date(recepcion.created_at).toLocaleString('es-EC') }}</p>
              <p class="mt-1 text-gray-500 dark:text-gray-400">#{{ recepcion.id }}</p>
            </div>
          </div>
        </div>
      </div>

      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
          </svg>
          Información de la Inspección
        </span>
      </h4>

      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando inspección...</div>

      <form v-else class="grid grid-cols-1 gap-6" novalidate @submit.prevent="submit">
        <div class="col-span-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-1">
            <label for="tipo_inspeccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Inspección</label>
            <select id="tipo_inspeccion" v-model="form.tipo_inspeccion" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="PREVENTIVO">Mantenimiento Preventivo</option>
              <option value="CORRECTIVO">Reparación Correctiva</option>
              <option value="DIAGNOSTICO">Solo Diagnóstico / Escaneo</option>
              <option value="ESTETICA">Enderezada, Pintura o Detailing</option>
              <option value="GARANTIA">Garantía / Retorno</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="codigos_dtc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Códigos de Falla (DTC OBD2)</label>
            <input id="codigos_dtc" v-model="form.codigos_dtc" maxlength="255" placeholder="Ej: P0300, P0171..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
          </div>
        </div>

        <div class="col-span-1">
          <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso / Falla Reportada</label>
          <textarea id="motivo_ingreso" v-model="form.motivo_ingreso" rows="3" placeholder="Razón por la cual el cliente trae el vehículo o falla reportada..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_ingreso ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.motivo_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
        </div>

        <div class="col-span-1">
          <label for="diagnostico_tecnico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Diagnóstico Técnico / Hallazgos</label>
          <textarea id="diagnostico_tecnico" v-model="form.diagnostico_tecnico" rows="4" placeholder="Describe el diagnóstico realizado por el mecánico..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.diagnostico_tecnico ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.diagnostico_tecnico" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.diagnostico_tecnico }}</p>
        </div>

        <div class="col-span-1">
          <label for="recomendaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recomendaciones y Plan de Acción</label>
          <textarea id="recomendaciones" v-model="form.recomendaciones" rows="3" placeholder="Describe las recomendaciones y plan de acción sugerido..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.recomendaciones ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.recomendaciones" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.recomendaciones }}</p>
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Testigos del Tablero</h5>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="flex items-center">
              <input id="testigo_check_engine" v-model="form.testigo_check_engine" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_check_engine" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Check Engine</label>
            </div>
            <div class="flex items-center">
              <input id="testigo_abs" v-model="form.testigo_abs" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_abs" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">ABS</label>
            </div>
            <div class="flex items-center">
              <input id="testigo_airbag" v-model="form.testigo_airbag" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_airbag" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Airbag</label>
            </div>
            <div class="flex items-center">
              <input id="testigo_bateria" v-model="form.testigo_bateria" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_bateria" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Batería</label>
            </div>
            <div class="flex items-center">
              <input id="testigo_aceite" v-model="form.testigo_aceite" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_aceite" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Presión de Aceite</label>
            </div>
            <div class="flex items-center">
              <input id="testigo_temperatura" v-model="form.testigo_temperatura" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
              <label for="testigo_temperatura" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Temperatura / Refrigerante</label>
            </div>
          </div>
        </div>

        <div class="col-span-1">
          <label for="otros_testigos_observaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Otros Testigos u Observaciones del Tablero</label>
          <input id="otros_testigos_observaciones" v-model="form.otros_testigos_observaciones" maxlength="255" placeholder="Otros testigos o notas adicionales..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
        </div>

        <div class="col-span-1">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/inspecciones/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
