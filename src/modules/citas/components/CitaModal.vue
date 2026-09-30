<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { Car, X, Save, Search, Plus, UserPlus } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { citasService } from '../services/citasService';
import Alert from '../../../shared/components/Alert.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  citaId: { type: [Number, String], default: null },
  // Valores iniciales al crear (usado por el calendario al hacer clic en un hueco)
  prefill: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const isEditMode = computed(() => Boolean(props.citaId));

const ESTADOS = [
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'NO_ASISTIO', label: 'No Asistió' },
];

const MOTIVOS = [
  { value: 'MANTENIMIENTO', label: 'Mantenimiento Preventivo' },
  { value: 'REPARACION', label: 'Reparación / Falla Reportada' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico / Escaneo' },
  { value: 'ESTETICA', label: 'Enderezada, Pintura o Detailing' },
  { value: 'GARANTIA', label: 'Garantía / Retorno' },
  { value: 'OTRO', label: 'Otro' },
];

const form = ref({
  cliente: null,
  vehiculo: null,
  taller: null,
  fecha_cita: '',
  hora_cita: '',
  duracion_minutos: 60,
  estado: 'PROGRAMADA',
  motivo: 'MANTENIMIENTO',
  motivo_descripcion: '',
  kilometraje_aproximado: null,
  notas_internas: '',
  asesor: null,
});

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const formErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

// --- Agenda / capacidad del taller ---
const talleres = ref([]);
const talleresCargados = ref(false);
const disponibilidad = ref(null);
const disponibilidadLoading = ref(false);
let disponibilidadTimer = null;

const TALLERES_ENDPOINT = '/api/configuracion/sucursales/';

// --- Búsqueda de cliente ---
const clientsList = ref([]);
const clientsLoading = ref(false);
const clientSearch = ref('');
const clientsDropped = ref(false);
const showClientCreate = ref(false);
const clientCreateForm = ref({ identificacion: '', nombre: '', telefono: '', email: '' });
const isCreatingClient = ref(false);

// --- Búsqueda de vehículo ---
const vehiclesList = ref([]);
const vehiclesLoading = ref(false);
const vehicleSearch = ref('');
const vehiclesDropped = ref(false);
const showVehicleCreate = ref(false);
const vehicleCreateForm = ref({ placa: '', marca: '', modelo: '', anio: '', color: '' });
const isCreatingVehicle = ref(false);

let searchTimer = null;

const CLIENT_ENDPOINT = '/api/clientes/';
const VEHICLE_ENDPOINT = '/api/vehiculos/';

function getComparableState() {
  return {
    cliente: form.value.cliente ? form.value.cliente.id : null,
    vehiculo: form.value.vehiculo ? form.value.vehiculo.id : null,
    taller: form.value.taller,
    fecha_cita: form.value.fecha_cita,
    hora_cita: form.value.hora_cita,
    duracion_minutos: form.value.duracion_minutos,
    estado: form.value.estado,
    motivo: form.value.motivo,
    motivo_descripcion: form.value.motivo_descripcion,
    kilometraje_aproximado: form.value.kilometraje_aproximado,
    notas_internas: form.value.notas_internas,
  };
}

const hasChanges = computed(() =>
  JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState())
);

const horaFin = computed(() => {
  if (!form.value.hora_cita) return '';
  const partes = String(form.value.hora_cita).split(':');
  const minutosInicio = Number(partes[0]) * 60 + Number(partes[1]);
  const duracion = Number(form.value.duracion_minutos);
  if (Number.isNaN(minutosInicio) || Number.isNaN(duracion)) return '';
  const total = minutosInicio + Math.max(duracion, 0);
  const excedeDia = total >= 24 * 60;
  const fin = total % (24 * 60);
  const hh = String(Math.floor(fin / 60)).padStart(2, '0');
  const mm = String(fin % 60).padStart(2, '0');
  return `${hh}:${mm}${excedeDia ? ' (día siguiente)' : ''}`;
});

async function ensureTalleres() {
  if (talleresCargados.value) return;
  try {
    const data = await request(`${TALLERES_ENDPOINT}?estado=activo&page=1`);
    talleres.value = Array.isArray(data) ? data : (data.results || []);
  } catch (error) {
    talleres.value = [];
  } finally {
    talleresCargados.value = true;
  }
}

function fetchDisponibilidad() {
  clearTimeout(disponibilidadTimer);
  if (!props.modelValue || !form.value.fecha_cita) {
    disponibilidad.value = null;
    return;
  }
  const params = new URLSearchParams({ fecha: form.value.fecha_cita });
  if (form.value.taller) params.set('taller', String(form.value.taller));
  if (form.value.hora_cita) {
    params.set('hora', form.value.hora_cita);
    params.set('duracion', String(Number(form.value.duracion_minutos) || 60));
  }
  if (props.citaId) params.set('cita', String(props.citaId));

  disponibilidadTimer = setTimeout(async () => {
    disponibilidadLoading.value = true;
    try {
      disponibilidad.value = await citasService.disponibilidad(params.toString());
    } catch (error) {
      disponibilidad.value = null;
    } finally {
      disponibilidadLoading.value = false;
    }
  }, 300);
}

watch(
  [
    () => form.value.fecha_cita,
    () => form.value.hora_cita,
    () => form.value.duracion_minutos,
    () => form.value.taller,
  ],
  fetchDisponibilidad
);

function fechaHoraLocal(fecha, hora) {
  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  const [hh, mm] = String(hora || '00:00').split(':').map(Number);
  if (!anio || !mes || !dia || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(anio, mes - 1, dia, hh, mm, 0, 0);
}

function validateForm() {
  formErrors.value = {};
  const errors = {};

  if (!form.value.cliente) errors.cliente = 'Selecciona o crea un cliente.';
  if (!form.value.vehiculo) errors.vehiculo = 'Selecciona o crea un vehículo.';

  // En edición solo se bloquea el pasado si el usuario mueve el horario:
  // una cita ya agendada debe poder actualizarse aunque su hora haya pasado.
  let horarioModificado = true;
  if (isEditMode.value && formSnapshot.value) {
    horarioModificado = form.value.fecha_cita !== formSnapshot.value.fecha_cita
      || form.value.hora_cita !== formSnapshot.value.hora_cita;
  }

  if (!form.value.fecha_cita) {
    errors.fecha_cita = 'La fecha de la cita es obligatoria.';
  } else if (horarioModificado) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaElegida = fechaHoraLocal(form.value.fecha_cita, '00:00');
    if (!fechaElegida || fechaElegida < hoy) {
      errors.fecha_cita = 'La fecha de la cita no puede ser anterior a hoy.';
    }
  }

  if (!form.value.hora_cita) {
    errors.hora_cita = 'La hora de la cita es obligatoria.';
  } else if (horarioModificado && form.value.fecha_cita && !errors.fecha_cita) {
    // El usuario puede tardar en completar el formulario: si la hora de inicio
    // ya pasó al momento de guardar, se bloquea antes de llamar al backend.
    const inicio = fechaHoraLocal(form.value.fecha_cita, form.value.hora_cita);
    if (inicio && inicio <= new Date()) {
      errors.hora_cita = 'La hora de la cita ya pasó. Selecciona un horario futuro.';
    }
  }

  const duracion = Number(form.value.duracion_minutos);
  if (!Number.isInteger(duracion) || duracion < 15 || duracion > 1440) {
    errors.duracion_minutos = 'La duración debe estar entre 15 y 1440 minutos.';
  }

  const consulta = disponibilidad.value && disponibilidad.value.solicitud;
  if (consulta && consulta.disponible === false) {
    errors[consulta.campo || 'hora_cita'] = consulta.motivo;
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

// Campos del backend que no existen en el formulario.
const CAMPOS_ALIAS = {
  fecha_hora_programada: 'hora_cita',
};

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...formErrors.value };
  Object.entries(data).forEach(([key, value]) => {
    const message = Array.isArray(value) ? value[0] : (typeof value === 'string' ? value : null);
    if (message && key !== 'non_field_errors') {
      newErrors[CAMPOS_ALIAS[key] || key] = message;
    } else if (typeof value === 'string' && key === 'detail') {
      errorMessage.value = value;
    }
  });
  formErrors.value = newErrors;
}

// --- Búsqueda de clientes (debounced) ---
async function searchClients() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    if (!clientSearch.value.trim()) {
      clientsList.value = [];
      clientsDropped.value = false;
      return;
    }
    clientsLoading.value = true;
    try {
      const data = await request(`${CLIENT_ENDPOINT}?search=${encodeURIComponent(clientSearch.value.trim())}&page=1&estado=activo`);
      clientsList.value = Array.isArray(data) ? data : (data.results || []);
      clientsDropped.value = true;
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      clientsLoading.value = false;
    }
  }, 350);
}

function selectClient(cliente) {
  form.value.cliente = {
    id: cliente.id,
    nombre: cliente.nombre,
    identificacion: cliente.identificacion,
    telefono: cliente.telefono,
  };
  clientSearch.value = '';
  clientsList.value = [];
  clientsDropped.value = false;
  showClientCreate.value = false;
  if (form.value.vehiculo) {
    const ownerId = form.value.vehiculo.cliente_id;
    if (ownerId && String(ownerId) !== String(cliente.id)) {
      form.value.vehiculo = null;
      vehicleSearch.value = '';
      vehiclesList.value = [];
    }
  }
}

function openClientCreate() {
  showClientCreate.value = true;
  clientsDropped.value = false;
}

async function createClient() {
  const nombre = (clientCreateForm.value.nombre || '').trim();
  const identificacion = (clientCreateForm.value.identificacion || '').trim();
  if (!nombre) {
    formErrors.value['create_cliente_nombre'] = 'El nombre es obligatorio.';
    return;
  }
  if (!identificacion) {
    formErrors.value['create_cliente_identificacion'] = 'La identificación es obligatoria.';
    return;
  }
  isCreatingClient.value = true;
  try {
    const nuevo = await request(CLIENT_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        tipo_identificacion: 'C',
        identificacion,
        nombre,
        telefono: clientCreateForm.value.telefono || '',
        email: clientCreateForm.value.email || '',
        direccion: '',
      }),
    });
    form.value.cliente = {
      id: nuevo.id,
      nombre: nuevo.nombre,
      identificacion: nuevo.identificacion,
      telefono: nuevo.telefono,
    };
    showClientCreate.value = false;
    clientCreateForm.value = { identificacion: '', nombre: '', telefono: '', email: '' };
    delete formErrors.value['create_cliente_nombre'];
    delete formErrors.value['create_cliente_identificacion'];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCreatingClient.value = false;
  }
}

// --- Búsqueda de vehículos (debounced) ---
function vehicleEndpoint() {
  const params = new URLSearchParams({ page: '1' });
  if (vehicleSearch.value.trim()) params.set('search', vehicleSearch.value.trim());
  if (form.value.cliente) params.set('cliente', String(form.value.cliente.id));
  return `${VEHICLE_ENDPOINT}?${params.toString()}`;
}

async function searchVehicles() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    vehiclesLoading.value = true;
    try {
      const data = await request(vehicleEndpoint());
      let items = Array.isArray(data) ? data : (data.results || []);
      items = items.filter((v) => v.is_active !== false);
      vehiclesList.value = items;
      vehiclesDropped.value = true;
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      vehiclesLoading.value = false;
    }
  }, 350);
}

function selectVehicle(vehiculo) {
  form.value.vehiculo = {
    id: vehiculo.id,
    placa: vehiculo.placa,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    color: vehiculo.color,
  };
  vehicleSearch.value = '';
  vehiclesList.value = [];
  vehiclesDropped.value = false;
  showVehicleCreate.value = false;
}

function openVehicleCreate() {
  showVehicleCreate.value = true;
  vehiclesDropped.value = false;
}

async function createVehicle() {
  const placa = (vehicleCreateForm.value.placa || '').replace(/-/g, '').trim().toUpperCase();
  const marca = (vehicleCreateForm.value.marca || '').trim();
  const modelo = (vehicleCreateForm.value.modelo || '').trim();
  const newErrors = {};
  if (!placa) newErrors.create_vehiculo_placa = 'La placa es obligatoria.';
  if (!marca) newErrors.create_vehiculo_marca = 'La marca es obligatoria.';
  if (!modelo) newErrors.create_vehiculo_modelo = 'El modelo es obligatorio.';
  if (Object.keys(newErrors).length) {
    formErrors.value = { ...formErrors.value, ...newErrors };
    return;
  }
  isCreatingVehicle.value = true;
  try {
    const payload = {
      placa,
      vin: '',
      numero_motor: '',
      marca,
      modelo,
      anio: vehicleCreateForm.value.anio ? Number(vehicleCreateForm.value.anio) : null,
      color: vehicleCreateForm.value.color || '',
      transmision: 'M',
      combustible: 'GAS',
      tipo: 'AUTO',
      kilometraje_actual: 0,
      observaciones: '',
      cliente_id: form.value.cliente ? form.value.cliente.id : null,
    };
    const nuevo = await request(VEHICLE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.value.vehiculo = {
      id: nuevo.id,
      placa: nuevo.placa,
      marca: nuevo.marca,
      modelo: nuevo.modelo,
      color: nuevo.color,
    };
    showVehicleCreate.value = false;
    vehicleCreateForm.value = { placa: '', marca: '', modelo: '', anio: '', color: '' };
    delete formErrors.value.create_vehiculo_placa;
    delete formErrors.value.create_vehiculo_marca;
    delete formErrors.value.create_vehiculo_modelo;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCreatingVehicle.value = false;
  }
}

function resetForm() {
  form.value = {
    cliente: null,
    vehiculo: null,
    taller: null,
    fecha_cita: '',
    hora_cita: '',
    duracion_minutos: 60,
    estado: 'PROGRAMADA',
    motivo: 'MANTENIMIENTO',
    motivo_descripcion: '',
    kilometraje_aproximado: null,
    notas_internas: '',
    asesor: null,
  };
  clientSearch.value = '';
  vehicleSearch.value = '';
  clientsList.value = [];
  vehiclesList.value = [];
  showClientCreate.value = false;
  showVehicleCreate.value = false;
  formErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
  clearTimeout(disponibilidadTimer);
  disponibilidad.value = null;
  disponibilidadLoading.value = false;
}

async function open() {
  resetForm();
  await ensureTalleres();

  if (!isEditMode.value) {
    const hoy = new Date();
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    form.value.fecha_cita = (props.prefill && props.prefill.fecha_cita) || local;
    if (!form.value.taller && talleres.value.length) {
      form.value.taller = talleres.value[0].id;
    }
    if (props.prefill) {
      if (props.prefill.hora_cita) form.value.hora_cita = props.prefill.hora_cita;
      if (props.prefill.duracion_minutos) {
        form.value.duracion_minutos = Number(props.prefill.duracion_minutos);
      }
      if (props.prefill.taller) form.value.taller = props.prefill.taller;
    }
    formSnapshot.value = getComparableState();
    return;
  }

  isLoading.value = true;
  try {
    const data = await citasService.getById(props.citaId);
    form.value = {
      cliente: data.cliente || null,
      vehiculo: data.vehiculo || null,
      taller: data.taller || null,
      fecha_cita: data.fecha_cita || '',
      hora_cita: data.hora_cita || '',
      duracion_minutos: Number(data.duracion_minutos) || 60,
      estado: data.estado || 'PROGRAMADA',
      motivo: data.motivo || 'MANTENIMIENTO',
      motivo_descripcion: data.motivo_descripcion || '',
      kilometraje_aproximado: data.kilometraje_aproximado,
      notas_internas: data.notas_internas || '',
      asesor: data.asesor || null,
    };
    nextTick().then(() => { formSnapshot.value = getComparableState(); });
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
}

watch(() => props.modelValue, (abierto) => {
  if (abierto) open();
});

async function submit() {
  errorMessage.value = '';
  if (!validateForm()) {
    errorMessage.value = 'Revisa los campos marcados en rojo.';
    return;
  }

  isSaving.value = true;
  const payload = {
    cliente: form.value.cliente ? form.value.cliente.id : null,
    vehiculo: form.value.vehiculo ? form.value.vehiculo.id : null,
    taller: form.value.taller || null,
    fecha_cita: form.value.fecha_cita,
    hora_cita: form.value.hora_cita,
    duracion_minutos: Number(form.value.duracion_minutos) || 60,
    estado: form.value.estado,
    motivo: form.value.motivo,
    motivo_descripcion: form.value.motivo_descripcion || '',
    kilometraje_aproximado: form.value.kilometraje_aproximado
      ? Number(form.value.kilometraje_aproximado)
      : null,
    notas_internas: form.value.notas_internas || '',
  };

  try {
    if (isEditMode.value) {
      const response = await citasService.update(props.citaId, payload);
      emit('updated', response);
    } else {
      const response = await citasService.create(payload);
      emit('created', response);
    }
  } catch (error) {
    errorMessage.value = error.message;
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

function close() {
  if (hasChanges.value && !isSaving.value) {
    if (!showDiscardWarning.value) {
      showDiscardWarning.value = true;
      return;
    }
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

function formatHour(value) {
  if (!value) return '';
  const parts = String(value).split(':');
  const hours = Number(parts[0]);
  const minutes = parts[1] || '00';
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4"
    @click.self="close"
  >
    <div class="relative block w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar cita' : 'Nueva cita' }}
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-4">
        <Alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          dismissible
          @dismiss="errorMessage = ''"
        />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando cita...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">Cliente y vehículo</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Cliente -->
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente *</label>
              <div v-if="form.cliente" class="flex items-center justify-between p-2.5 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate dark:text-white">{{ form.cliente.nombre }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ form.cliente.identificacion }} · {{ form.cliente.telefono || 'Sin teléfono' }}</p>
                </div>
                <button type="button" class="text-sm text-red-600 hover:underline dark:text-red-400" @click="form.cliente = null; clientSearch = ''">Cambiar</button>
              </div>
              <template v-else>
                <div class="relative">
                  <Search class="absolute w-4 h-4 text-gray-400 left-3 top-3" />
                  <input
                    v-model="clientSearch"
                    type="text"
                    placeholder="Buscar por nombre o identificación..."
                    class="block w-full p-2.5 pl-9 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    @input="searchClients"
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-blue-700 rounded-md hover:bg-primary-blue-50 dark:text-primary-blue-400"
                    @click="openClientCreate"
                  >
                    <UserPlus class="w-3.5 h-3.5" />
                    Crear
                  </button>
                  <div
                    v-if="clientsDropped"
                    class="absolute z-20 mt-1 w-full overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600"
                  >
                    <p v-if="clientsLoading" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando...</p>
                    <ul v-else-if="clientsList.length" class="max-h-52 overflow-y-auto">
                      <li
                        v-for="c in clientsList"
                        :key="c.id"
                        class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        @click="selectClient(c)"
                      >
                        <span class="font-medium text-gray-900 dark:text-white">{{ c.nombre }}</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ c.identificacion }} · {{ c.telefono || 'Sin teléfono' }}</span>
                      </li>
                    </ul>
                    <p v-else class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados. Usa "Crear".</p>
                  </div>
                </div>
                <p v-if="formErrors.cliente" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.cliente }}</p>
              </template>

              <div v-if="showClientCreate" class="p-3 mt-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Crear cliente rápido</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input v-model="clientCreateForm.nombre" type="text" placeholder="Nombre" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <p v-if="formErrors.create_cliente_nombre" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_cliente_nombre }}</p>
                  </div>
                  <div>
                    <input v-model="clientCreateForm.identificacion" type="text" maxlength="20" placeholder="Identificación" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <p v-if="formErrors.create_cliente_identificacion" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_cliente_identificacion }}</p>
                  </div>
                  <div>
                    <input v-model="clientCreateForm.telefono" type="text" placeholder="Teléfono" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  </div>
                  <div>
                    <input v-model="clientCreateForm.email" type="email" placeholder="Email" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  </div>
                </div>
                <button
                  type="button"
                  :disabled="isCreatingClient"
                  class="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 disabled:opacity-50"
                  @click="createClient"
                >
                  {{ isCreatingClient ? 'Creando...' : 'Crear cliente' }}
                </button>
              </div>
            </div>

            <!-- Vehículo -->
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo *</label>
              <div v-if="form.vehiculo" class="flex items-center justify-between p-2.5 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <div class="flex items-center gap-2 min-w-0">
                  <Car class="w-4 h-4 text-gray-500 shrink-0 dark:text-gray-400" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate dark:text-white">{{ form.vehiculo.placa }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ form.vehiculo.marca }} {{ form.vehiculo.modelo }} {{ form.vehiculo.color || '' }}</p>
                  </div>
                </div>
                <button type="button" class="text-sm text-red-600 hover:underline dark:text-red-400" @click="form.vehiculo = null; vehicleSearch = ''">Cambiar</button>
              </div>
              <template v-else>
                <div class="relative">
                  <Search class="absolute w-4 h-4 text-gray-400 left-3 top-3" />
                  <input
                    v-model="vehicleSearch"
                    type="text"
                    :placeholder="form.cliente ? 'Buscar vehículo del cliente...' : 'Buscar vehículo...'"
                    class="block w-full p-2.5 pl-9 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    @input="searchVehicles"
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-blue-700 rounded-md hover:bg-primary-blue-50 dark:text-primary-blue-400"
                    @click="openVehicleCreate"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    Crear
                  </button>
                  <div
                    v-if="vehiclesDropped"
                    class="absolute z-20 mt-1 w-full overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600"
                  >
                    <p v-if="vehiclesLoading" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando...</p>
                    <ul v-else-if="vehiclesList.length" class="max-h-52 overflow-y-auto">
                      <li
                        v-for="v in vehiclesList"
                        :key="v.id"
                        class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        @click="selectVehicle(v)"
                      >
                        <span class="font-medium text-gray-900 dark:text-white">{{ v.placa }}</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ v.marca }} {{ v.modelo }} {{ v.color || '' }}</span>
                      </li>
                    </ul>
                    <p v-else class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados. Usa "Crear".</p>
                  </div>
                </div>
                <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
                <p v-if="!form.cliente" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Sugerencia: selecciona primero el cliente.</p>
              </template>

              <div v-if="showVehicleCreate" class="p-3 mt-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Crear vehículo rápido</p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div class="col-span-1">
                    <input v-model="vehicleCreateForm.placa" type="text" placeholder="Placa" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <p v-if="formErrors.create_vehiculo_placa" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_placa }}</p>
                  </div>
                  <div class="col-span-1">
                    <input v-model="vehicleCreateForm.marca" type="text" placeholder="Marca" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <p v-if="formErrors.create_vehiculo_marca" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_marca }}</p>
                  </div>
                  <div class="col-span-1">
                    <input v-model="vehicleCreateForm.modelo" type="text" placeholder="Modelo" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <p v-if="formErrors.create_vehiculo_modelo" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_modelo }}</p>
                  </div>
                  <div class="col-span-1">
                    <input v-model="vehicleCreateForm.anio" type="number" min="1900" placeholder="Año" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  </div>
                  <div class="col-span-2 sm:col-span-4">
                    <input v-model="vehicleCreateForm.color" type="text" placeholder="Color" class="block w-full p-2 text-sm bg-white rounded-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  </div>
                </div>
                <button
                  type="button"
                  :disabled="isCreatingVehicle"
                  class="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 disabled:opacity-50"
                  @click="createVehicle"
                >
                  {{ isCreatingVehicle ? 'Creando...' : 'Crear vehículo' }}
                </button>
              </div>
            </div>
          </div>

          <h4 class="mt-6 mb-4 text-base font-semibold dark:text-white">Programación</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label for="cita_taller" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Taller</label>
              <select
                id="cita_taller"
                v-model="form.taller"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.taller ? 'bg-red-50 border border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
                <option :value="null">Sin taller asignado</option>
                <option v-for="t in talleres" :key="t.id" :value="t.id">{{ t.nombre }}</option>
              </select>
              <p v-if="formErrors.taller" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.taller }}</p>
            </div>
            <div>
              <label for="cita_fecha" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha *</label>
              <input
                id="cita_fecha"
                v-model="form.fecha_cita"
                type="date"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.fecha_cita ? 'bg-red-50 border border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.fecha_cita" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_cita }}</p>
            </div>
            <div>
              <label for="cita_hora" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Hora *</label>
              <input
                id="cita_hora"
                v-model="form.hora_cita"
                type="time"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.hora_cita ? 'bg-red-50 border border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.hora_cita" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.hora_cita }}</p>
            </div>
            <div>
              <label for="cita_duracion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Duración (minutos) *</label>
              <input
                id="cita_duracion"
                v-model.number="form.duracion_minutos"
                type="number"
                min="15"
                max="1440"
                step="15"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.duracion_minutos ? 'bg-red-50 border border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.duracion_minutos" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.duracion_minutos }}</p>
            </div>
            <div>
              <label for="cita_hora_fin" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Termina a las</label>
              <input
                id="cita_hora_fin"
                :value="horaFin"
                type="text"
                readonly
                placeholder="--:--"
                class="block w-full p-2.5 text-sm bg-gray-100 border border-gray-300 rounded-lg text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
              >
            </div>
            <div>
              <label for="cita_motivo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo *</label>
              <select id="cita_motivo" v-model="form.motivo" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="m in MOTIVOS" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div>
              <label for="cita_kilometraje" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje aproximado</label>
              <input id="cita_kilometraje" v-model="form.kilometraje_aproximado" type="number" min="0" placeholder="Ej: 45200" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>

            <!-- Disponibilidad de la agenda del taller -->
            <div v-if="disponibilidad || disponibilidadLoading" class="md:col-span-2">
              <div
                :class="[
                  'rounded-lg border p-3 text-sm',
                  disponibilidad && disponibilidad.solicitud && disponibilidad.solicitud.disponible === false
                    ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40',
                ]"
              >
                <p v-if="disponibilidadLoading" class="text-gray-500 dark:text-gray-400">
                  Consultando disponibilidad...
                </p>
                <template v-else-if="disponibilidad">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ disponibilidad.taller ? `Taller ${disponibilidad.taller.nombre}` : 'Sin taller configurado' }}
                        <span v-if="disponibilidad.horario" class="font-normal text-gray-500 dark:text-gray-400">
                          · Horario {{ disponibilidad.horario.apertura }}–{{ disponibilidad.horario.cierre }}
                        </span>
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <template v-if="!disponibilidad.aplicable">
                          No hay límites configurados: la cita se guardará sin validar cupo.
                        </template>
                        <template v-else-if="disponibilidad.capacidad_dia">
                          {{ disponibilidad.citas_ocupadas }} de {{ disponibilidad.capacidad_dia }} citas ocupadas
                          · {{ disponibilidad.citas_disponibles }} disponibles
                        </template>
                        <template v-else>
                          Sin límite de citas por día.
                        </template>
                        <template v-if="disponibilidad.capacidad_simultanea">
                          · Máximo {{ disponibilidad.capacidad_simultanea }} vehículos a la vez
                        </template>
                      </p>
                    </div>
                    <span
                      v-if="disponibilidad.solicitud"
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                        disponibilidad.solicitud.disponible
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                      ]"
                    >
                      {{ disponibilidad.solicitud.disponible ? 'Hora disponible' : 'Sin cupo' }}
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <div class="md:col-span-2">
              <label for="cita_motivo_desc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción del motivo / falla reportada</label>
              <textarea id="cita_motivo_desc" v-model="form.motivo_descripcion" rows="2" placeholder="Detalla el servicio solicitado o la falla..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
            <div class="md:col-span-2">
              <label for="cita_notas" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Notas internas</label>
              <textarea id="cita_notas" v-model="form.notas_internas" rows="2" placeholder="Observaciones para el equipo del taller..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
          </div>

          <div v-if="isEditMode" class="mt-6">
            <label for="cita_estado" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Estado</label>
            <select id="cita_estado" v-model="form.estado" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
            </select>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || isLoading"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="submit"
        >
          <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
          <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear cita') }}
        </button>
      </div>
    </div>
  </div>
</template>