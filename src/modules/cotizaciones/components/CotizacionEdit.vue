<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  CheckCircle2,
  Loader2,
  Send,
  Wand2,
  X,
  Plus,
  ArrowLeftRight,
} from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { cotizacionesService } from '../services/cotizacionesService';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';

const urlParams = new URLSearchParams(window.location.search);
const cotizacionParamId = urlParams.get('id');
const inspeccionParamId = urlParams.get('inspeccion');

const isEditMode = Boolean(cotizacionParamId);
const inspeccionId = inspeccionParamId ? Number(inspeccionParamId) : null;

const IVA_PORCENTAJE = 0.15;
const IVA_DISPLAY = '15%';

const ESTADOS = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  ENVIADA: { label: 'Enviada al cliente', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ACEPTADA: { label: 'Aceptada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  VENCIDA: { label: 'Vencida', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  CONVERTIDA: { label: 'Convertida a orden', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
};

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

const estado = ref('BORRADOR');
const numeroCotizacion = ref('');
const sucursalNombre = ref('');
const createdAt = ref('');
const fechaAceptacion = ref(null);
const metodoAceptacion = ref('');
const inspeccionOrigen = ref(null);
const recepcionOrigen = ref(null);
const ordenTrabajoNumero = ref('');
const inspeccionTipo = ref('');

const cotizacion = ref(null);

const form = reactive({
  cliente: null,
  vehiculo: null,
  clienteSearch: '',
  vehiculoSearch: '',
  validez_dias: 15,
  observaciones: '',
});

const clienteOptions = ref([]);
const vehiculoOptions = ref([]);
const showClienteDropdown = ref(false);
const showVehiculoDropdown = ref(false);
const showClientCreateModal = ref(false);
let clienteSearchTimer;

const servicios = ref([]);
const repuestos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);

const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);

const modal = reactive({
  visible: false,
  tipo: '',
  metodo: 'PRESENCIAL',
  procesando: false,
  error: '',
});

const esEditable = computed(() => estado.value === 'BORRADOR');
const estadoInfo = computed(() => ESTADOS[estado.value] || ESTADOS.BORRADOR);
const estaConvertida = computed(() => estado.value === 'CONVERTIDA');

const subtotalServicios = computed(() =>
  servicios.value.reduce((acc, s) => acc + (Number(s.horas_estimadas) || 0) * (Number(s.precio_unitario) || 0), 0)
);
const subtotalRepuestos = computed(() =>
  repuestos.value.reduce((acc, r) => acc + (Number(r.cantidad) || 0) * (Number(r.precio_unitario_referencial) || 0), 0)
);
const subtotal = computed(() => subtotalServicios.value + subtotalRepuestos.value);
const totalIva = computed(() => subtotal.value * IVA_PORCENTAJE);
const total = computed(() => subtotal.value + totalIva.value);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

// ---------- Ítems: filas con autocompletado desde catálogo ----------
function sugerenciasServicio(termino) {
  const term = (termino || '').trim().toLowerCase();
  if (!term) return [];
  return catalogoServicios.value.filter((s) =>
    [s.codigo, s.nombre, s.marca].filter(Boolean).join(' ').toLowerCase().includes(term)
  );
}

function sugerenciasRepuesto(termino) {
  const term = (termino || '').trim().toLowerCase();
  if (!term) return [];
  return catalogoRepuestos.value.filter((r) =>
    [r.codigo, r.nombre, r.marca].filter(Boolean).join(' ').toLowerCase().includes(term)
  );
}

function cerrarSugerencias() {
  servicios.value.forEach((s) => { s.abierto = false; });
  repuestos.value.forEach((r) => { r.abierto = false; });
}

function abrirSugerenciasServicio(fila) {
  cerrarSugerencias();
  fila.abierto = true;
}

function abrirSugerenciasRepuesto(fila) {
  cerrarSugerencias();
  fila.abierto = true;
}

function nuevaFilaServicio() {
  return {
    id: null,
    sufijo: Date.now() + Math.random(),
    descripcion: '',
    horas_estimadas: '1.00',
    precio_unitario: '0.00',
    es_opcional: false,
    abierto: false,
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
    es_opcional: false,
    abierto: false,
  };
}

function focusInput(id) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) el.focus();
  });
}

function agregarServicioVacio() {
  if (!esEditable.value) return;
  const fila = nuevaFilaServicio();
  servicios.value.push(fila);
  fila.abierto = true;
  focusInput(`svc-desc-${fila.sufijo}`);
}

function agregarRepuestoVacio() {
  if (!esEditable.value) return;
  const fila = nuevaFilaRepuesto();
  repuestos.value.push(fila);
  fila.abierto = true;
  focusInput(`rpt-desc-${fila.sufijo}`);
}

function seleccionarServicio(item, fila) {
  fila.descripcion = item.nombre;
  fila.horas_estimadas = '1.00';
  fila.precio_unitario = String(item.precio_referencial ?? '0.00');
  fila.es_opcional = false;
  fila.abierto = false;
  focusInput(`svc-horas-${fila.sufijo}`);
}

function seleccionarRepuesto(item, fila) {
  fila.codigo_repuesto = item.codigo || '';
  fila.descripcion = item.nombre;
  fila.cantidad = '1';
  fila.precio_unitario_referencial = String(item.precio_venta ?? '0.00');
  fila.abierto = false;
  focusInput(`rpt-cant-${fila.sufijo}`);
}

function seleccionarPrimeraServicio(fila) {
  const sugerencias = sugerenciasServicio(fila.descripcion);
  if (sugerencias.length) seleccionarServicio(sugerencias[0], fila);
}

function seleccionarPrimeraRepuesto(fila) {
  const sugerencias = sugerenciasRepuesto(fila.descripcion);
  if (sugerencias.length) seleccionarRepuesto(sugerencias[0], fila);
}

// ---------- Cliente / Vehículo (solo creación independiente) ----------
function searchClientes() {
  const term = form.clienteSearch.trim();
  if (!term) {
    clienteOptions.value = [];
    showClienteDropdown.value = false;
    return;
  }
  clearTimeout(clienteSearchTimer);
  clienteSearchTimer = setTimeout(async () => {
    try {
      const data = await request(`/api/clientes/?${new URLSearchParams({ search: term, ordering: 'nombre', page: '1' })}`);
      clienteOptions.value = Array.isArray(data?.results) ? data.results : [];
      showClienteDropdown.value = true;
    } catch (error) {
      clienteOptions.value = [];
    }
  }, 300);
}

function selectCliente(cliente) {
  form.cliente = cliente;
  form.clienteSearch = cliente.nombre || '';
  showClienteDropdown.value = false;
  form.vehiculo = null;
  form.vehiculoSearch = '';
  searchVehiculos();
}

function clearCliente() {
  form.cliente = null;
  form.clienteSearch = '';
  clienteOptions.value = [];
  showClienteDropdown.value = false;
  clearVehiculo();
}

async function searchVehiculos() {
  const term = form.vehiculoSearch.trim();
  const params = new URLSearchParams({ ordering: 'placa', page: '1' });
  if (term) params.set('search', term);
  if (form.cliente?.id) params.set('cliente', String(form.cliente.id));
  if (!term && !form.cliente?.id) {
    vehiculoOptions.value = [];
    showVehiculoDropdown.value = false;
    return;
  }
  try {
    const data = await request(`/api/vehiculos/?${params.toString()}`);
    vehiculoOptions.value = Array.isArray(data?.results) ? data.results : [];
    showVehiculoDropdown.value = true;
  } catch (error) {
    vehiculoOptions.value = [];
  }
}

function selectVehiculo(vehiculo) {
  form.vehiculo = vehiculo;
  form.vehiculoSearch = vehiculo.placa || '';
  showVehiculoDropdown.value = false;
}

function clearVehiculo() {
  form.vehiculo = null;
  form.vehiculoSearch = '';
  vehiculoOptions.value = [];
  showVehiculoDropdown.value = false;
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
  estado.value = data.estado || 'BORRADOR';
  numeroCotizacion.value = data.numero_cotizacion || '';
  sucursalNombre.value = data.sucursal_nombre || '';
  createdAt.value = data.created_at || '';
  fechaAceptacion.value = data.fecha_aceptacion || null;
  metodoAceptacion.value = data.metodo_aceptacion || '';
  inspeccionOrigen.value = data.inspeccion_origen ? Number(data.inspeccion_origen) : null;
  recepcionOrigen.value = data.recepcion_origen ? Number(data.recepcion_origen) : null;
  ordenTrabajoNumero.value = data.orden_trabajo_numero || '';
  inspeccionTipo.value = data.inspeccion_tipo || '';
  form.validez_dias = Number(data.validez_dias) || 15;
  form.observaciones = data.observaciones || '';
  form.cliente = data.cliente ? { id: Number(data.cliente) } : null;
  form.vehiculo = data.vehiculo ? { id: Number(data.vehiculo) } : null;
  form.clienteSearch = data.cliente_nombre || '';
  form.vehiculoSearch = data.vehiculo_placa || '';
  servicios.value = (data.servicios || []).map((s) => ({
    id: s.id,
    sufijo: Date.now() + Math.random(),
    descripcion: s.descripcion,
    horas_estimadas: String(s.horas_estimadas ?? '1.00'),
    precio_unitario: String(s.precio_unitario ?? '0.00'),
    es_opcional: Boolean(s.es_opcional),
  }));
  repuestos.value = (data.repuestos || []).map((r) => ({
    id: r.id,
    sufijo: Date.now() + Math.random(),
    codigo_repuesto: r.codigo_repuesto || '',
    descripcion: r.descripcion,
    cantidad: String(r.cantidad ?? '1'),
    precio_unitario_referencial: String(r.precio_unitario_referencial ?? '0.00'),
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
      observaciones: data.recepcion?.motivo_ingreso ? `Motivo de ingreso: ${data.recepcion.motivo_ingreso}` : '',
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
      descripcion: s.descripcion || '',
      horas_estimadas: String(s.horas_estimadas ?? '1.00'),
      precio_unitario: String(s.precio_unitario ?? '0.00'),
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
      codigo_repuesto: r.codigo_repuesto || '',
      descripcion: r.descripcion || '',
      cantidad: String(r.cantidad ?? '1'),
      precio_unitario_referencial: String(r.precio_unitario_referencial ?? '0.00'),
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
    } else if (modal.tipo === 'CONVERTIR') {
      const resultado = await cotizacionesService.convertirAOrden(cotizacionId.value);
      successMessage.value = `Orden de trabajo N° ${resultado.numero_orden} creada. La cotización quedó convertida.`;
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
      validez_dias: Number(form.validez_dias) || 15,
      observaciones: (form.observaciones || '').trim(),
    });
    cotizacionId.value = creada && creada.id;
    isEditModeFlag.value = true;
    await cargarCotizacion(cotizacionId.value);
    successMessage.value = `Cotización "${creada.numero_cotizacion}" creada. Agrega los servicios y repuestos.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  isSaving.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, {
      validez_dias: Number(form.validez_dias) || 15,
      observaciones: (form.observaciones || '').trim(),
    });
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
  if (estado.value === 'BORRADOR') formErrors.value = {};
});

watch(() => form.observaciones, (val) => {
  const clean = sanitizeObservaciones(val).slice(0, 2000);
  if (clean !== val) form.observaciones = clean;
});

// ---------- Ciclo de vida ----------
function cerrarPopups(event) {
  const target = event.target;
  if (target && !target.closest('.item-autocomplete') && !target.closest('.add-row-btn')) cerrarSugerencias();
  if (target && !target.closest('.cliente-dropdown') && !target.closest('.vehiculo-dropdown')) {
    showClienteDropdown.value = false;
    showVehiculoDropdown.value = false;
  }
}

onMounted(() => {
  loadCatalogo();
  document.addEventListener('click', cerrarPopups);
  if (isEditMode && cotizacionId.value) {
    cargarCotizacion(cotizacionId.value);
  } else if (inspeccionId) {
    crearCotizacionDesdeInspeccion();
  } else {
    isLoading.value = false;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', cerrarPopups);
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
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
        {{ isEditModeFlag ? 'Cotización' : 'Nueva Cotización' }}
      </h1>
      <span
        v-if="numeroCotizacion"
        class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      >
        {{ numeroCotizacion }}
      </span>
      <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium', estadoInfo.color]">
        {{ estadoInfo.label }}
      </span>
      <div v-if="isEditModeFlag && cotizacionId" class="flex items-center ml-auto gap-2 flex-wrap">
        <button
          v-if="estado === 'ENVIADA'"
          type="button"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="abrirModal('ACEPTAR')"
        >
          <CheckCircle2 class="w-4 h-4 mr-2" />
          Marcar aceptada
        </button>
        <button
          v-if="estado === 'ENVIADA'"
          type="button"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-800"
          @click="abrirModal('RECHAZAR')"
        >
          <X class="w-4 h-4 mr-2" />
          Marcar rechazada
        </button>
        <button
          v-if="estado === 'ACEPTADA'"
          type="button"
          :disabled="estaConvertida"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-700 dark:hover:bg-indigo-800"
          @click="abrirModal('CONVERTIR')"
        >
          <ArrowLeftRight class="w-4 h-4 mr-2" />
          Convertir a orden de trabajo
        </button>
        <button
          v-if="estado === 'BORRADOR'"
          type="button"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-800"
          @click="abrirModal('ENVIAR')"
        >
          <Send class="w-4 h-4 mr-2" />
          Enviar al cliente
        </button>
        <button
          v-if="estado === 'RECHAZADA'"
          type="button"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-800"
          @click="abrirModal('REENVIAR')"
        >
          <Send class="w-4 h-4 mr-2" />
          Reenviar al cliente
        </button>
      </div>
    </div>
  </div>

  <div class="p-4">
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
        <!-- Cierre: datos de cliente y vehículo (solo cotización independiente en borrador) -->
        <div v-if="!isEditModeFlag && !inspeccionOrigen" class="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Datos del cliente y vehículo</h3>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="relative cliente-dropdown">
              <label for="cliente" class="block text-sm font-medium text-gray-900 mb-1 dark:text-white">Cliente *</label>
              <input
                id="cliente"
                v-model="form.clienteSearch"
                type="text"
                placeholder="Buscar cliente por nombre o cédula"
                class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                @input="searchClientes"
                @focus="searchClientes"
              >
              <ul v-if="showClienteDropdown && clienteOptions.length" class="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
                <li v-for="cliente in clienteOptions" :key="cliente.id">
                  <button
                    type="button"
                    class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    @click="selectCliente(cliente)"
                  >
                    <span class="font-medium block">{{ cliente.nombre }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ cliente.identificacion || '' }} · {{ cliente.telefono || '' }}</span>
                  </button>
                </li>
              </ul>
              <button v-if="form.cliente" type="button" class="mt-2 text-sm text-red-600 hover:underline dark:text-red-400" @click="clearCliente">Quitar cliente</button>
              <button type="button" class="mt-2 ml-3 text-sm text-primary-blue-700 hover:underline dark:text-primary-blue-300" @click="showClientCreateModal = true">Crear cliente</button>
              <p v-if="formErrors.cliente" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.cliente }}</p>
            </div>

            <div class="relative vehiculo-dropdown">
              <label for="vehiculo" class="block text-sm font-medium text-gray-900 mb-1 dark:text-white">Vehículo *</label>
              <input
                id="vehiculo"
                v-model="form.vehiculoSearch"
                type="text"
                placeholder="Buscar por placa o marca"
                class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                @input="searchVehiculos"
                @focus="searchVehiculos"
              >
              <ul v-if="showVehiculoDropdown && vehiculoOptions.length" class="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
                <li v-for="vehiculo in vehiculoOptions" :key="vehiculo.id">
                  <button
                    type="button"
                    class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    @click="selectVehiculo(vehiculo)"
                  >
                    <span class="font-medium block">{{ vehiculo.placa }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ vehiculo.marca }} {{ vehiculo.modelo }} · {{ vehiculo.color }}</span>
                  </button>
                </li>
              </ul>
              <button v-if="form.vehiculo" type="button" class="mt-2 text-sm text-red-600 hover:underline dark:text-red-400" @click="clearVehiculo">Quitar vehículo</button>
              <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
            </div>
          </div>
        </div>

        <!-- Información desplegada cuando ya existe -->
        <div v-if="isEditModeFlag && cotizacion" class="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cliente</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ cotizacion.cliente_nombre || '-' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ cotizacion.cliente_identificacion || '' }} {{ cotizacion.cliente_telefono ? `· ${cotizacion.cliente_telefono}` : '' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Vehículo</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_placa || '-' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ cotizacion.vehiculo_marca || '' }} {{ cotizacion.vehiculo_modelo || '' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Taller</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ sucursalNombre || '-' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Emitida: {{ formatDate(createdAt) }}</p>
            </div>
            <div v-if="inspeccionOrigen">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Origen</p>
              <a :href="`/crud/inspecciones/editar/?id=${inspeccionOrigen}`" class="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Inspección {{ inspeccionTipo || '' }}
              </a>
              <p v-if="ordenTrabajoNumero" class="text-xs text-gray-500 dark:text-gray-400">OT: {{ ordenTrabajoNumero }}</p>
            </div>
            <div v-if="recepcionOrigen">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Recepción</p>
              <a :href="`/crud/recepciones/ver/?id=${recepcionOrigen}`" class="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Recepción #{{ recepcionOrigen }}
              </a>
            </div>
            <div v-if="fechaAceptacion">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Aceptada</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatDate(fechaAceptacion) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ (METODOS_ACEPTACION.find((m) => m.value === metodoAceptacion) || {}).label || metodoAceptacion }}</p>
            </div>
          </div>
        </div>

        <fieldset :disabled="!esEditable" class="grid grid-cols-1 gap-8">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label for="validez_dias" class="block text-sm font-medium text-gray-900 dark:text-white">Validez de la oferta (días)</label>
              <select id="validez_dias" v-model="form.validez_dias" class="mt-1 block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                <option v-for="dias in VALIDEZ_OPCIONES" :key="dias" :value="dias">{{ dias }} días</option>
              </select>
            </div>
            <div class="col-span-1">
              <TextImprover
                v-model="form.observaciones"
                contexto="observaciones generales de una cotización de un taller"
                v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
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
                <textarea id="observaciones" v-model="form.observaciones" rows="3" placeholder="Condiciones, garantías, notas para el cliente..." class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white"></textarea>
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
          </div>

          <!-- Servicios -->
          <div class="col-span-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 dark:text-white">Servicios / Mano de obra</h3>
            <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
              <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th class="px-4 py-3">Servicio</th>
                    <th class="px-4 py-3 w-24">Horas</th>
                    <th class="px-4 py-3 w-24 text-center">Opcional</th>
                    <th class="px-4 py-3 w-36">Precio unitario</th>
                    <th class="px-4 py-3 w-36">Subtotal</th>
                    <th v-if="esEditable" class="px-4 py-3 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!servicios.length">
                    <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay servicios de mano de obra.</td>
                  </tr>
                  <tr v-for="(servicio, index) in servicios" :key="servicio.sufijo || servicio.id" class="border-t border-gray-200 dark:border-gray-600">
                    <td class="px-4 py-2.5">
                      <div class="relative item-autocomplete">
                        <input
                          :id="`svc-desc-${servicio.sufijo}`"
                          v-model="servicio.descripcion"
                          type="text"
                          placeholder="Busca y selecciona..."
                          class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                          :disabled="!esEditable"
                          @focus="abrirSugerenciasServicio(servicio)"
                          @blur="servicio.abierto = false"
                          @keydown.enter.prevent="seleccionarPrimeraServicio(servicio)"
                          @keydown.esc="servicio.abierto = false"
                        />
                        <ul
                          v-if="servicio.abierto && esEditable && servicio.descripcion.trim().length >= 3"
                          class="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-700 dark:border-gray-600"
                        >
                          <li v-for="item in sugerenciasServicio(servicio.descripcion)" :key="item.id">
                            <button type="button" class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600" @mousedown.prevent="seleccionarServicio(item, servicio)">
                              <span class="font-medium block">{{ item.nombre }}</span>
                              <span class="text-xs text-gray-500 dark:text-gray-400">{{ item.codigo || '' }} · $ {{ formatMoney(item.precio_referencial) }}</span>
                            </button>
                          </li>
                          <li v-if="!sugerenciasServicio(servicio.descripcion).length" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Sin coincidencias. Puedes escribir un servicio libre.
                          </li>
                        </ul>
                      </div>
                    </td>
                    <td class="px-4 py-2.5">
                      <input :id="`svc-horas-${servicio.sufijo}`" v-model="servicio.horas_estimadas" type="number" min="0" step="0.5" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      <input v-model="servicio.es_opcional" type="checkbox" class="w-4 h-4 text-primary-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-blue-500 focus:ring-2" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5">
                      <input v-model="servicio.precio_unitario" type="number" min="0" step="0.01" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5 font-medium">$ {{ formatMoney((Number(servicio.horas_estimadas) || 0) * (Number(servicio.precio_unitario) || 0)) }}</td>
                    <td v-if="esEditable" class="px-4 py-2.5">
                      <button type="button" title="Quitar servicio" aria-label="Quitar servicio" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarServicio(index)">
                        <X class="w-5 h-5" />
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
                @click="agregarServicioVacio"
              >
                <Plus class="w-4 h-4" />
                Añadir
              </button>
            </div>
          </div>

          <!-- Repuestos -->
          <div class="col-span-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 dark:text-white">Repuestos / Materiales</h3>
            <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
              <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th class="px-4 py-3">Repuesto</th>
                    <th class="px-4 py-3 w-24">Cant.</th>
                    <th class="px-4 py-3 w-28 text-center">Opcional</th>
                    <th class="px-4 py-3 w-36">Precio unit.</th>
                    <th class="px-4 py-3 w-36">Subtotal</th>
                    <th v-if="esEditable" class="px-4 py-3 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!repuestos.length">
                    <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay repuestos o materiales.</td>
                  </tr>
                  <tr v-for="(repuesto, index) in repuestos" :key="repuesto.sufijo || repuesto.id" class="border-t border-gray-200 dark:border-gray-600">
                    <td class="px-4 py-2.5">
                      <div class="relative item-autocomplete">
                        <input
                          :id="`rpt-desc-${repuesto.sufijo}`"
                          v-model="repuesto.descripcion"
                          type="text"
                          placeholder="Busca y selecciona..."
                          class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                          :disabled="!esEditable"
                          @focus="abrirSugerenciasRepuesto(repuesto)"
                          @blur="repuesto.abierto = false"
                          @keydown.enter.prevent="seleccionarPrimeraRepuesto(repuesto)"
                          @keydown.esc="repuesto.abierto = false"
                        />
                        <span v-if="repuesto.codigo_repuesto" class="block mt-1 text-xs text-gray-400 dark:text-gray-400">{{ repuesto.codigo_repuesto }}</span>
                        <ul
                          v-if="repuesto.abierto && esEditable && repuesto.descripcion.trim().length >= 3"
                          class="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-700 dark:border-gray-600"
                        >
                          <li v-for="item in sugerenciasRepuesto(repuesto.descripcion)" :key="item.id">
                            <button type="button" class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600" @mousedown.prevent="seleccionarRepuesto(item, repuesto)">
                              <span class="font-medium block">{{ item.nombre }}</span>
                              <span class="text-xs text-gray-500 dark:text-gray-400">{{ item.codigo || '' }} · $ {{ formatMoney(item.precio_venta) }}</span>
                            </button>
                          </li>
                          <li v-if="!sugerenciasRepuesto(repuesto.descripcion).length" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Sin coincidencias. Puedes escribir un repuesto libre.
                          </li>
                        </ul>
                      </div>
                    </td>
                    <td class="px-4 py-2.5">
                      <input :id="`rpt-cant-${repuesto.sufijo}`" v-model="repuesto.cantidad" type="number" min="1" step="1" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      <input v-model="repuesto.es_opcional" type="checkbox" class="w-4 h-4 text-primary-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-blue-500 focus:ring-2" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5">
                      <input v-model="repuesto.precio_unitario_referencial" type="number" min="0" step="0.01" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" :disabled="!esEditable" />
                    </td>
                    <td class="px-4 py-2.5 font-medium">$ {{ formatMoney((Number(repuesto.cantidad) || 0) * (Number(repuesto.precio_unitario_referencial) || 0)) }}</td>
                    <td v-if="esEditable" class="px-4 py-2.5">
                      <button type="button" title="Quitar repuesto" aria-label="Quitar repuesto" class="inline-flex items-center p-1.5 text-red-600 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" @click="quitarRepuesto(index)">
                        <X class="w-5 h-5" />
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
                @click="agregarRepuestoVacio"
              >
                <Plus class="w-4 h-4" />
                Añadir
              </button>
            </div>
          </div>

          <!-- Resumen -->
          <div class="col-span-1">
            <div class="ml-auto max-w-sm space-y-2 text-sm">
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal servicios</span>
                <span class="font-medium">$ {{ formatMoney(subtotalServicios) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal repuestos</span>
                <span class="font-medium">$ {{ formatMoney(subtotalRepuestos) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span class="font-medium">$ {{ formatMoney(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span>IVA ({{ IVA_DISPLAY }})</span>
                <span class="font-medium">$ {{ formatMoney(totalIva) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900 dark:text-white">
                <span>Total</span>
                <span>$ {{ formatMoney(total) }}</span>
              </div>
            </div>
          </div>
        </fieldset>

        <FormSaveActions
          v-if="esEditable && cotizacionId && isEditModeFlag"
          :is-loading="isSaving"
          :is-edit-mode="isEditModeFlag"
          cancel-href="/crud/cotizaciones/"
          :on-submit="submit"
        />
        <FormSaveActions
          v-if="!isEditModeFlag && !inspeccionOrigen"
          :is-loading="isCreando"
          cancel-href="/crud/cotizaciones/"
          :on-submit="crearCotizacionIndependiente"
        />
      </template>
    </div>
  </div>

  <!-- Modal de transición de estado -->
  <div v-if="modal.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" @click.self="cerrarModal">
    <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ modal.tipo === 'ENVIAR' ? 'Enviar cotización al cliente' : modal.tipo === 'ACEPTAR' ? 'Marcar cotización como aceptada' : modal.tipo === 'RECHAZAR' ? 'Marcar cotización como rechazada' : modal.tipo === 'REENVIAR' ? 'Reenviar cotización al cliente' : 'Convertir cotización en orden de trabajo' }}
        </h3>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="cerrarModal">
          <X class="w-5 h-5" />
        </button>
      </div>

      <p v-if="modal.tipo === 'ENVIAR'" class="text-sm text-gray-600 dark:text-gray-300">
        La cotización quedará marcada como <strong>Enviada al cliente</strong> y no podrá editarse hasta su respuesta.
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
      <p v-else-if="modal.tipo === 'CONVERTIR'" class="text-sm text-gray-600 dark:text-gray-300">
        Se generará una <strong>orden de trabajo</strong> a partir de esta cotización. La inspección quedará finalizada y la cotización en estado <strong>Convertida</strong>.
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

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientCreated"
  />
</template>