<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import {
  Wand2, Loader2, Plus, Trash2, Camera, Car, ChevronsDown, Equal, ChevronsUp, Siren, Minus,
  HardHat, Wrench, Package, Check, CircleAlert, ArrowLeft, ArrowRight, ListChecks, CheckCircle2,
  CircleStop, IdCardIcon, TagIcon, Shapes, PaintBucket, Phone, Mail, UserRound, Building2,
  CalendarClock, ReceiptText, FileText, Stethoscope, Hourglass, CheckCheck, RotateCcw, Ban, X,
  NotebookPen, Gauge, LoaderCircle, ShieldCheck,
} from 'lucide-vue-next';
import { IconClockPlay, IconClockCheck, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/env';
import { ordenesService } from '../services/ordenesService';
import { PRIORIDADES_ORDEN, getEstadoOrden } from '../constants/estadosOrden';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import PhotoUploadGrid from '../../../shared/components/PhotoUploadGrid.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import EstadoOrdenBadge from './EstadoOrdenBadge.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';
import RelacionesFlujoEdit from '../../../shared/components/RelacionesFlujoEdit.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { useSucursalDocumento } from '../../../shared/composables/useSucursalDocumento';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';
import {
  TIPOS_TRABAJO_OPCIONES,
  normalizarTipoTrabajo,
} from '../../../shared/config/tiposTrabajo';
import {
  IVA_DEFECTO,
  IVA_OPCIONES,
  ivaLinea,
  netoLinea,
  normalizarIva,
  round2,
} from '../../../shared/utils/impuestos';

const orden = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');
const servicios = ref([]);
const repuestos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);
const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);

const FOTO_MAX = 5;
const fotosOt = ref([]);
const photosGrid = ref(null);

const ordenId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const isEditMode = computed(() => Boolean(ordenId.value));

const tituloPagina = computed(() => (isEditMode.value ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'));

const breadcrumb = computed(() => [
  { label: 'Inicio', href: '/' },
  { label: 'Órdenes', href: '/crud/ordenes/' },
  { label: tituloPagina.value },
]);

const ordenPersistidaId = ref(null);

// Relaciones de flujo (cita, recepción, inspección y cotización ligadas por FK).
const RELACIONES_VACIAS = () => ({ cita: [], recepcion: [], inspeccion: [], cotizacion: [] });
const PUEDE_AGREGAR = { cita: true, recepcion: true, inspeccion: true, cotizacion: true };
const relacionesOrden = ref(RELACIONES_VACIAS());
const puedeAgregarRelacion = ref({ ...PUEDE_AGREGAR });
const relacionesCargadas = ref(false);
const photoEntityId = computed(() => (isEditMode.value ? ordenId.value : ordenPersistidaId.value));

const clienteSeleccionado = ref(null);
const vehiculoSeleccionado = ref(null);
const clienteSearch = ref('');
const vehiculoSearch = ref('');
const mecanicoSearch = ref('');
const showClientCreateModal = ref(false);
const formErrors = ref({ cliente: '', vehiculo: '' });

const {
  tallerId: tallerSucursalId,
  error: tallerSucursalError,
  mostrar: mostrarSucursal,
  sucursal: sucursalDocumento,
  cargarSucursal,
  validar: validarSucursal,
  limpiarError: limpiarErrorSucursal,
} = useSucursalDocumento();
const tallerSucursalNombre = computed(() => orden.value?.sucursal_nombre || '');

// Mismos estilos de tarjeta que recepción e inspección (línea gráfica común del flujo).
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

function seleccionarCliente(clienteObj) {
  clienteSeleccionado.value = clienteObj || null;
  formErrors.value.cliente = '';
  vehiculoSeleccionado.value = null;
  vehiculoSearch.value = '';
}

function limpiarCliente() {
  clienteSeleccionado.value = null;
  formErrors.value.cliente = '';
  vehiculoSeleccionado.value = null;
  vehiculoSearch.value = '';
}

function seleccionarVehiculo(vehiculoObj) {
  vehiculoSeleccionado.value = vehiculoObj || null;
  formErrors.value.vehiculo = '';
}

function onClientCreated(clienteObj) {
  showClientCreateModal.value = false;
  if (clienteObj && clienteObj.id) {
    seleccionarCliente(clienteObj);
  }
}

function limpiarVehiculo() {
  vehiculoSeleccionado.value = null;
  vehiculoSearch.value = '';
  formErrors.value.vehiculo = '';
}

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function nombreEmpleado(empleado) {
  const user = empleado?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    || user.username
    || user.email
    || '';
}

// Empleados de la empresa: dan el rol del mecánico asignado.
const empleados = ref([]);
const mecanicoSeleccionado = ref(null);

async function loadEmpleados() {
  try {
    const data = await request('/api/auth/empleados/?page=1&page_size=100');
    empleados.value = Array.isArray(data?.results) ? data.results : [];
  } catch (err) {
    empleados.value = [];
  }
}

const mecanicoInfo = computed(() => {
  if (mecanicoSeleccionado.value) return mecanicoSeleccionado.value;
  if (!form.value.mecanico_principal) return null;
  return empleados.value.find(
    (empleado) => String(empleado.user?.id ?? '') === String(form.value.mecanico_principal)
  ) || null;
});

function seleccionarMecanico(empleado) {
  mecanicoSeleccionado.value = empleado || null;
  form.value.mecanico_principal = empleado?.user?.id ? String(empleado.user.id) : '';
  mecanicoSearch.value = nombreEmpleado(empleado);
}

function limpiarMecanico() {
  mecanicoSeleccionado.value = null;
  form.value.mecanico_principal = '';
  mecanicoSearch.value = '';
}

const form = ref({
  estado: 'PENDIENTE',
  prioridad: 'MEDIA',
  tipo_trabajo: 'MANTENIMIENTO',
  mecanico_principal: '',
  fecha_entrega: '',
  observaciones: '',
  motivo_espera: '',
});

const PRIORIDAD_BADGES = {
  BAJA: { label: 'Baja', icon: ChevronsDown, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  MEDIA: { label: 'Media', icon: Equal, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ALTA: { label: 'Alta', icon: ChevronsUp, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  URGENTE: { label: 'Urgente', icon: Siren, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const prioridadConfig = (prioridad) =>
  PRIORIDAD_BADGES[prioridad] || { label: prioridad || '—', icon: Minus, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };

const prioridadBadge = computed(() => prioridadConfig(form.value.prioridad));

const TIPOS = TIPOS_TRABAJO_OPCIONES;

function brutoServicio(s) {
  return (Number(s.horas_aplicadas) || 0) * (Number(s.precio_unitario) || 0);
}

function netoServicio(s) {
  return netoLinea(brutoServicio(s), s.descuento);
}

function brutoRepuesto(r) {
  return (Number(r.cantidad) || 0) * (Number(r.precio_unitario) || 0);
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
const subtotalNeto = computed(() => round2(subtotalServicios.value + subtotalRepuestos.value));
const subtotalBase0 = computed(() =>
  round2(lineasFiscales.value.filter((l) => l.tasa === 0).reduce((acc, l) => acc + l.neto, 0))
);
const subtotalBaseGravada = computed(() =>
  round2(lineasFiscales.value.filter((l) => l.tasa > 0).reduce((acc, l) => acc + l.neto, 0))
);
const montoIva = computed(() =>
  round2(lineasFiscales.value.reduce((acc, l) => acc + l.montoIva, 0))
);
const totalOt = computed(() => round2(subtotalNeto.value + montoIva.value));

const cliente = computed(() => clienteSeleccionado.value || null);
const vehiculo = computed(() => vehiculoSeleccionado.value || null);

function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() => resolveMediaUrl(vehiculo.value?.imagen));

const inspeccion = computed(() => orden.value?.inspeccion || null);
const recepciones = computed(() => orden.value?.recepciones || []);

/**
 * Documento del que viene la orden (cotización aprobada, o en su defecto la
 * inspección o la recepción). Con origen, cliente y vehículo quedan fijados.
 */
const origen = computed(() => {
  const ord = orden.value;
  if (!ord) return null;
  if (ord.cotizacion_origen) {
    return {
      etiqueta: 'Viene de la cotización',
      numero: ord.cotizacion_origen_numero,
      href: `/crud/cotizaciones/ver/?id=${encodeURIComponent(ord.cotizacion_origen)}`,
      icon: ReceiptText,
    };
  }
  if (inspeccion.value?.id) {
    return {
      etiqueta: 'Viene de la inspección',
      numero: inspeccion.value.numero_inspeccion,
      href: `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccion.value.id)}`,
      icon: Stethoscope,
    };
  }
  const rec = recepciones.value[0];
  if (rec?.id) {
    return {
      etiqueta: 'Viene de la recepción',
      numero: rec.numero_recepcion,
      href: `/crud/recepciones/ver/?id=${encodeURIComponent(rec.id)}`,
      icon: FileText,
    };
  }
  return null;
});

const partesFijas = computed(() => Boolean(origen.value && cliente.value && vehiculo.value));

const inspeccionHref = computed(() => (
  inspeccion.value?.id ? `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccion.value.id)}` : ''
));

const dtcLista = computed(() => (inspeccion.value?.codigos_dtc || '')
  .split(/[\s,;]+/)
  .map((codigo) => codigo.trim().toUpperCase())
  .filter(Boolean));

const mostrarDiagnostico = ref(true);

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const fechaIngresoDisplay = computed(() => {
  if (!isEditMode.value) return '';
  return formatDate(orden.value?.fecha_ingreso || orden.value?.created_at);
});

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function loadCatalogo() {
  request('/api/servicios/opciones/').then((data) => {
    catalogoServicios.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoServicios.value = []; });
  request('/api/repuestos/opciones/').then((data) => {
    catalogoRepuestos.value = data && data.results ? data.results : [];
  }).catch(() => { catalogoRepuestos.value = []; });
}

function nuevaFilaServicio() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    descripcion: '',
    horas_aplicadas: '1.00',
    precio_unitario: '0.00',
    descuento: '0.00',
    iva_porcentaje: IVA_DEFECTO,
    completado: false,
  };
}

function nuevaFilaRepuesto() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    codigo_repuesto: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario: '0.00',
    descuento: '0.00',
    iva_porcentaje: IVA_DEFECTO,
  };
}

function formatearItem(codigo, nombre) {
  if (!codigo) return nombre || '';
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

function agregarServicioVacio() {
  const fila = nuevaFilaServicio();
  servicios.value.push(fila);
  focusInput(`svc-desc-${fila.sufijo}`);
}

function agregarRepuestoVacio() {
  const fila = nuevaFilaRepuesto();
  repuestos.value.push(fila);
  focusInput(`rpt-desc-${fila.sufijo}`);
}

function seleccionarServicio(item, fila) {
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.horas_aplicadas = '1.00';
  fila.precio_unitario = String(item.precio_referencial ?? '0.00');
  fila.descuento = '0.00';
  fila.iva_porcentaje = normalizarIva(item.iva_porcentaje_defecto);
  focusInput(`svc-cant-${fila.sufijo}`);
}

function seleccionarRepuesto(item, fila) {
  fila.codigo_repuesto = item.codigo || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.cantidad = '1';
  fila.precio_unitario = String(item.precio_venta ?? '0.00');
  fila.descuento = '0.00';
  fila.iva_porcentaje = normalizarIva(item.iva_porcentaje_defecto);
  focusInput(`rpt-cant-${fila.sufijo}`);
}

function quitarServicio(index) {
  const removed = servicios.value.splice(index, 1)[0];
  if (removed && removed.id) serviciosEliminados.value.push(removed.id);
}

function quitarRepuesto(index) {
  const removed = repuestos.value.splice(index, 1)[0];
  if (removed && removed.id) repuestosEliminados.value.push(removed.id);
}

function mapearServicio(s) {
  return {
    id: s.id ?? null,
    sufijo: Date.now() + Math.random(),
    descripcion: s.descripcion || '',
    horas_aplicadas: String(s.horas_aplicadas ?? '1.00'),
    precio_unitario: String(s.precio_unitario ?? '0.00'),
    descuento: String(s.descuento ?? '0.00'),
    iva_porcentaje: normalizarIva(s.iva_porcentaje),
    completado: Boolean(s.completado),
  };
}

function mapearRepuesto(r) {
  return {
    id: r.id ?? null,
    sufijo: Date.now() + Math.random(),
    codigo_repuesto: r.codigo_repuesto || '',
    descripcion: r.descripcion || '',
    cantidad: String(r.cantidad ?? '1'),
    precio_unitario: String(r.precio_unitario ?? '0.00'),
    descuento: String(r.descuento ?? '0.00'),
    iva_porcentaje: normalizarIva(r.iva_porcentaje),
  };
}

function aplicarOrden(data) {
  orden.value = data;
  cargarSucursal(data.sucursal);
  servicios.value = (data.servicios || []).map(mapearServicio);
  repuestos.value = (data.repuestos || []).map(mapearRepuesto);
  fotosOt.value = (data.fotos || []).map((f) => ({
    id: f.id,
    file: null,
    preview: null,
    url: f.imagen,
    miniatura: f.miniatura,
    descripcion: f.descripcion || '',
    descripcionOriginal: f.descripcion || '',
  }));
  form.value = {
    estado: data.estado || 'PENDIENTE',
    prioridad: data.prioridad || 'MEDIA',
    tipo_trabajo: normalizarTipoTrabajo(data.tipo_trabajo) || 'MANTENIMIENTO',
    mecanico_principal: data.mecanico_principal || '',
    fecha_entrega: toDateTimeLocal(data.fecha_entrega),
    observaciones: data.observaciones || '',
    motivo_espera: data.motivo_espera || '',
  };
  clienteSearch.value = data.cliente?.nombre || '';
  clienteSeleccionado.value = data.cliente || null;
  vehiculoSearch.value = data.vehiculo?.placa ? formatPlaca(data.vehiculo.placa) : '';
  vehiculoSeleccionado.value = data.vehiculo || null;
  mecanicoSearch.value = data.mecanico_nombre || '';
}

async function guardarDetalles(idOrden) {
  const ordenRef = idOrden ? String(idOrden) : '';
  if (!ordenRef) throw new Error('No se pudo identificar la orden para guardar sus detalles.');
  const errores = [];

  for (const s of servicios.value) {
    const payload = {
      descripcion: sanitizeObservaciones(s.descripcion || ''),
      horas_aplicadas: String(s.horas_aplicadas ?? '1.00'),
      precio_unitario: String(s.precio_unitario ?? '0.00'),
      descuento: String(s.descuento ?? '0.00'),
      iva_porcentaje: normalizarIva(s.iva_porcentaje),
      completado: Boolean(s.completado),
    };
    try {
      if (s.id) {
        await ordenesService.updateServicio(s.id, payload);
      } else {
        const creado = await ordenesService.createServicio({ ...payload, orden_trabajo: ordenRef });
        s.id = creado && creado.id;
      }
    } catch (err) {
      errores.push(`Servicio "${s.descripcion || 'sin descripción'}"`);
    }
  }

  for (const r of repuestos.value) {
    const payload = {
      codigo_repuesto: sanitizeObservaciones(r.codigo_repuesto || ''),
      descripcion: sanitizeObservaciones(r.descripcion || ''),
      cantidad: String(r.cantidad ?? '1'),
      precio_unitario: String(r.precio_unitario ?? '0.00'),
      descuento: String(r.descuento ?? '0.00'),
      iva_porcentaje: normalizarIva(r.iva_porcentaje),
    };
    try {
      if (r.id) {
        await ordenesService.updateRepuesto(r.id, payload);
      } else {
        const creado = await ordenesService.createRepuesto({ ...payload, orden_trabajo: ordenRef });
        r.id = creado && creado.id;
      }
    } catch (err) {
      errores.push(`Repuesto "${r.descripcion || 'sin descripción'}"`);
    }
  }

  for (const id of serviciosEliminados.value) {
    try {
      await ordenesService.deleteServicio(id);
    } catch (err) {
      errores.push('Servicio eliminado');
    }
  }
  for (const id of repuestosEliminados.value) {
    try {
      await ordenesService.deleteRepuesto(id);
    } catch (err) {
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

onMounted(async () => {
  loadCatalogo();
  loadEmpleados();
  if (!isEditMode.value) {
    loading.value = false;
    return;
  }
  try {
    const data = await ordenesService.getById(ordenId.value);
    aplicarOrden(data);
    await cargarRelacionesOrden(ordenId.value);
  } catch (err) {
    error.value = err.message || 'Error al cargar la orden de trabajo.';
  } finally {
    loading.value = false;
  }
});

async function cargarRelacionesOrden(id = ordenId.value) {
  relacionesCargadas.value = false;
  if (!id) {
    relacionesOrden.value = RELACIONES_VACIAS();
    return;
  }
  try {
    const data = await ordenesService.listarRelaciones(id);
    relacionesOrden.value = data?.relaciones || RELACIONES_VACIAS();
    puedeAgregarRelacion.value = data?.puede_agregar || PUEDE_AGREGAR;
    relacionesCargadas.value = true;
  } catch (err) {
    relacionesOrden.value = RELACIONES_VACIAS();
    error.value = err.message || 'No se pudieron cargar las relaciones de flujo.';
  }
}

async function relacionOrden(payload) {
  const respuesta = await ordenesService.actualizarRelacion(ordenId.value, payload);
  // El listado se recarga porque las relaciones derivadas (recepciones, citas)
  // cambian aunque la orden no se haya modificado.
  await cargarRelacionesOrden(ordenId.value);
  return respuesta;
}

function vincularRelacion({ tipo, id }) {
  return relacionOrden({ tipo, id, accion: 'vincular' });
}

function desvincularRelacion({ tipo, id }) {
  return relacionOrden({ tipo, id, accion: 'desvincular' });
}

/** Devuelve `true` si la orden quedó guardada. */
async function handleSubmit(mensajeExito = 'Orden de trabajo guardada correctamente.') {
  if (saving.value) return false;
  saving.value = true;
  error.value = '';
  successMessage.value = '';

  formErrors.value = { cliente: '', vehiculo: '' };
  if (!clienteSeleccionado.value) formErrors.value.cliente = 'Selecciona el cliente de la orden.';
  if (!vehiculoSeleccionado.value) formErrors.value.vehiculo = 'Selecciona el vehículo a atender.';
  if (formErrors.value.cliente || formErrors.value.vehiculo) {
    error.value = 'Completa el cliente y el vehículo de la orden.';
    saving.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  if (form.value.estado === 'EN_ESPERA' && !String(form.value.motivo_espera || '').trim()) {
    error.value = 'Indica el motivo de la espera de la orden.';
    saving.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  if (!validarSucursal()) {
    error.value = tallerSucursalError.value;
    saving.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  const datosOrden = {
    sucursal: sucursalDocumento.value,
    cliente: clienteSeleccionado.value.id,
    vehiculo: vehiculoSeleccionado.value.id,
    estado: form.value.estado,
    prioridad: form.value.prioridad,
    tipo_trabajo: form.value.tipo_trabajo,
    mecanico_principal: form.value.mecanico_principal || null,
    fecha_entrega: form.value.fecha_entrega ? new Date(form.value.fecha_entrega).toISOString() : null,
    observaciones: form.value.observaciones || '',
    motivo_espera: form.value.motivo_espera || null,
  };

  if (!isEditMode.value) {
    try {
      const creada = await ordenesService.create(datosOrden);
      ordenPersistidaId.value = creada && creada.id;
      if (!ordenPersistidaId.value) {
        throw new Error('No se pudo confirmar la orden de trabajo creada.');
      }
      await guardarDetalles(ordenPersistidaId.value);
      await photosGrid.value?.guardarFotos();
      window.location.assign(`/crud/ordenes/editar/?id=${ordenPersistidaId.value}`);
    } catch (err) {
      error.value = err.message || 'No se pudo crear la orden de trabajo.';
    } finally {
      saving.value = false;
    }
    return false;
  }

  if (!orden.value) {
    saving.value = false;
    return false;
  }

  let guardado = false;
  try {
    const actualizada = await ordenesService.update(orden.value.id, datosOrden);
    await guardarDetalles(orden.value.id);
    await photosGrid.value?.guardarFotos();
    orden.value = {
      ...orden.value,
      estado: form.value.estado,
      estado_display: actualizada?.estado_display || getEstadoOrden(form.value.estado).label,
    };
    successMessage.value = mensajeExito;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    guardado = true;
  } catch (err) {
    error.value = err.message || 'No se pudo guardar la orden de trabajo.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    saving.value = false;
  }
  return guardado;
}

// ---- Pasos: Trabajo (mano de obra y repuestos) y Evidencia ----
const activeTab = ref('trabajo');
const PASOS = [
  { key: 'trabajo', label: 'Trabajo', icon: Wrench },
  { key: 'evidencia', label: 'Evidencia', icon: Camera },
];
const activeTabIndex = computed(() => PASOS.findIndex((p) => p.key === activeTab.value));

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

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

const serviciosHechos = computed(() => servicios.value.filter((s) => s.completado).length);
const totalItems = computed(() => servicios.value.length + repuestos.value.length);
const horasManoObra = computed(() => round2(servicios.value.reduce((acc, s) => acc + (Number(s.horas_aplicadas) || 0), 0)));
const fotosCargadas = computed(() => fotosOt.value.length);
const tieneNotas = computed(() => Boolean((form.value.observaciones || '').trim()));

const estadoPasos = computed(() => ({
  trabajo: totalItems.value && serviciosHechos.value === servicios.value.length ? 'completo' : 'pendiente',
  evidencia: fotosCargadas.value || tieneNotas.value ? 'completo' : 'pendiente',
}));

const resumenPaso = computed(() => ({
  trabajo: servicios.value.length
    ? `${serviciosHechos.value} de ${plural(servicios.value.length, 'servicio hecho', 'servicios hechos')} · ${plural(repuestos.value.length, 'repuesto', 'repuestos')}`
    : 'Mano de obra y repuestos',
  evidencia: `${fotosCargadas.value}/${FOTO_MAX} fotos${tieneNotas.value ? ' · con notas' : ''}`,
}));

function pasoCirculoClass(key) {
  const estado = estadoPasos.value[key];
  if (estado === 'completo') return 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900';
  if (activeTab.value === key) return 'bg-white border-2 border-brand-900 text-brand-900 dark:bg-gray-800 dark:border-brand-300 dark:text-brand-200';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
}

// ---- Avance de la ejecución (panel lateral) ----
const requisitos = computed(() => [
  { key: 'partes', label: 'Cliente y vehículo', ok: Boolean(cliente.value && vehiculo.value), paso: null },
  { key: 'mecanico', label: 'Mecánico asignado', ok: Boolean(form.value.mecanico_principal), paso: null },
  { key: 'trabajo', label: 'Trabajo registrado', ok: totalItems.value > 0, paso: 'trabajo' },
  {
    key: 'hechos',
    label: servicios.value.length ? `Servicios terminados (${serviciosHechos.value}/${servicios.value.length})` : 'Servicios terminados',
    ok: servicios.value.length > 0 ? serviciosHechos.value === servicios.value.length : totalItems.value > 0,
    paso: 'trabajo',
  },
]);

const requisitosCumplidos = computed(() => requisitos.value.filter((r) => r.ok).length);
const avancePorcentaje = computed(() => Math.round((requisitosCumplidos.value / requisitos.value.length) * 100));

const registrado = computed(() => [
  { key: 'svc', label: 'Servicios', valor: servicios.value.length, paso: 'trabajo' },
  { key: 'rpt', label: 'Repuestos', valor: repuestos.value.length, paso: 'trabajo' },
  { key: 'horas', label: 'Horas de M.O.', valor: horasManoObra.value, paso: 'trabajo' },
  { key: 'fotos', label: 'Fotos', valor: fotosCargadas.value, paso: 'evidencia' },
]);

function irARequisito(req) {
  if (req.paso) irAPaso(req.paso);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Cambios de estado: solo desde el aviso superior, guardando antes ----
const estadoActual = computed(() => orden.value?.estado || form.value.estado);
const puedeCompletar = computed(() => estadoActual.value === 'EN_PROCESO' && avancePorcentaje.value === 100);
const ordenCerrada = computed(() => ['ENTREGADO', 'CANCELADO'].includes(estadoActual.value));
const puedeAnular = computed(() => isEditMode.value && ['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO'].includes(estadoActual.value));

const MOTIVOS_ESPERA = ['Esperando repuestos', 'Aprobación del cliente', 'Trabajo adicional'];
const pidiendoEspera = ref(false);
const motivoEsperaBorrador = ref('');
const errorEspera = ref('');

const transicion = ref(null);
const TRANSICIONES = {
  iniciar: {
    estado: 'EN_PROCESO',
    title: 'Iniciar trabajo',
    message: 'La orden pasará a «En proceso» y se guardarán los cambios. ¿Deseas continuar?',
    icon: IconClockPlay,
    iconClass: 'text-blue-600 dark:text-blue-400',
    confirmText: 'Sí, iniciar',
    confirmingText: 'Iniciando...',
    variant: 'primary',
    exito: 'Trabajo iniciado. La orden está en proceso.',
  },
  reanudar: {
    estado: 'EN_PROCESO',
    title: 'Reanudar trabajo',
    message: 'La orden volverá a «En proceso». ¿Deseas continuar?',
    icon: IconPlayerPlay,
    iconClass: 'text-blue-600 dark:text-blue-400',
    confirmText: 'Sí, reanudar',
    confirmingText: 'Reanudando...',
    variant: 'primary',
    exito: 'Trabajo reanudado. La orden está en proceso.',
  },
  completar: {
    estado: 'COMPLETADO',
    title: 'Completar orden',
    message: 'Se guardarán los cambios y la orden quedará lista para entregar al cliente. ¿Deseas continuar?',
    icon: IconClockCheck,
    iconClass: 'text-green-600 dark:text-green-400',
    confirmText: 'Sí, completar',
    confirmingText: 'Completando...',
    variant: 'success',
    exito: 'Orden completada. El vehículo está listo para entregar.',
  },
  reabrir: {
    estado: 'EN_PROCESO',
    title: 'Reabrir trabajo',
    message: 'La orden volverá a «En proceso» para registrar más trabajo. ¿Deseas continuar?',
    icon: RotateCcw,
    iconClass: 'text-blue-600 dark:text-blue-400',
    confirmText: 'Sí, reabrir',
    confirmingText: 'Reabriendo...',
    variant: 'primary',
    exito: 'Orden reabierta. Está en proceso otra vez.',
  },
  entregar: {
    estado: 'ENTREGADO',
    title: 'Registrar entrega',
    message: 'La orden quedará como entregada al cliente. ¿Deseas continuar?',
    icon: CheckCheck,
    iconClass: 'text-green-600 dark:text-green-400',
    confirmText: 'Sí, entregar',
    confirmingText: 'Registrando...',
    variant: 'success',
    exito: 'Entrega registrada. La orden está cerrada.',
  },
  anular: {
    estado: 'CANCELADO',
    title: 'Anular orden',
    message: 'La orden quedará anulada y no podrá subir más evidencia. ¿Deseas continuar?',
    icon: Ban,
    iconClass: 'text-red-600 dark:text-red-400',
    confirmText: 'Sí, anular',
    confirmingText: 'Anulando...',
    variant: 'danger',
    exito: 'La orden fue anulada.',
  },
};

const mostrarTransicion = computed({
  get: () => Boolean(transicion.value),
  set: (valor) => { if (!valor) transicion.value = null; },
});

function solicitarTransicion(clave) {
  if (saving.value) return;
  transicion.value = { clave, ...TRANSICIONES[clave] };
}

async function cambiarEstado(nuevoEstado, mensajeExito, motivo = null) {
  const anterior = { estado: form.value.estado, motivo_espera: form.value.motivo_espera, fecha_entrega: form.value.fecha_entrega };
  form.value.estado = nuevoEstado;
  if (motivo !== null) form.value.motivo_espera = motivo;
  if (nuevoEstado === 'ENTREGADO' && !form.value.fecha_entrega) {
    form.value.fecha_entrega = toDateTimeLocal(new Date().toISOString());
  }
  const guardado = await handleSubmit(mensajeExito);
  if (!guardado) Object.assign(form.value, anterior);
  return guardado;
}

async function confirmarTransicion() {
  const t = transicion.value;
  if (!t) return;
  await cambiarEstado(t.estado, t.exito);
  transicion.value = null;
}

function abrirEspera() {
  motivoEsperaBorrador.value = form.value.motivo_espera || '';
  errorEspera.value = '';
  pidiendoEspera.value = true;
}

async function confirmarEspera() {
  const motivo = motivoEsperaBorrador.value.trim();
  if (!motivo) {
    errorEspera.value = 'Indica el motivo de la espera.';
    return;
  }
  const guardado = await cambiarEstado('EN_ESPERA', 'Orden en espera. Reanúdala cuando se resuelva el motivo.', motivo.slice(0, 80));
  if (guardado) pidiendoEspera.value = false;
}

const grupos = computed(() => [
  {
    key: 'svc',
    titulo: 'Mano de obra',
    singular: 'Servicio',
    icon: Wrench,
    filas: servicios.value,
    catalogo: catalogoServicios.value,
    columna: 'Horas',
    campo: 'horas_aplicadas',
    step: '0.5',
    vacio: 'Aún no hay servicios de mano de obra.',
    agregar: agregarServicioVacio,
    quitar: quitarServicio,
    seleccionar: seleccionarServicio,
    neto: netoServicio,
    entidad: 'servicio',
    subtotal: subtotalServicios.value,
  },
  {
    key: 'rpt',
    titulo: 'Repuestos y materiales',
    singular: 'Repuesto',
    icon: Package,
    filas: repuestos.value,
    catalogo: catalogoRepuestos.value,
    columna: 'Cant.',
    campo: 'cantidad',
    step: '1',
    vacio: 'Aún no hay repuestos o materiales.',
    agregar: agregarRepuestoVacio,
    quitar: quitarRepuesto,
    seleccionar: seleccionarRepuesto,
    neto: netoRepuesto,
    entidad: 'repuesto',
    subtotal: subtotalRepuestos.value,
  },
]);
</script>

<template>
  <EntityHeader
    :breadcrumb="breadcrumb"
    entity="Orden de trabajo"
    :title="tituloPagina"
    :record-number="orden?.numero_orden || ''"
    :mode="isEditMode ? 'edit' : 'create'"
  >
    <template #badges>
      <EstadoOrdenBadge
        v-if="orden"
        :estado="form.estado"
        :estado-display="getEstadoOrden(form.estado).label"
        size="md"
      />
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
        :class="prioridadBadge.color"
        :title="`Prioridad: ${prioridadBadge.label}`">
        <component :is="prioridadBadge.icon" class="w-4 h-4 shrink-0" aria-hidden="true" />
        {{ prioridadBadge.label }}
      </span>
      <!-- Marca de etapa: distingue la orden de la recepción, la inspección y la cotización. -->
      <span
        class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/30 dark:text-brand-200 dark:ring-brand-500/50"
        title="La orden de trabajo es la etapa de ejecución: el trabajo aprobado se realiza en el taller">
        <HardHat class="w-3.5 h-3.5" />
        Etapa de ejecución
      </span>
    </template>
    <template #actions>
      <FormSaveActions
        v-if="!loading"
        :is-loading="saving"
        :is-edit-mode="isEditMode"
        :cancel-href="isEditMode ? `/crud/ordenes/ver/?id=${ordenId}` : '/crud/ordenes/'"
        color="brand"
        :on-submit="() => handleSubmit()"
      />
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-4">
    <!-- Avisos de cambio de estado: único lugar para mover la orden por su ciclo. -->
    <div
      v-if="isEditMode && orden && !ordenCerrada"
      class="p-4 mb-4 text-sm border rounded-lg bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-700/20 dark:border-brand-500/40 dark:text-brand-100">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <component
            :is="estadoActual === 'PENDIENTE' ? CircleStop
              : estadoActual === 'EN_ESPERA' ? Hourglass
                : estadoActual === 'COMPLETADO' || puedeCompletar ? CheckCircle2 : LoaderCircle"
            class="w-5 h-5 mt-0.5 shrink-0" />
          <p v-if="estadoActual === 'PENDIENTE'">
            <span class="font-semibold">El trabajo aún no ha comenzado.</span>
            Inícialo cuando el mecánico tome el vehículo.
          </p>
          <p v-else-if="estadoActual === 'EN_ESPERA'">
            <span class="font-semibold">Orden en espera:</span>
            {{ orden.motivo_espera || form.motivo_espera || 'sin motivo indicado' }}. Reanúdala cuando se resuelva.
          </p>
          <p v-else-if="estadoActual === 'COMPLETADO'">
            <span class="font-semibold">Trabajo completado.</span>
            Registra la entrega cuando el cliente retire el vehículo.
          </p>
          <p v-else-if="puedeCompletar">
            <span class="font-semibold">Todo el trabajo está hecho.</span>
            Completa la orden para dejar el vehículo listo para entregar.
          </p>
          <p v-else>
            <span class="font-semibold">Trabajo en proceso.</span>
            Marca cada servicio como hecho al terminarlo; al completar todos podrás cerrar la orden.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 sm:justify-end">
          <template v-if="estadoActual === 'PENDIENTE'">
            <button type="button" :disabled="saving" :class="BOTON_ESTADO" @click="solicitarTransicion('iniciar')">
              <IconClockPlay class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Iniciar trabajo
            </button>
          </template>
          <template v-else-if="estadoActual === 'EN_PROCESO'">
            <button v-if="!pidiendoEspera" type="button" :disabled="saving" :class="BOTON_ESTADO" @click="abrirEspera">
              <IconPlayerPause class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Poner en espera
            </button>
            <button v-if="puedeCompletar" type="button" :disabled="saving" :class="BOTON_ESTADO" @click="solicitarTransicion('completar')">
              <IconClockCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
              Completar orden
            </button>
          </template>
          <template v-else-if="estadoActual === 'EN_ESPERA'">
            <button type="button" :disabled="saving" :class="BOTON_ESTADO" @click="solicitarTransicion('reanudar')">
              <IconPlayerPlay class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Reanudar trabajo
            </button>
          </template>
          <template v-else-if="estadoActual === 'COMPLETADO'">
            <button type="button" :disabled="saving" :class="BOTON_ESTADO" @click="solicitarTransicion('reabrir')">
              <RotateCcw class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Reabrir
            </button>
            <button type="button" :disabled="saving" :class="BOTON_ESTADO" @click="solicitarTransicion('entregar')">
              <CheckCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
              Registrar entrega
            </button>
          </template>
        </div>
      </div>

      <!-- Motivo de la espera, en el mismo aviso para no perder el contexto -->
      <div v-if="pidiendoEspera" class="pt-3 mt-3 border-t border-brand-200 dark:border-brand-500/40">
        <label for="motivo_espera" class="block mb-2 text-sm font-medium">Motivo de la espera <span class="text-accent-500">*</span></label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input
            id="motivo_espera"
            v-model="motivoEsperaBorrador"
            type="text"
            maxlength="80"
            placeholder="Ej.: esperando repuestos, aprobación del cliente..."
            :class="[BASE_INPUT, errorEspera ? INPUT_ERROR : INPUT_OK, 'bg-white sm:flex-1']"
            @keydown.enter.prevent="confirmarEspera">
          <div class="flex gap-2">
            <button type="button" :disabled="saving" :class="BOTON_ESTADO" @click="confirmarEspera">
              <Loader2 v-if="saving" class="w-5 h-5 animate-spin" />
              <IconPlayerPause v-else class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Poner en espera
            </button>
            <button type="button" :class="BOTON_ESTADO" title="Cancelar" aria-label="Cancelar" @click="pidiendoEspera = false">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>
        <p v-if="errorEspera" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ errorEspera }}</p>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <button
            v-for="motivo in MOTIVOS_ESPERA"
            :key="motivo"
            type="button"
            class="px-2.5 py-1 text-xs font-medium bg-white border border-brand-200 rounded-full hover:bg-brand-100 dark:bg-gray-800 dark:border-brand-500/50 dark:hover:bg-gray-700"
            @click="motivoEsperaBorrador = motivo; errorEspera = ''">
            {{ motivo }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
      Cargando orden de trabajo...
    </div>

    <div v-else-if="isEditMode && !orden && !error" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
      Orden de trabajo no encontrada.
    </div>

    <form v-else class="grid grid-cols-1 gap-4 lg:grid-cols-4" novalidate @submit.prevent="handleSubmit()">
      <div class="space-y-4 lg:col-span-3">
        <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
        <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''" />

        <!-- Vehículo en taller -->
        <section :class="SECCION">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 :class="TITULO_SECCION">
              <Wrench class="w-4 h-4" />
              Vehículo en taller
            </h4>
            <a
              v-if="origen"
              :href="origen.href"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-brand-900 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
              title="Abrir el documento del que viene esta orden">
              <component :is="origen.icon" class="w-3.5 h-3.5" />
              {{ origen.etiqueta }}
              <span class="font-mono font-semibold">{{ origen.numero }}</span>
            </a>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
            <!-- Cliente -->
            <div class="min-w-0">
              <template v-if="partesFijas">
                <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Cliente</p>
                <p class="mb-2 text-base font-semibold text-gray-900 truncate dark:text-white">{{ cliente?.nombre || '—' }}</p>
              </template>
              <template v-else>
                <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente <span class="text-accent-500">*</span></label>
                <ClienteSearchSelect
                  id="cliente"
                  v-model="clienteSearch"
                  :error="Boolean(formErrors.cliente)"
                  :error-message="formErrors.cliente"
                  show-create
                  @select="seleccionarCliente"
                  @clear="limpiarCliente"
                  @create="showClientCreateModal = true"/>
              </template>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" />
                  <dt>Correo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <UserRound class="w-3.5 h-3.5 shrink-0" />
                  <dt>Asesor:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ orden?.asesor_nombre || '—' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Vehículo -->
            <div class="min-w-0">
              <template v-if="partesFijas">
                <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Vehículo</p>
                <p class="mb-2 font-mono text-base font-semibold tracking-widest text-gray-900 dark:text-white">{{ formatPlaca(vehiculo?.placa) || '—' }}</p>
              </template>
              <template v-else>
                <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo <span class="text-accent-500">*</span></label>
                <VehiculoSearchSelect
                  id="vehiculo"
                  v-model="vehiculoSearch"
                  :cliente-id="clienteSeleccionado?.id || null"
                  :disabled="!clienteSeleccionado"
                  :placeholder="clienteSeleccionado ? 'Buscar por placa...' : 'Selecciona un cliente primero'"
                  :error="Boolean(formErrors.vehiculo)"
                  :error-message="formErrors.vehiculo"
                  @select="seleccionarVehiculo"
                  @clear="limpiarVehiculo"/>
              </template>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TagIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Marca:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  <dt>Modelo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}<template v-if="vehiculo?.anio"> · {{ vehiculo.anio }}</template></dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  <dt>Color:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Gauge class="w-3.5 h-3.5 shrink-0" />
                  <dt>Kilometraje:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.kilometraje_actual != null ? `${Number(vehiculo.kilometraje_actual).toLocaleString('es-EC')} km` : '—' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Mecánico -->
            <div class="min-w-0">
              <label for="mecanico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Mecánico responsable</label>
              <EmpleadoSearchSelect
                id="mecanico"
                v-model="mecanicoSearch"
                placeholder="Asignar mecánico..."
                @select="seleccionarMecanico"
                @clear="limpiarMecanico"/>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
                  <dt>Rol:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ mecanicoInfo?.rol_display || mecanicoInfo?.rol || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Building2 class="w-3.5 h-3.5 shrink-0" />
                  <dt>Taller:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ orden?.sucursal_nombre || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Planificación de la orden -->
          <div class="grid grid-cols-1 gap-4 pt-4 mt-5 border-t border-gray-100 sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-700">
            <div>
              <label for="tipo_trabajo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de trabajo</label>
              <select id="tipo_trabajo" v-model="form.tipo_trabajo" :class="inputClass('tipo_trabajo')">
                <option v-for="tipo in TIPOS" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
              </select>
            </div>
            <div>
              <label for="prioridad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Prioridad</label>
              <select id="prioridad" v-model="form.prioridad" :class="inputClass('prioridad')">
                <option v-for="prioridad in PRIORIDADES_ORDEN" :key="prioridad.value" :value="prioridad.value">{{ prioridad.label }}</option>
              </select>
            </div>
            <div>
              <label for="fecha_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ingreso</label>
              <input
                id="fecha_ingreso"
                :value="fechaIngresoDisplay || 'Se registra al crear'"
                type="text"
                readonly
                disabled
                class="block w-full p-2.5 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded shadow-xs cursor-not-allowed dark:bg-gray-700/60 dark:text-gray-400 dark:border-gray-600">
            </div>
            <div>
              <label for="fecha_entrega" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Entrega comprometida</label>
              <input id="fecha_entrega" v-model="form.fecha_entrega" type="datetime-local" :class="inputClass('fecha_entrega')">
            </div>
          </div>

          <div v-if="mostrarSucursal" class="max-w-sm mt-4">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Taller emisor <span class="text-accent-500">*</span></label>
            <TallerSelect
              v-model="tallerSucursalId"
              :nombre="tallerSucursalNombre"
              variante="campo"
              :invalid="Boolean(tallerSucursalError)"
              placeholder="Selecciona el taller"
              @change="limpiarErrorSucursal"
            />
            <p v-if="tallerSucursalError" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ tallerSucursalError }}</p>
          </div>
        </section>

        <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <!-- Pasos: Trabajo y Evidencia -->
          <nav ref="pasosRef" aria-label="Pasos de la orden de trabajo" class="scroll-mt-20 border-b border-gray-200 dark:border-gray-700">
            <ol class="grid grid-cols-2">
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
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <span class="min-w-0">
                    <span class="block text-xs font-semibold sm:text-sm" :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'">
                      {{ paso.label }}
                    </span>
                    <span class="hidden text-xs truncate sm:block text-gray-500 dark:text-gray-400">{{ resumenPaso[paso.key] }}</span>
                  </span>
                </button>
              </li>
            </ol>
          </nav>

          <div class="p-4 sm:p-5 space-y-4 bg-gray-50/60 dark:bg-gray-900/30">
            <!-- 1. Trabajo -->
            <div v-show="activeTab === 'trabajo'" class="space-y-4">
              <!-- Lo que diagnosticó la inspección: referencia para el mecánico -->
              <section v-if="inspeccion?.diagnostico_tecnico || inspeccion?.recomendaciones" class="border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                <button
                  type="button"
                  class="flex items-center justify-between w-full gap-2 px-4 py-3 text-left sm:px-5"
                  :aria-expanded="mostrarDiagnostico"
                  @click="mostrarDiagnostico = !mostrarDiagnostico">
                  <span :class="TITULO_SECCION">
                    <Stethoscope class="w-4 h-4" />
                    Diagnóstico a resolver
                  </span>
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ mostrarDiagnostico ? 'Ocultar' : 'Ver' }}</span>
                </button>
                <div v-show="mostrarDiagnostico" class="grid grid-cols-1 gap-4 px-4 pb-4 text-sm sm:px-5 md:grid-cols-2">
                  <div>
                    <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Diagnóstico</p>
                    <p class="text-gray-900 whitespace-pre-line dark:text-white">{{ inspeccion.diagnostico_tecnico || '—' }}</p>
                    <div v-if="dtcLista.length" class="flex flex-wrap gap-1.5 mt-2">
                      <span
                        v-for="codigo in dtcLista"
                        :key="codigo"
                        class="px-2 py-0.5 font-mono text-xs font-semibold rounded bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/60">
                        {{ codigo }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Recomendaciones</p>
                    <p class="text-gray-900 whitespace-pre-line dark:text-white">{{ inspeccion.recomendaciones || '—' }}</p>
                    <a v-if="inspeccionHref" :href="inspeccionHref" class="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-700 hover:underline dark:text-brand-200">
                      Ver inspección <span class="font-mono">{{ inspeccion.numero_inspeccion }}</span>
                    </a>
                  </div>
                </div>
              </section>

              <section v-for="grupo in grupos" :key="grupo.key" :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 :class="TITULO_SECCION">
                    <component :is="grupo.icon" class="w-4 h-4" />
                    {{ grupo.titulo }}
                    <span class="px-1.5 text-xs font-medium normal-case tracking-normal rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums">{{ grupo.filas.length }}</span>
                  </h4>
                  <div class="flex items-center gap-3">
                    <span v-if="grupo.key === 'svc' && grupo.filas.length" class="text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ serviciosHechos }}/{{ grupo.filas.length }}</span> hechos
                    </span>
                    <button type="button" :class="BOTON_AGREGAR" :title="`Añadir ${grupo.entidad}`" @click="grupo.agregar">
                      <Plus class="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>
                <div class="border border-gray-200 rounded-lg dark:border-gray-700">
                  <table class="w-full text-sm xl:table-fixed">
                    <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                      <tr>
                        <th v-if="grupo.key === 'svc'" class="px-1 py-2 font-medium text-center w-14">Hecho</th>
                        <th class="w-full px-3 py-2 font-medium text-left xl:w-auto">{{ grupo.singular }}</th>
                        <th class="hidden px-2 py-2 font-medium text-center xl:table-cell w-20">{{ grupo.columna }}</th>
                        <th class="hidden px-2 py-2 font-medium text-center xl:table-cell w-24">P. unitario</th>
                        <th class="hidden px-2 py-2 font-medium text-center xl:table-cell w-20">Desc.</th>
                        <th class="hidden px-2 py-2 font-medium text-center xl:table-cell w-20">IVA</th>
                        <th class="px-2 py-2 font-medium text-right w-24">Neto</th>
                        <th class="px-2 py-2 w-10"><span class="sr-only">Quitar</span></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr v-if="!grupo.filas.length">
                        <td :colspan="grupo.key === 'svc' ? 8 : 7" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">{{ grupo.vacio }}</td>
                      </tr>
                      <template v-for="(fila, index) in grupo.filas" :key="fila.id || fila.sufijo">
                      <tr
                        class="align-top"
                        :class="fila.completado ? 'bg-green-50/60 dark:bg-green-900/10' : ''">
                        <td v-if="grupo.key === 'svc'" class="px-2 py-2 text-center">
                          <input
                            v-model="fila.completado"
                            type="checkbox"
                            :aria-label="`Marcar «${fila.descripcion || 'servicio'}» como hecho`"
                            :disabled="estadoActual === 'PENDIENTE' && isEditMode"
                            :title="estadoActual === 'PENDIENTE' && isEditMode ? 'Inicia el trabajo para marcar servicios como hechos' : 'Marcar como hecho'"
                            class="w-5 h-5 mt-2.5 rounded border-gray-300 text-green-600 focus:ring-green-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50">
                        </td>
                        <td class="px-2 py-2 min-w-0">
                          <CatalogoSelect
                            :input-id="`${grupo.key}-desc-${fila.sufijo}`"
                            v-model="fila.descripcion"
                            :catalogo="grupo.catalogo"
                            placeholder="Busca y selecciona..."
                            :mostrar-stock="grupo.key === 'rpt'"
                            :mensaje-sin-resultados="`Sin coincidencias. Puedes escribir un ${grupo.entidad} libre.`"
                            @select="(item) => grupo.seleccionar(item, fila)"/>
                        </td>
                        <td class="hidden px-1.5 py-2 xl:table-cell">
                          <input :id="`${grupo.key}-cant-${fila.sufijo}`" v-model="fila[grupo.campo]" type="number" min="0" :step="grupo.step" :class="inputClass('', '!px-1 !py-2 text-center tabular-nums')">
                        </td>
                        <td class="hidden px-1.5 py-2 xl:table-cell">
                          <input v-model="fila.precio_unitario" type="number" min="0" step="0.01" :class="inputClass('', '!px-1 !py-2 text-center tabular-nums')">
                        </td>
                        <td class="hidden px-1.5 py-2 xl:table-cell">
                          <input v-model="fila.descuento" type="number" min="0" step="0.01" :class="inputClass('', '!px-1 !py-2 text-center tabular-nums')">
                        </td>
                        <td class="hidden px-1.5 py-2 xl:table-cell">
                          <select v-model="fila.iva_porcentaje" :class="inputClass('', '!py-2 !ps-2 !pe-6')">
                            <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                          </select>
                        </td>
                        <td class="px-2 py-2 pt-4 font-medium text-right text-gray-900 tabular-nums whitespace-nowrap dark:text-white">$ {{ formatNumber(grupo.neto(fila)) }}</td>
                        <td class="px-2 py-2 text-center">
                          <button
                            type="button"
                            :title="`Quitar ${grupo.entidad}`"
                            :aria-label="`Quitar ${grupo.entidad}`"
                            class="inline-flex items-center p-2 mt-0.5 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                            @click="grupo.quitar(index)">
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      <!-- En pantallas angostas, cantidad, precio, descuento e IVA van en su propia fila. -->
                      <tr class="xl:hidden !border-t-0" :class="fila.completado ? 'bg-green-50/60 dark:bg-green-900/10' : ''">
                        <td :colspan="grupo.key === 'svc' ? 4 : 3" class="px-2 pb-3">
                          <div class="grid grid-cols-4 gap-2">
                            <label class="text-[11px] text-gray-500 dark:text-gray-400">{{ grupo.columna }}
                              <input v-model="fila[grupo.campo]" type="number" min="0" :step="grupo.step" :class="inputClass('', '!p-1.5 mt-0.5 text-xs text-center tabular-nums')">
                            </label>
                            <label class="text-[11px] text-gray-500 dark:text-gray-400">P. unit.
                              <input v-model="fila.precio_unitario" type="number" min="0" step="0.01" :class="inputClass('', '!p-1.5 mt-0.5 text-xs text-center tabular-nums')">
                            </label>
                            <label class="text-[11px] text-gray-500 dark:text-gray-400">Desc.
                              <input v-model="fila.descuento" type="number" min="0" step="0.01" :class="inputClass('', '!p-1.5 mt-0.5 text-xs text-center tabular-nums')">
                            </label>
                            <label class="text-[11px] text-gray-500 dark:text-gray-400">IVA
                              <select v-model="fila.iva_porcentaje" :class="inputClass('', '!p-1.5 mt-0.5 text-xs')">
                                <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                              </select>
                            </label>
                          </div>
                        </td>
                      </tr>
                      </template>
                    </tbody>
                    <tfoot v-if="grupo.filas.length" class="border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td :colspan="grupo.key === 'svc' ? 8 : 7" class="px-3 py-2 text-xs text-right text-gray-500 dark:text-gray-400">
                          Subtotal {{ grupo.titulo.toLowerCase() }}:
                          <span class="ms-1 text-sm font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(grupo.subtotal) }}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>

            <!-- 2. Evidencia -->
            <div v-show="activeTab === 'evidencia'" class="space-y-4">
              <section :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4 :class="TITULO_SECCION">
                    <Camera class="w-4 h-4" />
                    Evidencia del trabajo
                  </h4>
                  <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ fotosCargadas }}/{{ FOTO_MAX }} fotos</span>
                </div>
                <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Fotos del trabajo terminado: piezas cambiadas, piezas retiradas, mediciones finales.
                </p>
                <PhotoUploadGrid
                  ref="photosGrid"
                  v-model="fotosOt"
                  :entity-id="photoEntityId"
                  entity-field="orden_trabajo"
                  :service="ordenesService"
                  :max="FOTO_MAX"
                  entity-label="orden de trabajo"
                  :disabled="form.estado === 'CANCELADO'"
                  disabled-message="La orden está anulada; no se pueden subir fotos."
                />
              </section>

              <section :class="SECCION">
                <TextImprover
                  v-model="form.observaciones"
                  contexto="observaciones de una orden de trabajo de un taller mecánico"
                  v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <h4 :class="TITULO_SECCION">
                      <NotebookPen class="w-4 h-4" />
                      <label for="observaciones">Notas para el cliente</label>
                    </h4>
                    <button type="button" title="Mejorar el texto con IA" :disabled="mejorando || !form.observaciones" :class="BOTON_MEJORAR" @click="mejorar">
                      <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                      <Wand2 v-else class="w-4 h-4" />
                      {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                    </button>
                  </div>
                  <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">Qué se hizo, hallazgos adicionales y recomendaciones para la próxima visita.</p>
                  <textarea
                    id="observaciones"
                    v-model="form.observaciones"
                    rows="4"
                    placeholder="Ej.: Se cambiaron pastillas delanteras y se rectificaron discos. Revisar suspensión en el próximo mantenimiento."
                    :class="inputClass('observaciones')"></textarea>
                  <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
                  <div v-if="mejorado && !errorMejora" class="flex flex-wrap items-center gap-x-2 mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-4 h-4" />
                    <p>Texto mejorado. Revisa antes de guardar.</p>
                    <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                  </div>
                </TextImprover>
              </section>
            </div>
          </div>

          <!-- Navegación entre pasos -->
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 sm:px-5 dark:border-gray-700">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              :class="activeTabIndex <= 0 ? 'invisible' : ''"
              @click="irAPaso(PASOS[activeTabIndex - 1].key)">
              <ArrowLeft class="w-4 h-4" />
              {{ PASOS[activeTabIndex - 1]?.label || 'Anterior' }}
            </button>
            <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Paso {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
            <button
              v-if="activeTabIndex < PASOS.length - 1"
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
              @click="irAPaso(PASOS[activeTabIndex + 1].key)">
              Siguiente: {{ PASOS[activeTabIndex + 1].label }}
              <ArrowRight class="w-4 h-4" />
            </button>
            <span v-else></span>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:col-span-1">
        <!-- Avance de la ejecución -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <ListChecks class="w-4 h-4" />
            Avance
          </h4>
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
          <p v-if="estadoActual === 'EN_PROCESO'" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Completa los requisitos para poder completar la orden.
          </p>

          <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Registrado</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="h in registrado"
              :key="h.key"
              type="button"
              class="flex flex-col items-start px-3 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              @click="irAPaso(h.paso)">
              <span class="text-lg font-semibold leading-tight tabular-nums" :class="h.valor ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ h.valor }}</span>
              <span class="text-xs text-gray-500 truncate max-w-full dark:text-gray-400">{{ h.label }}</span>
            </button>
          </div>

          <button
            v-if="puedeAnular"
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            @click="solicitarTransicion('anular')">
            <Ban class="w-3.5 h-3.5" />
            Anular orden
          </button>
        </section>

        <!-- Valor de la orden -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <ReceiptText class="w-4 h-4" />
            Valor de la orden
          </h4>
          <dl class="space-y-1.5 text-sm">
            <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <dt>Mano de obra</dt>
              <dd class="font-medium tabular-nums">$ {{ formatNumber(subtotalServicios) }}</dd>
            </div>
            <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <dt>Repuestos</dt>
              <dd class="font-medium tabular-nums">$ {{ formatNumber(subtotalRepuestos) }}</dd>
            </div>
            <div v-if="descuentoTotal" class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <dt>Descuento</dt>
              <dd class="font-medium tabular-nums">− $ {{ formatNumber(descuentoTotal) }}</dd>
            </div>
            <div class="flex justify-between gap-2 pt-1.5 border-t border-gray-100 text-gray-600 dark:border-gray-700 dark:text-gray-300">
              <dt>Base 0%</dt>
              <dd class="font-medium tabular-nums">$ {{ formatNumber(subtotalBase0) }}</dd>
            </div>
            <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <dt>Base gravada</dt>
              <dd class="font-medium tabular-nums">$ {{ formatNumber(subtotalBaseGravada) }}</dd>
            </div>
            <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <dt>IVA</dt>
              <dd class="font-medium tabular-nums">$ {{ formatNumber(montoIva) }}</dd>
            </div>
          </dl>
          <div class="flex items-baseline justify-between gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
            <span class="text-xl font-bold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(totalOt) }}</span>
          </div>
        </section>

        <!-- Vehículo -->
        <section v-if="vehiculo" :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <Car class="w-4 h-4" />
            Vehículo
          </h4>
          <div v-if="vehiculoImagenSrc" class="h-36 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
            <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
          </div>
          <div v-else class="flex flex-col items-center justify-center gap-1.5 h-24 text-xs text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg dark:bg-gray-700/40 dark:border-gray-600">
            <Camera class="w-5 h-5" />
            Sin foto del vehículo
          </div>
          <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {{ [vehiculo.marca, vehiculo.modelo, vehiculo.anio].filter(Boolean).join(' · ') || '—' }}
          </p>
          <p v-if="form.fecha_entrega" class="inline-flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <CalendarClock class="w-3.5 h-3.5" />
            Entrega: {{ formatDate(form.fecha_entrega) }}
          </p>
        </section>

        <RelacionesFlujoEdit
          v-if="isEditMode && relacionesCargadas"
          tipo-entidad="orden"
          :entidad-id="ordenId"
          :relaciones="relacionesOrden"
          :puede-agregar="puedeAgregarRelacion"
          :al-vincular="vincularRelacion"
          :al-desvincular="desvincularRelacion"
        />
      </aside>
    </form>
  </div>

  <ClientModal v-model="showClientCreateModal" @created="onClientCreated" />

  <ConfirmModal
    v-model="mostrarTransicion"
    :title="transicion?.title || ''"
    :message="transicion?.message || ''"
    :icon="transicion?.icon"
    :icon-class="transicion?.iconClass || ''"
    :confirm-text="transicion?.confirmText || 'Confirmar'"
    :confirming-text="transicion?.confirmingText || 'Guardando...'"
    :variant="transicion?.variant || 'primary'"
    :is-deleting="saving"
    @confirm="confirmarTransicion"
    @cancel="transicion = null"
  />
</template>
