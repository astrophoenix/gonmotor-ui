<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import {
  X, Save, CalendarPlus, CalendarClock, UserRound, Car, Clock, Wrench, Hammer, ScanLine,
  SprayCan, ShieldCheck, Ellipsis, Gauge, Lock, Building2, CircleCheck, CircleAlert,
  TriangleAlert, Wand2, Loader2, CheckCircle2, ClipboardList, Info,
} from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { listarTalleresDisponibles } from '../../../shared/services/talleresDisponiblesService';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { useAuthStore } from '../../auth/stores/authStore';
import { COLORES_ESTADO } from '../../calendario/composables/useCalendario';
import { citasService } from '../services/citasService';
import Alert from '../../../shared/components/Alert.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import FichaCampos from '../../../shared/components/FichaCampos.vue';
import { formatDateOnly } from '../../../shared/utils/datetime';
import RecordatoriosCita from '../../notificaciones/components/RecordatoriosCita.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  citaId: { type: [Number, String], default: null },
  // Valores iniciales al crear (usado por el calendario al hacer clic en un hueco)
  prefill: { type: Object, default: null },
  // Variante de consulta: ficha de lectura y solo «Cerrar» (rol sin `modificar`).
  soloLectura: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const authStore = useAuthStore();
const { puede } = usePermisos();

const isEditMode = computed(() => Boolean(props.citaId));

const ESTADOS = [
  { value: 'PROGRAMADA', label: 'Programada', ayuda: 'Agendada, sin confirmar con el cliente.' },
  { value: 'CONFIRMADA', label: 'Confirmada', ayuda: 'El cliente confirmó que vendrá.' },
  { value: 'EN_PROGRESO', label: 'En progreso', ayuda: 'El cliente llegó y se está atendiendo.' },
  { value: 'COMPLETADA', label: 'Completada', ayuda: 'Se convirtió en recepción.' },
  { value: 'CANCELADA', label: 'Cancelada', ayuda: 'Libera el cupo en la agenda.' },
  { value: 'NO_ASISTIO', label: 'No asistió', ayuda: 'Libera el cupo en la agenda.' },
];

// Una cita completada (convertida en recepción), cancelada o sin asistencia
// ya no cambia de estado ni de horario: el backend lo rechaza.
const ESTADOS_FINALES = ['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'];
// Cancelada y no asistió no ocupan cupo en la agenda del taller.
const ESTADOS_SIN_CUPO = ['CANCELADA', 'NO_ASISTIO'];

const MOTIVOS = [
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', detalle: 'Preventivo', icon: Wrench },
  { value: 'REPARACION', label: 'Reparación', detalle: 'Falla reportada', icon: Hammer },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico', detalle: 'Escaneo', icon: ScanLine },
  { value: 'ESTETICA', label: 'Estética', detalle: 'Pintura o detailing', icon: SprayCan },
  { value: 'GARANTIA', label: 'Garantía', detalle: 'Retorno', icon: ShieldCheck },
  { value: 'OTRO', label: 'Otro', detalle: 'Otro motivo', icon: Ellipsis },
];

const DURACIONES = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 90, label: '1 h 30' },
  { value: 120, label: '2 h' },
  { value: 180, label: '3 h' },
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
const estadoOriginal = ref('PROGRAMADA');
const recepcionNumero = ref('');
// Datos tal como llegan de la API, para la ficha de lectura (nombres ya resueltos).
const citaData = ref(null);

const esFinal = computed(() => isEditMode.value && ESTADOS_FINALES.includes(estadoOriginal.value));
const estadosVisibles = computed(() => (
  esFinal.value
    ? ESTADOS.filter((e) => e.value === estadoOriginal.value)
    : ESTADOS.filter((e) => e.value !== 'COMPLETADA')
));
const estadoActual = computed(() => ESTADOS.find((e) => e.value === form.value.estado) || ESTADOS[0]);

function colorEstado(estado) {
  return (COLORES_ESTADO[estado] || COLORES_ESTADO.PROGRAMADA).bg;
}

// --- Agenda / capacidad del taller ---
const talleres = ref([]);
const talleresCargados = ref(false);
const disponibilidad = ref(null);
const disponibilidadLoading = ref(false);
let disponibilidadTimer = null;

// --- Cliente y vehículo (selectores con búsqueda; el vehículo requiere cliente) ---
const clientSearch = ref('');
const vehicleSearch = ref('');
const showClientCreate = ref(false);
const clientCreateForm = ref({ identificacion: '', nombre: '', telefono: '', email: '' });
const isCreatingClient = ref(false);
const showVehicleCreate = ref(false);
const vehicleCreateForm = ref({ placa: '', marca: '', modelo: '', anio: '', color: '' });
const isCreatingVehicle = ref(false);
// Último kilometraje registrado del vehículo (referencia para el aproximado).
const kmVehiculo = ref(null);

const CLIENT_ENDPOINT = '/api/clientes/';
const VEHICLE_ENDPOINT = '/api/vehiculos/';

const puedeCrearCliente = computed(() => puede('clientes', 'modificar'));
const puedeCrearVehiculo = computed(() => puede('vehiculos', 'modificar'));

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').trim().toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function formatKm(valor) {
  if (valor == null || valor === '') return '';
  return `${Number(valor).toLocaleString('es-EC')} km`;
}

// --- Asesor (empleado que atiende la cita y recibirá el vehículo al convertirla) ---
const asesorSearch = ref('');

function nombreEmpleado(empleado) {
  const user = empleado?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '';
}

function selectAsesor(empleado) {
  form.value.asesor = empleado?.user?.id ?? null;
  asesorSearch.value = nombreEmpleado(empleado);
}

function clearAsesor() {
  form.value.asesor = null;
  asesorSearch.value = '';
}

function getComparableState() {
  return {
    cliente: form.value.cliente ? form.value.cliente.id : null,
    vehiculo: form.value.vehiculo ? form.value.vehiculo.id : null,
    taller: form.value.taller,
    asesor: form.value.asesor || null,
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

function aMinutos(hora) {
  if (!hora) return null;
  const [hh, mm] = String(hora).split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function aHora(minutos) {
  const fin = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
}

const horaFin = computed(() => {
  const inicio = aMinutos(form.value.hora_cita);
  const duracion = Number(form.value.duracion_minutos);
  if (inicio == null || Number.isNaN(duracion)) return '';
  const total = inicio + Math.max(duracion, 0);
  return `${aHora(total)}${total >= 24 * 60 ? ' (día siguiente)' : ''}`;
});

const duracionTexto = computed(() => {
  const minutos = Number(form.value.duracion_minutos);
  if (!Number.isFinite(minutos) || minutos <= 0) return '';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
});

const fechaPartes = computed(() => {
  const [anio, mes, dia] = String(form.value.fecha_cita || '').split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  const fecha = new Date(anio, mes - 1, dia);
  return {
    dia: String(dia),
    mes: fecha.toLocaleDateString('es-EC', { month: 'short' }).replace('.', ''),
    semana: fecha.toLocaleDateString('es-EC', { weekday: 'long' }),
    larga: fecha.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
});

const tallerNombre = computed(() => {
  const taller = talleres.value.find((t) => String(t.id) === String(form.value.taller));
  return taller?.nombre || disponibilidad.value?.taller?.nombre || '';
});

async function ensureTalleres() {
  if (talleresCargados.value) return;
  try {
    // Solo los talleres en los que el rol del usuario puede operar.
    const data = await listarTalleresDisponibles();
    talleres.value = data?.resultados || [];
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

const ocupaCupo = computed(() => !ESTADOS_SIN_CUPO.includes(form.value.estado));
// En una cita finalizada el horario ya no se mueve: no se muestra el veredicto de cupo.
const solicitud = computed(() => (
  ocupaCupo.value && !esFinal.value ? disponibilidad.value?.solicitud || null : null
));

// Línea de tiempo del día: franjas ocupadas repartidas en carriles y la
// franja de esta cita encima.
const agenda = computed(() => {
  const d = disponibilidad.value;
  if (!d) return null;
  const intervalos = (d.intervalos || []).map((i) => ({
    ...i,
    desde: aMinutos(i.inicio),
    hasta: aMinutos(i.fin) || 1440,
  })).filter((i) => i.desde != null);

  const seleccionDesde = aMinutos(form.value.hora_cita);
  const seleccionHasta = seleccionDesde != null
    ? seleccionDesde + Math.max(Number(form.value.duracion_minutos) || 0, 15)
    : null;

  let inicio = aMinutos(d.horario?.apertura) ?? 8 * 60;
  let fin = aMinutos(d.horario?.cierre) ?? 18 * 60;
  if (seleccionDesde != null) {
    inicio = Math.min(inicio, seleccionDesde);
    fin = Math.max(fin, Math.min(seleccionHasta, 1440));
  }
  inicio = Math.floor(inicio / 60) * 60;
  fin = Math.ceil(fin / 60) * 60;
  if (fin - inicio < 120) fin = inicio + 120;
  const total = fin - inicio;
  const pct = (m) => ((Math.min(Math.max(m, inicio), fin) - inicio) / total) * 100;

  const carriles = [];
  const bloques = [...intervalos]
    .sort((a, b) => a.desde - b.desde)
    .filter((i) => i.hasta > inicio && i.desde < fin)
    .map((i) => {
      let carril = carriles.findIndex((ocupadoHasta) => ocupadoHasta <= i.desde);
      if (carril === -1) {
        carril = carriles.length;
        carriles.push(i.hasta);
      } else {
        carriles[carril] = i.hasta;
      }
      return { ...i, carril, left: pct(i.desde), width: Math.max(pct(i.hasta) - pct(i.desde), 1) };
    });

  // Una línea por hora; con más de 6 h en pantalla, etiqueta cada 2 h.
  const cadaEtiqueta = total > 6 * 60 ? 120 : 60;
  const marcas = [];
  for (let m = inicio; m <= fin; m += 60) {
    marcas.push({ etiqueta: (m - inicio) % cadaEtiqueta === 0 ? aHora(m).replace(/^0/, '') : '', left: pct(m) });
  }

  const fueraDeHorario = d.horario && seleccionDesde != null && (
    seleccionDesde < aMinutos(d.horario.apertura) || seleccionHasta > aMinutos(d.horario.cierre)
  );

  return {
    bloques,
    marcas,
    carriles: Math.max(carriles.length, 1),
    horarioLeft: d.horario ? pct(aMinutos(d.horario.apertura)) : 0,
    horarioWidth: d.horario ? pct(aMinutos(d.horario.cierre)) - pct(aMinutos(d.horario.apertura)) : 100,
    seleccion: seleccionDesde != null
      ? { left: pct(seleccionDesde), width: Math.max(pct(seleccionHasta) - pct(seleccionDesde), 1) }
      : null,
    fueraDeHorario,
    lista: intervalos.sort((a, b) => a.desde - b.desde),
  };
});

const ocupacionPct = computed(() => {
  const d = disponibilidad.value;
  if (!d || !d.capacidad_dia) return 0;
  return Math.min(Math.round((d.citas_ocupadas / d.capacidad_dia) * 100), 100);
});

function fechaHoraLocal(fecha, hora) {
  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  const [hh, mm] = String(hora || '00:00').split(':').map(Number);
  if (!anio || !mes || !dia || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(anio, mes - 1, dia, hh, mm, 0, 0);
}

const kmMenorAlRegistrado = computed(() => {
  const valor = form.value.kilometraje_aproximado;
  if (valor === null || valor === '' || kmVehiculo.value == null) return false;
  return Number(valor) < Number(kmVehiculo.value);
});

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

  const consulta = solicitud.value;
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

function limpiarError(campo) {
  if (formErrors.value[campo]) delete formErrors.value[campo];
}

// --- Cliente ---
function selectCliente(cliente) {
  form.value.cliente = cliente;
  clientSearch.value = cliente.nombre || '';
  showClientCreate.value = false;
  limpiarError('cliente');
  clearVehiculo();
}

function clearCliente() {
  form.value.cliente = null;
  clientSearch.value = '';
  clearVehiculo();
}

function openClientCreate() {
  showClientCreate.value = true;
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
    form.value.cliente = nuevo;
    clientSearch.value = nuevo.nombre || '';
    showClientCreate.value = false;
    clientCreateForm.value = { identificacion: '', nombre: '', telefono: '', email: '' };
    clearVehiculo();
    delete formErrors.value['create_cliente_nombre'];
    delete formErrors.value['create_cliente_identificacion'];
    limpiarError('cliente');
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCreatingClient.value = false;
  }
}

// --- Vehículo ---
async function cargarKmVehiculo(vehiculo) {
  kmVehiculo.value = vehiculo?.kilometraje_actual ?? null;
  if (!vehiculo?.id || vehiculo.kilometraje_actual !== undefined) return;
  // La cita trae un resumen del vehículo sin su odómetro: se consulta aparte.
  try {
    const detalle = await request(`${VEHICLE_ENDPOINT}${encodeURIComponent(vehiculo.id)}/`);
    if (form.value.vehiculo?.id === vehiculo.id) {
      kmVehiculo.value = detalle?.kilometraje_actual ?? null;
      form.value.vehiculo = { ...detalle, ...form.value.vehiculo, anio: detalle?.anio ?? form.value.vehiculo.anio };
    }
  } catch {
    kmVehiculo.value = null;
  }
}

function selectVehiculo(vehiculo) {
  form.value.vehiculo = vehiculo;
  vehicleSearch.value = formatPlaca(vehiculo.placa);
  showVehicleCreate.value = false;
  limpiarError('vehiculo');
  cargarKmVehiculo(vehiculo);
}

function clearVehiculo() {
  form.value.vehiculo = null;
  vehicleSearch.value = '';
  kmVehiculo.value = null;
}

function openVehicleCreate() {
  showVehicleCreate.value = true;
}

function usarKmRegistrado() {
  form.value.kilometraje_aproximado = kmVehiculo.value;
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
    form.value.vehiculo = nuevo;
    vehicleSearch.value = formatPlaca(nuevo.placa);
    kmVehiculo.value = nuevo?.kilometraje_actual ?? null;
    showVehicleCreate.value = false;
    vehicleCreateForm.value = { placa: '', marca: '', modelo: '', anio: '', color: '' };
    delete formErrors.value.create_vehiculo_placa;
    delete formErrors.value.create_vehiculo_marca;
    delete formErrors.value.create_vehiculo_modelo;
    limpiarError('vehiculo');
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCreatingVehicle.value = false;
  }
}

const vehiculoResumen = computed(() => {
  const v = form.value.vehiculo;
  if (!v) return '';
  return [[v.marca, v.modelo].filter(Boolean).join(' '), v.anio, v.color].filter(Boolean).join(' · ');
});

const clienteResumen = computed(() => {
  const c = form.value.cliente;
  if (!c) return '';
  return [c.identificacion, c.telefono].filter(Boolean).join(' · ');
});

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
  asesorSearch.value = '';
  kmVehiculo.value = null;
  estadoOriginal.value = 'PROGRAMADA';
  recepcionNumero.value = '';
  showClientCreate.value = false;
  showVehicleCreate.value = false;
  formErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
  clearTimeout(disponibilidadTimer);
  disponibilidad.value = null;
  disponibilidadLoading.value = false;
}

function tallerInicial() {
  // El taller activo de la sesión, si el rol puede operar en él; si no, el primero.
  const activo = talleres.value.find((t) => String(t.id) === String(authStore.tallerId));
  return (activo || talleres.value[0])?.id ?? null;
}

async function open() {
  resetForm();
  citaData.value = null;
  await ensureTalleres();

  if (!isEditMode.value) {
    const hoy = new Date();
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    form.value.fecha_cita = (props.prefill && props.prefill.fecha_cita) || local;
    form.value.taller = tallerInicial();
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
      hora_cita: data.hora_cita ? String(data.hora_cita).slice(0, 5) : '',
      duracion_minutos: Number(data.duracion_minutos) || 60,
      estado: data.estado || 'PROGRAMADA',
      motivo: data.motivo || 'MANTENIMIENTO',
      motivo_descripcion: data.motivo_descripcion || '',
      kilometraje_aproximado: data.kilometraje_aproximado,
      notas_internas: data.notas_internas || '',
      asesor: data.asesor || null,
    };
    // Un taller fuera del alcance del rol se conserva como opción para no perderlo.
    if (data.taller && !talleres.value.some((t) => String(t.id) === String(data.taller))) {
      talleres.value = [...talleres.value, { id: data.taller, nombre: data.taller_nombre || 'Taller asignado' }];
    }
    citaData.value = data;
    estadoOriginal.value = form.value.estado;
    recepcionNumero.value = data.recepcion_generada_numero || '';
    asesorSearch.value = data.asesor_nombre || '';
    clientSearch.value = data.cliente?.nombre || '';
    vehicleSearch.value = data.vehiculo ? formatPlaca(data.vehiculo.placa) : '';
    cargarKmVehiculo(data.vehiculo);
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
  showDiscardWarning.value = false;
  if (!validateForm()) {
    errorMessage.value = 'Revisa los campos marcados en rojo.';
    return;
  }

  isSaving.value = true;
  const payload = {
    cliente: form.value.cliente ? form.value.cliente.id : null,
    vehiculo: form.value.vehiculo ? form.value.vehiculo.id : null,
    taller: form.value.taller || null,
    asesor: form.value.asesor || null,
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
  if (!props.soloLectura && hasChanges.value && !isSaving.value) {
    showDiscardWarning.value = true;
    return;
  }
  discard();
}

function discard() {
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

const camposFicha = computed(() => {
  const d = citaData.value;
  if (!d) return [];
  const vehiculo = d.vehiculo
    ? [formatPlaca(d.vehiculo.placa), d.vehiculo.marca, d.vehiculo.modelo].filter(Boolean).join(' · ')
    : '';
  const estado = ESTADOS.find((e) => e.value === d.estado)?.label || d.estado_display || '';
  return [
    { etiqueta: 'Fecha', valor: formatDateOnly(d.fecha_cita) },
    { etiqueta: 'Hora', valor: d.hora_cita ? String(d.hora_cita).slice(0, 5) : '' },
    { etiqueta: 'Duración', valor: DURACIONES.find((x) => x.value === Number(d.duracion_minutos))?.label || (d.duracion_minutos ? `${d.duracion_minutos} min` : '') },
    { etiqueta: 'Taller', valor: d.taller_nombre },
    { etiqueta: 'Cliente', valor: [d.cliente?.nombre, d.cliente?.telefono].filter(Boolean).join(' · ') },
    { etiqueta: 'Vehículo', valor: vehiculo },
    { etiqueta: 'Estado', valor: recepcionNumero.value ? `${estado} · recepción ${recepcionNumero.value}` : estado },
    { etiqueta: 'Asesor', valor: d.asesor_nombre },
    { etiqueta: 'Motivo', valor: MOTIVOS.find((m) => m.value === d.motivo)?.label || d.motivo_display },
    { etiqueta: 'Kilometraje aproximado', valor: d.kilometraje_aproximado != null ? `${Number(d.kilometraje_aproximado).toLocaleString('es-EC')} km` : '' },
    { etiqueta: 'Descripción del motivo', valor: d.motivo_descripcion, ancho: 'completo' },
    { etiqueta: 'Notas internas', valor: d.notas_internas, ancho: 'completo' },
  ];
});

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-60';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const LABEL = 'block mb-2 text-sm font-medium text-gray-900 dark:text-white';
const MINI_INPUT = 'block w-full p-2 text-sm bg-white rounded border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400';

// Campo que la agenda marca sin cupo (hora o fecha), resaltado antes de guardar.
const campoSinCupo = computed(() => (
  solicitud.value && solicitud.value.disponible === false ? (solicitud.value.campo || 'hora_cita') : null
));

function inputClass(campo) {
  return [BASE_INPUT, formErrors.value[campo] || campoSinCupo.value === campo ? INPUT_ERROR : INPUT_OK];
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/70 p-2 sm:p-4">
    <div class="relative flex flex-col w-full max-w-6xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] my-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
      <!-- Cabecera -->
      <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
        <div class="flex items-center min-w-0 gap-3">
          <span class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
            <CalendarClock v-if="isEditMode" class="w-5 h-5" />
            <CalendarPlus v-else class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h3 class="text-lg font-semibold leading-tight text-gray-900 dark:text-white">
                {{ soloLectura ? 'Detalle de la cita' : (isEditMode ? 'Editar cita' : 'Nueva cita') }}
              </h3>
              <span
                v-if="isEditMode && !isLoading"
                class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: colorEstado(estadoOriginal) }"></span>
                {{ ESTADOS.find((e) => e.value === estadoOriginal)?.label }}
              </span>
            </div>
            <p class="mt-0.5 text-sm text-gray-500 truncate dark:text-gray-400">
              <template v-if="isEditMode && form.cliente">
                {{ form.cliente.nombre }}<template v-if="form.vehiculo"> · {{ formatPlaca(form.vehiculo.placa) }}</template>
              </template>
              <template v-else>Agenda el ingreso de un vehículo y reserva su espacio en el taller.</template>
            </p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Cuerpo con scroll propio: cabecera y botones siempre visibles -->
      <div class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-gray-50/60 dark:bg-gray-900/30">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <div v-if="esFinal && !soloLectura" class="flex items-start gap-3 p-3 mb-5 text-sm border rounded-lg border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <Lock class="w-4 h-4 mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
          <p>
            <span class="font-semibold text-gray-900 dark:text-white">Cita {{ estadoActual.label.toLowerCase() }}.</span>
            <template v-if="recepcionNumero"> Generó la recepción {{ recepcionNumero }}.</template>
            Cliente, vehículo, horario y motivo ya no se pueden cambiar; puedes actualizar el asesor, la descripción, el kilometraje y las notas internas.
          </p>
        </div>

        <div v-if="isLoading" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 class="w-4 h-4 animate-spin" /> Cargando cita...
        </div>
        <section v-else-if="soloLectura" :class="SECCION">
          <FichaCampos :campos="camposFicha" />
        </section>
        <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          <!-- 1. Cliente y vehículo -->
          <section :class="[SECCION, 'lg:col-span-2 lg:col-start-1']">
            <h4 :class="[TITULO_SECCION, 'mb-4']">
              <UserRound class="w-4 h-4" />
              Cliente y vehículo
            </h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Cliente -->
              <div>
                <label for="cita_cliente" :class="LABEL">Cliente <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <ClienteSearchSelect
                  id="cita_cliente"
                  v-model="clientSearch"
                  placeholder="Nombre o identificación"
                  :error="Boolean(formErrors.cliente)"
                  :error-message="formErrors.cliente"
                  :show-create="puedeCrearCliente && !esFinal"
                  :disabled="esFinal"
                  @select="selectCliente"
                  @clear="clearCliente"
                  @create="openClientCreate"
                />
                <p v-if="clienteResumen && !showClientCreate" class="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <UserRound class="w-3.5 h-3.5" /> {{ clienteResumen }}
                </p>

                <div v-if="showClientCreate" class="p-3 mt-3 border rounded-lg border-brand-200 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-brand-800 dark:text-brand-100">Cliente nuevo</p>
                    <button type="button" class="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" @click="showClientCreate = false">Cancelar</button>
                  </div>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <input v-model="clientCreateForm.nombre" type="text" placeholder="Nombre *" :class="MINI_INPUT">
                      <p v-if="formErrors.create_cliente_nombre" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_cliente_nombre }}</p>
                    </div>
                    <div>
                      <input v-model="clientCreateForm.identificacion" type="text" maxlength="20" placeholder="Identificación *" :class="MINI_INPUT">
                      <p v-if="formErrors.create_cliente_identificacion" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_cliente_identificacion }}</p>
                    </div>
                    <input v-model="clientCreateForm.telefono" type="text" placeholder="Teléfono" :class="MINI_INPUT">
                    <input v-model="clientCreateForm.email" type="email" placeholder="Email" :class="MINI_INPUT">
                  </div>
                  <button
                    type="button"
                    :disabled="isCreatingClient"
                    class="inline-flex items-center mt-3 px-3 py-1.5 text-sm font-medium text-white rounded bg-brand-900 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 disabled:opacity-50"
                    @click="createClient"
                  >
                    <Loader2 v-if="isCreatingClient" class="w-4 h-4 mr-1.5 animate-spin" />
                    {{ isCreatingClient ? 'Creando...' : 'Crear y seleccionar' }}
                  </button>
                </div>
              </div>

              <!-- Vehículo -->
              <div>
                <label for="cita_vehiculo" :class="LABEL">Vehículo <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <VehiculoSearchSelect
                  id="cita_vehiculo"
                  v-model="vehicleSearch"
                  :cliente-id="form.cliente ? form.cliente.id : null"
                  :disabled="!form.cliente || esFinal"
                  :placeholder="form.cliente ? 'Buscar por placa' : 'Primero elige el cliente'"
                  :show-create="Boolean(form.cliente) && puedeCrearVehiculo && !esFinal"
                  :error="Boolean(formErrors.vehiculo)"
                  :error-message="formErrors.vehiculo"
                  @select="selectVehiculo"
                  @clear="clearVehiculo"
                  @create="openVehicleCreate"
                />
                <p v-if="vehiculoResumen && !showVehicleCreate" class="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <Car class="w-3.5 h-3.5" /> {{ vehiculoResumen }}
                  <template v-if="kmVehiculo != null">
                    <span aria-hidden="true">·</span>
                    <Gauge class="w-3.5 h-3.5" /> {{ formatKm(kmVehiculo) }}
                  </template>
                </p>

                <div v-if="showVehicleCreate" class="p-3 mt-3 border rounded-lg border-brand-200 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-brand-800 dark:text-brand-100">Vehículo nuevo de {{ form.cliente?.nombre }}</p>
                    <button type="button" class="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" @click="showVehicleCreate = false">Cancelar</button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <input v-model="vehicleCreateForm.placa" type="text" placeholder="Placa *" :class="[MINI_INPUT, 'font-mono uppercase']">
                      <p v-if="formErrors.create_vehiculo_placa" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_placa }}</p>
                    </div>
                    <input v-model="vehicleCreateForm.anio" type="number" min="1900" placeholder="Año" :class="MINI_INPUT">
                    <div>
                      <input v-model="vehicleCreateForm.marca" type="text" placeholder="Marca *" :class="MINI_INPUT">
                      <p v-if="formErrors.create_vehiculo_marca" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_marca }}</p>
                    </div>
                    <div>
                      <input v-model="vehicleCreateForm.modelo" type="text" placeholder="Modelo *" :class="MINI_INPUT">
                      <p v-if="formErrors.create_vehiculo_modelo" class="mt-1 text-xs text-red-600 dark:text-red-500">{{ formErrors.create_vehiculo_modelo }}</p>
                    </div>
                    <input v-model="vehicleCreateForm.color" type="text" placeholder="Color" :class="[MINI_INPUT, 'col-span-2']">
                  </div>
                  <button
                    type="button"
                    :disabled="isCreatingVehicle"
                    class="inline-flex items-center mt-3 px-3 py-1.5 text-sm font-medium text-white rounded bg-brand-900 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 disabled:opacity-50"
                    @click="createVehicle"
                  >
                    <Loader2 v-if="isCreatingVehicle" class="w-4 h-4 mr-1.5 animate-spin" />
                    {{ isCreatingVehicle ? 'Creando...' : 'Crear y seleccionar' }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. Fecha y hora -->
          <section :class="[SECCION, 'lg:col-span-2 lg:col-start-1']">
            <h4 :class="[TITULO_SECCION, 'mb-4']">
              <Clock class="w-4 h-4" />
              Fecha y hora
            </h4>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div class="col-span-1">
                <label for="cita_fecha" :class="LABEL">Fecha <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <input id="cita_fecha" v-model="form.fecha_cita" type="date" :disabled="esFinal" :class="inputClass('fecha_cita')" @input="limpiarError('fecha_cita')">
              </div>
              <div class="col-span-1">
                <label for="cita_hora" :class="LABEL">Hora <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <input id="cita_hora" v-model="form.hora_cita" type="time" step="900" :disabled="esFinal" :class="inputClass('hora_cita')" @input="limpiarError('hora_cita')">
              </div>
              <div class="col-span-2">
                <label for="cita_taller" :class="LABEL">Taller</label>
                <div class="relative">
                  <Building2 class="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                  <select id="cita_taller" v-model="form.taller" :disabled="esFinal" :class="[inputClass('taller'), 'pl-9']" @change="limpiarError('taller')">
                    <option :value="null">Taller por defecto de la empresa</option>
                    <option v-for="t in talleres" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                  </select>
                </div>
              </div>
            </div>
            <p v-if="formErrors.fecha_cita" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_cita }}</p>
            <p v-if="formErrors.hora_cita" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.hora_cita }}</p>
            <p v-if="formErrors.taller" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.taller }}</p>
            <p v-if="campoSinCupo && !formErrors[campoSinCupo]" class="flex items-start gap-1.5 mt-2 text-sm text-red-600 dark:text-red-500">
              <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" /> {{ solicitud.motivo }}
            </p>

            <div class="mt-4">
              <span id="cita_duracion_label" :class="LABEL">Duración estimada <span class="text-accent-500 dark:text-accent-400">*</span></span>
              <div class="flex flex-wrap items-center gap-2" role="group" aria-labelledby="cita_duracion_label">
                <button
                  v-for="d in DURACIONES"
                  :key="d.value"
                  type="button"
                  :aria-pressed="Number(form.duracion_minutos) === d.value"
                  :disabled="esFinal"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    Number(form.duracion_minutos) === d.value
                      ? 'bg-brand-900 border-brand-900 text-white dark:bg-brand-600 dark:border-brand-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600',
                  ]"
                  @click="form.duracion_minutos = d.value; limpiarError('duracion_minutos')"
                >
                  {{ d.label }}
                </button>
                <div class="relative w-28">
                  <input
                    id="cita_duracion"
                    v-model.number="form.duracion_minutos"
                    type="number"
                    min="15"
                    max="1440"
                    step="15"
                    :disabled="esFinal"
                    aria-label="Duración en minutos"
                    :class="[inputClass('duracion_minutos'), 'py-2 pr-11']"
                    @input="limpiarError('duracion_minutos')"
                  >
                  <span class="absolute text-xs text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">min</span>
                </div>
                <span v-if="horaFin" class="inline-flex items-center gap-1.5 ml-1 text-sm text-gray-600 dark:text-gray-300">
                  <Clock class="w-4 h-4 text-gray-400" />
                  Termina a las <strong class="font-semibold text-gray-900 dark:text-white">{{ horaFin }}</strong>
                </span>
              </div>
              <p v-if="formErrors.duracion_minutos" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.duracion_minutos }}</p>
            </div>
          </section>

          <!-- Panel lateral: estado y agenda del taller -->
          <aside class="space-y-5 lg:col-start-3 lg:row-start-1 lg:row-span-4 lg:sticky lg:top-0">
            <!-- Estado (solo edición) -->
            <section v-if="isEditMode" :class="SECCION">
              <h4 :class="[TITULO_SECCION, 'mb-3']">
                <ClipboardList class="w-4 h-4" />
                Estado
              </h4>
              <div class="space-y-1.5" role="radiogroup" aria-label="Estado de la cita">
                <button
                  v-for="e in estadosVisibles"
                  :key="e.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.estado === e.value"
                  :disabled="esFinal"
                  :class="[
                    'flex items-center w-full gap-3 px-3 py-2 text-left rounded-lg border transition-colors disabled:cursor-default',
                    form.estado === e.value
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-300 dark:bg-brand-500/15 dark:ring-brand-300'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/60',
                  ]"
                  @click="form.estado = e.value"
                >
                  <span class="w-2.5 h-2.5 shrink-0 rounded-full" :style="{ backgroundColor: colorEstado(e.value) }"></span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ e.label }}</span>
                    <span class="block text-xs text-gray-500 dark:text-gray-400">{{ e.ayuda }}</span>
                  </span>
                  <CircleCheck v-if="form.estado === e.value" class="w-4 h-4 shrink-0 text-brand-700 dark:text-brand-200" />
                </button>
              </div>
              <p v-if="formErrors.estado" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.estado }}</p>
            </section>

            <!-- Agenda del taller -->
            <section :class="[SECCION, 'p-0 sm:p-0 overflow-hidden']">
              <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex flex-col items-center justify-center w-12 h-12 overflow-hidden text-center border rounded-lg shrink-0 border-brand-200 bg-white dark:border-brand-500/40 dark:bg-gray-800">
                  <span class="w-full text-[10px] font-semibold uppercase leading-4 text-white bg-brand-900 dark:bg-brand-600">{{ fechaPartes?.mes || '—' }}</span>
                  <span class="text-lg font-bold leading-7 text-gray-900 dark:text-white">{{ fechaPartes?.dia || '—' }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 first-letter:uppercase truncate dark:text-white">{{ fechaPartes?.larga || 'Sin fecha' }}</p>
                  <p class="text-sm text-gray-600 dark:text-gray-300">
                    <template v-if="form.hora_cita">{{ form.hora_cita }} – {{ horaFin }} <span class="text-gray-400">·</span> {{ duracionTexto }}</template>
                    <template v-else>Elige una hora</template>
                  </p>
                  <p v-if="tallerNombre" class="text-xs text-gray-500 truncate dark:text-gray-400">{{ tallerNombre }}</p>
                </div>
              </div>

              <div class="p-4 space-y-4">
                <!-- Resultado de la consulta -->
                <div v-if="disponibilidadLoading && !disponibilidad" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 class="w-4 h-4 animate-spin" /> Consultando la agenda...
                </div>
                <div
                  v-else-if="!ocupaCupo"
                  class="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300"
                >
                  <Info class="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Una cita {{ estadoActual.label.toLowerCase() }} no ocupa cupo en la agenda.</p>
                </div>
                <div
                  v-else-if="solicitud && solicitud.disponible"
                  class="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <CircleCheck class="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p class="font-semibold">Horario disponible</p>
                    <p class="text-xs opacity-90">El taller tiene espacio para este vehículo.</p>
                  </div>
                </div>
                <div
                  v-else-if="solicitud && solicitud.disponible === false"
                  class="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300"
                >
                  <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p class="font-semibold">Sin cupo en este horario</p>
                    <p class="text-xs opacity-90">{{ solicitud.motivo }}</p>
                  </div>
                </div>
                <p v-else-if="disponibilidad && !disponibilidad.aplicable" class="text-sm text-gray-500 dark:text-gray-400">
                  No hay límites configurados: la cita se guardará sin validar cupo.
                </p>

                <template v-if="disponibilidad && disponibilidad.aplicable">
                  <!-- Ocupación del día -->
                  <div>
                    <div class="flex items-baseline justify-between mb-1.5 text-xs">
                      <span class="font-medium text-gray-700 dark:text-gray-300">Citas del día</span>
                      <span v-if="disponibilidad.capacidad_dia" class="text-gray-500 dark:text-gray-400">
                        <strong class="font-semibold text-gray-900 dark:text-white">{{ disponibilidad.citas_ocupadas }}</strong> de {{ disponibilidad.capacidad_dia }}
                        · {{ disponibilidad.citas_disponibles }} libres
                      </span>
                      <span v-else class="text-gray-500 dark:text-gray-400">{{ disponibilidad.citas_ocupadas }} · sin límite diario</span>
                    </div>
                    <div v-if="disponibilidad.capacidad_dia" class="h-2 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
                      <div
                        :class="['h-full rounded-full', ocupacionPct >= 100 ? 'bg-red-500' : ocupacionPct >= 75 ? 'bg-amber-500' : 'bg-brand-500 dark:bg-brand-300']"
                        :style="{ width: `${ocupacionPct}%` }"
                      ></div>
                    </div>
                  </div>

                  <!-- Línea de tiempo -->
                  <div v-if="agenda">
                    <div class="flex items-baseline justify-between mb-1.5 text-xs">
                      <span class="font-medium text-gray-700 dark:text-gray-300">Ocupación del taller</span>
                      <span v-if="disponibilidad.capacidad_simultanea" class="text-gray-500 dark:text-gray-400">Máx. {{ disponibilidad.capacidad_simultanea }} a la vez</span>
                    </div>
                    <div
                      class="relative overflow-hidden bg-gray-100 rounded-md dark:bg-gray-900/60"
                      :style="{ height: `${agenda.carriles * 10 + 12}px` }"
                    >
                      <!-- Franja fuera del horario de atención -->
                      <div
                        v-if="disponibilidad.horario"
                        class="absolute inset-y-0 bg-white dark:bg-gray-800"
                        :style="{ left: `${agenda.horarioLeft}%`, width: `${agenda.horarioWidth}%` }"
                      ></div>
                      <div
                        v-for="m in agenda.marcas"
                        :key="m.left"
                        class="absolute inset-y-0 w-px bg-gray-200 dark:bg-gray-700"
                        :style="{ left: `${m.left}%` }"
                      ></div>
                      <div
                        v-for="(b, i) in agenda.bloques"
                        :key="`${b.origen}-${b.referencia}-${i}`"
                        :class="['absolute h-2 rounded-sm', b.origen === 'recepcion' ? 'bg-amber-400 dark:bg-amber-500/80' : 'bg-brand-300 dark:bg-brand-500']"
                        :style="{ left: `${b.left}%`, width: `${b.width}%`, top: `${6 + b.carril * 10}px` }"
                        :title="`${b.inicio}–${b.fin} · ${formatPlaca(b.detalle)}`"
                      ></div>
                      <div
                        v-if="agenda.seleccion && ocupaCupo && !esFinal"
                        :class="[
                          'absolute inset-y-0 rounded-sm border-2',
                          solicitud && solicitud.disponible === false
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-emerald-500 bg-emerald-500/20',
                        ]"
                        :style="{ left: `${agenda.seleccion.left}%`, width: `${agenda.seleccion.width}%` }"
                      ></div>
                    </div>
                    <div class="relative h-4 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                      <template v-for="(m, i) in agenda.marcas" :key="m.left">
                        <span
                          v-if="m.etiqueta"
                          class="absolute"
                          :class="i === 0 ? '' : i === agenda.marcas.length - 1 ? '-translate-x-full' : '-translate-x-1/2'"
                          :style="{ left: `${m.left}%` }"
                        >{{ m.etiqueta }}</span>
                      </template>
                    </div>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-300 dark:bg-brand-500"></span>Citas</span>
                      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400 dark:bg-amber-500/80"></span>Vehículos en taller</span>
                      <span v-if="ocupaCupo && !esFinal" class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm border-2 border-emerald-500"></span>Esta cita</span>
                    </div>
                    <p v-if="agenda.fueraDeHorario" class="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
                      <TriangleAlert class="w-3.5 h-3.5" />
                      Fuera del horario de atención ({{ disponibilidad.horario.apertura }}–{{ disponibilidad.horario.cierre }}).
                    </p>
                  </div>

                  <!-- Lista de franjas ocupadas -->
                  <div v-if="agenda && agenda.lista.length">
                    <p class="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Ocupado ese día</p>
                    <ul class="divide-y divide-gray-100 dark:divide-gray-700">
                      <li v-for="(b, i) in agenda.lista.slice(0, 5)" :key="`l-${i}`" class="flex items-center justify-between gap-2 py-1.5 text-xs">
                        <span class="font-mono text-gray-700 dark:text-gray-300">{{ b.inicio }}–{{ b.fin }}</span>
                        <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ formatPlaca(b.detalle) || '—' }}</span>
                        <span :class="['rounded px-1.5 py-0.5 text-[10px] font-medium', b.origen === 'recepcion' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200']">
                          {{ b.origen === 'recepcion' ? 'En taller' : 'Cita' }}
                        </span>
                      </li>
                    </ul>
                    <p v-if="agenda.lista.length > 5" class="mt-1 text-xs text-gray-500 dark:text-gray-400">y {{ agenda.lista.length - 5 }} más</p>
                  </div>
                  <p v-else class="text-xs text-gray-500 dark:text-gray-400">No hay otros vehículos agendados ese día.</p>
                </template>
              </div>
            </section>
          </aside>

          <!-- 3. Motivo del servicio -->
          <section :class="[SECCION, 'lg:col-span-2 lg:col-start-1']">
            <h4 :class="[TITULO_SECCION, 'mb-4']">
              <Wrench class="w-4 h-4" />
              Motivo de la visita
            </h4>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Motivo de la cita">
              <button
                v-for="m in MOTIVOS"
                :key="m.value"
                type="button"
                role="radio"
                :aria-checked="form.motivo === m.value"
                :disabled="esFinal"
                :class="[
                  'flex items-center gap-2.5 p-2.5 text-left rounded-lg border transition-colors disabled:cursor-not-allowed',
                  form.motivo === m.value
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-300 dark:bg-brand-500/15 dark:ring-brand-300'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/60',
                  esFinal && form.motivo !== m.value ? 'opacity-50' : '',
                ]"
                @click="form.motivo = m.value"
              >
                <span
                  :class="[
                    'inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-md',
                    form.motivo === m.value ? 'bg-brand-900 text-white dark:bg-brand-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                  ]"
                >
                  <component :is="m.icon" class="w-4 h-4" />
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ m.label }}</span>
                  <span class="block text-xs text-gray-500 truncate dark:text-gray-400">{{ m.detalle }}</span>
                </span>
              </button>
            </div>

            <div class="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
              <div class="md:col-span-2">
                <TextImprover
                  v-model="form.motivo_descripcion"
                  contexto="descripción del motivo de una cita en un taller mecánico"
                  v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <label for="cita_motivo_desc" class="text-sm font-medium text-gray-900 dark:text-white">Falla o servicio solicitado</label>
                    <button
                      type="button"
                      title="Mejorar el texto con IA"
                      :disabled="mejorando || !form.motivo_descripcion"
                      class="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-brand-200 dark:hover:text-white"
                      @click="mejorar"
                    >
                      <Loader2 v-if="mejorando" class="w-3.5 h-3.5 animate-spin" />
                      <Wand2 v-else class="w-3.5 h-3.5" />
                      {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                    </button>
                  </div>
                  <textarea
                    id="cita_motivo_desc"
                    v-model="form.motivo_descripcion"
                    rows="3"
                    placeholder="Ej.: Ruido al frenar y luz de check encendida desde ayer."
                    :class="inputClass('motivo_descripcion')"
                  ></textarea>
                  <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
                  <div v-if="mejorado && !errorMejora" class="flex flex-wrap items-center gap-x-2 mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <p>Texto mejorado. Revisa antes de guardar.</p>
                    <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                  </div>
                </TextImprover>
              </div>
              <div>
                <label for="cita_kilometraje" :class="LABEL">Kilometraje aproximado</label>
                <div class="relative">
                  <Gauge class="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                  <input
                    id="cita_kilometraje"
                    v-model="form.kilometraje_aproximado"
                    type="number"
                    min="0"
                    placeholder="Ej: 45200"
                    :class="[inputClass('kilometraje_aproximado'), 'pl-9 pr-10']"
                  >
                  <span class="absolute text-xs text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">km</span>
                </div>
                <p v-if="formErrors.kilometraje_aproximado" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.kilometraje_aproximado }}</p>
                <p v-else-if="kmMenorAlRegistrado" class="flex items-start gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert class="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>Es menor que el último registrado ({{ formatKm(kmVehiculo) }}). Al recibir el vehículo se tomará la lectura real.</span>
                </p>
                <p v-else-if="kmVehiculo != null" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Último registrado: {{ formatKm(kmVehiculo) }}
                  <button
                    v-if="String(form.kilometraje_aproximado ?? '') === ''"
                    type="button"
                    class="ml-1 font-medium text-brand-700 hover:underline dark:text-brand-200"
                    @click="usarKmRegistrado"
                  >Usar</button>
                </p>
                <p v-else class="mt-2 text-xs text-gray-500 dark:text-gray-400">Lo que reporta el cliente al agendar.</p>
              </div>
            </div>
          </section>

          <!-- 4. Equipo y notas internas -->
          <section :class="[SECCION, 'lg:col-span-2 lg:col-start-1']">
            <h4 :class="[TITULO_SECCION, 'mb-4']">
              <Lock class="w-4 h-4" />
              Uso interno
            </h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label for="cita_asesor" :class="LABEL">Asesor</label>
                <EmpleadoSearchSelect
                  id="cita_asesor"
                  v-model="asesorSearch"
                  placeholder="Buscar asesor"
                  :error="Boolean(formErrors.asesor)"
                  :error-message="formErrors.asesor"
                  @select="selectAsesor"
                  @clear="clearAsesor"
                />
                <p v-if="!formErrors.asesor" class="mt-2 text-xs text-gray-500 dark:text-gray-400">Si lo dejas vacío, será quien convierta la cita en recepción.</p>
              </div>
              <div class="md:col-span-2">
                <label for="cita_notas" :class="LABEL">Notas internas</label>
                <textarea
                  id="cita_notas"
                  v-model="form.notas_internas"
                  rows="3"
                  placeholder="Ej.: El cliente espera en sala; llamar antes de cambiar piezas."
                  class="block w-full p-2.5 text-sm text-gray-900 border rounded shadow-xs bg-amber-50/60 border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 dark:bg-amber-500/5 dark:border-amber-500/30 dark:text-white dark:placeholder-gray-400 dark:focus:ring-amber-500/30"
                ></textarea>
                <p class="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <Lock class="w-3 h-3" /> Solo las ve el equipo del taller; no se comparten con el cliente.
                </p>
              </div>
            </div>
          </section>

          <RecordatoriosCita v-if="isEditMode && !isLoading" :key="citaId" :cita-id="citaId" />
        </div>
      </div>

      <!-- Pie fijo -->
      <div
        :class="[
          'flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
          showDiscardWarning ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-gray-200 dark:border-gray-700',
        ]"
      >
        <p v-if="showDiscardWarning" class="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <TriangleAlert class="w-4 h-4 shrink-0" />
          Tienes cambios sin guardar. ¿Descartarlos?
        </p>
        <span v-else-if="soloLectura" class="hidden sm:block"></span>
        <p v-else class="hidden text-xs text-gray-500 sm:block dark:text-gray-400"><span class="text-accent-500 dark:text-accent-400">*</span> Campos obligatorios</p>

        <div v-if="showDiscardWarning" class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
            @click="showDiscardWarning = false"
          >
            Seguir editando
          </button>
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-semibold text-white rounded bg-danger hover:bg-red-700 focus:ring-4 focus:ring-red-200 dark:focus:ring-red-900"
            @click="discard"
          >
            Descartar cambios
          </button>
        </div>
        <div v-else-if="soloLectura" class="flex items-center justify-end">
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
            @click="close"
          >
            Cerrar
          </button>
        </div>
        <div v-else class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isSaving || isLoading"
            class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-300 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus:ring-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submit"
          >
            <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
            <Loader2 v-else class="w-5 h-5 mr-1.5 -ml-1 animate-spin" />
            {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Agendar cita') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
