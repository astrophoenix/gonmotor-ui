<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  CheckCircle2,
  Loader2,
  Send,
  Wand2,
  X,
  Plus,
  Package,
  IdCardIcon,
  Phone,
  Mail,
  TagIcon,
  Shapes,
  PaintBucket,
  Trash2,
  CalendarDays,
  Toolbox,
  Store,
  UserCheck,
  ArrowLeftRight,
  RotateCcw,
  XCircle,
  Wrench,
  Users,
  MessageSquareText,
} from 'lucide-vue-next';
import { IconBrandWhatsapp } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { formatDateTime } from '../../../shared/utils/datetime';
import { cotizacionesService } from '../services/cotizacionesService';
import { sanitizeObservaciones, normalizarDecimal } from '../../../shared/utils/sanitize';
import {
  IVA_DEFECTO,
  IVA_OPCIONES,
  ivaLinea,
  netoLinea,
  normalizarIva,
  round2,
} from '../../../shared/utils/impuestos';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import RelacionesFlujoEdit from '../../../shared/components/RelacionesFlujoEdit.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import TextImprover from '../../../shared/components/TextImprover.vue';
// FlowSteps temporalmente desactivado; conservar para reactivarlo más adelante.
// import FlowSteps from '../../../shared/components/FlowSteps.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
// import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
import ClientModal from '../../clientes/components/ClientModal.vue';
import { useAuthStore } from '../../auth/stores/authStore';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { useSucursalDocumento } from '../../../shared/composables/useSucursalDocumento';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';
import CotizacionCiclo from './CotizacionCiclo.vue';
import CotizacionTotales from './CotizacionTotales.vue';
import CotizacionVigencia from './CotizacionVigencia.vue';
import { referenciaCorta } from '../../../shared/utils/format';

const urlParams = new URLSearchParams(window.location.search);
const cotizacionParamId = urlParams.get('id');
const inspeccionParamId = urlParams.get('inspeccion');

const isEditModeUrl = Boolean(cotizacionParamId);
const inspeccionId = inspeccionParamId || null;

const VALIDEZ_OPCIONES = [7, 15, 30, 60];
const METODOS_ACEPTACION = [
  { value: 'PRESENCIAL', label: 'Presencial en taller' },
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEFONO', label: 'Teléfono' },
];

const isEditMode = ref(isEditModeUrl);
const cotizacionId = ref(cotizacionParamId || null);
const isLoading = ref(true);
const isSaving = ref(false);
const isCreando = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

const estado = ref('PENDIENTE');
const numeroCotizacion = ref('');
const sucursalNombre = ref('');
const createdAt = ref('');
const fechaAceptacion = ref(null);
const metodoAceptacion = ref('');
const inspeccionOrigen = ref(null);
const recepcionOrigen = ref(null);
const inspeccionNumero = ref('');
const recepcionNumero = ref('');
const ordenTrabajoNumero = ref('');
const ordenGeneradaNumero = ref('');
const inspeccionTipo = ref('');
const previewImg = ref('');
const showImageModal = ref(false);

const mostrarModalGenerarOrden = ref(false);
const procesandoGeneracionOrden = ref(false);

const tituloPagina = computed(() => (isEditMode.value ? 'Editar cotización' : 'Nueva cotización'));

const breadcrumb = computed(() => [
  { label: 'Inicio', href: '/' },
  { label: 'Cotizaciones', href: '/crud/cotizaciones/' },
  ...(inspeccionOrigen.value
    ? [{
        label: `Inspección ${inspeccionNumero.value || referenciaCorta(inspeccionOrigen.value)}`,
        href: `/crud/inspecciones/editar/?id=${inspeccionOrigen.value}`,
      }]
    : []),
  { label: tituloPagina.value },
]);

// Relaciones de flujo (cita, recepción, inspección y orden ligadas por FK).
const RELACIONES_VACIAS = () => ({ cita: [], recepcion: [], inspeccion: [], orden: [] });
const PUEDE_AGREGAR = { cita: true, recepcion: true, inspeccion: true, orden: true };
const relacionesCotizacion = ref(RELACIONES_VACIAS());
const puedeAgregarRelacion = ref({ ...PUEDE_AGREGAR });
const relacionesCargadas = ref(false);

const cotizacion = ref(null);

const form = reactive({
  cliente: null,
  vehiculo: null,
  asesor: null,
  clienteSearch: '',
  vehiculoSearch: '',
  cliente_identificacion: '',
  cliente_telefono: '',
  cliente_email: '',
  vehiculo_color: '',
  validez_dias: 15,
  observaciones: '',
});

const showClientCreateModal = ref(false);

// Asesor (reemplaza inspector)
const asesorSearch = ref('');
const asesorSeleccionado = ref(null);
const empleadosOpciones = ref([]);

const servicios = ref([]);
const repuestos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);

const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);
const activeTab = ref('servicios');

const modal = reactive({
  visible: false,
  tipo: '',
  metodo: 'PRESENCIAL',
  procesando: false,
  error: '',
});

const esEditable = computed(() => ['PENDIENTE', 'ENVIADA'].includes(estado.value));

const tieneOrdenRelacionada = computed(() =>
  Boolean(ordenGeneradaNumero.value || ordenTrabajoNumero.value)
);

const puedeGenerarOrden = computed(
  () => estado.value === 'ACEPTADA' && !tieneOrdenRelacionada.value
);

const ordenHref = computed(() => (
  cotizacion.value?.orden_generada_id
    ? `/crud/ordenes/ver/?id=${encodeURIComponent(cotizacion.value.orden_generada_id)}`
    : ''
));

const opcionales = computed(
  () => [...servicios.value, ...repuestos.value].filter((item) => item.es_opcional).length
);

const authStore = useAuthStore();
const tallerSesion = computed(() => authStore.user?.taller_nombre || '');

const {
  tallerId: tallerSucursalId,
  error: tallerSucursalError,
  mostrar: mostrarSucursal,
  sucursal: sucursalDocumento,
  cargarSucursal,
  validar: validarSucursal,
  limpiarError: limpiarErrorSucursal,
} = useSucursalDocumento();

// Emisión: si la cotización aún no existe se calcula con la fecha/hora actual local.
const fechaEmision = computed(() => formatDateTime(createdAt.value || new Date()));

// Cliente y vehículo quedan bloqueados cuando la cotización proviene de una
// inspección (datos precargados) o cuando ya no es editable (PENDIENTE /
// ENVIADA son los estados en los que el usuario puede cambiarlos).
const bloqueadoClienteVehiculo = computed(
  () => Boolean(inspeccionOrigen.value) || !esEditable.value
);

const metodoAceptacionLabel = computed(() => {
  const metodo = metodoAceptacion.value;
  if (!metodo) return '';
  return (METODOS_ACEPTACION.find((m) => m.value === metodo) || {}).label || metodo;
});

const iconoMetodoAceptacion = computed(() => {
  const iconos = { WHATSAPP: IconBrandWhatsapp, EMAIL: Mail, TELEFONO: Phone, PRESENCIAL: UserCheck };
  return iconos[metodoAceptacion.value] || UserCheck;
});

/* FlowSteps temporalmente desactivado; conservar la lógica para reactivarla.
const pasosFlujo = computed(() => {
  const cot = cotizacion.value || {};
  const ordenId = cot.orden_generada_id || cot.orden_trabajo_origen || null;
  const ordenNumero = cot.orden_generada_id ? cot.orden_generada_numero : cot.orden_trabajo_numero;
  return buildPasosFlujo([
    {
      entidad: 'recepcion',
      estado: cot.recepcion_estado,
      estadoDisplay: cot.recepcion_estado_display,
      id: cot.recepcion_origen,
      numero: cot.recepcion_numero,
    },
    {
      entidad: 'inspeccion',
      estado: cot.inspeccion_estado,
      estadoDisplay: cot.inspeccion_estado_display,
      id: cot.inspeccion_origen,
      numero: cot.inspeccion_numero,
    },
    {
      entidad: 'cotizacion',
      estado: cot.estado,
      estadoDisplay: cot.estado_display,
      id: cot.id,
      numero: cot.numero_cotizacion,
    },
    {
      entidad: 'orden',
      estado: cot.orden_trabajo_estado,
      estadoDisplay: cot.orden_trabajo_estado_display,
      id: ordenId,
      numero: ordenNumero,
    },
  ]);
});
*/

function brutoServicio(s) {
  return (Number(s.horas_estimadas) || 0) * (Number(s.precio_unitario) || 0);
}

function netoServicio(s) {
  return netoLinea(brutoServicio(s), s.descuento);
}

function brutoRepuesto(r) {
  return (Number(r.cantidad) || 0) * (Number(r.precio_unitario_referencial) || 0);
}

function netoRepuesto(r) {
  return netoLinea(brutoRepuesto(r), r.descuento);
}

const subtotalServicios = computed(() =>
  round2(servicios.value.reduce((acc, s) => acc + netoServicio(s), 0))
);
const subtotalRepuestos = computed(() =>
  round2(repuestos.value.reduce((acc, r) => acc + netoRepuesto(r), 0))
);
const subtotal = computed(() => round2(subtotalServicios.value + subtotalRepuestos.value));
const descuentoTotal = computed(() =>
  round2(
    [...servicios.value, ...repuestos.value].reduce(
      (acc, item) => acc + (Number(item.descuento) || 0),
      0
    )
  )
);
const lineasFiscales = computed(() => [
  ...servicios.value.map((s) => {
    const neto = netoServicio(s);
    return { neto, tasa: Number(s.iva_porcentaje) || 0, montoIva: ivaLinea(neto, s.iva_porcentaje) };
  }),
  ...repuestos.value.map((r) => {
    const neto = netoRepuesto(r);
    return { neto, tasa: Number(r.iva_porcentaje) || 0, montoIva: ivaLinea(neto, r.iva_porcentaje) };
  }),
]);
const subtotalBase0 = computed(() =>
  round2(lineasFiscales.value.filter((l) => l.tasa === 0).reduce((acc, l) => acc + l.neto, 0))
);
const subtotalBaseGravada = computed(() =>
  round2(lineasFiscales.value.filter((l) => l.tasa > 0).reduce((acc, l) => acc + l.neto, 0))
);
const totalIva = computed(() =>
  round2(lineasFiscales.value.reduce((acc, l) => acc + l.montoIva, 0))
);
const total = computed(() => round2(subtotal.value + totalIva.value));

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fecha y hora en formato 12 h local: '01/10/2026, 10:23 p. m.'
function formatFechaHora12(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function traducirErrorItem(valor, porDefecto) {
  return (typeof valor === 'string' && valor.trim()) ? valor.trim() : porDefecto;
}

// ---------- Catálogos ----------
function loadCatalogo() {
  request('/api/servicios/opciones/').then((data) => {
    catalogoServicios.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoServicios.value = []; });
  request('/api/repuestos/opciones/').then((data) => {
    catalogoRepuestos.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoRepuestos.value = []; });
}

// ---------- Asesor ----------
function nombreEmpleado(empleado) {
  const user = empleado?.user || empleado || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.username || user.email || `#${empleado?.id || ''}`;
}

const asesorInfo = computed(() => {
  if (asesorSeleccionado.value) return asesorSeleccionado.value;
  if (!form.asesor) return null;
  return empleadosOpciones.value.find((empleado) => {
    const empleadoUsuarioId = empleado.user?.id || empleado.id;
    return empleadoUsuarioId != null && String(empleadoUsuarioId) === String(form.asesor);
  }) || null;
});

const asesorDetalles = computed(() => {
  if (!form.asesor) return null;
  const info = asesorInfo.value;
  if (info && info.user) {
    return {
      identificacion: info.user.identificacion,
      telefono: info.user.telefono,
      email: info.user.email,
    };
  }
  const cot = cotizacion.value;
  if (cot && cot.asesor_nombre) {
    return {
      identificacion: cot.asesor_identificacion,
      telefono: cot.asesor_telefono,
      email: cot.asesor_email,
    };
  }
  return null;
});

async function loadEmpleados() {
  try {
    const data = await request('/api/auth/empleados/?page=1&page_size=100');
    empleadosOpciones.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    empleadosOpciones.value = [];
  }
}

function selectAsesor(empleado) {
  asesorSeleccionado.value = empleado;
  form.asesor = empleado?.user?.id || null;
  asesorSearch.value = nombreEmpleado(empleado);
}

function clearAsesor() {
  asesorSeleccionado.value = null;
  form.asesor = null;
  asesorSearch.value = '';
}

// ---------- Ítems: filas con autocompletado desde catálogo (CatalogoSelect) ----------
function nuevaFilaServicio() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    codigo: '',
    descripcion: '',
    horas_estimadas: '1.00',
    precio_unitario: '0.00',
    descuento: '0.00',
    iva_porcentaje: IVA_DEFECTO,
    es_opcional: false,
  };
}

function nuevaFilaRepuesto() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    codigo_repuesto: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario_referencial: '0.00',
    descuento: '0.00',
    iva_porcentaje: IVA_DEFECTO,
    es_opcional: false,
  };
}

function focusInput(id) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) el.focus();
  });
}

function formatearItem(codigo, nombre) {
  if (!codigo) return nombre;
  const codigoTexto = String(codigo).trim();
  return codigoTexto && !nombre.startsWith(codigoTexto)
    ? `${codigoTexto} - ${nombre}`
    : nombre;
}

function agregarServicioVacio() {
  if (!esEditable.value) return;
  const fila = nuevaFilaServicio();
  servicios.value.push(fila);
  focusInput(`svc-desc-${fila.sufijo}`);
}

function agregarRepuestoVacio() {
  if (!esEditable.value) return;
  const fila = nuevaFilaRepuesto();
  repuestos.value.push(fila);
  focusInput(`rpt-desc-${fila.sufijo}`);
}

function seleccionarServicio(item, fila) {
  fila.codigo = item.codigo || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.horas_estimadas = '1.00';
  fila.precio_unitario = String(item.precio_referencial ?? '0.00');
  fila.descuento = '0.00';
  fila.iva_porcentaje = normalizarIva(item.iva_porcentaje_defecto);
  fila.es_opcional = false;
  focusInput(`svc-horas-${fila.sufijo}`);
}

function seleccionarRepuesto(item, fila) {
  fila.codigo_repuesto = item.codigo || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.cantidad = '1';
  fila.precio_unitario_referencial = String(item.precio_venta ?? '0.00');
  fila.descuento = '0.00';
  fila.iva_porcentaje = normalizarIva(item.iva_porcentaje_defecto);
  fila.es_opcional = false;
  focusInput(`rpt-cant-${fila.sufijo}`);
}

// ---------- Cliente / Vehículo (mismo patrón que RecepcionEdit) ----------
function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function selectCliente(cliente) {
  form.cliente = cliente;
  form.cliente_identificacion = cliente.identificacion || '';
  form.cliente_telefono = cliente.telefono || '';
  form.cliente_email = cliente.email || '';
  form.clienteSearch = cliente.nombre || '';
  clearVehiculo();
}

function clearCliente() {
  form.cliente = null;
  form.cliente_identificacion = '';
  form.cliente_telefono = '';
  form.cliente_email = '';
  form.clienteSearch = '';
  clearVehiculo();
}

function selectVehiculo(vehiculo) {
  form.vehiculo = vehiculo;
  form.vehiculo_color = vehiculo.color || '';
  form.vehiculoSearch = formatPlaca(vehiculo.placa);
}

function clearVehiculo() {
  form.vehiculo = null;
  form.vehiculo_color = '';
  form.vehiculoSearch = '';
}

function onClientCreated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
  }
}

// ---------- Carga ----------
function aplicarCotizacion(data) {
  cotizacion.value = data;
  estado.value = data.estado || 'PENDIENTE';
  numeroCotizacion.value = data.numero_cotizacion || '';
  sucursalNombre.value = data.sucursal_nombre || '';
  cargarSucursal(data.sucursal);
  createdAt.value = data.created_at || '';
  fechaAceptacion.value = data.fecha_aceptacion || null;
  metodoAceptacion.value = data.metodo_aceptacion || '';
  inspeccionOrigen.value = data.inspeccion_origen || null;
  recepcionOrigen.value = data.recepcion_origen || null;
  inspeccionNumero.value = data.inspeccion_numero || '';
  recepcionNumero.value = data.recepcion_numero || '';
  ordenTrabajoNumero.value = data.orden_trabajo_numero || '';
  ordenGeneradaNumero.value = data.orden_generada_numero || '';
  inspeccionTipo.value = data.inspeccion_tipo || '';
  form.validez_dias = Number(data.validez_dias) || 15;
  form.observaciones = data.observaciones || '';
  form.cliente = data.cliente
    ? { id: data.cliente, nombre: data.cliente_nombre || '' }
    : null;
  form.vehiculo = data.vehiculo
    ? {
        id: data.vehiculo,
        placa: data.vehiculo_placa || '',
        marca: data.vehiculo_marca || '',
        modelo: data.vehiculo_modelo || '',
        color: data.vehiculo_color || '',
      }
    : null;
  form.asesor = data.asesor ? Number(data.asesor) : null;
  form.clienteSearch = data.cliente_nombre || '';
  form.vehiculoSearch = formatPlaca(data.vehiculo_placa);
  form.cliente_identificacion = data.cliente_identificacion || '';
  form.cliente_telefono = data.cliente_telefono || '';
  form.cliente_email = data.cliente_email || '';
  form.vehiculo_color = data.vehiculo_color || '';
  asesorSeleccionado.value = null;
  asesorSearch.value = data.asesor_nombre || '';
  servicios.value = (data.servicios || []).map((s) => ({
    id: s.id,
    sufijo: Date.now() + Math.random(),
    codigo: s.codigo || '',
    descripcion: formatearItem(s.codigo, s.descripcion),
    horas_estimadas: String(s.horas_estimadas ?? '1.00'),
    precio_unitario: String(s.precio_unitario ?? '0.00'),
    descuento: String(s.descuento ?? '0.00'),
    iva_porcentaje: normalizarIva(s.iva_porcentaje),
    es_opcional: Boolean(s.es_opcional),
  }));
  repuestos.value = (data.repuestos || []).map((r) => ({
    id: r.id,
    sufijo: Date.now() + Math.random(),
    codigo_repuesto: r.codigo_repuesto || '',
    descripcion: formatearItem(r.codigo_repuesto, r.descripcion),
    cantidad: String(r.cantidad ?? '1'),
    precio_unitario_referencial: String(r.precio_unitario_referencial ?? '0.00'),
    descuento: String(r.descuento ?? '0.00'),
    iva_porcentaje: normalizarIva(r.iva_porcentaje),
    es_opcional: Boolean(r.es_opcional),
  }));
}

async function cargarCotizacion(id) {
  try {
    const data = await cotizacionesService.getById(id);
    cotizacionId.value = id;
    isEditMode.value = true;
    aplicarCotizacion(data);
    await cargarRelacionesCotizacion(cotizacionId.value);
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function cargarRelacionesCotizacion(id = cotizacionId.value) {
  relacionesCargadas.value = false;
  if (!id) {
    relacionesCotizacion.value = RELACIONES_VACIAS();
    return;
  }
  try {
    const data = await cotizacionesService.listarRelaciones(id);
    relacionesCotizacion.value = data?.relaciones || RELACIONES_VACIAS();
    puedeAgregarRelacion.value = data?.puede_agregar || PUEDE_AGREGAR;
    relacionesCargadas.value = true;
  } catch (error) {
    relacionesCotizacion.value = RELACIONES_VACIAS();
    showError(error);
  }
}

async function relacionCotizacion(payload) {
  const respuesta = await cotizacionesService.actualizarRelacion(cotizacionId.value, payload);
  // Se recarga el listado para que los vínculos derivados (p. ej. la recepción
  // heredada por la inspección) queden igual que en el backend.
  await cargarRelacionesCotizacion(cotizacionId.value);
  return respuesta;
}

function vincularRelacion({ tipo, id }) {
  return relacionCotizacion({ tipo, id, accion: 'vincular' });
}

function desvincularRelacion({ tipo, id }) {
  return relacionCotizacion({ tipo, id, accion: 'desvincular' });
}

function observacionesIniciales(inspeccion) {
  const lineas = [];
  if (inspeccion?.recepcion?.motivo_ingreso) {
    lineas.push(`Motivo de ingreso: ${inspeccion.recepcion.motivo_ingreso}`);
  }
  return sanitizeObservaciones(lineas.join('\n')).slice(0, 2000);
}

async function crearCotizacionDesdeInspeccion() {
  if (isCreando.value) return;
  isCreando.value = true;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const data = await request(`/api/ordenes/inspecciones/${inspeccionId}/`);
    // Una cotización aceptada es inmutable: una nueva cotización desde la
    // inspección debe construirse exclusivamente con sus ítems actuales.
    if (data.cotizacion_activa_id && data.cotizacion_activa_estado !== 'ACEPTADA') {
      window.location.replace(`/crud/cotizaciones/editar/?id=${encodeURIComponent(data.cotizacion_activa_id)}`);
      return;
    }
    const tieneDetalles = (data.servicios_detectados?.length || 0) + (data.repuestos_sugeridos?.length || 0) > 0;
    if (!tieneDetalles) {
      errorMessage.value = 'La inspección no tiene servicios ni repuestos. Agrega al menos un ítem antes de generar la cotización.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const clienteId = data.recepcion?.cliente?.id || null;
    const vehiculoId = data.recepcion?.vehiculo?.id || null;
    form.clienteSearch = data.recepcion?.cliente?.nombre || '';
    form.vehiculoSearch = data.recepcion?.vehiculo?.placa || '';

    prefillDesdeInspeccion(data);

    const creada = await cotizacionesService.create({
      sucursal: sucursalDocumento.value,
      cliente: clienteId,
      vehiculo: vehiculoId,
      inspeccion_origen: inspeccionId,
      recepcion_origen: data.recepcion?.id || null,
      validez_dias: 15,
      observaciones: observacionesIniciales(data),
    });
    cotizacionId.value = creada && creada.id;
    isEditMode.value = true;
    await guardarDetalles(cotizacionId.value);
    const recargada = await cotizacionesService.getById(cotizacionId.value);
    aplicarCotizacion(recargada);
    successMessage.value = `Cotización "${recargada.numero_cotizacion}" creada desde la inspección. Revisa los precios y detalles antes de enviarla al cliente.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
  } finally {
    isCreando.value = false;
    isLoading.value = false;
  }
}

function ivaDesdeCatalogo(catalogo, id) {
  const item = id ? catalogo.value.find((c) => c.id === id) : null;
  return item ? item.iva_porcentaje_defecto : IVA_DEFECTO;
}

function prefillDesdeInspeccion(inspeccion) {
  const detallesServicios = inspeccion.servicios_detectados || [];
  const detallesRepuestos = inspeccion.repuestos_sugeridos || [];
  servicios.value = detallesServicios
    .filter((s) => s.descripcion || s.servicio_nombre)
    .map((s) => ({
      id: null,
      sufijo: Date.now() + Math.random(),
      descripcion: s.descripcion || s.servicio_nombre || '',
      horas_estimadas: String(s.horas_estimadas ?? '1.00'),
      precio_unitario: String(s.precio_referencial ?? '0.00'),
      descuento: '0.00',
      iva_porcentaje: normalizarIva(ivaDesdeCatalogo(catalogoServicios, s.servicio)),
    }));
  repuestos.value = detallesRepuestos
    .filter((r) => r.descripcion || r.repuesto_nombre)
    .map((r) => ({
      id: null,
      sufijo: Date.now() + Math.random(),
      codigo_repuesto: r.repuesto_codigo || '',
      descripcion: r.descripcion || r.repuesto_nombre || '',
      cantidad: String(r.cantidad ?? '1'),
      precio_unitario_referencial: String(r.precio_referencial ?? '0.00'),
      descuento: '0.00',
      iva_porcentaje: normalizarIva(ivaDesdeCatalogo(catalogoRepuestos, r.repuesto)),
      es_opcional: Boolean(r.es_sugerido),
    }));
}

// ---------- Ítems (servicios / repuestos) ----------
// Una cotización puede llevar solo servicios, solo repuestos o ambos; lo único
// que no se permite es guardarla sin ningún ítem. Las filas que el usuario dejó
// a medias (sin descripción ni código) no se envían al backend.
function descripcionItem(item) {
  return sanitizeObservaciones(String(item.descripcion || '')).trim();
}

function serviciosCompletos() {
  return servicios.value.filter((s) => descripcionItem(s));
}

function repuestosCompletos() {
  return repuestos.value.filter((r) => descripcionItem(r) || String(r.codigo_repuesto || '').trim());
}

function hayItems() {
  return serviciosCompletos().length > 0 || repuestosCompletos().length > 0;
}

function quitarServicio(index) {
  const removed = servicios.value.splice(index, 1)[0];
  if (removed && removed.id) serviciosEliminados.value.push(removed.id);
}

function quitarRepuesto(index) {
  const removed = repuestos.value.splice(index, 1)[0];
  if (removed && removed.id) repuestosEliminados.value.push(removed.id);
}

async function guardarDetalles(idCotizacion) {
  const cotizacionRef = idCotizacion ? String(idCotizacion) : '';
  if (!cotizacionRef) throw new Error('No se pudo identificar la cotización para guardar sus detalles.');
  const errores = [];

  async function guardarServicio(s) {
    const payload = {
      codigo: String(s.codigo || '').slice(0, 50),
      descripcion: sanitizeObservaciones(String(s.descripcion || '')).slice(0, 255) || '',
      horas_estimadas: normalizarDecimal(s.horas_estimadas, 0, 999.99, '1.00'),
      precio_unitario: normalizarDecimal(s.precio_unitario, 0, 99999999.99, '0.00'),
      descuento: normalizarDecimal(s.descuento, 0, 99999999.99, '0.00'),
      iva_porcentaje: normalizarIva(s.iva_porcentaje),
      es_opcional: Boolean(s.es_opcional),
    };
    try {
      if (s.id) {
        await cotizacionesService.updateServicio(s.id, payload);
      } else {
        const creado = await cotizacionesService.createServicio({ ...payload, cotizacion: cotizacionRef });
        s.id = creado && creado.id;
      }
    } catch (error) {
      errores.push(`Servicio "${traducirErrorItem(s.descripcion, 'sin descripción')}"`);
    }
  }

  async function guardarRepuesto(r) {
    const payload = {
      codigo_repuesto: String(r.codigo_repuesto || '').slice(0, 50),
      descripcion: sanitizeObservaciones(String(r.descripcion || '')).slice(0, 255) || '',
      cantidad: String(Math.max(1, Math.round(Number(r.cantidad) || 1))),
      precio_unitario_referencial: normalizarDecimal(r.precio_unitario_referencial, 0, 99999999.99, '0.00'),
      descuento: normalizarDecimal(r.descuento, 0, 99999999.99, '0.00'),
      iva_porcentaje: normalizarIva(r.iva_porcentaje),
      es_opcional: Boolean(r.es_opcional),
    };
    try {
      if (r.id) {
        await cotizacionesService.updateRepuesto(r.id, payload);
      } else {
        const creado = await cotizacionesService.createRepuesto({ ...payload, cotizacion: cotizacionRef });
        r.id = creado && creado.id;
      }
    } catch (error) {
      errores.push(`Repuesto "${traducirErrorItem(r.descripcion, 'sin descripción')}"`);
    }
  }

  for (const s of serviciosCompletos()) await guardarServicio(s);
  for (const r of repuestosCompletos()) await guardarRepuesto(r);
  for (const id of serviciosEliminados.value) {
    try {
      await cotizacionesService.deleteServicio(id);
    } catch (error) {
      errores.push('Servicio eliminado');
    }
  }
  for (const id of repuestosEliminados.value) {
    try {
      await cotizacionesService.deleteRepuesto(id);
    } catch (error) {
      errores.push('Repuesto eliminado');
    }
  }

  if (errores.length) {
    throw new Error(
      `No se pudieron guardar los siguientes ítems: ${errores.join(', ')}. Revisa la información y vuelve a intentarlo.`
    );
  }

  serviciosEliminados.value = [];
  repuestosEliminados.value = [];
}

// ---------- Acciones de estado ----------
function abrirModal(tipo) {
  modal.tipo = tipo;
  modal.metodo = tipo === 'ACEPTAR' ? 'PRESENCIAL' : modal.metodo;
  modal.error = '';
  modal.visible = true;
}

function cerrarModal() {
  if (modal.procesando) return;
  modal.visible = false;
}

// El PDF documenta lo que está GUARDADO en el backend, así que no depende del
// estado de la cotización: aparece desde que existe el ID (borrador incluido).
function descargarPdf() {
  return cotizacionesService.exportarPdf(cotizacionId.value);
}

const TITULOS_MODAL = {
  ENVIAR: 'Enviar cotización al cliente',
  ACEPTAR: 'Registrar aprobación del cliente',
  RECHAZAR: 'Registrar rechazo del cliente',
  REENVIAR: 'Reenviar cotización',
};

async function confirmarModal() {
  if (!cotizacionId.value || modal.procesando) return;
  modal.procesando = true;
  modal.error = '';
  try {
    if (modal.tipo === 'ENVIAR') {
      // Se envía lo que está en pantalla: primero se guardan los cambios. Si el
      // guardado falla, el modal se cierra y los errores quedan en la página.
      const guardado = await submit({ silencioso: true });
      if (!guardado) {
        modal.visible = false;
        return;
      }
      await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
      successMessage.value = 'Cotización guardada y enviada al cliente.';
    } else if (modal.tipo === 'ACEPTAR') {
      await cotizacionesService.update(cotizacionId.value, {
        estado: 'ACEPTADA',
        metodo_aceptacion: modal.metodo,
      });
      successMessage.value = 'Cotización marcada como aceptada por el cliente.';
    } else if (modal.tipo === 'RECHAZAR') {
      await cotizacionesService.update(cotizacionId.value, { estado: 'RECHAZADA' });
      successMessage.value = 'Cotización marcada como rechazada.';
    } else if (modal.tipo === 'REENVIAR') {
      await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
      successMessage.value = 'Cotización reenviada al cliente.';
    }
    modal.visible = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await cargarCotizacion(cotizacionId.value);
  } catch (error) {
    modal.error = error.message || 'No se pudo completar la operación.';
  } finally {
    modal.procesando = false;
  }
}

async function confirmarGenerarOrden() {
  if (!cotizacionId.value || !cotizacion.value || procesandoGeneracionOrden.value) return;
  procesandoGeneracionOrden.value = true;
  errorMessage.value = '';
  try {
    const resultado = await cotizacionesService.generarOrden(cotizacionId.value, {
      metodo_aceptacion: metodoAceptacion.value || 'PRESENCIAL',
    });
    mostrarModalGenerarOrden.value = false;
    successMessage.value = `Orden de trabajo N° ${resultado.numero_orden} generada correctamente.`;
    await cargarCotizacion(cotizacionId.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
  } finally {
    procesandoGeneracionOrden.value = false;
  }
}

// ---------- Creación independiente ----------
function validateForm() {
  formErrors.value = {};
  const errors = {};
  if (!form.cliente) errors.cliente = 'Debes seleccionar el cliente.';
  if (!form.vehiculo) errors.vehiculo = 'Debes seleccionar el vehículo.';
  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function crearCotizacionIndependiente() {
  if (isSaving.value || isCreando.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  if (!validateForm()) {
    errorMessage.value = 'Completa correctamente los campos obligatorios.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (!validarSucursal()) {
    errorMessage.value = tallerSucursalError.value;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  isCreando.value = true;
  try {
    const creada = await cotizacionesService.create({
      sucursal: sucursalDocumento.value,
      cliente: form.cliente.id,
      vehiculo: form.vehiculo.id,
      asesor: form.asesor || null,
      validez_dias: Number(form.validez_dias) || 15,
      observaciones: sanitizeObservaciones(form.observaciones || '').slice(0, 2000).trim(),
    });
    const nuevoId = creada && creada.id;
    if (!nuevoId) throw new Error('No se pudo crear la cotización. Intenta nuevamente.');
    cotizacionId.value = nuevoId;

    // Si el usuario ya agregó servicios/repuestos antes de crear, se persisten
    // antes de redirigir para no perderlos al recargar desde el servidor.
    const teniaDetalles = hayItems();
    let errorDetalles = '';
    if (teniaDetalles) {
      try {
        await guardarDetalles(nuevoId);
      } catch (error) {
        errorDetalles = error.message || '';
      }
    }

    sessionStorage.setItem(
      'cotizacion_exito',
      teniaDetalles
        ? `Cotización "${creada.numero_cotizacion}" creada correctamente.`
        : `Cotización "${creada.numero_cotizacion}" creada. Agrega los servicios y repuestos.`
    );
    if (errorDetalles) sessionStorage.setItem('cotizacion_error', errorDetalles);
    window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(nuevoId)}`);
  } catch (error) {
    showError(error);
  } finally {
    isCreando.value = false;
  }
}

// ---------- Guardar ----------
// Devuelve true si guardó. Con `silencioso` no muestra el aviso de éxito: lo usa
// el envío al cliente, que guarda antes de cambiar el estado.
async function submit({ silencioso = false } = {}) {
  if (!esEditable.value || !cotizacionId.value) return false;
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};

  if (!validarSucursal()) {
    errorMessage.value = tallerSucursalError.value;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  const payload = {
    sucursal: sucursalDocumento.value,
    validez_dias: Number(form.validez_dias) || 15,
    observaciones: sanitizeObservaciones(form.observaciones || '').slice(0, 2000).trim(),
    asesor: form.asesor || null,
  };

  if (!bloqueadoClienteVehiculo.value) {
    if (!validateForm()) {
      errorMessage.value = 'Completa correctamente los campos de: Información General';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    payload.cliente = form.cliente.id;
    payload.vehiculo = form.vehiculo.id;
  }

  if (!hayItems()) {
    errorMessage.value =
      'La cotización debe tener al menos un servicio o un repuesto. Agrega los ítems en las pestañas Servicios o Repuestos.';
    activeTab.value = !servicios.value.length && repuestos.value.length ? 'repuestos' : 'servicios';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  isSaving.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, payload);
    await guardarDetalles(cotizacionId.value);
    await cargarCotizacion(cotizacionId.value);
    if (!silencioso) {
      successMessage.value = 'Cotización actualizada correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return true;
  } catch (error) {
    if (error.data && typeof error.data === 'object') {
      const serverErrors = {};
      Object.keys(error.data).forEach((key) => {
        const value = error.data[key];
        serverErrors[key] = Array.isArray(value) ? value[0] : value;
      });
      formErrors.value = serverErrors;
    }
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  } finally {
    isSaving.value = false;
  }
}

// ---------- Presentación ----------
// Mismos estilos de tarjeta que recepción e inspección (línea gráfica del flujo).
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const INPUT = 'block w-full px-2.5 py-2 text-sm bg-gray-50 border border-gray-300 text-gray-900 rounded shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300 disabled:cursor-not-allowed disabled:opacity-70';
const BOTON_PRIMARIO = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed';
const BOTON_SECUNDARIO = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800';

const ICONOS_METODO = { PRESENCIAL: UserCheck, EMAIL: Mail, WHATSAPP: IconBrandWhatsapp, TELEFONO: Phone };

// Las dos pestañas de ítems comparten la misma tabla; cada una indica sus campos.
const TABS_ITEMS = computed(() => [
  {
    key: 'servicios',
    label: 'Servicios',
    singular: 'Servicio',
    icon: Toolbox,
    filas: servicios.value,
    catalogo: catalogoServicios.value,
    columna: 'Horas',
    campoCantidad: 'horas_estimadas',
    campoPrecio: 'precio_unitario',
    subtotal: subtotalServicios.value,
    neto: netoServicio,
    seleccionar: seleccionarServicio,
    agregar: agregarServicioVacio,
    quitar: quitarServicio,
    vacio: 'Aún no hay servicios de mano de obra.',
  },
  {
    key: 'repuestos',
    label: 'Repuestos',
    singular: 'Repuesto',
    icon: Package,
    filas: repuestos.value,
    catalogo: catalogoRepuestos.value,
    columna: 'Cant.',
    campoCantidad: 'cantidad',
    campoPrecio: 'precio_unitario_referencial',
    subtotal: subtotalRepuestos.value,
    neto: netoRepuesto,
    seleccionar: seleccionarRepuesto,
    agregar: agregarRepuestoVacio,
    quitar: quitarRepuesto,
    vacio: 'Aún no hay repuestos o materiales.',
  },
]);

// ---------- Vigilancia ----------
watch([
  () => form.clienteSearch,
  () => form.validez_dias,
  () => form.observaciones,
], () => {
  if (estado.value === 'PENDIENTE') formErrors.value = {};
});

watch(() => form.observaciones, (val) => {
  const clean = sanitizeObservaciones(val).slice(0, 2000);
  if (clean !== val) form.observaciones = clean;
});

// ---------- Ciclo de vida ----------
const { puede, cargarPermisos } = usePermisos();

onMounted(async () => {
  // Sin permiso de modificar se lleva al usuario a la vista de consulta.
  await cargarPermisos().catch(() => {});
  if (!puede('cotizaciones', 'modificar')) {
    window.location.replace(cotizacionParamId
      ? `/crud/cotizaciones/ver/?id=${encodeURIComponent(cotizacionParamId)}`
      : '/crud/cotizaciones/');
    return;
  }
  const mensajeExito = sessionStorage.getItem('cotizacion_exito');
  if (mensajeExito) {
    successMessage.value = mensajeExito;
    sessionStorage.removeItem('cotizacion_exito');
  }
  const mensajeError = sessionStorage.getItem('cotizacion_error');
  if (mensajeError) {
    errorMessage.value = mensajeError;
    sessionStorage.removeItem('cotizacion_error');
  }
  loadCatalogo();
  loadEmpleados();
  if (isEditMode.value && cotizacionId.value) {
    cargarCotizacion(cotizacionId.value);
  } else if (inspeccionId) {
    crearCotizacionDesdeInspeccion();
  } else {
    isLoading.value = false;
  }
});
</script>

<template>
  <EntityHeader
    :breadcrumb="breadcrumb"
    entity="Cotización"
    :title="tituloPagina"
    :record-number="numeroCotizacion"
    :mode="isEditMode ? 'edit' : 'create'"
  >
    <template #badges>
      <EstadoCotizacionBadge
        v-if="isEditMode && cotizacionId"
        :estado="estado"
        :estado-display="cotizacion?.estado_display"
        size="md"
      />
    </template>
    <template #actions>
      <template v-if="isEditMode && cotizacionId">
        <PdfExportButton :descargador="descargarPdf" label="Exportar" :disabled="isSaving" @error="errorMessage = $event" />
        <FormSaveActions
          v-if="esEditable"
          :is-loading="isSaving"
          :is-edit-mode="isEditMode"
          cancel-href="/crud/cotizaciones/"
          color="brand"
          :on-submit="submit"/>
      </template>
      <FormSaveActions
        v-if="!isEditMode && !inspeccionOrigen"
        :is-loading="isCreando"
        cancel-href="/crud/cotizaciones/"
        color="brand"
        :on-submit="crearCotizacionIndependiente"
      />
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-6">
    <div class="space-y-4">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <Alert
        v-if="!isLoading && isEditMode && cotizacionId && !esEditable"
        type="info"
        title="Solo lectura"
        message="La cotización ya tiene respuesta del cliente; sus ítems no se pueden modificar."
      />
    </div>

    <div v-if="isLoading" :class="[SECCION, 'mt-4 flex items-center justify-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400']">
      <Loader2 class="w-5 h-5 animate-spin" />
      {{ isCreando ? 'Creando la cotización...' : 'Cargando cotización...' }}
    </div>

    <template v-else>
      <!-- Ciclo de vida + siguiente paso (solo con la cotización guardada) -->
      <CotizacionCiclo
        v-if="isEditMode && cotizacionId"
        class="mt-4"
        :estado="estado"
        :creada="createdAt"
        :enviada="cotizacion?.fecha_envio || ''"
        :aceptada="fechaAceptacion || ''"
        :orden-numero="ordenGeneradaNumero || ''"
        :orden-href="ordenHref"
      >
        <template #accion>
          <template v-if="estado === 'PENDIENTE'">
            <button type="button" :disabled="isSaving" :class="BOTON_PRIMARIO" @click="abrirModal('ENVIAR')">
              <Send class="w-4 h-4 -ms-0.5" />
              Enviar al cliente
            </button>
          </template>
          <template v-else-if="estado === 'ENVIADA'">
            <button type="button" :disabled="isSaving" :class="BOTON_SECUNDARIO" @click="abrirModal('RECHAZAR')">
              <XCircle class="w-4 h-4 -ms-0.5 text-red-600 dark:text-red-400" />
              Rechazó
            </button>
            <button type="button" :disabled="isSaving" :class="BOTON_PRIMARIO" @click="abrirModal('ACEPTAR')">
              <CheckCircle2 class="w-4 h-4 -ms-0.5" />
              Aprobó
            </button>
          </template>
          <button v-else-if="estado === 'RECHAZADA'" type="button" :class="BOTON_PRIMARIO" @click="abrirModal('REENVIAR')">
            <RotateCcw class="w-4 h-4 -ms-0.5" />
            Reenviar
          </button>
          <button v-else-if="puedeGenerarOrden" type="button" :class="BOTON_PRIMARIO" @click="mostrarModalGenerarOrden = true">
            <Wrench class="w-4 h-4 -ms-0.5" />
            Generar orden de trabajo
          </button>
        </template>
      </CotizacionCiclo>

      <div class="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-4">
        <div class="space-y-4 lg:col-span-3">
          <!-- Cliente, vehículo y asesor -->
          <section :class="SECCION">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 :class="TITULO_SECCION">
                <Users class="w-4 h-4" />
                Cliente y vehículo
              </h4>
              <span
                v-if="inspeccionOrigen"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600"
                title="Cliente y vehículo vienen de la inspección y no se pueden cambiar">
                Desde la inspección
                <span class="font-mono font-semibold">{{ inspeccionNumero || referenciaCorta(inspeccionOrigen) }}</span>
              </span>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="min-w-0">
                <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Cliente <span v-if="!bloqueadoClienteVehiculo" class="text-accent-500 dark:text-accent-400">*</span>
                </label>
                <ClienteSearchSelect
                  id="cliente"
                  v-model="form.clienteSearch"
                  placeholder="Buscar por nombre, cédula o teléfono"
                  :error="Boolean(formErrors.cliente)"
                  :error-message="formErrors.cliente"
                  :show-create="!bloqueadoClienteVehiculo"
                  :disabled="bloqueadoClienteVehiculo"
                  @select="selectCliente"
                  @clear="clearCliente"
                  @create="showClientCreateModal = true"
                />
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Identificación:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_identificacion || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <dt>Teléfono:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_telefono || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <dt>Correo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_email || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <div class="relative min-w-0">
                <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Vehículo <span v-if="!bloqueadoClienteVehiculo" class="text-accent-500 dark:text-accent-400">*</span>
                </label>
                <VehiculoSearchSelect
                  id="vehiculo"
                  v-model="form.vehiculoSearch"
                  :cliente-id="form.cliente?.id || null"
                  :disabled="bloqueadoClienteVehiculo || !form.cliente"
                  :placeholder="form.cliente ? 'Buscar placa...' : 'Selecciona un cliente primero'"
                  :error="Boolean(formErrors.vehiculo)"
                  :error-message="formErrors.vehiculo"
                  class="relative"
                  @select="selectVehiculo"
                  @clear="clearVehiculo"
                />
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <TagIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Marca:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo?.marca || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" />
                    <dt>Modelo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo?.modelo || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                    <dt>Color:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo_color || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <div class="min-w-0">
                <label for="asesor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Responsable <span v-if="esEditable" class="text-accent-500 dark:text-accent-400">*</span>
                </label>
                <EmpleadoSearchSelect
                  v-if="esEditable"
                  id="asesor"
                  v-model="asesorSearch"
                  placeholder="Buscar responsable..."
                  @select="selectAsesor"
                  @clear="clearAsesor"
                />
                <p v-else class="py-2 text-base font-semibold truncate text-gray-900 dark:text-white">{{ asesorSearch || cotizacion?.asesor_nombre || '—' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Identificación:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorDetalles?.identificacion || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <dt>Teléfono:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorDetalles?.telefono || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <dt>Correo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorDetalles?.email || '—' }}</dd>
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
                :nombre="sucursalNombre"
                variante="campo"
                :disabled="Boolean(inspeccionOrigen)"
                :invalid="Boolean(tallerSucursalError)"
                placeholder="Selecciona el taller"
                @change="limpiarErrorSucursal"
              />
              <p v-if="tallerSucursalError" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerSucursalError }}</p>
            </div>

            <!-- Metadatos visibles al crear (al editar los muestra el ciclo de vida). -->
            <div v-if="!isEditMode" class="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 mt-4 text-sm text-gray-600 border-t border-gray-200 dark:border-gray-700 dark:text-gray-300">
              <span class="inline-flex items-center gap-1.5">
                <CalendarDays class="w-4 h-4 shrink-0 text-brand-700 dark:text-brand-300" />
                <span class="font-medium text-gray-900 dark:text-white">Emisión:</span>
                {{ fechaEmision }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Store class="w-4 h-4 shrink-0 text-brand-700 dark:text-brand-300" />
                <span class="font-medium text-gray-900 dark:text-white">Taller:</span>
                {{ sucursalNombre || tallerSesion || '—' }}
              </span>
            </div>
          </section>

          <!-- Detalle: servicios y repuestos -->
          <fieldset :disabled="!esEditable" class="min-w-0">
            <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <nav aria-label="Ítems de la cotización" class="border-b border-gray-200 dark:border-gray-700">
                <ol class="grid grid-cols-2" role="tablist">
                  <li v-for="tab in TABS_ITEMS" :key="tab.key">
                    <button
                      type="button"
                      role="tab"
                      :aria-selected="activeTab === tab.key"
                      class="flex items-center w-full h-full gap-3 px-4 py-3 -mb-px text-left border-b-2 transition-colors"
                      :class="activeTab === tab.key
                        ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'"
                      @click="activeTab = tab.key"
                    >
                      <span
                        class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full"
                        :class="activeTab === tab.key ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                      >
                        <component :is="tab.icon" class="w-4 h-4" />
                      </span>
                      <span class="min-w-0">
                        <span class="block text-sm font-semibold" :class="activeTab === tab.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'">
                          {{ tab.label }}
                          <span class="ms-1 px-1.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums">{{ tab.filas.length }}</span>
                        </span>
                        <span class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">$ {{ formatMoney(tab.subtotal) }}</span>
                      </span>
                    </button>
                  </li>
                </ol>
              </nav>

              <div class="p-4 sm:p-5 bg-gray-50/60 dark:bg-gray-900/30">
                <div v-for="tab in TABS_ITEMS" v-show="activeTab === tab.key" :key="tab.key">
                  <div class="relative overflow-x-auto bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
                    <table class="w-full text-sm text-left">
                      <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                        <tr>
                          <th scope="col" class="px-3 py-2.5 font-medium min-w-64">{{ tab.singular }}</th>
                          <th scope="col" class="w-24 px-2 py-2.5 font-medium text-center">{{ tab.columna }}</th>
                          <th scope="col" class="w-32 px-2 py-2.5 font-medium text-center">P. unitario</th>
                          <th scope="col" class="w-28 px-2 py-2.5 font-medium text-center">Descuento</th>
                          <th scope="col" class="w-24 px-2 py-2.5 font-medium text-center">IVA</th>
                          <th scope="col" class="w-24 px-2 py-2.5 font-medium text-center">Opcional</th>
                          <th scope="col" class="w-28 px-3 py-2.5 font-medium text-right">Neto</th>
                          <th v-if="esEditable" scope="col" class="w-12 px-2 py-2.5"><span class="sr-only">Quitar</span></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr v-if="!tab.filas.length">
                          <td :colspan="esEditable ? 8 : 7" class="px-4 py-8 text-center">
                            <component :is="tab.icon" class="w-7 h-7 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p class="text-sm text-gray-500 dark:text-gray-400">{{ tab.vacio }}</p>
                          </td>
                        </tr>
                        <tr v-for="(fila, index) in tab.filas" :key="fila.sufijo || fila.id" class="align-top">
                          <td class="px-3 py-2">
                            <CatalogoSelect
                              :input-id="`${tab.key === 'servicios' ? 'svc' : 'rpt'}-desc-${fila.sufijo}`"
                              v-model="fila.descripcion"
                              :catalogo="tab.catalogo"
                              placeholder="Busca y selecciona..."
                              :disabled="!esEditable"
                              :mostrar-stock="tab.key === 'repuestos'"
                              :mensaje-sin-resultados="`Sin coincidencias. Puedes escribir un ${tab.singular.toLowerCase()} libre.`"
                              @select="(item) => tab.seleccionar(item, fila)"/>
                          </td>
                          <td class="px-2 py-2">
                            <input
                              :id="tab.key === 'servicios' ? `svc-horas-${fila.sufijo}` : `rpt-cant-${fila.sufijo}`"
                              v-model="fila[tab.campoCantidad]"
                              type="number"
                              :min="tab.key === 'servicios' ? 0 : 1"
                              :step="tab.key === 'servicios' ? 0.5 : 1"
                              :aria-label="tab.columna"
                              :class="[INPUT, 'text-center']"
                              :disabled="!esEditable" />
                          </td>
                          <td class="px-2 py-2">
                            <div class="relative">
                              <span class="absolute inset-y-0 flex items-center text-gray-400 pointer-events-none start-0 ps-2.5">$</span>
                              <input v-model="fila[tab.campoPrecio]" type="number" min="0" step="0.01" aria-label="Precio unitario" :class="[INPUT, 'ps-6 text-right']" :disabled="!esEditable" />
                            </div>
                          </td>
                          <td class="px-2 py-2">
                            <div class="relative">
                              <span class="absolute inset-y-0 flex items-center text-gray-400 pointer-events-none start-0 ps-2.5">$</span>
                              <input v-model="fila.descuento" type="number" min="0" step="0.01" aria-label="Descuento" :class="[INPUT, 'ps-6 text-right']" :disabled="!esEditable" />
                            </div>
                          </td>
                          <td class="px-2 py-2">
                            <select v-model="fila.iva_porcentaje" aria-label="IVA" :class="INPUT" :disabled="!esEditable">
                              <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                            </select>
                          </td>
                          <td class="px-2 py-2 text-center">
                            <label class="inline-flex items-center mt-1.5" :class="esEditable ? 'cursor-pointer' : 'cursor-default'" :title="fila.es_opcional ? 'El cliente puede postergarlo' : 'Necesario'">
                              <input v-model="fila.es_opcional" type="checkbox" class="sr-only peer" :disabled="!esEditable" :aria-label="`${tab.singular} opcional`" />
                              <span class="relative w-9 h-5 bg-gray-200 rounded-full peer-focus:ring-4 peer-focus:ring-brand-200 dark:peer-focus:ring-brand-700 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-900 dark:peer-checked:bg-brand-500"></span>
                            </label>
                          </td>
                          <td class="px-3 py-2 pt-4 font-semibold text-right tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(tab.neto(fila)) }}</td>
                          <td v-if="esEditable" class="px-2 py-2 text-center">
                            <button
                              type="button"
                              :title="`Quitar ${tab.singular.toLowerCase()}`"
                              :aria-label="`Quitar ${tab.singular.toLowerCase()}`"
                              class="inline-flex items-center p-2 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              @click="tab.quitar(index)">
                              <Trash2 class="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot v-if="tab.filas.length" class="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th scope="row" colspan="6" class="px-3 py-2.5 text-xs font-medium text-right uppercase text-gray-500 dark:text-gray-400">Subtotal {{ tab.label.toLowerCase() }}</th>
                          <td class="px-3 py-2.5 font-bold text-right tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(tab.subtotal) }}</td>
                          <td v-if="esEditable"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <button
                    v-if="esEditable"
                    type="button"
                    :title="`Añadir ${tab.singular.toLowerCase()}`"
                    class="add-row-btn flex items-center justify-center w-full gap-2 px-4 py-2.5 mt-3 text-sm font-medium border-2 border-dashed rounded-lg text-brand-700 border-brand-200 hover:bg-brand-50 hover:border-brand-500 focus:ring-4 focus:ring-brand-200 dark:text-brand-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
                    @click="tab.agregar">
                    <Plus class="w-4 h-4" />
                    Añadir {{ tab.singular.toLowerCase() }}
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          <!-- Observaciones -->
          <section :class="SECCION">
            <TextImprover
              v-model="form.observaciones"
              contexto="observaciones generales de una cotización de un taller"
              v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
            >
              <div class="flex items-center justify-between gap-2 mb-3">
                <h4 :class="TITULO_SECCION">
                  <MessageSquareText class="w-4 h-4" />
                  <label for="observaciones">Observaciones para el cliente</label>
                </h4>
                <button
                  v-if="esEditable"
                  type="button"
                  title="Mejorar el texto con IA"
                  :disabled="mejorando || !form.observaciones"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="mejorar"
                >
                  <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                  <Wand2 v-else class="w-4 h-4" />
                  {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                </button>
              </div>
              <textarea
                id="observaciones"
                v-model="form.observaciones"
                rows="4"
                maxlength="2000"
                :disabled="!esEditable"
                placeholder="Condiciones, garantías, notas para el cliente..."
                :class="[INPUT, '!p-2.5']"></textarea>
              <div class="flex items-start justify-between gap-3 mt-1.5">
                <div class="min-w-0">
                  <p v-if="error" class="text-sm text-red-600 dark:text-red-500">{{ error }}</p>
                  <div v-if="mejorado && !error" class="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-4 h-4" />
                    <p>Texto mejorado. Revisa antes de guardar.</p>
                    <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                  </div>
                </div>
                <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ (form.observaciones || '').length }}/2000</span>
              </div>
            </TextImprover>
          </section>
        </div>

        <aside class="lg:col-span-1">
          <div class="space-y-4 lg:sticky lg:top-4">
            <CotizacionTotales
              :subtotal-servicios="subtotalServicios"
              :subtotal-repuestos="subtotalRepuestos"
              :subtotal-neto="subtotal"
              :descuento="descuentoTotal"
              :base0="subtotalBase0"
              :base-gravada="subtotalBaseGravada"
              :iva="totalIva"
              :total="total"
              :n-servicios="servicios.length"
              :n-repuestos="repuestos.length"
            />
            <p v-if="opcionales" class="px-1 text-xs text-gray-500 dark:text-gray-400">
              {{ opcionales }} ítem{{ opcionales === 1 ? '' : 's' }} opcional{{ opcionales === 1 ? '' : 'es' }} incluido{{ opcionales === 1 ? '' : 's' }} en el total.
            </p>

            <CotizacionVigencia
              v-model="form.validez_dias"
              :desde="cotizacion?.fecha_envio || ''"
              :editable="esEditable"
              :opciones="VALIDEZ_OPCIONES"
              :mostrar-restante="estado === 'ENVIADA'"
            />

            <section v-if="fechaAceptacion" :class="SECCION">
              <h4 :class="[TITULO_SECCION, 'mb-3']">
                <UserCheck class="w-4 h-4" />
                Aceptación
              </h4>
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <component :is="iconoMetodoAceptacion" class="w-5 h-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ metodoAceptacionLabel || 'Aceptada' }}</p>
                  <p class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatFechaHora12(fechaAceptacion) }}</p>
                </div>
              </div>
            </section>

            <RelacionesFlujoEdit
              v-if="isEditMode && cotizacionId && relacionesCargadas"
              tipo-entidad="cotizacion"
              :entidad-id="cotizacionId"
              :relaciones="relacionesCotizacion"
              :puede-agregar="puedeAgregarRelacion"
              :al-vincular="vincularRelacion"
              :al-desvincular="desvincularRelacion"
            />
          </div>
        </aside>
      </div>
    </template>
  </div>

  <!-- Modal de transición de estado (no se cierra al hacer clic fuera) -->
  <div v-if="modal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-estado-title">
    <div class="fixed inset-0 bg-black/70" aria-hidden="true"></div>
    <div class="relative w-full max-w-md bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 id="modal-estado-title" class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <component
            :is="{ ENVIAR: Send, ACEPTAR: CheckCircle2, RECHAZAR: XCircle, REENVIAR: RotateCcw }[modal.tipo] || Send"
            class="w-5 h-5"
            :class="modal.tipo === 'RECHAZAR' ? 'text-red-600 dark:text-red-400' : 'text-brand-700 dark:text-brand-200'"
          />
          {{ TITULOS_MODAL[modal.tipo] }}
        </h3>
        <button
          type="button"
          aria-label="Cerrar"
          :disabled="modal.procesando"
          class="inline-flex items-center justify-center w-8 h-8 text-gray-400 rounded-lg hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
          @click="cerrarModal">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <p v-if="modal.tipo === 'ENVIAR'" class="text-sm text-gray-600 dark:text-gray-300">
          Se guardarán los cambios en pantalla y la cotización quedará marcada como <strong>Enviada al cliente</strong>.
          Su vigencia de {{ form.validez_dias }} días empieza a contar desde hoy. Podrá ajustarse o reenviarse hasta que el cliente responda.
        </p>
        <p v-else-if="modal.tipo === 'ACEPTAR'" class="text-sm text-gray-600 dark:text-gray-300">
          Indica cómo aceptó el cliente la cotización. Con la aceptación podrás convertirla en una orden de trabajo.
        </p>
        <p v-else-if="modal.tipo === 'RECHAZAR'" class="text-sm text-gray-600 dark:text-gray-300">
          La cotización quedará marcada como <strong>Rechazada</strong>. Podrás reenviarla más adelante si el cliente cambia de opinión.
        </p>
        <p v-else-if="modal.tipo === 'REENVIAR'" class="text-sm text-gray-600 dark:text-gray-300">
          La cotización volverá al estado <strong>Enviada al cliente</strong>.
        </p>

        <div v-if="modal.tipo === 'ACEPTAR'">
          <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Método de aceptación <span class="text-accent-500 dark:text-accent-400">*</span></p>
          <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de aceptación">
            <label
              v-for="metodo in METODOS_ACEPTACION"
              :key="metodo.value"
              class="flex items-center gap-2 p-3 text-sm border-2 rounded-lg cursor-pointer transition-colors"
              :class="modal.metodo === metodo.value
                ? 'border-brand-900 bg-brand-50 text-brand-900 dark:border-brand-300 dark:bg-brand-700/30 dark:text-white'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'"
            >
              <input v-model="modal.metodo" type="radio" :value="metodo.value" class="sr-only" />
              <component :is="ICONOS_METODO[metodo.value]" class="w-4 h-4 shrink-0" />
              {{ metodo.label }}
            </label>
          </div>
        </div>

        <Alert v-if="modal.error" type="error" :message="modal.error" dismissible @dismiss="modal.error = ''" />
      </div>

      <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          :disabled="modal.procesando"
          class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
          @click="cerrarModal">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="modal.procesando"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="modal.tipo === 'RECHAZAR' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:focus:ring-red-800' : 'bg-brand-900 hover:bg-brand-700 focus:ring-brand-500/30'"
          @click="confirmarModal"
        >
          <Loader2 v-if="modal.procesando" class="w-4 h-4 animate-spin" />
          <CheckCircle2 v-else class="w-4 h-4" />
          {{ modal.procesando ? 'Procesando...' : 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>

  <ConfirmModal
    v-model="mostrarModalGenerarOrden"
    title="Generar orden de trabajo"
    message="Se generará una orden de trabajo a partir de esta cotización aceptada."
    :icon="ArrowLeftRight"
    icon-class="text-brand-700 dark:text-brand-200"
    confirm-text="Generar orden"
    confirming-text="Generando..."
    variant="primary"
    :is-deleting="procesandoGeneracionOrden"
    @confirm="confirmarGenerarOrden"
  />

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientCreated"
  />

  <div
    v-if="showImageModal"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
    role="dialog"
    aria-label="Foto del vehículo"
    @click.self="cerrarFoto"
  >
    <button
      type="button"
      class="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      @click="cerrarFoto"
    >
      <X class="w-6 h-6" />
    </button>
    <img :src="previewImg" alt="Foto del vehículo" class="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
  </div>
</template>
