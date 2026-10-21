<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { Car, Toolbox, TriangleAlert, CheckCircle2, Loader2, Plus, Trash2, Wand2, IdCardIcon, TagIcon, Shapes, PaintBucket, Phone, Mail, Camera, ShieldCheck, Workflow, Package, Check, CircleAlert, ArrowLeft, ArrowRight, ListChecks, Stethoscope, CalendarClock, ScanSearch, ClipboardList, CircleStop, Lock } from 'lucide-vue-next';
import { IconClockCheck, IconClockPlay, IconEngine, IconManualGearbox, IconAutomaticGearbox, IconGasStation } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/env';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import PhotoUploadGrid from '../../../shared/components/PhotoUploadGrid.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';
import { inspeccionesService } from '../services/inspeccionesService';
import { TESTIGO_KEYS, testigoDefaults, testigoPayload } from '../../../shared/config/testigos';
import {
  TIPOS_TRABAJO_OPCIONES,
  getTipoTrabajoLabel,
  normalizarTipoTrabajo,
} from '../../../shared/config/tiposTrabajo';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import EstadoInspeccionBadge from './EstadoInspeccionBadge.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TestigosTablero from '../../../shared/components/TestigosTablero.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import RelacionesFlujoEdit from '../../../shared/components/RelacionesFlujoEdit.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { useSucursalDocumento } from '../../../shared/composables/useSucursalDocumento';
import { relacionesDeInspeccion } from '../../../shared/utils/relacionesFlujo';
// FlowSteps temporalmente desactivado; conservar para reactivarlo más adelante.
// import FlowSteps from '../../../shared/components/FlowSteps.vue';
// import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
import { sanitizeDtc, sanitizeObservaciones, normalizarDecimal } from '../../../shared/utils/sanitize';
import { formatDateTime, formatDuration, localDatetimeNow, minutesBetween, toIsoFromLocalInput, toLocalDatetimeInput } from '../../../shared/utils/datetime';

const urlParams = new URLSearchParams(window.location.search);
const inspeccionId = urlParams.get('id');
const recepcionId = urlParams.get('recepcion');
const isEditMode = Boolean(inspeccionId);

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

// Relaciones de flujo (cita, recepción, cotización y orden ligadas por FK).
const RELACIONES_VACIAS = () => ({ cita: [], recepcion: [], cotizacion: [], orden: [] });
const PUEDE_AGREGAR = { cita: true, recepcion: true, cotizacion: true, orden: true };
const relacionesInspeccion = ref(RELACIONES_VACIAS());
const politicaRelaciones = ref({});
const puedeAgregarRelacion = ref({ ...PUEDE_AGREGAR });
const relacionesCargadas = ref(false);

const {
  tallerId: tallerSucursalId,
  error: tallerSucursalError,
  mostrar: mostrarSucursal,
  sucursal: sucursalDocumento,
  cargarSucursal,
  validar: validarSucursal,
  limpiarError: limpiarErrorSucursal,
} = useSucursalDocumento();

const form = reactive({
  recepcion: recepcionId || null,
  numero_inspeccion: '',
  tipo_inspeccion: 'DIAGNOSTICO',
  fecha_inspeccion: localDatetimeNow(),
  fecha_finalizacion: '',
  motivo_ingreso: '',
  codigos_dtc: '',
  diagnostico_tecnico: '',
  recomendaciones: '',
  kilometraje_diagnostico: null,
  responsable: null,
  ...testigoDefaults(),
});

const testigos = ref(testigoDefaults());

watch(testigos.value, (val) => {
  TESTIGO_KEYS.forEach((key) => { form[key] = val[key]; });
  form.otros_testigos_observaciones = val.otros_testigos_observaciones;
}, { deep: true });

function syncTestigosDesdeForm() {
  Object.assign(testigos.value, testigoPayload(form));
}

const CAMPO_MAX_CHARS = {
  motivo_ingreso: 500,
  diagnostico_tecnico: 1000,
  recomendaciones: 1000,
  codigos_dtc: 255,
};

['motivo_ingreso', 'diagnostico_tecnico', 'recomendaciones', 'codigos_dtc'].forEach((key) => {
  watch(() => form[key], (val) => {
    const clean = key === 'codigos_dtc'
      ? sanitizeDtc(val, CAMPO_MAX_CHARS[key])
      : sanitizeObservaciones(val).slice(0, CAMPO_MAX_CHARS[key]);
    if (clean !== val) form[key] = clean;
  });
});

const recepcion = ref(null);
const estadoInspeccion = ref('');
const inspeccionData = ref(null);

const tituloPagina = computed(() => (isEditMode ? 'Editar inspección' : 'Nueva inspección'));

const breadcrumb = computed(() => [
  { label: 'Inicio', href: '/' },
  { label: 'Inspecciones', href: '/crud/inspecciones/' },
  { label: tituloPagina.value },
]);

const inspeccionFinalizada = computed(() => estadoInspeccion.value === 'FINALIZADA');
const readOnly = computed(() => isEditMode && inspeccionFinalizada.value);
// Pendiente: el diagnóstico (pasos y responsable) se habilita al iniciar la inspección.
const pendienteDeInicio = computed(() => isEditMode && estadoInspeccion.value === 'PENDIENTE');
const diagnosticoBloqueado = computed(() => readOnly.value || pendienteDeInicio.value);
const detalleHref = computed(() => `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccionId)}`);
const mensajeSoloLectura = computed(() => {
  if (inspeccionData.value?.tiene_orden_trabajo) {
    return 'La inspección ya generó una orden de trabajo y no se puede reabrir. Solo puedes consultar su información.';
  }
  if (inspeccionData.value?.tiene_cotizacion_bloqueante) {
    return 'La inspección tiene una cotización enviada o aceptada y no se puede reabrir. Solo puedes consultar su información.';
  }
  return 'La inspección está finalizada, por lo que solo puedes consultarla.';
});
const pasosRelaciones = computed(() => relacionesDeInspeccion(inspeccionData.value || {}));
const tallerSucursalNombre = computed(() => inspeccionData.value?.sucursal_nombre || '');

const fechaFinalizacionDisplay = computed(() => (
  form.fecha_finalizacion ? formatDateTime(form.fecha_finalizacion) : 'Pendiente de cierre'
));

const fechaInspeccionDisplay = computed(() => (
  form.fecha_inspeccion ? formatDateTime(form.fecha_inspeccion) : '—'
));

const duracionInspeccion = computed(() => {
  if (!form.fecha_inspeccion || !form.fecha_finalizacion) return null;
  return minutesBetween(form.fecha_inspeccion, form.fecha_finalizacion);
});

const transicionEstado = ref(false);
const showFinalizarModal = ref(false);
const showIniciarModal = ref(false);

const activeTab = ref('informacion');
const TAB_ORDER = ['informacion', 'testigos', 'fotos', 'servicios'];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

const PASOS = [
  { key: 'informacion', label: 'Diagnóstico' },
  { key: 'testigos', label: 'Testigos' },
  { key: 'fotos', label: 'Evidencia' },
  { key: 'servicios', label: 'Plan de trabajo' },
];

// Mismos estilos de tarjeta que la recepción (línea gráfica común del flujo).
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-70';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';
const BOTON_MEJORAR = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';
const BOTON_ESTADO = 'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg shadow-xs shrink-0 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700';
const BOTON_AGREGAR = 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700';

function inputClass(campo, extra = '') {
  return [BASE_INPUT, campo && formErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
}

// Cambia de paso y lleva la vista al inicio del formulario.
const pasosRef = ref(null);
function irAPaso(key) {
  activeTab.value = key;
  nextTick(() => {
    const el = pasosRef.value;
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* FlowSteps temporalmente desactivado; conservar la lógica para reactivarla.
const pasosFlujo = computed(() => {
  const rec = recepcion.value || null;
  const data = inspeccionData.value || {};
  const estadoCotizacion = data.cotizacion_estado || (data.tiene_cotizacion_activa ? 'PENDIENTE' : null);
  return buildPasosFlujo([
    {
      entidad: 'recepcion',
      estado: rec?.estado,
      estadoDisplay: rec?.estado_display,
      id: rec?.id,
      numero: rec?.numero_recepcion,
    },
    {
      entidad: 'inspeccion',
      estado: estadoInspeccion.value || 'PENDIENTE',
      id: data.id || inspeccionId,
      numero: data.numero_inspeccion || form.numero_inspeccion,
    },
    {
      entidad: 'cotizacion',
      estado: estadoCotizacion,
      estadoDisplay: data.cotizacion_estado_display,
      id: data.cotizacion_id || data.cotizacion_activa_id,
      numero: data.cotizacion_numero || data.numero_cotizacion,
    },
    {
      entidad: 'orden',
      estado: data.orden_trabajo_estado,
      estadoDisplay: data.orden_trabajo_estado_display,
      id: data.orden_trabajo,
      numero: data.orden_trabajo_numero,
    },
  ]);
});
*/

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    irAPaso(TAB_ORDER[next]);
  }
}

const TAB_ERROR_MAP = {
  motivo_ingreso: 'Inspección',
  diagnostico_tecnico: 'Inspección',
  recomendaciones: 'Inspección',
  kilometraje_diagnostico: 'Inspección',
  fecha_inspeccion: 'Inspección',
  cliente: 'Información General',
  vehiculo: 'Información General',
};

const TAB_ORDER_LABELS = [
  'Información General',
  'Inspección',
  'Testigos',
  'Evidencia',
  'Servicios & Repuestos',
];

const seccionesConErrores = computed(() => {
  const encontradas = new Set();
  Object.entries(TAB_ERROR_MAP).forEach(([campo, seccion]) => {
    if (formErrors.value[campo]) encontradas.add(seccion);
  });
  return TAB_ORDER_LABELS.filter((seccion) => encontradas.has(seccion));
});

const mensajeErroresValidacion = computed(() => {
  const secciones = seccionesConErrores.value;
  if (secciones.length === 0) {
    return 'Completa correctamente los campos obligatorios.';
  }
  return `Completa correctamente los campos obligatorios en: ${secciones.join(', ')}.`;
});

const clienteSearch = ref('');
const vehiculoSearch = ref('');
const showClientCreateModal = ref(false);
const clienteSeleccionado = ref(null);
const vehiculoSeleccionado = ref(null);
const responsableSearch = ref('');
const responsableSeleccionado = ref(null);
const empleadosOpciones = ref([]);

const inspectorInfo = computed(() => {
  if (responsableSeleccionado.value) return responsableSeleccionado.value;
  if (!form.responsable) return null;

  return empleadosOpciones.value.find((empleado) => {
    const empleadoUsuarioId = empleado.user?.id || empleado.id;
    return empleadoUsuarioId != null && String(empleadoUsuarioId) === String(form.responsable);
  }) || null;
});

function nombreEmpleado(empleado) {
  const user = empleado?.user || empleado || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.username || user.email || `#${empleado?.id || ''}`;
}

watch([empleadosOpciones, () => form.responsable], ([ops, respId]) => {
  if (!respId) return;
  const emp = ops.find((e) => (e.user?.id || e.id) === respId);
  if (emp && responsableSearch.value !== nombreEmpleado(emp)) {
    responsableSeleccionado.value = emp;
    responsableSearch.value = nombreEmpleado(emp);
  }
});

async function loadEmpleados() {
  try {
    const data = await request('/api/auth/empleados/?page=1&page_size=100');
    empleadosOpciones.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    empleadosOpciones.value = [];
  }
}

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function selectCliente(cliente) {
  clienteSeleccionado.value = cliente;
  clienteSearch.value = cliente.nombre || '';
  clearVehiculo();
}

function clearCliente() {
  clienteSeleccionado.value = null;
  clienteSearch.value = '';
  clearVehiculo();
}

function selectResponsable(empleado) {
  responsableSeleccionado.value = empleado;
  form.responsable = empleado?.user?.id || null;
  responsableSearch.value = nombreEmpleado(empleado);
}

function clearResponsable() {
  responsableSeleccionado.value = null;
  form.responsable = null;
  responsableSearch.value = '';
}

function onClientCreated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
    const nombre = cliente.nombre || 'el cliente';
    successMessage.value = `Cliente "${nombre}" creado correctamente. Continúa con la inspección.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function selectVehiculo(vehiculo) {
  vehiculoSeleccionado.value = vehiculo;
  vehiculoSearch.value = formatPlaca(vehiculo.placa || '');
  precargarKilometraje();
}

function clearVehiculo() {
  vehiculoSeleccionado.value = null;
  vehiculoSearch.value = '';
}

const clienteInfo = computed(() => {
  if (recepcion.value) {
    const cli = recepcion.value.cliente;
    if (cli) return cli;
    if (recepcion.value.cliente_nombre) {
      return { nombre: recepcion.value.cliente_nombre, identificacion: '', telefono: '', email: '' };
    }
    return null;
  }
  return clienteSeleccionado.value || null;
});

const vehiculoInfo = computed(() => {
  if (recepcion.value) return recepcion.value.vehiculo || null;
  return vehiculoSeleccionado.value || null;
});

const tipoInspeccionLabel = computed(() => getTipoTrabajoLabel(form.tipo_inspeccion));

/** Odómetro vigente del vehículo: referencia para no retroceder el kilometraje. */
const kmReferencia = computed(() => {  const vehiculo = recepcion.value?.vehiculo
    || vehiculoSeleccionado.value
    || inspeccionData.value?.vehiculo
    || null;
  const km = vehiculo?.kilometraje_actual;
  if (km === null || km === undefined || km === '') return null;
  const numero = Number(km);
  return Number.isNaN(numero) ? null : numero;
});

const kmReferenciaDisplay = computed(() => (
  kmReferencia.value == null ? '' : kmReferencia.value.toLocaleString('es-EC')
));

/** Texto crudo del input, ya normalizado a solo dígitos por el setter. */
const kmTexto = computed(() => (
  form.kilometraje_diagnostico == null ? '' : String(form.kilometraje_diagnostico).trim()
));

const kilometrajeDisplay = computed({
  get() {
    return form.kilometraje_diagnostico == null ? '' : String(form.kilometraje_diagnostico);
  },
  set(value) {
    form.kilometraje_diagnostico = String(value).replace(/\D/g, '');
  },
});

/** Precarga la lectura con el odómetro vigente si el campo sigue vacío. */
function precargarKilometraje() {
  if (form.kilometraje_diagnostico === '' || form.kilometraje_diagnostico === null) {
    form.kilometraje_diagnostico = kmReferencia.value;
  }
}

const transmisionLabel = computed(() => {
  const map = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };
  const value = vehiculoInfo.value?.transmision || '';
  return map[value] || value || '';
});

const transmisionIcon = computed(() => {
  const type = vehiculoInfo.value?.transmision || '';
  if (type === 'M') return IconManualGearbox;
  return IconAutomaticGearbox;
});

const combustibleLabel = computed(() => {
  const map = {
    GAS: 'Gasolina',
    DIE: 'Diésel',
    HIB: 'Híbrido',
    ELE: 'Eléctrico',
    GNV: 'Gas Natural Vehicular (GNV)',
  };
  const value = vehiculoInfo.value?.combustible || '';
  return map[value] || value || '';
});

function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() => resolveMediaUrl(vehiculoInfo.value?.imagen));

const responsableNombre = computed(() => {
  if (responsableSeleccionado.value) {
    const emp = responsableSeleccionado.value;
    return `${nombreEmpleado(emp)}${emp.rol_display ? ` — ${emp.rol_display}` : ''}`.trim();
  }
  const empleado = empleadosOpciones.value.find(
    (emp) => (emp.user?.id || emp.id) === form.responsable
  );
  return empleado ? `${nombreEmpleado(empleado)} — ${empleado.rol_display || ''}`.trim().replace(/— $/, '') : (form.responsable ? '—' : 'Sin asignar');
});

// Inicia sin confirmación: es reversible. El modal se conserva (confirmarIniciar) por si se reactiva.
async function solicitarIniciar() {
  if (transicionEstado.value) return;
  await cambiarEstado('EN_PROCESO');
}

async function confirmarIniciar() {
  await cambiarEstado('EN_PROCESO');
  showIniciarModal.value = false;
}

function solicitarFinalizacion() {
  if (transicionEstado.value) return;
  showFinalizarModal.value = true;
}

async function confirmarFinalizar() {
  // Guarda primero lo editado: finalizar solo cambia el estado y saldría de la página.
  const guardado = await submit();
  if (!guardado) {
    showFinalizarModal.value = false;
    return;
  }
  await cambiarEstado('FINALIZADA');
  showFinalizarModal.value = false;
}

async function cambiarEstado(nuevoEstado) {
  if (!inspeccionId || transicionEstado.value) return;
  transicionEstado.value = true;
  try {
    const actualizada = await inspeccionesService.update(inspeccionId, { estado: nuevoEstado });
    if (nuevoEstado === 'FINALIZADA') {
      window.location.assign(`/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccionId)}&finalizada=1`);
      return;
    }
    estadoInspeccion.value = nuevoEstado;
    if (inspeccionData.value) {
      inspeccionData.value = {
        ...inspeccionData.value,
        estado: nuevoEstado,
        estado_display: actualizada?.estado_display || '',
      };
    }
    // El backend sella la fecha de cierre al finalizar y la limpia al reabrir.
    if (actualizada && typeof actualizada === 'object') {
      form.fecha_finalizacion = toLocalDatetimeInput(actualizada.fecha_finalizacion);
      if (actualizada.fecha_inspeccion) {
        form.fecha_inspeccion = toLocalDatetimeInput(actualizada.fecha_inspeccion);
      }
    }
    successMessage.value = 'Inspección iniciada. Ya puedes registrar el diagnóstico.';
    // Lleva al usuario al primer campo recién habilitado.
    activeTab.value = 'informacion';
    nextTick(() => {
      const campo = document.getElementById('tipo_inspeccion');
      if (campo) {
        campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        campo.focus({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  } catch (error) {
    showError(error);
  } finally {
    transicionEstado.value = false;
  }
}

const PRIORIDADES = [
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

const serviciosDetectados = ref([]);
const repuestosSugeridos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);

const FOTO_MAX = 5;
const fotosInspeccion = ref([]);
const fotosEntityId = ref(inspeccionId || null);
const photosGrid = ref(null);

const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);

function formatearItem(codigo, nombre) {
  if (!codigo) return nombre;
  const codigoTexto = String(codigo).trim();
  return codigoTexto && !nombre.startsWith(codigoTexto)
    ? `${codigoTexto} - ${nombre}`
    : nombre;
}

function focusInput(id) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) el.focus();
  });
}

function nuevaFilaServicio() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    servicio: null,
    servicio_codigo: '',
    servicio_nombre: '',
    descripcion: '',
    horas_estimadas: '1.00',
    precio_referencial: '0.00',
    es_sugerido: false,
    prioridad: 'MEDIA',
    error: '',
  };
}

function nuevaFilaRepuesto() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    repuesto: null,
    repuesto_codigo: '',
    repuesto_nombre: '',
    descripcion: '',
    cantidad: '1.00',
    precio_referencial: '0.00',
    es_sugerido: false,
    prioridad: 'MEDIA',
    error: '',
  };
}

function agregarServicioVacio() {
  const fila = nuevaFilaServicio();
  serviciosDetectados.value.push(fila);
  focusInput(`svc-desc-${fila.sufijo}`);
}

function agregarRepuestoVacio() {
  const fila = nuevaFilaRepuesto();
  repuestosSugeridos.value.push(fila);
  focusInput(`rpt-desc-${fila.sufijo}`);
}

function seleccionarServicio(item, fila) {
  fila.servicio = item.id;
  fila.servicio_codigo = item.codigo || '';
  fila.servicio_nombre = item.nombre || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.horas_estimadas = '1.00';
  fila.precio_referencial = String(item.precio_referencial ?? '0.00');
  fila.es_sugerido = false;
  fila.prioridad = 'MEDIA';
  fila.error = '';
  focusInput(`svc-horas-${fila.sufijo}`);
}

function seleccionarRepuesto(item, fila) {
  fila.repuesto = item.id;
  fila.repuesto_codigo = item.codigo || '';
  fila.repuesto_nombre = item.nombre || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.cantidad = '1.00';
  fila.precio_referencial = String(item.precio_venta ?? '0.00');
  fila.es_sugerido = false;
  fila.prioridad = 'MEDIA';
  fila.error = '';
  focusInput(`rpt-cant-${fila.sufijo}`);
}

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
      request(`/api/ordenes/inspeccion-servicios/?inspeccion=${inspeccionId}`),
      request(`/api/ordenes/inspeccion-repuestos/?inspeccion=${inspeccionId}`),
    ]);
    serviciosDetectados.value = (Array.isArray(servData) ? servData : (servData.results || [])).map((s) => ({ ...s, sufijo: Date.now() + Math.random(), error: '' }));
    repuestosSugeridos.value = (Array.isArray(repData) ? repData : (repData.results || [])).map((r) => ({ ...r, sufijo: Date.now() + Math.random(), error: '' }));
  } catch (error) {
    console.error('No se pudieron cargar los detalles de inspección:', error);
  }
}

function quitarServicio(index) {
  const removed = serviciosDetectados.value.splice(index, 1)[0];
  if (removed && removed.id) serviciosEliminados.value.push(removed.id);
}

function quitarRepuesto(index) {
  const removed = repuestosSugeridos.value.splice(index, 1)[0];
  if (removed && removed.id) repuestosEliminados.value.push(removed.id);
}

function traducirErrorItem(descripcion, fallback) {
  return String(descripcion || fallback);
}

async function guardarDetalles(idInspeccion) {
  const inspeccionRef = idInspeccion ? String(idInspeccion) : '';
  if (!inspeccionRef) throw new Error('No se pudo identificar la inspección para guardar sus detalles.');

  const errores = [];

  async function guardarServicio(s) {
    const payload = {
      servicio: s.servicio || null,
      descripcion: sanitizeObservaciones(String(s.descripcion || s.servicio_nombre || '')).slice(0, 255) || '',
      horas_estimadas: normalizarDecimal(s.horas_estimadas, 0, 999.99, '1.00'),
      precio_referencial: normalizarDecimal(s.precio_referencial, 0, 99999999.99, '0.00'),
      es_sugerido: Boolean(s.es_sugerido),
      prioridad: s.prioridad || 'MEDIA',
    };
    try {
      if (s.id) {
        await request(`/api/ordenes/inspeccion-servicios/${s.id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const creado = await request('/api/ordenes/inspeccion-servicios/', {
          method: 'POST',
          body: JSON.stringify({ ...payload, inspeccion: inspeccionRef }),
        });
        s.id = creado && creado.id;
      }
    } catch (error) {
      errores.push(`Servicio "${traducirErrorItem(s.descripcion, 'sin descripción')}"`);
    }
  }

  async function guardarRepuesto(r) {
    const payload = {
      repuesto: r.repuesto || null,
      descripcion: sanitizeObservaciones(String(r.descripcion || r.repuesto_nombre || '')).slice(0, 255) || '',
      cantidad: normalizarDecimal(r.cantidad, 0, 9999.99, '1.00'),
      precio_referencial: normalizarDecimal(r.precio_referencial, 0, 99999999.99, '0.00'),
      es_sugerido: Boolean(r.es_sugerido),
      prioridad: r.prioridad || 'MEDIA',
    };
    try {
      if (r.id) {
        await request(`/api/ordenes/inspeccion-repuestos/${r.id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const creado = await request('/api/ordenes/inspeccion-repuestos/', {
          method: 'POST',
          body: JSON.stringify({ ...payload, inspeccion: inspeccionRef }),
        });
        r.id = creado && creado.id;
      }
    } catch (error) {
      errores.push(`Repuesto "${traducirErrorItem(r.descripcion, 'sin descripción')}"`);
    }
  }

  async function eliminarServicio(id) {
    try {
      await request(`/api/ordenes/inspeccion-servicios/${id}/`, { method: 'DELETE' });
    } catch (error) {
      errores.push('Servicio eliminado');
    }
  }

  async function eliminarRepuesto(id) {
    try {
      await request(`/api/ordenes/inspeccion-repuestos/${id}/`, { method: 'DELETE' });
    } catch (error) {
      errores.push('Repuesto eliminado');
    }
  }

  for (const s of serviciosDetectados.value) await guardarServicio(s);
  for (const r of repuestosSugeridos.value) await guardarRepuesto(r);
  for (const id of serviciosEliminados.value) await eliminarServicio(id);
  for (const id of repuestosEliminados.value) await eliminarRepuesto(id);

  if (errores.length) {
    throw new Error(
      `No se pudieron guardar los siguientes ítems: ${errores.join(', ')}. Revisa la información y vuelve a intentarlo.`
    );
  }

  serviciosEliminados.value = [];
  repuestosEliminados.value = [];
}

async function loadFotos() {
  if (!inspeccionId) return;
  try {
    const data = await inspeccionesService.listFotos(inspeccionId);
    const items = (Array.isArray(data) ? data : (data.results || (data.fotos || []))).map((f) => ({
      id: f.id,
      file: null,
      preview: null,
      url: f.imagen,
      miniatura: f.miniatura,
      descripcion: f.descripcion || '',
      descripcionOriginal: f.descripcion || '',
    }));
    fotosInspeccion.value = items;
  } catch (error) {
    console.error('No se pudieron cargar las fotos de la inspección:', error);
  }
}

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

  if (!form.fecha_inspeccion) {
    errors.fecha_inspeccion = 'Indica cuándo se realizó la inspección.';
  } else if (new Date(form.fecha_inspeccion).getTime() > Date.now() + 5 * 60 * 1000) {
    errors.fecha_inspeccion = 'La fecha de inspección no puede ser futura.';
  }

  if (!recepcion.value) {
    if (!clienteSeleccionado.value) {
      errors.cliente = 'El cliente es obligatorio.';
    }
    if (!vehiculoSeleccionado.value) {
      errors.vehiculo = 'El vehículo / placa es obligatorio.';
    }
  }

  if (kmTexto.value !== '') {
    const km = Number(kmTexto.value);
    if (Number.isNaN(km) || !Number.isInteger(km) || km < 0) {
      errors.kilometraje_diagnostico = 'Ingresa un kilometraje válido, mayor o igual a 0.';
    } else if (kmReferencia.value != null) {
      // A diferencia de la recepción, aquí el kilometraje puede ser IGUAL al del
      // vehículo: sale a prueba de ruta y puede no haber regresar al taller.
      // Solo se bloquea bajar, salvo que se conserve la lectura ya guardada.
      const conservaLectura = isEditMode
        && km === Number(inspeccionData.value?.kilometraje_diagnostico);
      if (km < kmReferencia.value && !conservaLectura) {
        errors.kilometraje_diagnostico = `El kilometraje no puede ser menor al registrado del vehículo (${kmReferenciaDisplay.value} km).`;
      }
    }
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function validarDetalles() {
  const incidencias = [];

  serviciosDetectados.value.forEach((s, index) => {
    const sinDescripcion = !s.descripcion || !String(s.descripcion).trim();
    const horas = Number(s.horas_estimadas);
    s.error = sinDescripcion ? 'La descripción es obligatoria.' : '';
    if (sinDescripcion || Number.isNaN(horas) || horas < 0 || horas > 999.99) {
      incidencias.push(`«${traducirErrorItem(s.descripcion, `Servicio ${index + 1}`)}»${sinDescripcion ? ' sin descripción' : ': horas fuera de rango (0 - 999.99)'}`);
    }
  });

  repuestosSugeridos.value.forEach((r, index) => {
    const sinDescripcion = !r.descripcion || !String(r.descripcion).trim();
    const cantidad = Number(r.cantidad);
    r.error = sinDescripcion ? 'La descripción es obligatoria.' : '';
    if (sinDescripcion || Number.isNaN(cantidad) || cantidad < 0 || cantidad > 9999.99) {
      incidencias.push(`«${traducirErrorItem(r.descripcion, `Repuesto ${index + 1}`)}»${sinDescripcion ? ' sin descripción' : ': cantidad fuera de rango (0 - 9999.99)'}`);
    }
  });

  return incidencias.join('; ');
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
      form.tipo_inspeccion = normalizarTipoTrabajo(data.tipo_recepcion) || 'DIAGNOSTICO';
      // El diagnóstico arranca, por defecto, cuando ingresó el vehículo.
      form.fecha_inspeccion = toLocalDatetimeInput(data.fecha_ingreso) || localDatetimeNow();
      Object.assign(form, testigoPayload(data));
      syncTestigosDesdeForm();
      precargarKilometraje();
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
    inspeccionData.value = data;
    cargarSucursal(data.sucursal);
    estadoInspeccion.value = data.estado || '';
    const recepcionIdVal = data.recepcion && typeof data.recepcion === 'object' ? data.recepcion.id : data.recepcion;
    Object.assign(form, {
      recepcion: recepcionIdVal,
      numero_inspeccion: data.numero_inspeccion || '',
      tipo_inspeccion: normalizarTipoTrabajo(data.tipo_inspeccion) || 'DIAGNOSTICO',
      fecha_inspeccion: toLocalDatetimeInput(data.fecha_inspeccion) || toLocalDatetimeInput(data.created_at) || localDatetimeNow(),
      fecha_finalizacion: toLocalDatetimeInput(data.fecha_finalizacion),
      motivo_ingreso: data.motivo_ingreso || '',
      codigos_dtc: data.codigos_dtc || '',
      diagnostico_tecnico: data.diagnostico_tecnico || '',
      recomendaciones: data.recomendaciones || '',
      kilometraje_diagnostico: data.kilometraje_diagnostico ?? null,
      responsable: data.responsable || null,
      ...testigoPayload(data),
    });
    syncTestigosDesdeForm();
    if (data.recepcion) {
      recepcion.value = data.recepcion;
    } else {
      if (data.cliente) {
        clienteSeleccionado.value = data.cliente;
        clienteSearch.value = data.cliente.nombre || '';
      }
      if (data.vehiculo) {
        vehiculoSeleccionado.value = data.vehiculo;
        vehiculoSearch.value = formatPlaca(data.vehiculo.placa);
      }
    }
    // Las inspecciones anteriores a este campo no tienen lectura: se precarga
    // con el odómetro vigente del vehículo.
    precargarKilometraje();
    await cargarRelacionesInspeccion(data.id || inspeccionId);
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function cargarRelacionesInspeccion(id = inspeccionId) {
  relacionesCargadas.value = false;
  if (!id) {
    relacionesInspeccion.value = RELACIONES_VACIAS();
    return;
  }
  try {
    const data = await inspeccionesService.listarRelaciones(id);
    relacionesInspeccion.value = data?.relaciones || RELACIONES_VACIAS();
    politicaRelaciones.value = data || {};
    puedeAgregarRelacion.value = data?.puede_agregar || PUEDE_AGREGAR;
    relacionesCargadas.value = true;
  } catch (error) {
    relacionesInspeccion.value = RELACIONES_VACIAS();
    showError(error);
  }
}

// Vincular o desvincular la recepción también actualiza el formulario: si el
// guardado enviara el valor viejo, borraría el vínculo recién creado.
async function relacionRecepcion(payload) {
  const respuesta = await inspeccionesService.actualizarRelacion(inspeccionId, payload);
  if (payload.tipo === 'recepcion') {
    if (payload.accion === 'vincular') {
      form.recepcion = payload.id;
      try {
        recepcion.value = await request(`/api/recepciones/${payload.id}/`);
      } catch (error) {
        console.error('No se pudo refrescar la recepción vinculada:', error);
      }
    } else {
      form.recepcion = null;
      recepcion.value = null;
    }
  }
  await cargarRelacionesInspeccion(inspeccionId);
  return respuesta;
}

function vincularRelacion({ tipo, id }) {
  return relacionRecepcion({ tipo, id, accion: 'vincular' });
}

function desvincularRelacion({ tipo, id }) {
  return relacionRecepcion({ tipo, id, accion: 'desvincular' });
}

/** Devuelve `true` si la inspección (ya existente) quedó guardada. */
async function submit() {
  if (readOnly.value) return false;
  let guardado = false;
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};
  isSaving.value = true;

  try {
    if (!validateForm()) {
      errorMessage.value = mensajeErroresValidacion.value;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const detalleError = validarDetalles();
    if (detalleError) {
      errorMessage.value = `Revisa los siguientes ítems en la pestaña "Servicios & Repuestos": ${detalleError}`;
      irAPaso('servicios');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    if (!validarSucursal()) {
      errorMessage.value = tallerSucursalError.value;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      ...testigoPayload(form),
      sucursal: sucursalDocumento.value,
      recepcion: form.recepcion && typeof form.recepcion === 'object' ? form.recepcion.id : form.recepcion,
      ...(!recepcion.value ? {
        cliente: clienteSeleccionado.value?.id || null,
        vehiculo: vehiculoSeleccionado.value?.id || null,
      } : {}),
      responsable: form.responsable || null,
      tipo_inspeccion: form.tipo_inspeccion,
      fecha_inspeccion: toIsoFromLocalInput(form.fecha_inspeccion),
      motivo_ingreso: sanitizeObservaciones(form.motivo_ingreso || '').slice(0, 500).trim(),
      codigos_dtc: sanitizeDtc(form.codigos_dtc, 255),
      diagnostico_tecnico: sanitizeObservaciones(form.diagnostico_tecnico || '').slice(0, 1000).trim(),
      recomendaciones: sanitizeObservaciones(form.recomendaciones || '').slice(0, 1000).trim(),
      kilometraje_diagnostico: kmTexto.value === '' ? null : Number(kmTexto.value),
      otros_testigos_observaciones: sanitizeObservaciones(String(form.otros_testigos_observaciones || '')).slice(0, 255),
    };

    if (isEditMode) {
      await inspeccionesService.update(inspeccionId, payload);
      await guardarDetalles(inspeccionId);
      await photosGrid.value.guardarFotos();
      successMessage.value = 'Inspección actualizada correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      guardado = true;
    } else {
      const response = await inspeccionesService.create(payload);
      const nuevoId = response && response.id;
      if (nuevoId) {
        fotosEntityId.value = String(nuevoId);
        await guardarDetalles(nuevoId);
        await photosGrid.value.guardarFotos();
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
  return guardado;
}

// ---- Avance y hallazgos (alimentan el stepper y el panel lateral) ----
const testigosEncendidos = computed(() => TESTIGO_KEYS.filter((key) => testigos.value[key]).length);

const dtcLista = computed(() => (form.codigos_dtc || '')
  .split(/[\s,;]+/)
  .map((codigo) => codigo.trim().toUpperCase())
  .filter(Boolean));

const fotosCargadas = computed(() => fotosInspeccion.value.length);
const totalItems = computed(() => serviciosDetectados.value.length + repuestosSugeridos.value.length);

const requisitos = computed(() => {
  const lista = [];
  if (!recepcion.value) {
    lista.push({
      key: 'partes',
      label: 'Cliente y vehículo',
      ok: !!clienteSeleccionado.value && !!vehiculoSeleccionado.value,
      paso: null,
    });
  }
  lista.push(
    { key: 'fecha', label: 'Fecha de inspección', ok: !!form.fecha_inspeccion, paso: 'informacion' },
    { key: 'motivo', label: 'Motivo', ok: !!(form.motivo_ingreso || '').trim(), paso: 'informacion' },
    { key: 'diagnostico', label: 'Diagnóstico técnico', ok: !!(form.diagnostico_tecnico || '').trim(), paso: 'informacion' },
    { key: 'recomendaciones', label: 'Recomendaciones', ok: !!(form.recomendaciones || '').trim(), paso: 'informacion' },
  );
  return lista;
});

const requisitosCumplidos = computed(() => requisitos.value.filter((r) => r.ok).length);
const avancePorcentaje = computed(() => Math.round((requisitosCumplidos.value / requisitos.value.length) * 100));

// Lo que encontró el técnico: no es obligatorio, pero resume el diagnóstico.
const hallazgos = computed(() => [
  { key: 'dtc', label: 'Códigos DTC', valor: dtcLista.value.length, paso: 'informacion' },
  { key: 'testigos', label: 'Testigos', valor: testigosEncendidos.value, paso: 'testigos' },
  { key: 'fotos', label: 'Fotos', valor: fotosCargadas.value, paso: 'fotos' },
  { key: 'items', label: 'Ítems del plan', valor: totalItems.value, paso: 'servicios' },
]);

function irARequisito(req) {
  if (req.paso) irAPaso(req.paso);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

const estadoPasos = computed(() => {
  const informacionOk = requisitos.value.filter((r) => r.paso === 'informacion').every((r) => r.ok);
  const serviciosConError = [...serviciosDetectados.value, ...repuestosSugeridos.value].some((item) => item.error);
  return {
    informacion: seccionesConErrores.value.includes('Inspección') ? 'error' : informacionOk ? 'completo' : 'pendiente',
    testigos: testigosEncendidos.value > 0 || (form.otros_testigos_observaciones || '').trim() ? 'completo' : 'pendiente',
    fotos: fotosCargadas.value > 0 ? 'completo' : 'pendiente',
    servicios: serviciosConError ? 'error' : totalItems.value > 0 ? 'completo' : 'pendiente',
  };
});

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

const resumenPaso = computed(() => ({
  informacion: estadoPasos.value.informacion === 'completo' ? 'Diagnóstico completo' : 'Motivo y hallazgos',
  testigos: testigosEncendidos.value ? plural(testigosEncendidos.value, 'encendido', 'encendidos') : 'Tablero',
  fotos: `${fotosCargadas.value}/${FOTO_MAX} fotos`,
  servicios: totalItems.value ? plural(totalItems.value, 'ítem', 'ítems') : 'Servicios y repuestos',
}));

function pasoCirculoClass(key) {
  const estado = estadoPasos.value[key];
  if (estado === 'error') return 'bg-red-600 text-white dark:bg-red-500';
  if (estado === 'completo') return 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900';
  if (activeTab.value === key) return 'bg-white border-2 border-brand-900 text-brand-900 dark:bg-gray-800 dark:border-brand-300 dark:text-brand-200';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
}

const recepcionHref = computed(() => (
  recepcion.value?.id ? `/crud/recepciones/ver/?id=${encodeURIComponent(recepcion.value.id)}` : ''
));

const kmDiferenciaTexto = computed(() => {
  if (kmTexto.value === '' || kmReferencia.value == null) return '';
  const diff = Number(kmTexto.value) - kmReferencia.value;
  if (Number.isNaN(diff) || diff <= 0) return '';
  return `+${diff.toLocaleString('es-EC')} km en la prueba`;
});

// Finalizar solo se ofrece con la inspección en proceso y todos los requisitos completos.
const puedeFinalizar = computed(() => estadoInspeccion.value === 'EN_PROCESO' && avancePorcentaje.value === 100);

const puedeGuardar = computed(() => !readOnly.value && estadoInspeccion.value !== 'PENDIENTE');

const PRIORIDAD_CLASE = {
  ALTA: 'text-red-700 dark:text-red-400',
  MEDIA: 'text-amber-700 dark:text-amber-400',
  BAJA: 'text-gray-600 dark:text-gray-400',
};

const { puede, cargarPermisos } = usePermisos();

onMounted(async () => {
  // Sin permiso de modificar se lleva al usuario a la vista de consulta.
  await cargarPermisos().catch(() => {});
  if (!puede('inspecciones', 'modificar')) {
    window.location.replace(inspeccionId
      ? `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccionId)}`
      : '/crud/inspecciones/');
    return;
  }
  loadCatalogo();
  loadEmpleados();
  loadRecepcion();
  loadInspeccion();
  loadDetalles();
  loadFotos();
});
</script>

<template>
  <EntityHeader
    :breadcrumb="breadcrumb"
    entity="Inspección"
    :title="tituloPagina"
    :record-number="form.numero_inspeccion"
    :mode="isEditMode ? 'edit' : 'create'"
  >
    <template #badges>
      <EstadoInspeccionBadge
        v-if="isEditMode && estadoInspeccion"
        :estado="estadoInspeccion"
        :estado-display="inspeccionData?.estado_display"
        size="md"/>
      <!-- Marca de etapa: distingue esta pantalla de la recepción, que se ve parecida. -->
      <span
        class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/30 dark:text-brand-200 dark:ring-brand-500/50"
        title="La inspección es la etapa de diagnóstico, posterior a la recepción del vehículo">
        <Stethoscope class="w-3.5 h-3.5" />
        Etapa de diagnóstico
      </span>
    </template>
    <template #actions>
      <FormSaveActions
        v-if="puedeGuardar"
        :is-loading="isSaving"
        :is-edit-mode="isEditMode"
        cancel-href="/crud/inspecciones/"
        color="brand"
        :on-submit="submit"/>
    </template>
  </EntityHeader>

  <!-- FlowSteps temporalmente desactivado.
  <div v-if="recepcion" class="relative mx-auto max-w-6xl px-4 pt-4 rounded-lg">
    <FlowSteps :steps="pasosFlujo" />
  </div>
  -->

  <div class="px-4 pt-4">
    <!-- Avisos de cambio de estado (iniciar también se ofrece en la guía del formulario). -->
    <div
      v-if="(estadoInspeccion === 'PENDIENTE' && !readOnly) || puedeFinalizar"
      class="flex flex-col gap-3 p-4 mb-4 text-sm border rounded-lg sm:flex-row sm:items-center sm:justify-between"
      :class="puedeFinalizar
        ? 'bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-700/20 dark:border-brand-500/40 dark:text-brand-100'
        : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700/60 dark:text-blue-100'">
      <div class="flex items-start gap-3">
        <component :is="puedeFinalizar ? CheckCircle2 : CircleStop" class="w-5 h-5 mt-0.5 shrink-0" />
        <p v-if="puedeFinalizar">
          <span class="font-semibold">El diagnóstico está completo.</span>
          Finaliza la inspección para cerrarla y continuar con la cotización.
        </p>
        <p v-else>
          <span class="font-semibold">La inspección aún no ha comenzado.</span>
          Iníciala cuando el técnico tome el vehículo para poder registrar y guardar el diagnóstico.
        </p>
      </div>
      <button
        v-if="puedeFinalizar"
        type="button"
        :disabled="transicionEstado || isSaving"
        title="Guardar y cerrar el diagnóstico de la inspección"
        :class="BOTON_ESTADO"
        @click="solicitarFinalizacion">
        <IconClockCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
        Finalizar inspección
      </button>
      <button
        v-else
        type="button"
        :disabled="transicionEstado"
        title="Marcar la inspección como en proceso"
        :class="BOTON_ESTADO"
        @click="solicitarIniciar">
        <IconClockPlay class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Iniciar inspección
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="readOnly"
          type="info"
          title="Solo lectura"
        >
          {{ mensajeSoloLectura }}
          <template v-if="!inspeccionData?.tiene_orden_trabajo && !inspeccionData?.tiene_cotizacion_bloqueante">
            Ve al <a :href="detalleHref" class="font-medium underline hover:no-underline">detalle de la inspección</a>
            para reabrirla si necesitas modificar el diagnóstico.
          </template>
        </Alert>

        <!-- Vehículo en diagnóstico -->
        <section :class="SECCION">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 :class="TITULO_SECCION">
              <ScanSearch class="w-4 h-4" />
              Vehículo en diagnóstico
            </h4>
            <a
              v-if="recepcionHref"
              :href="recepcionHref"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-brand-900 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
              title="Abrir la recepción de la que viene esta inspección">
              <ClipboardList class="w-3.5 h-3.5" />
              Viene de la recepción
              <span class="font-mono font-semibold">{{ recepcion.numero_recepcion }}</span>
            </a>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
            <!-- Cliente -->
            <div class="min-w-0">
              <template v-if="recepcion">
                <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Cliente</p>
                <p class="mb-2 text-base font-semibold text-gray-900 truncate dark:text-white">{{ clienteInfo?.nombre || '—' }}</p>
              </template>
              <template v-else>
                <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <ClienteSearchSelect
                  id="cliente"
                  v-model="clienteSearch"
                  :error="Boolean(formErrors.cliente)"
                  :error-message="formErrors.cliente"
                  :show-create="!readOnly"
                  :disabled="readOnly"
                  @select="selectCliente"
                  @clear="clearCliente"
                  @create="showClientCreateModal = true"
                />
              </template>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.identificacion || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.telefono || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" />
                  <dt>Correo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ clienteInfo?.email || '—' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Vehículo -->
            <div class="min-w-0">
              <template v-if="recepcion">
                <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Vehículo</p>
                <p class="mb-2 font-mono text-base font-semibold tracking-widest text-gray-900 dark:text-white">{{ formatPlaca(vehiculoInfo?.placa) || '—' }}</p>
              </template>
              <template v-else>
                <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <VehiculoSearchSelect
                  id="vehiculo"
                  v-model="vehiculoSearch"
                  :cliente-id="clienteSeleccionado?.id || null"
                  :disabled="readOnly || !clienteSeleccionado"
                  :placeholder="clienteSeleccionado ? 'Buscar placa...' : 'Selecciona un cliente primero'"
                  class="relative"
                  @select="selectVehiculo"
                />
                <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
              </template>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TagIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Marca:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.marca || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  <dt>Modelo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.modelo || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  <dt>Color:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculoInfo?.color || '—' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Inspector -->
            <div class="min-w-0">
              <label for="inspector" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Responsable</label>
              <EmpleadoSearchSelect
                id="inspector"
                v-model="responsableSearch"
                :disabled="diagnosticoBloqueado"
                placeholder="Asignar responsable..."
                @select="selectResponsable"
                @clear="clearResponsable"
              />
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ inspectorInfo?.user?.identificacion || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ inspectorInfo?.user?.telefono || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
                  <dt>Rol:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ inspectorInfo?.rol_display || inspectorInfo?.rol || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div v-if="mostrarSucursal" class="mt-4 max-w-sm">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Taller emisor <span class="text-accent-500 dark:text-accent-400">*</span>
            </label>
            <TallerSelect
              v-model="tallerSucursalId"
              variante="campo"
              :nombre="tallerSucursalNombre"
              :invalid="Boolean(tallerSucursalError)"
              :disabled="readOnly"
              placeholder="Selecciona el taller"
              @change="limpiarErrorSucursal"
            />
            <p v-if="tallerSucursalError" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerSucursalError }}</p>
          </div>
        </section>

        <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <div v-if="isLoading" class="p-4 text-sm text-gray-500 dark:text-gray-400">Cargando inspección...</div>

          <form v-else novalidate @submit.prevent="submit">
            <!-- Pasos -->
            <nav ref="pasosRef" aria-label="Pasos de la inspección" class="scroll-mt-20 border-b border-gray-200 dark:border-gray-700">
              <ol class="grid grid-cols-4">
                <li v-for="(paso, index) in PASOS" :key="paso.key">
                  <button
                    type="button"
                    class="flex w-full h-full flex-col items-center gap-1.5 px-2 py-3 -mb-px text-center border-b-2 transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
                    :class="activeTab === paso.key
                      ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'"
                    :aria-current="activeTab === paso.key ? 'step' : undefined"
                    @click="irAPaso(paso.key)"
                  >
                    <span class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-sm font-semibold" :class="pasoCirculoClass(paso.key)">
                      <Check v-if="estadoPasos[paso.key] === 'completo'" class="w-4 h-4" />
                      <CircleAlert v-else-if="estadoPasos[paso.key] === 'error'" class="w-4 h-4" />
                      <template v-else>{{ index + 1 }}</template>
                    </span>
                    <span class="min-w-0">
                      <span class="block text-xs font-semibold sm:text-sm" :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'">
                        {{ paso.label }}
                      </span>
                      <span class="hidden text-xs truncate sm:block" :class="estadoPasos[paso.key] === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'">
                        {{ estadoPasos[paso.key] === 'error' ? 'Revisa los campos' : resumenPaso[paso.key] }}
                      </span>
                    </span>
                  </button>
                </li>
              </ol>
            </nav>

            <div class="p-4 sm:p-5 space-y-4 bg-gray-50/60 dark:bg-gray-900/30">
              <!-- 1. Diagnóstico -->
              <div v-show="activeTab === 'informacion'" class="space-y-4">
                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <CalendarClock class="w-4 h-4" />
                    Datos de la inspección
                  </h4>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label for="tipo_inspeccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de inspección</label>
                      <select id="tipo_inspeccion" v-model="form.tipo_inspeccion" :disabled="diagnosticoBloqueado" :class="inputClass('tipo_inspeccion')">
                        <option v-for="item in TIPOS_TRABAJO_OPCIONES" :key="item.value" :value="item.value">{{ item.label }}</option>
                      </select>
                    </div>
                    <div>
                      <label for="fecha_inspeccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Inicio <span class="text-accent-500 dark:text-accent-400">*</span>
                      </label>
                      <input id="fecha_inspeccion" v-model="form.fecha_inspeccion" type="datetime-local" :disabled="diagnosticoBloqueado" :class="inputClass('fecha_inspeccion')">
                      <p v-if="formErrors.fecha_inspeccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_inspeccion }}</p>
                    </div>
                    <div>
                      <label for="fecha_finalizacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cierre</label>
                      <input
                        id="fecha_finalizacion"
                        :value="fechaFinalizacionDisplay"
                        type="text"
                        readonly
                        disabled
                        :title="fechaFinalizacionDisplay"
                        class="block w-full p-2.5 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded shadow-xs cursor-not-allowed dark:bg-gray-700/60 dark:text-gray-400 dark:border-gray-600">
                      <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <template v-if="duracionInspeccion !== null">Duración: {{ formatDuration(duracionInspeccion) }}</template>
                        <template v-else>Se registra al finalizar.</template>
                      </p>
                    </div>
                    <div>
                      <label for="kilometraje_diagnostico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Kilometraje <span class="text-accent-500 dark:text-accent-400">*</span>
                      </label>
                      <div class="relative">
                        <input
                          id="kilometraje_diagnostico"
                          v-model="kilometrajeDisplay"
                          type="text"
                          inputmode="numeric"
                          autocomplete="off"
                          :disabled="diagnosticoBloqueado"
                          placeholder="Lectura del odómetro"
                          :class="inputClass('kilometraje_diagnostico', 'pe-12 tabular-nums')">
                        <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">km</span>
                      </div>
                      <p v-if="formErrors.kilometraje_diagnostico" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.kilometraje_diagnostico }}</p>
                      <p v-else-if="kmReferenciaDisplay" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Odómetro: {{ kmReferenciaDisplay }} km
                        <span v-if="kmDiferenciaTexto" class="ms-1 font-semibold text-green-700 dark:text-green-400">{{ kmDiferenciaTexto }}</span>
                      </p>
                    </div>
                  </div>
                </section>

                <section :class="SECCION">
                  <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div>
                      <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Motivo <span class="text-accent-500 dark:text-accent-400">*</span>
                      </label>
                      <textarea
                        id="motivo_ingreso"
                        v-model="form.motivo_ingreso"
                        rows="3"
                        maxlength="500"
                        :disabled="diagnosticoBloqueado"
                        placeholder="Razón por la cual el cliente trae el vehículo o falla reportada..."
                        :class="inputClass('motivo_ingreso')"></textarea>
                      <div class="flex items-start justify-between gap-3 mt-1.5">
                        <p v-if="formErrors.motivo_ingreso" class="text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
                        <p v-else-if="recepcion" class="text-xs text-gray-500 dark:text-gray-400">Precargado desde la recepción.</p>
                        <span v-else></span>
                        <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ (form.motivo_ingreso || '').length }}/500</span>
                      </div>
                    </div>
                    <div>
                      <label for="codigos_dtc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Códigos de falla (DTC OBD2)</label>
                      <input
                        id="codigos_dtc"
                        v-model="form.codigos_dtc"
                        maxlength="255"
                        :disabled="diagnosticoBloqueado"
                        placeholder="Ej.: P0300, P0171"
                        :class="inputClass('codigos_dtc', 'font-mono uppercase placeholder:font-sans placeholder:normal-case')">
                      <div v-if="dtcLista.length" class="flex flex-wrap gap-1.5 mt-2.5" aria-label="Códigos leídos">
                        <span
                          v-for="codigo in dtcLista"
                          :key="codigo"
                          class="px-2 py-0.5 font-mono text-xs font-semibold rounded bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/60">
                          {{ codigo }}
                        </span>
                      </div>
                      <p v-else class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Sepáralos con comas. Déjalo vacío si el escáner no reporta fallas.</p>
                    </div>
                  </div>
                </section>

                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <Stethoscope class="w-4 h-4" />
                    Diagnóstico técnico
                  </h4>
                  <div class="space-y-5">
                    <TextImprover
                      v-model="form.diagnostico_tecnico"
                      contexto="diagnóstico técnico de una inspección vehicular"
                      v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
                    >
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <label for="diagnostico_tecnico" class="block text-sm font-medium text-gray-900 dark:text-white">Diagnóstico <span class="text-accent-500 dark:text-accent-400">*</span></label>
                        <button v-if="!diagnosticoBloqueado" type="button" title="Mejorar el texto con IA" :disabled="mejorando || !form.diagnostico_tecnico" :class="BOTON_MEJORAR" @click="mejorar">
                          <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                          <Wand2 v-else class="w-4 h-4" />
                          {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                        </button>
                      </div>
                      <textarea
                        id="diagnostico_tecnico"
                        v-model="form.diagnostico_tecnico"
                        rows="4"
                        maxlength="1000"
                        :disabled="diagnosticoBloqueado"
                        placeholder="¿Qué encontró el técnico? Piezas desgastadas, fugas, mediciones..."
                        :class="inputClass('diagnostico_tecnico')"></textarea>
                      <div class="flex items-start justify-between gap-3 mt-1.5">
                        <div class="min-w-0">
                          <p v-if="formErrors.diagnostico_tecnico" class="text-sm text-red-600 dark:text-red-500">{{ formErrors.diagnostico_tecnico }}</p>
                          <p v-if="error" class="text-sm text-red-600 dark:text-red-500">{{ error }}</p>
                          <div v-if="mejorado && !error" class="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 class="w-4 h-4" />
                            <p>Texto mejorado. Revisa antes de guardar.</p>
                            <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                          </div>
                        </div>
                        <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ (form.diagnostico_tecnico || '').length }}/1000</span>
                      </div>
                    </TextImprover>

                    <TextImprover
                      v-model="form.recomendaciones"
                      contexto="recomendaciones y plan de acción de una inspección vehicular"
                      v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
                    >
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <label for="recomendaciones" class="block text-sm font-medium text-gray-900 dark:text-white">Recomendaciones <span class="text-accent-500 dark:text-accent-400">*</span></label>
                        <button v-if="!diagnosticoBloqueado" type="button" title="Mejorar el texto con IA" :disabled="mejorando || !form.recomendaciones" :class="BOTON_MEJORAR" @click="mejorar">
                          <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                          <Wand2 v-else class="w-4 h-4" />
                          {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                        </button>
                      </div>
                      <textarea
                        id="recomendaciones"
                        v-model="form.recomendaciones"
                        rows="3"
                        maxlength="1000"
                        :disabled="diagnosticoBloqueado"
                        placeholder="Trabajos sugeridos y su urgencia. Servirán de base para la cotización."
                        :class="inputClass('recomendaciones')"></textarea>
                      <div class="flex items-start justify-between gap-3 mt-1.5">
                        <div class="min-w-0">
                          <p v-if="formErrors.recomendaciones" class="text-sm text-red-600 dark:text-red-500">{{ formErrors.recomendaciones }}</p>
                          <p v-if="error" class="text-sm text-red-600 dark:text-red-500">{{ error }}</p>
                          <div v-if="mejorado && !error" class="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 class="w-4 h-4" />
                            <p>Texto mejorado. Revisa antes de guardar.</p>
                            <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                          </div>
                        </div>
                        <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ (form.recomendaciones || '').length }}/1000</span>
                      </div>
                    </TextImprover>
                  </div>
                </section>
              </div>

              <!-- 2. Testigos -->
              <section v-show="activeTab === 'testigos'" :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4 :class="TITULO_SECCION">
                    <TriangleAlert class="w-4 h-4" />
                    Testigos del tablero
                  </h4>
                  <span
                    v-if="testigosEncendidos"
                    class="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {{ plural(testigosEncendidos, 'encendido', 'encendidos') }}
                  </span>
                </div>
                <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Confirma los testigos que siguen encendidos durante el diagnóstico. Llegan precargados desde la recepción.
                </p>
                <TestigosTablero v-model="testigos" :disabled="diagnosticoBloqueado" />
              </section>

              <!-- 3. Evidencia -->
              <section v-show="activeTab === 'fotos'" :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4 :class="TITULO_SECCION">
                    <Camera class="w-4 h-4" />
                    Evidencia del diagnóstico
                  </h4>
                  <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ fotosCargadas }}/{{ FOTO_MAX }} fotos</span>
                </div>
                <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Opcional: fotos de los hallazgos (DTC en pantalla, desgastes, fugas, testigos encendidos).
                </p>
                <PhotoUploadGrid
                  ref="photosGrid"
                  v-model="fotosInspeccion"
                  :entity-id="fotosEntityId"
                  entity-field="inspeccion"
                  :service="inspeccionesService"
                  :max="FOTO_MAX"
                  entity-label="inspección"
                  :disabled="diagnosticoBloqueado"
                  :disabled-message="pendienteDeInicio
                    ? 'Inicia la inspección para poder cargar las fotos.'
                    : 'La inspección está finalizada; reábrela para poder modificar las fotos.'"
                />
              </section>

              <!-- 4. Servicios y repuestos -->
              <div v-show="activeTab === 'servicios'" class="space-y-4">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Lo que el técnico propone hacer. Se copia a la cotización; marca como opcional lo que el cliente puede postergar.
                </p>
                <section v-for="grupo in [
                  { key: 'svc', titulo: 'Servicios', icon: Toolbox, filas: serviciosDetectados, catalogo: catalogoServicios, columna: 'Horas', campo: 'horas_estimadas', step: '0.25', max: '999.99', vacio: 'Aún no hay servicios propuestos.', agregar: agregarServicioVacio, quitar: quitarServicio, seleccionar: seleccionarServicio, entidad: 'servicio' },
                  { key: 'rpt', titulo: 'Repuestos', icon: Package, filas: repuestosSugeridos, catalogo: catalogoRepuestos, columna: 'Cant.', campo: 'cantidad', step: '0.5', max: '9999.99', vacio: 'Aún no hay repuestos sugeridos.', agregar: agregarRepuestoVacio, quitar: quitarRepuesto, seleccionar: seleccionarRepuesto, entidad: 'repuesto' },
                ]" :key="grupo.key" :class="SECCION">
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <h4 :class="TITULO_SECCION">
                      <component :is="grupo.icon" class="w-4 h-4" />
                      {{ grupo.titulo }}
                      <span class="px-1.5 text-xs font-medium normal-case tracking-normal rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums">{{ grupo.filas.length }}</span>
                    </h4>
                    <button v-if="!diagnosticoBloqueado" type="button" :class="BOTON_AGREGAR" :title="`Añadir ${grupo.entidad}`" @click="grupo.agregar">
                      <Plus class="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                  <div class="border border-gray-200 rounded-lg dark:border-gray-700">
                    <table class="w-full text-sm">
                      <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                        <tr>
                          <th class="px-3 py-2 font-medium text-left">{{ grupo.titulo.slice(0, -1) }}</th>
                          <th class="hidden px-2 py-2 font-medium text-left sm:table-cell w-24">{{ grupo.columna }}</th>
                          <th class="hidden px-2 py-2 font-medium text-left sm:table-cell w-28">Prioridad</th>
                          <th class="hidden px-2 py-2 font-medium text-center sm:table-cell w-20">Opcional</th>
                          <th class="px-2 py-2 w-10"><span class="sr-only">Quitar</span></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr v-if="!grupo.filas.length">
                          <td colspan="5" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">{{ grupo.vacio }}</td>
                        </tr>
                        <tr v-for="(fila, index) in grupo.filas" :key="fila.id || fila.sufijo" class="align-top">
                          <td class="px-2 py-2 min-w-0">
                            <CatalogoSelect
                              :input-id="`${grupo.key}-desc-${fila.sufijo}`"
                              v-model="fila.descripcion"
                              :catalogo="grupo.catalogo"
                              :disabled="diagnosticoBloqueado"
                              placeholder="Busca y selecciona..."
                              :mostrar-stock="grupo.key === 'rpt'"
                              :mensaje-sin-resultados="`Sin coincidencias. Puedes escribir un ${grupo.entidad} libre.`"
                              :error="!!fila.error"
                              :error-message="fila.error"
                              @select="(item) => grupo.seleccionar(item, fila)"/>
                            <!-- En móvil, cantidad, prioridad y opcional bajan bajo la descripción. -->
                            <div class="flex flex-wrap items-center gap-2 mt-2 sm:hidden">
                              <input
                                v-model="fila[grupo.campo]"
                                :disabled="diagnosticoBloqueado"
                                type="number"
                                :step="grupo.step"
                                min="0"
                                :max="grupo.max"
                                :aria-label="grupo.columna"
                                :class="inputClass('', '!w-20 !p-1.5 text-xs text-center tabular-nums')">
                              <select v-model="fila.prioridad" :disabled="diagnosticoBloqueado" :aria-label="`Prioridad del ${grupo.entidad}`" :class="inputClass('', ['!w-24 !py-1.5 !ps-2.5 text-xs font-medium', PRIORIDAD_CLASE[fila.prioridad]])">
                                <option v-for="p in PRIORIDADES" :key="p.value" :value="p.value">{{ p.label }}</option>
                              </select>
                              <label class="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                <input v-model="fila.es_sugerido" :disabled="diagnosticoBloqueado" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-brand-900 focus:ring-brand-300 dark:bg-gray-700 dark:border-gray-600">
                                Opcional
                              </label>
                            </div>
                          </td>
                          <td class="hidden px-2 py-2 sm:table-cell">
                            <input
                              :id="`${grupo.key === 'svc' ? 'svc-horas' : 'rpt-cant'}-${fila.sufijo}`"
                              v-model="fila[grupo.campo]"
                              :disabled="diagnosticoBloqueado"
                              type="number"
                              :step="grupo.step"
                              min="0"
                              :max="grupo.max"
                              :class="inputClass('', '!p-2 text-center tabular-nums')">
                          </td>
                          <td class="hidden px-2 py-2 sm:table-cell">
                            <select v-model="fila.prioridad" :disabled="diagnosticoBloqueado" :class="inputClass('', ['!p-2 font-medium', PRIORIDAD_CLASE[fila.prioridad]])">
                              <option v-for="p in PRIORIDADES" :key="p.value" :value="p.value">{{ p.label }}</option>
                            </select>
                          </td>
                          <td class="hidden px-2 py-2 text-center sm:table-cell">
                            <input v-model="fila.es_sugerido" :disabled="diagnosticoBloqueado" type="checkbox" :aria-label="`${grupo.entidad} opcional`" class="w-4 h-4 mt-3 rounded border-gray-300 text-brand-900 focus:ring-brand-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60">
                          </td>
                          <td class="px-2 py-2 text-center">
                            <button
                              type="button"
                              :title="`Quitar ${grupo.entidad}`"
                              :aria-label="`Quitar ${grupo.entidad}`"
                              :disabled="diagnosticoBloqueado"
                              class="inline-flex items-center p-2 mt-0.5 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                              @click="grupo.quitar(index)">
                              <Trash2 class="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>

            <!-- Navegación entre pasos -->
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 sm:px-5 dark:border-gray-700">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                :class="activeTabIndex <= 0 ? 'invisible' : ''"
                @click="goToTab(-1)">
                <ArrowLeft class="w-4 h-4" />
                {{ PASOS[activeTabIndex - 1]?.label || 'Anterior' }}
              </button>
              <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Paso {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
              <button
                v-if="activeTabIndex < PASOS.length - 1"
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
                @click="goToTab(1)">
                Siguiente: {{ PASOS[activeTabIndex + 1].label }}
                <ArrowRight class="w-4 h-4" />
              </button>
              <FormSaveActions
                v-else-if="puedeGuardar"
                :is-loading="isSaving"
                :is-edit-mode="isEditMode"
                cancel-href="/crud/inspecciones/"
                text="Guardar inspección"
                color="brand"
                :on-submit="submit"/>
              <span v-else></span>
            </div>
          </form>
        </div>
      </div>

      <aside class="lg:col-span-1 space-y-4">
        <!-- Avance del diagnóstico -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <ListChecks class="w-4 h-4" />
            {{ readOnly ? 'Diagnóstico cerrado' : 'Avance' }}
          </h4>
          <template v-if="!readOnly">
            <div class="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ requisitosCumplidos }} de {{ requisitos.length }} requisitos</span>
              <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ avancePorcentaje }}%</span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="avancePorcentaje === 100 ? 'bg-green-600 dark:bg-green-500' : 'bg-brand-900 dark:bg-brand-300'"
                :style="{ width: `${avancePorcentaje}%` }"></div>
            </div>
            <ul class="mt-3 -mx-2 space-y-0.5">
              <li v-for="req in requisitos" :key="req.key">
                <button type="button" class="flex w-full items-center gap-2.5 px-2 py-1.5 text-sm text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700" @click="irARequisito(req)">
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full"
                    :class="req.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'border-2 border-dashed border-gray-300 dark:border-gray-500'">
                    <Check v-if="req.ok" class="w-3 h-3" />
                  </span>
                  <span class="flex-1 min-w-0 truncate" :class="req.ok ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'">{{ req.label }}</span>
                </button>
              </li>
            </ul>
            <p v-if="estadoInspeccion === 'EN_PROCESO'" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Completa los requisitos para poder finalizar la inspección.
            </p>
          </template>
          <dl v-else class="space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-gray-500 dark:text-gray-400">Cierre</dt>
              <dd class="font-medium text-right text-gray-900 dark:text-white">{{ fechaFinalizacionDisplay }}</dd>
            </div>
            <div v-if="duracionInspeccion !== null" class="flex justify-between gap-2">
              <dt class="text-gray-500 dark:text-gray-400">Duración</dt>
              <dd class="font-medium text-gray-900 dark:text-white">{{ formatDuration(duracionInspeccion) }}</dd>
            </div>
          </dl>

          <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Registrado</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="h in hallazgos"
              :key="h.key"
              type="button"
              class="flex flex-col items-start px-3 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              @click="irAPaso(h.paso)">
              <span class="text-lg font-semibold leading-tight tabular-nums" :class="h.valor ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ h.valor }}</span>
              <span class="text-xs text-gray-500 truncate max-w-full dark:text-gray-400">{{ h.label }}</span>
            </button>
          </div>
        </section>

        <!-- Vehículo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <Car class="w-4 h-4" />
            Vehículo
          </h4>
          <div v-if="vehiculoImagenSrc" class="h-36 mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
            <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
          </div>
          <div v-else class="flex flex-col items-center justify-center gap-1.5 h-24 mb-3 text-xs text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg dark:bg-gray-700/40 dark:border-gray-600">
            <Camera class="w-5 h-5" />
            Sin foto del vehículo
          </div>
          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconEngine class="w-4 h-4 shrink-0" stroke-width="1.8" />
                N° motor
              </dt>
              <dd class="font-medium text-gray-900 dark:text-white truncate">{{ vehiculoInfo?.numero_motor || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <component :is="transmisionIcon" class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Transmisión
              </dt>
              <dd class="font-medium text-right text-gray-900 dark:text-white">{{ transmisionLabel || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconGasStation class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Combustible
              </dt>
              <dd class="font-medium text-gray-900 dark:text-white truncate">{{ combustibleLabel || '—' }}</dd>
            </div>
          </dl>
        </section>

        <template v-if="isEditMode && relacionesCargadas">
          <section v-if="readOnly" :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-1']">
              <Workflow class="w-4 h-4" />
              Relaciones del flujo
            </h4>
            <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Documentos generados a partir de esta inspección.
            </p>
            <RelacionesFlujo :pasos="pasosRelaciones" />
          </section>
          <RelacionesFlujoEdit
            v-else
            tipo-entidad="inspeccion"
            :entidad-id="inspeccionId"
            :relaciones="relacionesInspeccion"
            :puede-agregar="puedeAgregarRelacion"
            :puede-editar="politicaRelaciones.puede_editar"
            :contexto="politicaRelaciones.contexto"
            :motivo-bloqueo="politicaRelaciones.motivo_bloqueo"
            :al-vincular="vincularRelacion"
            :al-desvincular="desvincularRelacion"
          />
        </template>
      </aside>
    </div>
  </div>

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientCreated"
  />

  <ConfirmModal
    v-model="showIniciarModal"
    title="Iniciar inspección"
    :message="'Al iniciar la inspección pasarás a registrar testigos, fotos y servicios. ¿Deseas continuar?'"
    :icon="IconClockPlay"
    icon-class="text-blue-600 dark:text-blue-400"
    confirm-text="Sí, iniciar"
    confirming-text="Iniciando..."
    variant="primary"
    :is-deleting="transicionEstado"
    @confirm="confirmarIniciar"
    @cancel="showIniciarModal = false"
  />

  <ConfirmModal
    v-model="showFinalizarModal"
    title="Finalizar inspección"
    :message="'Se guardarán los cambios y el diagnóstico quedará cerrado. Podrás reabrirla desde el detalle si necesitas hacer cambios. ¿Deseas continuar?'"
    :icon="IconClockCheck"
    icon-class="text-green-600 dark:text-green-400"
    confirm-text="Sí, finalizar"
    confirming-text="Finalizando..."
    variant="success"
    :is-deleting="transicionEstado"
    @confirm="confirmarFinalizar"
    @cancel="showFinalizarModal = false"
  />
</template>
