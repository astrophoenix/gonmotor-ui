<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { request } from '../../../shared/services/httpClient';
import { inspeccionesService } from '../services/inspeccionesService';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TestigosTablero from '../../../shared/components/TestigosTablero.vue';
import { formatCurrency } from '../../../shared/utils/format';

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

const testigos = ref({
  testigo_check_engine: false,
  testigo_abs: false,
  testigo_airbag: false,
  testigo_bateria: false,
  testigo_aceite: false,
  testigo_temperatura: false,
  otros_testigos_observaciones: '',
});

watch(testigos.value, (val) => {
  form.testigo_check_engine = val.testigo_check_engine;
  form.testigo_abs = val.testigo_abs;
  form.testigo_airbag = val.testigo_airbag;
  form.testigo_bateria = val.testigo_bateria;
  form.testigo_aceite = val.testigo_aceite;
  form.testigo_temperatura = val.testigo_temperatura;
  form.otros_testigos_observaciones = val.otros_testigos_observaciones;
}, { deep: true });

function syncTestigosDesdeForm() {
  Object.assign(testigos.value, {
    testigo_check_engine: form.testigo_check_engine,
    testigo_abs: form.testigo_abs,
    testigo_airbag: form.testigo_airbag,
    testigo_bateria: form.testigo_bateria,
    testigo_aceite: form.testigo_aceite,
    testigo_temperatura: form.testigo_temperatura,
    otros_testigos_observaciones: form.otros_testigos_observaciones,
  });
}

const recepcion = ref(null);
const estadoInspeccion = ref('');

const PRIORIDADES = [
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

const serviciosDetectados = ref([]);
const repuestosSugeridos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);

const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);
const servicioPickerSearch = ref('');
const repuestoPickerSearch = ref('');
const showServicioPicker = ref(false);
const showRepuestoPicker = ref(false);

const serviciosFiltrados = computed(() => {
  const term = servicioPickerSearch.value.trim().toLowerCase();
  if (!term) return catalogoServicios.value;
  return catalogoServicios.value.filter((s) =>
    [s.codigo, s.nombre, s.marca].filter(Boolean).join(' ').toLowerCase().includes(term)
  );
});

const repuestosFiltrados = computed(() => {
  const term = repuestoPickerSearch.value.trim().toLowerCase();
  if (!term) return catalogoRepuestos.value;
  return catalogoRepuestos.value.filter((r) =>
    [r.codigo, r.nombre, r.marca].filter(Boolean).join(' ').toLowerCase().includes(term)
  );
});

function loadCatalogo() {
  request('/api/servicios/opciones/').then((data) => {
    catalogoServicios.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoServicios.value = []; });
  request('/api/repuestos/opciones/').then((data) => {
    catalogoRepuestos.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoRepuestos.value = []; });
}

async function loadDetalles() {
  if (!inspeccionId) return;
  try {
    const [servData, repData] = await Promise.all([
      request(`/api/inspeccion-servicios/?inspeccion=${inspeccionId}`),
      request(`/api/inspeccion-repuestos/?inspeccion=${inspeccionId}`),
    ]);
    serviciosDetectados.value = Array.isArray(servData) ? servData : (servData.results || []);
    repuestosSugeridos.value = Array.isArray(repData) ? repData : (repData.results || []);
  } catch (error) {
    console.error('No se pudieron cargar los detalles de inspección:', error);
  }
}

function agregarServicio(item) {
  const nuevo = {
    id: null,
    sufijo: Date.now(),
    servicio: item.id,
    servicio_codigo: item.codigo,
    servicio_nombre: item.nombre,
    descripcion: item.nombre,
    horas_estimadas: '1.00',
    precio_referencial: item.precio_referencial || '0.00',
    es_sugerido: true,
    prioridad: 'MEDIA',
  };
  if (!serviciosDetectados.value.some((s) => s.servicio === item.id)) {
    serviciosDetectados.value.push(nuevo);
  }
  showServicioPicker.value = false;
  servicioPickerSearch.value = '';
}

function agregarRepuesto(item) {
  const nuevo = {
    id: null,
    sufijo: Date.now(),
    repuesto: item.id,
    repuesto_codigo: item.codigo,
    repuesto_nombre: item.nombre,
    descripcion: item.nombre,
    cantidad: '1.00',
    precio_referencial: item.precio_venta || '0.00',
    es_sugerido: true,
    prioridad: 'MEDIA',
  };
  if (!repuestosSugeridos.value.some((r) => r.repuesto === item.id)) {
    repuestosSugeridos.value.push(nuevo);
  }
  showRepuestoPicker.value = false;
  repuestoPickerSearch.value = '';
}

function quitarServicio(index) {
  const removed = serviciosDetectados.value.splice(index, 1)[0];
  if (removed && removed.id) serviciosEliminados.value.push(removed.id);
}

function quitarRepuesto(index) {
  const removed = repuestosSugeridos.value.splice(index, 1)[0];
  if (removed && removed.id) repuestosEliminados.value.push(removed.id);
}

async function guardarDetalles() {
  if (!isEditMode) return;
  const asyncOps = [];

  serviciosDetectados.value.forEach((s) => {
    const payload = {
      servicio: s.servicio || null,
      descripcion: s.descripcion || '',
      horas_estimadas: String(s.horas_estimadas ?? '1.00'),
      precio_referencial: String(s.precio_referencial ?? '0.00'),
      es_sugerido: Boolean(s.es_sugerido),
      prioridad: s.prioridad || 'MEDIA',
    };
    if (s.id) {
      asyncOps.push(request(`/api/inspeccion-servicios/${s.id}/`, { method: 'PATCH', body: JSON.stringify(payload) }));
    } else {
      asyncOps.push(request('/api/inspeccion-servicios/', { method: 'POST', body: JSON.stringify({ ...payload, inspeccion: Number(inspeccionId) }) }));
    }
  });

  repuestosSugeridos.value.forEach((r) => {
    const payload = {
      repuesto: r.repuesto || null,
      descripcion: r.descripcion || '',
      cantidad: String(r.cantidad ?? '1.00'),
      precio_referencial: String(r.precio_referencial ?? '0.00'),
      es_sugerido: Boolean(r.es_sugerido),
      prioridad: r.prioridad || 'MEDIA',
    };
    if (r.id) {
      asyncOps.push(request(`/api/inspeccion-repuestos/${r.id}/`, { method: 'PATCH', body: JSON.stringify(payload) }));
    } else {
      asyncOps.push(request('/api/inspeccion-repuestos/', { method: 'POST', body: JSON.stringify({ ...payload, inspeccion: Number(inspeccionId) }) }));
    }
  });

  serviciosEliminados.value.forEach((id) => {
    asyncOps.push(request(`/api/inspeccion-servicios/${id}/`, { method: 'DELETE' }));
  });
  repuestosEliminados.value.forEach((id) => {
    asyncOps.push(request(`/api/inspeccion-repuestos/${id}/`, { method: 'DELETE' }));
  });

  await Promise.all(asyncOps);
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function crearCotizacion() {
  window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(inspeccionId)}`);
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
      syncTestigosDesdeForm();
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
    estadoInspeccion.value = data.estado || '';
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
    syncTestigosDesdeForm();
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
      await guardarDetalles();
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
  loadCatalogo();
  loadRecepcion();
  loadInspeccion();
  loadDetalles();
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
    <button
      v-if="isEditMode && estadoInspeccion === 'PENDIENTE'"
      type="button"
      class="inline-flex items-center px-4 py-2 mt-3 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
      @click="crearCotizacion"
    >
      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm4 3a1 1 0 000 2h8a1 1 0 100-2H8zm0 4a1 1 0 000 2h8a1 1 0 100-2H8zm0 4a1 1 0 000 2h5a1 1 0 100-2H8z"></path></svg>
      Crear cotización
    </button>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <!--div v-if="recepcion" class="p-5 mb-6 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
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
      </div-->

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
          <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso </label>
          <textarea id="motivo_ingreso" v-model="form.motivo_ingreso" rows="3" placeholder="Razón por la cual el cliente trae el vehículo o falla reportada..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_ingreso ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.motivo_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
        </div>

        <div class="col-span-1">
          <label for="diagnostico_tecnico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Diagnóstico</label>
          <textarea id="diagnostico_tecnico" v-model="form.diagnostico_tecnico" rows="4" placeholder="Describe el diagnóstico realizado por el mecánico..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.diagnostico_tecnico ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.diagnostico_tecnico" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.diagnostico_tecnico }}</p>
        </div>

        <div class="col-span-1">
          <label for="recomendaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recomendaciones</label>
          <textarea id="recomendaciones" v-model="form.recomendaciones" rows="3" placeholder="Describe las recomendaciones y plan de acción sugerido..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.recomendaciones ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.recomendaciones" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.recomendaciones }}</p>
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Testigos del Tablero</h5>
          <TestigosTablero v-model="testigos" />
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Servicios Detectados / Recomendados</h5>
          <div class="relative mb-3">
            <div class="flex gap-2">
              <input v-model="servicioPickerSearch" type="search" placeholder="Buscar servicio del catálogo..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <button
                type="button"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
                @click="showServicioPicker = !showServicioPicker"
              >
                Agregar
              </button>
            </div>
            <div v-if="showServicioPicker" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in serviciosFiltrados"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @click.stop="agregarServicio(item)"
              >
                <span class="font-medium">{{ item.codigo }}</span> - {{ item.nombre }}
                <span class="text-gray-400 text-xs">({{ formatCurrency(item.precio_referencial) }})</span>
              </button>
              <p v-if="!serviciosFiltrados.length" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados. Registra servicios en Inventario → Servicios.</p>
            </div>
          </div>
          <div v-if="serviciosDetectados.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead class="bg-gray-100 dark:bg-gray-900">
                <tr>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Servicio</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Horas</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Precio ref.</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Sugerido</th>
                  <th class="p-2"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                <tr v-for="(s, index) in serviciosDetectados" :key="s.id || s.sufijo">
                  <td class="p-2">
                    <input v-model="s.descripcion" class="block w-full p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <input v-model="s.horas_estimadas" type="number" step="0.25" min="0" class="block w-20 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <input v-model="s.precio_referencial" type="number" step="0.01" min="0" class="block w-28 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <select v-model="s.prioridad" class="block w-24 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                      <option v-for="p in PRIORIDADES" :key="p.value" :value="p.value">{{ p.label }}</option>
                    </select>
                  </td>
                  <td class="p-2 text-center">
                    <input v-model="s.es_sugerido" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
                  </td>
                  <td class="p-2 text-right">
                    <button type="button" title="Quitar servicio" aria-label="Quitar servicio" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarServicio(index)">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z" clip-rule="evenodd"></path></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Repuestos Sugeridos</h5>
          <div class="relative mb-3">
            <div class="flex gap-2">
              <input v-model="repuestoPickerSearch" type="search" placeholder="Buscar repuesto del catálogo..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <button
                type="button"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50"
                @click="showRepuestoPicker = !showRepuestoPicker"
              >
                Agregar
              </button>
            </div>
            <div v-if="showRepuestoPicker" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in repuestosFiltrados"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @click.stop="agregarRepuesto(item)"
              >
                <span class="font-medium">{{ item.codigo }}</span> - {{ item.nombre }}
                <span class="text-gray-400 text-xs">({{ formatCurrency(item.precio_venta) }} · stock {{ item.stock_actual }})</span>
              </button>
              <p v-if="!repuestosFiltrados.length" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados. Registra repuestos en Inventario → Repuestos.</p>
            </div>
          </div>
          <div v-if="repuestosSugeridos.length" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead class="bg-gray-100 dark:bg-gray-900">
                <tr>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Repuesto</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Cant.</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Precio ref.</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                  <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Sugerido</th>
                  <th class="p-2"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                <tr v-for="(r, index) in repuestosSugeridos" :key="r.id || r.sufijo">
                  <td class="p-2">
                    <input v-model="r.descripcion" class="block w-full p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <input v-model="r.cantidad" type="number" step="0.5" min="0" class="block w-20 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <input v-model="r.precio_referencial" type="number" step="0.01" min="0" class="block w-28 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  </td>
                  <td class="p-2">
                    <select v-model="r.prioridad" class="block w-24 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                      <option v-for="p in PRIORIDADES" :key="p.value" :value="p.value">{{ p.label }}</option>
                    </select>
                  </td>
                  <td class="p-2 text-center">
                    <input v-model="r.es_sugerido" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
                  </td>
                  <td class="p-2 text-right">
                    <button type="button" title="Quitar repuesto" aria-label="Quitar repuesto" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarRepuesto(index)">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z" clip-rule="evenodd"></path></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
