<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  CheckCircle2,
  ArrowLeft,
  FileText,
  Loader2,
  Send,
  Wand2,
  X,
  Plus,
  Package,
  Wrench,
  CircleDollarSign,
  IdCardIcon,
  Phone,
  Mail,
  TagIcon,
  Shapes,
  PaintBucket,
  Trash2,
  CalendarDays,
  ClipboardList,
  Store,
  UserCheck,
  ArrowLeftRight,
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
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
// FlowSteps temporalmente desactivado; conservar para reactivarlo más adelante.
// import FlowSteps from '../../../shared/components/FlowSteps.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
// import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
import ClientModal from '../../clientes/components/ClientModal.vue';
import { useAuthStore } from '../../auth/stores/authStore';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';

const urlParams = new URLSearchParams(window.location.search);
const cotizacionParamId = urlParams.get('id');
const inspeccionParamId = urlParams.get('inspeccion');

const isEditMode = Boolean(cotizacionParamId);
const inspeccionId = inspeccionParamId ? Number(inspeccionParamId) : null;

const VALIDEZ_OPCIONES = [7, 15, 30, 60];
const METODOS_ACEPTACION = [
  { value: 'PRESENCIAL', label: 'Presencial en taller' },
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEFONO', label: 'Teléfono' },
];

const isEditModeFlag = ref(isEditMode);
const cotizacionId = ref(cotizacionParamId ? Number(cotizacionParamId) : null);
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

const authStore = useAuthStore();
const tallerSesion = computed(() => authStore.user?.taller_nombre || '');

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
  createdAt.value = data.created_at || '';
  fechaAceptacion.value = data.fecha_aceptacion || null;
  metodoAceptacion.value = data.metodo_aceptacion || '';
  inspeccionOrigen.value = data.inspeccion_origen ? Number(data.inspeccion_origen) : null;
  recepcionOrigen.value = data.recepcion_origen ? Number(data.recepcion_origen) : null;
  inspeccionNumero.value = data.inspeccion_numero || '';
  recepcionNumero.value = data.recepcion_numero || '';
  ordenTrabajoNumero.value = data.orden_trabajo_numero || '';
  ordenGeneradaNumero.value = data.orden_generada_numero || '';
  inspeccionTipo.value = data.inspeccion_tipo || '';
  form.validez_dias = Number(data.validez_dias) || 15;
  form.observaciones = data.observaciones || '';
  form.cliente = data.cliente
    ? { id: Number(data.cliente), nombre: data.cliente_nombre || '' }
    : null;
  form.vehiculo = data.vehiculo
    ? {
        id: Number(data.vehiculo),
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
    cotizacionId.value = Number(id);
    isEditModeFlag.value = true;
    aplicarCotizacion(data);
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function crearCotizacionDesdeInspeccion() {
  if (isCreando.value) return;
  isCreando.value = true;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const data = await request(`/api/ordenes/inspecciones/${inspeccionId}/`);
    if (data.cotizacion_activa_id) {
      window.location.replace(`/crud/cotizaciones/editar/?id=${encodeURIComponent(data.cotizacion_activa_id)}`);
      return;
    }
    const clienteId = data.recepcion?.cliente?.id || null;
    const vehiculoId = data.recepcion?.vehiculo?.id || null;
    form.clienteSearch = data.recepcion?.cliente?.nombre || '';
    form.vehiculoSearch = data.recepcion?.vehiculo?.placa || '';

    prefillDesdeInspeccion(data);

    const creada = await cotizacionesService.create({
      cliente: clienteId,
      vehiculo: vehiculoId,
      inspeccion_origen: inspeccionId,
      recepcion_origen: data.recepcion?.id || null,
      validez_dias: 15,
      observaciones: sanitizeObservaciones(
        data.recepcion?.motivo_ingreso ? `Motivo de ingreso: ${data.recepcion.motivo_ingreso}` : ''
      ).slice(0, 2000),
    });
    cotizacionId.value = creada && creada.id;
    isEditModeFlag.value = true;
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
function quitarServicio(index) {
  const removed = servicios.value.splice(index, 1)[0];
  if (removed && removed.id) serviciosEliminados.value.push(removed.id);
}

function quitarRepuesto(index) {
  const removed = repuestos.value.splice(index, 1)[0];
  if (removed && removed.id) repuestosEliminados.value.push(removed.id);
}

async function guardarDetalles(idCotizacion) {
  const cotizacionRef = Number(idCotizacion);
  if (!cotizacionRef) return;
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

  for (const s of servicios.value) await guardarServicio(s);
  for (const r of repuestos.value) await guardarRepuesto(r);
  for (const id of serviciosEliminados.value) {
    try {
      await cotizacionesService.deleteServicio(id);
    } catch (error) {
      errores.push(`Servicio eliminado (#${id})`);
    }
  }
  for (const id of repuestosEliminados.value) {
    try {
      await cotizacionesService.deleteRepuesto(id);
    } catch (error) {
      errores.push(`Repuesto eliminado (#${id})`);
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

async function confirmarModal() {
  if (!cotizacionId.value || modal.procesando) return;
  modal.procesando = true;
  modal.error = '';
  try {
    if (modal.tipo === 'ENVIAR') {
      await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
      successMessage.value = 'Cotización enviada al cliente.';
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
  isCreando.value = true;
  try {
    const creada = await cotizacionesService.create({
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
    const teniaDetalles = servicios.value.length > 0 || repuestos.value.length > 0;
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
async function submit() {
  if (!esEditable.value || !cotizacionId.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};

  const payload = {
    validez_dias: Number(form.validez_dias) || 15,
    observaciones: sanitizeObservaciones(form.observaciones || '').slice(0, 2000).trim(),
    asesor: form.asesor || null,
  };

  if (!bloqueadoClienteVehiculo.value) {
    if (!validateForm()) {
      errorMessage.value = 'Completa correctamente los campos de: Información General';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    payload.cliente = form.cliente.id;
    payload.vehiculo = form.vehiculo.id;
  }

  isSaving.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, payload);
    await guardarDetalles(cotizacionId.value);
    await cargarCotizacion(cotizacionId.value);
    successMessage.value = 'Cotización actualizada correctamente.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  } finally {
    isSaving.value = false;
  }
}

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
onMounted(() => {
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
  if (isEditMode && cotizacionId.value) {
    cargarCotizacion(cotizacionId.value);
  } else if (inspeccionId) {
    crearCotizacionDesdeInspeccion();
  } else {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/cotizaciones/" class="hover:text-primary-600">Cotizaciones</a></li>
        <li v-if="inspeccionOrigen" class="text-gray-400">/ <a :href="`/crud/inspecciones/editar/?id=${inspeccionOrigen}`" class="hover:text-primary-600">Inspección</a></li>
        <li class="text-gray-400">/ {{ isEditModeFlag ? 'Editar' : 'Nueva' }} Cotización</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <a href="/crud/cotizaciones/" title="Volver al listado" class="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
          <ArrowLeft class="w-5 h-5" />
        </a>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          {{ isEditModeFlag ? (numeroCotizacion ? `Cotización ${numeroCotizacion}` : 'Cotización') : 'Nueva Cotización' }}
        </h1>
      </div>
      <EstadoCotizacionBadge :estado="estado" size="lg" />
      <div class="flex items-center ml-auto gap-2 flex-wrap">
        <template v-if="isEditModeFlag && cotizacionId">
        <FormSaveActions
          v-if="esEditable"
          :is-loading="isSaving"
          :is-edit-mode="isEditModeFlag"
          cancel-href="/crud/cotizaciones/"
          :on-submit="submit"/>
        <button
          v-if="estado === 'ENVIADA'"
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium font-semibold text-white rounded-base bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="abrirModal('ACEPTAR')">
          <CheckCircle2 class="w-4 h-4 mr-2" />
          Marcar aceptada
        </button>
        <button
          v-if="estado === 'ENVIADA'"
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium font-semibold text-white rounded-base bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-800"
          @click="abrirModal('RECHAZAR')"
        >
          <X class="w-4 h-4 mr-2" />
          Marcar rechazada
        </button>
        <button
          v-if="estado === 'PENDIENTE'"
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium font-semibold text-white rounded-base bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="abrirModal('ENVIAR')"
        >
          <Send class="w-4 h-4 mr-2" />
          Enviar Cliente
        </button>
        <button
          v-if="estado === 'RECHAZADA'"
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium font-semibold text-white rounded-base bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 dark:bg-primary-700 dark:hover:bg-primary-800"
          @click="abrirModal('REENVIAR')"
        >
          <Send class="w-4 h-4 mr-2" />
          Reenviar al cliente
        </button>
        <button
          v-if="estado === 'ACEPTADA'"
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium font-semibold text-white rounded-base bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="mostrarModalGenerarOrden = true"
        >
          <ArrowLeftRight class="w-4 h-4 mr-2" />
          Generar orden de trabajo
        </button>
        <PdfExportButton
          :descargador="descargarPdf"
          title="Descargar en PDF la cotización guardada"
          :disabled="isSaving"
          @error="errorMessage = $event"
        />
        </template>
        <FormSaveActions
          v-if="!isEditModeFlag && !inspeccionOrigen"
          :is-loading="isCreando"
          cancel-href="/crud/cotizaciones/"
          :on-submit="crearCotizacionIndependiente"
        />
      </div>
    </div>
  </div>

  <div class="p-4">
    <!-- FlowSteps temporalmente desactivado.
    <div v-if="cotizacion" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div>
    -->
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 class="w-6 h-6 animate-spin" />
          <span>{{ isCreando ? 'Creando la cotización...' : 'Cargando cotización...' }}</span>
        </div>
      </div>

      <template v-else>
        <!-- Información General: cliente / vehículo / asesor -->
        <div class="mb-6">
          <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-2">
                <FileText class="w-5 h-5 text-gray-900 dark:text-white" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Información General</h2>
              </div>
              <div class="flex items-center gap-2">
                <label for="validez_dias" class="text-sm font-medium text-gray-900 dark:text-white">Validez</label>
                <select id="validez_dias" v-model="form.validez_dias" :disabled="!esEditable" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-6 py-2 shadow-xs">
                  <option v-for="dias in VALIDEZ_OPCIONES" :key="dias" :value="dias">{{ dias }} días</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr_1fr]">
              <!-- Cliente -->
              <div class="min-w-0">
                <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Cliente <span v-if="!bloqueadoClienteVehiculo" class="text-accent-500">*</span>
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
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.cliente_identificacion || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.cliente_telefono || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.cliente_email || '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Vehículo -->
              <div class="relative min-w-0">
                <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Vehículo <span v-if="!bloqueadoClienteVehiculo" class="text-accent-500">*</span>
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
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <TagIcon class="w-3.5 h-3.5 shrink-0" /> Marca:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.vehiculo?.marca || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.vehiculo?.modelo || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ form.vehiculo_color || '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Asesor (reemplaza Inspector) -->
              <div class="min-w-0">
                <label for="asesor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Asesor <span class="text-accent-500">*</span>
                </label>
                <EmpleadoSearchSelect
                  v-if="esEditable"
                  id="asesor"
                  v-model="asesorSearch"
                  placeholder="Buscar asesor..."
                  @select="selectAsesor"
                  @clear="clearAsesor"
                />
                <div v-else class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  {{ asesorSearch || cotizacion?.asesor_nombre || '—' }}
                </div>
                <div class="mt-3 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ asesorDetalles?.identificacion || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ asesorDetalles?.telefono || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                    <span class="truncate font-bold text-gray-900 dark:text-white">{{ asesorDetalles?.email || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Metadatos de la cotización (siempre visibles) -->
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 mt-4 text-sm text-gray-600 border-t border-gray-200 dark:border-gray-600 dark:text-gray-300">
              <span class="inline-flex items-center gap-1.5" title="Fecha y hora de emisión">
                <CalendarDays class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span class="font-medium text-gray-900 dark:text-white">Emisión:</span>
                {{ fechaEmision }}
              </span>
              <span class="inline-flex items-center gap-1.5 md:border-l md:border-gray-200 md:pl-6 md:dark:border-gray-600" title="Taller donde se creó la cotización">
                <Store class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span class="font-medium text-gray-900 dark:text-white">Taller:</span>
                {{ sucursalNombre || tallerSesion || '—' }}
              </span>
              <span class="inline-flex items-center gap-1.5 md:border-l md:border-gray-200 md:pl-6 md:dark:border-gray-600" title="Origen de la cotización">
                <ClipboardList class="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span class="font-medium text-gray-900 dark:text-white">Origen:</span>
                <template v-if="inspeccionOrigen">
                  <a
                    :href="`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccionOrigen)}`"
                    class="font-medium text-primary-blue-700 hover:underline dark:text-primary-blue-400">Cod Inspección {{ inspeccionNumero || `#${inspeccionOrigen}` }}</a>
                  <span v-if="recepcionOrigen" class="font-medium text-primary-blue-700 dark:text-primary-blue-400">
                    / Recepción {{ recepcionNumero || `#${recepcionOrigen}` }}
                  </span>
                </template>
                <span v-else-if="recepcionOrigen" class="font-medium text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                  Recepción {{ recepcionNumero || `#${recepcionOrigen}` }}
                </span>
                <span v-else>Independiente</span>
              </span>
              <span
                v-if="fechaAceptacion"
                class="inline-flex basis-full items-center gap-1.5 pt-1"
                title="Aceptación de la cotización por parte del cliente">
                <CheckCircle2 class="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                <span class="font-medium text-gray-900 dark:text-white">Aceptada:</span>
                {{ formatFechaHora12(fechaAceptacion) }} -
                <component :is="iconoMetodoAceptacion" class="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                {{ metodoAceptacionLabel || '—' }}
              </span>
            </div>
          </div>
        </div>

        <fieldset :disabled="!esEditable" class="grid grid-cols-1 gap-8">
          <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex flex-wrap -mb-px">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'servicios' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'servicios'">
                  <Package class="w-4 h-4" />
                  Servicios
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'repuestos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'repuestos'">
                  <Wrench class="w-4 h-4" />
                  Repuestos
                </button>
              </nav>
            </div>

            <div class="p-4 space-y-1">
              <!-- Servicios -->
              <div v-show="activeTab === 'servicios'" class="col-span-1">
                <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                  <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                    <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th class="px-4 py-3">Servicio</th>
                        <th class="px-4 py-3 w-24 text-center">Opcional</th>
                        <th class="px-4 py-3 w-24 text-center">Horas</th>
                        <th class="px-4 py-3 w-36 text-center">Precio unitario</th>
                        <th class="px-4 py-3 w-28 text-center">Descuento</th>
                        <th class="px-4 py-3 w-28 text-center">IVA</th>
                        <th class="px-4 py-3 w-32 text-center">Neto</th>
                        <th v-if="esEditable" class="px-4 py-3 w-14 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!servicios.length">
                        <td colspan="8" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay servicios de mano de obra.</td>
                      </tr>
                      <tr v-for="(servicio, index) in servicios" :key="servicio.sufijo || servicio.id" class="border-t border-gray-200 dark:border-gray-600">
                        <td class="px-4 py-2.5">
                          <div class="relative">
                            <CatalogoSelect
                              :input-id="`svc-desc-${servicio.sufijo}`"
                              v-model="servicio.descripcion"
                              :catalogo="catalogoServicios"
                              placeholder="Busca y selecciona..."
                              :disabled="!esEditable"
                              mensaje-sin-resultados="Sin coincidencias. Puedes escribir un servicio libre."
                              @select="(item) => seleccionarServicio(item, servicio)"/>
                          </div>
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="servicio.es_opcional" type="checkbox" class="w-4 h-4 text-primary-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-blue-500 focus:ring-2" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5">
                          <input :id="`svc-horas-${servicio.sufijo}`" v-model="servicio.horas_estimadas" type="number" min="0" step="0.5" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="servicio.precio_unitario" type="number" min="0" step="0.01" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="servicio.descuento" type="number" min="0" step="0.01" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <select v-model="servicio.iva_porcentaje" 
                            class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable">
                            <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                          </select>
                        </td>
                        <td class="px-4 py-2.5 font-medium text-center">$ {{ formatMoney(netoServicio(servicio)) }}</td>
                        <td v-if="esEditable" class="px-4 py-2.5 text-center">
                          <button type="button" title="Quitar servicio" aria-label="Quitar servicio" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarServicio(index)">
                            <Trash2 class="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="flex justify-end mt-3">
                  <button
                    v-if="esEditable"
                    type="button"
                    title="Añadir servicio o mano de obra"
                    aria-label="Añadir servicio"
                    class="add-row-btn inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary-blue-700 text-white hover:bg-primary-blue-800 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarServicioVacio">
                    <Plus class="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>

              <!-- Repuestos -->
              <div v-show="activeTab === 'repuestos'" class="col-span-1">
                <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                  <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                    <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th class="px-4 py-3">Repuesto</th>
                        <th class="px-4 py-3 w-28 text-center">Opcional</th>
                        <th class="px-4 py-3 w-24 text-center">Cant.</th>
                        <th class="px-4 py-3 w-36 text-center">Precio unit.</th>
                        <th class="px-4 py-3 w-28 text-center">Descuento</th>
                        <th class="px-4 py-3 w-28 text-center">IVA</th>
                        <th class="px-4 py-3 w-32 text-center">Neto</th>
                        <th v-if="esEditable" class="px-4 py-3 w-14 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!repuestos.length">
                        <td colspan="8" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay repuestos o materiales.</td>
                      </tr>
                      <tr v-for="(repuesto, index) in repuestos" :key="repuesto.sufijo || repuesto.id" class="border-t border-gray-200 dark:border-gray-600">
                        <td class="px-4 py-2.5">
                          <div class="relative">
                            <CatalogoSelect
                              :input-id="`rpt-desc-${repuesto.sufijo}`"
                              v-model="repuesto.descripcion"
                              :catalogo="catalogoRepuestos"
                              placeholder="Busca y selecciona..."
                              :disabled="!esEditable"
                              mostrar-stock
                              mensaje-sin-resultados="Sin coincidencias. Puedes escribir un repuesto libre."
                              @select="(item) => seleccionarRepuesto(item, repuesto)"/>
                          </div>
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="repuesto.es_opcional" type="checkbox" class="w-4 h-4 text-primary-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-blue-500 focus:ring-2" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input :id="`rpt-cant-${repuesto.sufijo}`" v-model="repuesto.cantidad" type="number" min="1" step="1" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="repuesto.precio_unitario_referencial" type="number" min="0" step="0.01" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="repuesto.descuento" type="number" min="0" step="0.01" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <select v-model="repuesto.iva_porcentaje" class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" :disabled="!esEditable">
                            <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                          </select>
                        </td>
                        <td class="px-4 py-2.5 font-medium text-center">$ {{ formatMoney(netoRepuesto(repuesto)) }}</td>
                        <td v-if="esEditable" class="px-4 py-2.5 text-center">
                          <button type="button" title="Quitar repuesto" aria-label="Quitar repuesto" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarRepuesto(index)">
                            <Trash2 class="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="flex justify-end mt-3">
                  <button
                    v-if="esEditable"
                    type="button"
                    title="Añadir repuesto o material"
                    aria-label="Añadir repuesto"
                    class="add-row-btn inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary-blue-700 text-white hover:bg-primary-blue-800 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarRepuestoVacio">
                    <Plus class="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>
          </div>
        </div>
        </fieldset>

        <!-- ===== OBSERVACIONES + RESUMEN (estilo CotizacionDetail) ===== -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Columna izquierda: Observaciones -->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <TextImprover
              v-model="form.observaciones"
              contexto="observaciones generales de una cotización de un taller"
              v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <label for="observaciones" class="block text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
                <button
                  v-if="esEditable"
                  type="button"
                  title="Mejorar el texto con IA"
                  :disabled="mejorando"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="mejorar"
                >
                  <Wand2 v-if="!mejorando" class="w-4 h-4" />
                  <Loader2 v-else class="w-4 h-4 animate-spin" />
                  {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                </button>
              </div>
              <textarea id="observaciones" v-model="form.observaciones" rows="6" maxlength="2000" placeholder="Condiciones, garantías, notas para el cliente..." class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body"></textarea>
              <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ error }}</p>
              <div v-if="mejorado && !error" class="mt-2 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 class="w-5 h-5 shrink-0" />
                <div class="flex flex-wrap items-center gap-x-2">
                  <p>Texto mejorado. Revisa antes de guardar.</p>
                  <button v-if="tieneOriginal" type="button" class="text-sm font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                </div>
              </div>
            </TextImprover>
          </div>

          <!-- Columna derecha: Resumen -->
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-4">
              <CircleDollarSign class="w-5 h-5 text-gray-900 dark:text-white" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Resumen</h3>
            </div>
            <div class="p-5 space-y-2 text-sm rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-700/40 dark:border-gray-600/60">
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal servicios</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalServicios) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal repuestos / materiales</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalRepuestos) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal neto</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Descuento total</span>
                <span class="font-medium tabular-nums text-accent-600 dark:text-accent-400">$ {{ formatMoney(descuentoTotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal base 0%</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalBase0) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal base gravada</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(subtotalBaseGravada) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>IVA total</span>
                <span class="font-medium tabular-nums">$ {{ formatMoney(totalIva) }}</span>
              </div>
              <div class="flex items-center justify-between pt-3 mt-3 text-base font-bold border-t border-gray-200 text-gray-900 dark:border-gray-600 dark:text-white">
                <span>Total</span>
                <span class="tabular-nums">$ {{ formatMoney(total) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Modal de transición de estado -->
  <div v-if="modal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" @click.self="cerrarModal">
    <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ modal.tipo === 'ENVIAR' ? 'Enviar cotización al cliente' : modal.tipo === 'ACEPTAR' ? 'Marcar cotización como aceptada' : modal.tipo === 'RECHAZAR' ? 'Marcar cotización como rechazada' : 'Reenviar cotización al cliente' }}
        </h3>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="cerrarModal">
          <X class="w-5 h-5" />
        </button>
      </div>

      <p v-if="modal.tipo === 'ENVIAR'" class="text-sm text-gray-600 dark:text-gray-300">
        La cotización quedará marcada como <strong>Enviada al cliente</strong>. Podrá ajustarse o reenviarse hasta que el cliente responda.
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

      <div v-if="modal.tipo === 'ACEPTAR'" class="mt-4">
        <label class="block text-sm font-medium text-gray-900 mb-2 dark:text-white">Método de aceptación *</label>
        <div class="space-y-2">
          <label v-for="metodo in METODOS_ACEPTACION" :key="metodo.value" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="modal.metodo" type="radio" :value="metodo.value" class="w-4 h-4 text-primary-blue-600" />
            {{ metodo.label }}
          </label>
        </div>
      </div>

      <Alert v-if="modal.error" type="error" :message="modal.error" dismissible @dismiss="modal.error = ''" />

      <div class="flex items-center justify-end gap-3 mt-6">
        <button type="button" class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300" :disabled="modal.procesando" @click="cerrarModal">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="modal.procesando"
          class="inline-flex items-center px-4 py-2 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700 disabled:opacity-50"
          @click="confirmarModal"
        >
          <Loader2 v-if="modal.procesando" class="w-4 h-4 mr-2 animate-spin" />
          <CheckCircle2 v-else class="w-4 h-4 mr-2" />
          {{ modal.procesando ? 'Procesando...' : 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Confirmación para generar orden de trabajo -->
  <ConfirmModal
    v-model="mostrarModalGenerarOrden"
    title="Generar orden de trabajo"
    message="Se generará una orden de trabajo a partir de esta cotización aceptada."
    :icon="ArrowLeftRight"
    icon-class="text-green-600 dark:text-green-400"
    confirm-text="Generar orden"
    confirming-text="Generando..."
    confirm-class="bg-green-600 hover:bg-green-700 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
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