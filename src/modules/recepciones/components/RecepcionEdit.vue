<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { recepcionesService } from '../services/recepcionesService';
import { request } from '../../../shared/services/httpClient';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';

const recepcionId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(recepcionId);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

const defaultNow = new Date().toISOString().slice(0, 16);

function toLocalDatetimeInput(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.slice(0, 16);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  return '';
}

const form = reactive({
  cliente: null,
  vehiculo: null,
  fecha_ingreso: defaultNow,
  fecha_salida: '',
  recibido_por: '',
  kilometraje_ingreso: null,
  nivel_combustible: '1/4',
  ingreso_en_grua: false,
  datos_grua: '',
  tiene_espejo_izquierdo: true,
  tiene_espejo_derecho: true,
  tiene_vidrios: true,
  tiene_radio: true,
  tiene_pantalla: false,
  tiene_encendedor: false,
  tiene_antena: true,
  tiene_control_puertas: false,
  tiene_cargador_celular: false,
  tiene_triangulos: false,
  tiene_cubresol: false,
  tiene_herramientas: false,
  tiene_gata_palanca: true,
  tiene_llanta_repuesto: true,
  tiene_faros_lunas: true,
  tiene_tapa_gasolina: true,
  tiene_placas: true,
  tiene_tapetes: true,
  tiene_extintor: false,
  tiene_botiquin: false,
  tiene_copas_ruedas: true,
  tiene_llave_tuercas: false,
  datos_danos_carroceria: null,
  detalles_carroceria: '',
  cliente_identificacion: '',
  cliente_telefono: '',
  cliente_email: '',
  vehiculo_color: '',
});

const GRUPO_BLUEPRINT_MAP = {
  AUTO: 'liviano',
  JEEP: 'liviano',
  CAMN: 'camioneta',
  FURG: 'camioneta',
};
const MAX_DETALLES_CARROCERIA = 20;

const clienteSearch = ref('');
const vehiculoSearch = ref('');
const vehiculoSearchDisplay = ref('');
const clienteOptions = ref([]);
const vehiculoOptions = ref([]);
const showClienteDropdown = ref(false);
const showVehiculoDropdown = ref(false);
const blueprintImageUrl = ref('');
const marcas = ref([]);
const detallesSyncVersion = ref(0);
const blueprintError = ref('');
const detallesErrors = ref({});

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function syncDetallesCarroceria() {
  const lines = marcas.value
    .map((punto, idx) => ({ numero: idx + 1, descripcion: (punto.descripcion || '').trim() }))
    .filter(item => item.descripcion.length > 0)
    .map(item => `${item.numero}: ${item.descripcion}`);
  form.detalles_carroceria = lines.join('\n');
  detallesSyncVersion.value += 1;
}

function sanitizeDetalleCarroceria(punto, value) {
  punto.descripcion = sanitizeObservaciones(value).slice(0, 80);
}

function sanitizeDatosGrua(value) {
  form.datos_grua = sanitizeObservaciones(value);
}

function parseDetallesCarroceria(texto) {
  if (!texto) {
    return [];
  }
  const regex = /^(\d+):\s*(.+)$/gm;
  const items = [];
  let match;
  while ((match = regex.exec(texto)) !== null) {
    items.push({ numero: parseInt(match[1], 10), descripcion: match[2] });
  }
  items.sort((a, b) => a.numero - b.numero);
  return items.map(item => item.descripcion);
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

async function loadRecepcion() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await recepcionesService.getById(recepcionId);
    if (data) {
      Object.assign(form, {
        ...data,
        cliente: data.cliente || null,
        vehiculo: data.vehiculo || null,
        fecha_ingreso: toLocalDatetimeInput(data.fecha_ingreso),
        fecha_salida: toLocalDatetimeInput(data.fecha_salida),
        recibido_por: data.recibido_por || '',
      });
      if (data.cliente) {
        form.cliente_identificacion = data.cliente.identificacion || '';
        form.cliente_telefono = data.cliente.telefono || '';
        form.cliente_email = data.cliente.email || '';
        clienteSearch.value = data.cliente.nombre;
      } else {
        form.cliente_identificacion = '';
        form.cliente_telefono = '';
        form.cliente_email = '';
        clienteSearch.value = '';
      }
      if (data.vehiculo) {
        form.vehiculo_color = data.vehiculo.color || '';
        vehiculoSearch.value = data.vehiculo.placa;
        vehiculoSearchDisplay.value = formatPlaca(data.vehiculo.placa);
        await cargarBlueprint(data.vehiculo.grupo_blueprint);
      } else {
        form.vehiculo_color = '';
        vehiculoSearch.value = '';
        vehiculoSearchDisplay.value = '';
      }
      const descripciones = parseDetallesCarroceria(data.detalles_carroceria);
      if (descripciones.length > 0) {
        marcas.value = marcas.value.map((punto, idx) => ({
          ...punto,
          descripcion: descripciones[idx] || ''
        }));
      }
    }
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function cargarBlueprint(grupo) {
  const grupoFinal = grupo || (form.vehiculo?.grupo_blueprint ? GRUPO_BLUEPRINT_MAP[form.vehiculo?.tipo] : null);
  if (!grupoFinal) {
    blueprintImageUrl.value = '';
    return;
  }
  const candidates = [grupoFinal, 'liviano'];
  for (const candidate of candidates) {
    const url = `/images/blueprint_${candidate}.jpeg`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        blueprintImageUrl.value = url;
        return;
      }
    } catch {
      // ignore and try fallback
    }
  }
  blueprintImageUrl.value = '';
}

function onBlueprintClick(event) {
  if (marcas.value.length >= MAX_DETALLES_CARROCERIA) {
    blueprintError.value = 'No se pueden agregar más de 20 detalles. Eliminá uno existente para continuar.';
    return;
  }
  blueprintError.value = '';
  const container = event.currentTarget;
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  marcas.value = [...marcas.value, { id: Date.now(), x: Math.round(x), y: Math.round(y), descripcion: '' }];
}

async function searchClientes() {
  const term = clienteSearch.value.trim();
  if (!term) {
    clienteOptions.value = [];
    return;
  }

  try {
    const params = new URLSearchParams({ search: term, ordering: 'nombre', page: '1' });
    const data = await request(`/api/clientes/?${params.toString()}`);
    clienteOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar clientes:', error);
  }
}

async function searchVehiculos() {
  const term = vehiculoSearch.value.trim();
  const params = new URLSearchParams({ ordering: 'placa', page: '1' });
  if (term) params.set('search', term);
  if (form.cliente?.id) params.set('cliente', String(form.cliente.id));

  if (!term && !form.cliente?.id) {
    vehiculoOptions.value = [];
    return;
  }

  try {
    const data = await request(`/api/vehiculos/?${params.toString()}`);
    vehiculoOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar vehículos:', error);
  }
}

function selectCliente(cliente) {
  form.cliente = cliente;
  form.cliente_identificacion = cliente.identificacion || '';
  form.cliente_telefono = cliente.telefono || '';
  form.cliente_email = cliente.email || '';
  clienteSearch.value = cliente.nombre;
  showClienteDropdown.value = false;
  form.vehiculo = null;
  form.vehiculo_color = '';
  vehiculoSearch.value = '';
  vehiculoSearchDisplay.value = '';
  searchVehiculos();
  if (vehiculoOptions.value.length === 1) {
    selectVehiculo(vehiculoOptions.value[0]);
  }
}

function selectVehiculo(vehiculo) {
  form.vehiculo = vehiculo;
  form.vehiculo_color = vehiculo.color || '';
  vehiculoSearch.value = vehiculo.placa;
  vehiculoSearchDisplay.value = formatPlaca(vehiculo.placa);
  showVehiculoDropdown.value = false;
  marcas.value = [];
  cargarBlueprint(vehiculo.grupo_blueprint);
}

function clearMarcas() {
  marcas.value = [];
}

function clearCliente() {
  form.cliente = null;
  form.cliente_identificacion = '';
  form.cliente_telefono = '';
  form.cliente_email = '';
  clienteSearch.value = '';
  clienteOptions.value = [];
  clearVehiculo();
}

function clearVehiculo() {
  form.vehiculo = null;
  form.vehiculo_color = '';
  vehiculoSearch.value = '';
  vehiculoSearchDisplay.value = '';
  vehiculoOptions.value = [];
}

function validateRecepcion() {
  const errors = {};

  if (!form.cliente) {
    errors.cliente = 'El cliente es obligatorio.';
  }

  if (!form.vehiculo) {
    errors.vehiculo = 'El vehículo es obligatorio.';
  }

  const kmRaw = form.kilometraje_ingreso;
  const kmStr = kmRaw == null ? '' : String(kmRaw).trim();
  if (kmStr === '') {
    errors.kilometraje_ingreso = 'El kilometraje es obligatorio y debe ser mayor a 0.';
  } else {
    const km = Number(kmStr);
    if (Number.isNaN(km)) {
      errors.kilometraje_ingreso = 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
    } else if (km < 0) {
      errors.kilometraje_ingreso = 'El kilometraje no puede ser negativo. Por favor ingresa un valor mayor a 0.';
    } else if (km === 0) {
      errors.kilometraje_ingreso = 'El kilometraje debe ser mayor a 0.';
    } else if (!Number.isInteger(km)) {
      errors.kilometraje_ingreso = 'El kilometraje debe ser un número entero mayor a 0.';
    }
  }

  if (!form.fecha_ingreso) {
    errors.fecha_ingreso = 'La fecha de ingreso es obligatoria.';
  }

  if (form.ingreso_en_grua && !form.datos_grua) {
    errors.datos_grua = 'Ingresa los datos de la grúa o chófer.';
  }

  const detallesVacios = marcas.value.filter(p => !(p.descripcion || '').trim());
  if (detallesVacios.length > 0) {
    errors.detalles_carroceria = 'Completa todas las descripciones de carrocería.';
  }

  formErrors.value = errors;
  detallesErrors.value = {};
  marcas.value.forEach((p, idx) => {
    if (!(p.descripcion || '').trim()) {
      detallesErrors.value[idx] = 'La descripción es obligatoria.';
    }
  });

  return Object.keys(errors).length === 0;
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};
  isSaving.value = true;

  try {
    const isValid = validateRecepcion();
    if (!isValid) {
      errorMessage.value = 'Completa correctamente los campos obligatorios.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      cliente: form.cliente?.id || null,
      vehiculo: form.vehiculo?.id || null,
      fecha_ingreso: form.fecha_ingreso || defaultNow,
      fecha_salida: form.fecha_salida || null,
      kilometraje_ingreso: Number(form.kilometraje_ingreso),
      nivel_combustible: form.nivel_combustible,
      ingreso_en_grua: form.ingreso_en_grua,
      datos_grua: form.ingreso_en_grua ? form.datos_grua : null,
      tiene_espejo_izquierdo: form.tiene_espejo_izquierdo,
      tiene_espejo_derecho: form.tiene_espejo_derecho,
      tiene_vidrios: form.tiene_vidrios,
      tiene_radio: form.tiene_radio,
      tiene_pantalla: form.tiene_pantalla,
      tiene_encendedor: form.tiene_encendedor,
      tiene_antena: form.tiene_antena,
      tiene_control_puertas: form.tiene_control_puertas,
      tiene_cargador_celular: form.tiene_cargador_celular,
      tiene_triangulos: form.tiene_triangulos,
      tiene_cubresol: form.tiene_cubresol,
      tiene_herramientas: form.tiene_herramientas,
      tiene_gata_palanca: form.tiene_gata_palanca,
      tiene_llanta_repuesto: form.tiene_llanta_repuesto,
      tiene_faros_lunas: form.tiene_faros_lunas,
      tiene_tapa_gasolina: form.tiene_tapa_gasolina,
      tiene_placas: form.tiene_placas,
      tiene_tapetes: form.tiene_tapetes,
      tiene_extintor: form.tiene_extintor,
      tiene_botiquin: form.tiene_botiquin,
      tiene_copas_ruedas: form.tiene_copas_ruedas,
      tiene_llave_tuercas: form.tiene_llave_tuercas,
      datos_danos_carroceria: marcas.value,
      detalles_carroceria: form.detalles_carroceria || '',
    };

    if (isEditMode) {
      await recepcionesService.update(recepcionId, payload);
      successMessage.value = 'Recepción actualizada correctamente.';
    } else {
      await recepcionesService.create(payload);
      successMessage.value = 'Recepción creada correctamente.';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

watch(() => clienteSearch.value, () => {
  if (!clienteSearch.value.trim()) {
    clearCliente();
    return;
  }
  searchClientes();
});

watch(() => vehiculoSearch.value, () => {
  searchVehiculos();
});

watch(() => form.vehiculo?.tipo, (tipo) => {
  const grupo = tipo ? GRUPO_BLUEPRINT_MAP[tipo] : null;
  if (grupo) {
    cargarBlueprint(grupo);
  } else {
    blueprintImageUrl.value = '';
  }
});

watch(() => marcas.value, () => {
  syncDetallesCarroceria();
}, { deep: true });

onMounted(() => {
  loadRecepcion();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/recepciones/" class="hover:text-primary-600">Recepciones</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Nueva' }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
      {{ isEditMode ? 'Editar recepción' : 'Nueva recepción' }}
    </h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando recepción...</div>
      <form v-else class="space-y-6" novalidate @submit.prevent="submit">
        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
            Información General
          </span>
        </h4>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="relative col-span-1">
            <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</label>
            <input
              id="cliente"
              v-model="clienteSearch"
              autocomplete="off"
              placeholder="Buscar cliente..."
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.cliente ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
               @focus="showClienteDropdown = true"
               @blur="async () => { await wait(150); showClienteDropdown = false; }"
            />
            <p v-if="formErrors.cliente" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.cliente }}</p>
            <div v-if="showClienteDropdown && clienteOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in clienteOptions"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @mousedown="selectCliente(item)"
              >
                {{ item.nombre }}
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="cliente_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</label>
            <input
              id="cliente_identificacion"
              :value="form.cliente_identificacion"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="cliente_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
            <input
              id="cliente_telefono"
              :value="form.cliente_telefono"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="cliente_email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo</label>
            <input
              id="cliente_email"
              :value="form.cliente_email"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
        </div>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="relative col-span-1">
            <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
            <input
              id="vehiculo"
              v-model="vehiculoSearchDisplay"
              autocomplete="off"
              placeholder="Buscar placa..."
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.vehiculo ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
               @focus="showVehiculoDropdown = true; vehiculoSearchDisplay = vehiculoSearch"
               @blur="async () => { await wait(150); showVehiculoDropdown = false; vehiculoSearch = vehiculoSearchDisplay.replace(/-/g, '').toUpperCase(); vehiculoSearchDisplay = formatPlaca(vehiculoSearch); }"
            />
            <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
            <div v-if="showVehiculoDropdown && vehiculoOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in vehiculoOptions"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @mousedown="selectVehiculo(item)"
              >
                {{ formatPlaca(item.placa) }}
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="vehiculo_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
            <input
              id="vehiculo_marca"
              :value="form.vehiculo ? form.vehiculo.marca : ''"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="vehiculo_modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
            <input
              id="vehiculo_modelo"
              :value="form.vehiculo ? form.vehiculo.modelo : ''"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="vehiculo_color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
            <input
              id="vehiculo_color"
              v-model="form.vehiculo_color"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
            Información de Ingreso
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="col-span-1">
            <label for="fecha_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Ingreso</label>
            <input
              id="fecha_ingreso"
              v-model="form.fecha_ingreso"
              type="datetime-local"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.fecha_ingreso ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.fecha_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_ingreso }}</p>
          </div>

          <div class="col-span-1">
            <label for="fecha_salida" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Salida (estimada)</label>
            <input
              id="fecha_salida"
              v-model="form.fecha_salida"
              type="datetime-local"
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div class="col-span-1">
            <label for="recibido_por" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recibido por</label>
            <input
              id="recibido_por"
              v-model="form.recibido_por"
              type="text"
              placeholder="Nombre del recepcionista"
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div class="col-span-1">
            <label for="kilometraje_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje de Ingreso</label>
            <input
              id="kilometraje_ingreso"
              v-model="form.kilometraje_ingreso"
              type="number"
              min="1"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.kilometraje_ingreso ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.kilometraje_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.kilometraje_ingreso }}</p>
          </div>

          <div class="col-span-1">
            <label for="nivel_combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nivel de Combustible</label>
            <select id="nivel_combustible" v-model="form.nivel_combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="VACIO">Vacío</option>
              <option value="RESERVA">Reserva</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="3/4">3/4</option>
              <option value="LLENO">Lleno</option>
            </select>
          </div>

          <div class="col-span-1 flex items-center mt-6">
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.ingreso_en_grua" type="checkbox" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              <span class="ml-3 text-sm font-medium text-gray-900 dark:text-white">¿Ingresó en grúa?</span>
            </label>
          </div>

          <div v-if="form.ingreso_en_grua" class="col-span-1">
            <label for="datos_grua" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Datos de la grúa / Chófer</label>
            <input
              id="datos_grua"
              :value="form.datos_grua"
              @input="sanitizeDatosGrua($event.target.value)"
              placeholder="Datos Grúa / chófer"
              maxlength="80"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.datos_grua ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.datos_grua" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.datos_grua }}</p>
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 7 2 2 4-4m-5-9v4h4V3h-4Z"/>
            </svg>
            Inventario del Vehículo
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Elementos Exteriores / Mecánicos</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_espejo_izquierdo', label: 'Espejo Izquierdo' },
                { key: 'tiene_espejo_derecho', label: 'Espejo Derecho' },
                { key: 'tiene_vidrios', label: 'Vidrios / Cristales' },
                { key: 'tiene_faros_lunas', label: 'Faros / Lunas' },
                { key: 'tiene_tapa_gasolina', label: 'Tapa de Gasolina' },
                { key: 'tiene_placas', label: 'Placas de Circulación' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Interiores / Confort</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_radio', label: 'Radio / Mascarilla' },
                { key: 'tiene_pantalla', label: 'Pantalla / Multimedia' },
                { key: 'tiene_encendedor', label: 'Encendedor' },
                { key: 'tiene_control_puertas', label: 'Control de Puertas' },
                { key: 'tiene_cargador_celular', label: 'Cargador de Celular' },
                { key: 'tiene_tapetes', label: 'Tapetes / Alfombras' },
                { key: 'tiene_cubresol', label: 'Cubresol' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seguridad y Emergencia</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_llanta_repuesto', label: 'Llanta de Repuesto' },
                { key: 'tiene_gata_palanca', label: 'Gata y Palanca' },
                { key: 'tiene_herramientas', label: 'Juego de Herramientas' },
                { key: 'tiene_extintor', label: 'Extintor' },
                { key: 'tiene_botiquin', label: 'Botiquín' },
                { key: 'tiene_triangulos', label: 'Triángulos de Seguridad' },
                { key: 'tiene_llave_tuercas', label: 'Llave de Tuercas' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
            </svg>
            Inspección Física / Carrocería
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marcación de Daños (Clic en el diagrama)</p>
            <p v-if="blueprintError" class="mb-2 text-sm text-red-600 dark:text-red-500">{{ blueprintError }}</p>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <div v-if="!form.vehiculo" class="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">Selecciona un vehículo para cargar el diagrama.</div>
              <div v-else class="relative" style="aspect-ratio: 4/3;">
                <img v-if="blueprintImageUrl" :src="blueprintImageUrl" class="absolute inset-0 w-full h-full object-contain" @click="onBlueprintClick" />
                <div class="absolute inset-0 pointer-events-none">
                  <span
                    v-for="(punto, idx) in marcas"
                    :key="punto.id"
                    class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full -translate-x-1/2 -translate-y-1/2"
                    :style="{ left: punto.x + '%', top: punto.y + '%' }"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex justify-center mt-3">
              <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20" @click="clearMarcas">
                <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                </svg>
                Limpiar marcaciones
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="detalles_carroceria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalles de Carrocería</label>
            <div class="mt-2 space-y-2">
              <div v-for="(punto, idx) in marcas" :key="punto.id" class="flex items-start gap-2">
                <span class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full mt-1">{{ idx + 1 }}</span>
                <div class="flex-1">
                <input
                  :value="punto.descripcion"
                  @input="sanitizeDetalleCarroceria(punto, $event.target.value)"
                  type="text"
                  :name="`detalle_carroceria_${punto.id}`"
                  placeholder="Descripción del daño..."
                  maxlength="80"
                  :class="['block w-full p-2 text-sm bg-white border rounded-lg dark:bg-gray-700 dark:text-white', detallesErrors[idx] ? 'border-red-500 text-red-900 dark:text-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600']"
                />
                <p v-if="detallesErrors[idx]" class="mt-1 text-sm text-red-600 dark:text-red-500">{{ detallesErrors[idx] }}</p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ punto.descripcion.length }}/80</p>
                </div>
                <button type="button" class="inline-flex items-center justify-center w-8 h-8 text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20 mt-1" @click="marcas = marcas.filter(m => m.id !== punto.id)">
                  <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm5.757-1a1 1 0 1 0 0 2h8.486a1 1 0 1 0 0-2H7.757Z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              id="detalles_carroceria"
              v-model="form.detalles_carroceria"
              hidden
              rows="8"
              placeholder="Describe golpes, rayones o estado de pintura..."
              class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>
        </div>

        <div class="col-span-1 md:col-span-4">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/recepciones/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
