<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Toolbox, WrenchIcon, ImageIcon, TriangleAlert, CheckCircle2, Clock, FileText, Loader2, Plus, Trash2, Wand2, Wrench, ClipboardList, IdCardIcon, TagIcon, Shapes, PaintBucket, Phone, Mail, CameraIcon, Car, Camera } from 'lucide-vue-next';
import { IconChecklist, IconPlayerPlayFilled, IconEngine, IconManualGearbox, IconAutomaticGearbox, IconGasStation } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/env';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import PhotoUploadGrid from '../../../shared/components/PhotoUploadGrid.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';
import { inspeccionesService } from '../services/inspeccionesService';
import { TESTIGO_KEYS, testigoDefaults, testigoPayload } from '../../../shared/config/testigos';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TestigosTablero from '../../../shared/components/TestigosTablero.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import { sanitizeDtc, sanitizeObservaciones, normalizarDecimal } from '../../../shared/utils/sanitize';

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
  numero_inspeccion: '',
  tipo_inspeccion: 'DIAGNOSTICO',
  motivo_ingreso: '',
  codigos_dtc: '',
  diagnostico_tecnico: '',
  recomendaciones: '',
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

const transicionEstado = ref(false);
const showFinalizarModal = ref(false);

const activeTab = ref('informacion');
const TAB_ORDER = ['informacion', 'testigos', 'fotos', 'servicios'];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    activeTab.value = TAB_ORDER[next];
  }
}

const TAB_ERROR_MAP = {
  motivo_ingreso: 'Inspección',
  diagnostico_tecnico: 'Inspección',
  recomendaciones: 'Inspección',
  cliente: 'Información General',
  vehiculo: 'Información General',
};

const TAB_ORDER_LABELS = [
  'Información General',
  'Inspección',
  'Testigos luminosos',
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

const tipoInspeccionLabel = computed(() => {
  const map = {
    PREVENTIVO: 'Mantenimiento Preventivo',
    CORRECTIVO: 'Revisión Correctiva',
    DIAGNOSTICO: 'Diagnóstico',
    ESTETICA: 'Evaluación Estética',
    GARANTIA: 'Revisión por Garantía',
  };
  return map[form.tipo_inspeccion] || form.tipo_inspeccion || '—';
});

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

const estadoResumenBadge = computed(() => {
  const map = {
    PENDIENTE: {
      label: 'Pendiente',
      classes: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      dot: 'bg-yellow-600 dark:bg-yellow-400',
    },
    EN_PROCESO: {
      label: 'En Proceso',
      classes: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
      dot: 'bg-blue-600 dark:bg-blue-400',
    },
    FINALIZADA: {
      label: 'Finalizada',
      classes: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      dot: 'bg-green-600 dark:bg-green-400',
    },
  };
  return map[estadoInspeccion.value] || map.PENDIENTE;
});

function solicitarFinalizacion() {
  if (transicionEstado.value) return;
  showFinalizarModal.value = true;
}

async function confirmarFinalizar() {
  await cambiarEstado('FINALIZADA');
  showFinalizarModal.value = false;
}

async function cambiarEstado(nuevoEstado) {
  if (!inspeccionId || transicionEstado.value) return;
  transicionEstado.value = true;
  try {
    await inspeccionesService.update(inspeccionId, { estado: nuevoEstado });
    if (nuevoEstado === 'FINALIZADA') {
      window.location.assign(`/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccionId)}&finalizada=1`);
      return;
    }
    estadoInspeccion.value = nuevoEstado;
    successMessage.value = 'Inspección iniciada. Ahora está en proceso.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
  } finally {
    transicionEstado.value = false;
  }
}

const estadoBadge = computed(() => {
  const map = {
    PENDIENTE: {
      label: 'Pendiente',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: Clock,
    },
    EN_PROCESO: {
      label: 'En Proceso',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      icon: Wrench,
    },
    FINALIZADA: {
      label: 'Finalizada',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle2,
    },
  };
  return map[estadoInspeccion.value];
});

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
  const inspeccionRef = Number(idInspeccion);
  if (!inspeccionRef) return;

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
      errores.push(`Servicio eliminado (#${id})`);
    }
  }

  async function eliminarRepuesto(id) {
    try {
      await request(`/api/ordenes/inspeccion-repuestos/${id}/`, { method: 'DELETE' });
    } catch (error) {
      errores.push(`Repuesto eliminado (#${id})`);
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

  if (!recepcion.value) {
    if (!clienteSeleccionado.value) {
      errors.cliente = 'El cliente es obligatorio.';
    }
    if (!vehiculoSeleccionado.value) {
      errors.vehiculo = 'El vehículo / placa es obligatorio.';
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
      form.tipo_inspeccion = data.tipo_recepcion || 'DIAGNOSTICO';
      Object.assign(form, testigoPayload(data));
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
      numero_inspeccion: data.numero_inspeccion || '',
      tipo_inspeccion: data.tipo_inspeccion || 'DIAGNOSTICO',
      motivo_ingreso: data.motivo_ingreso || '',
      codigos_dtc: data.codigos_dtc || '',
      diagnostico_tecnico: data.diagnostico_tecnico || '',
      recomendaciones: data.recomendaciones || '',
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
      errorMessage.value = mensajeErroresValidacion.value;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const detalleError = validarDetalles();
    if (detalleError) {
      errorMessage.value = `Revisa los siguientes ítems en la pestaña "Servicios & Repuestos": ${detalleError}`;
      activeTab.value = 'servicios';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      ...testigoPayload(form),
      recepcion: form.recepcion && typeof form.recepcion === 'object' ? form.recepcion.id : form.recepcion,
      ...(!recepcion.value ? {
        cliente: clienteSeleccionado.value?.id || null,
        vehiculo: vehiculoSeleccionado.value?.id || null,
      } : {}),
      tipo_inspeccion: form.tipo_inspeccion,
      motivo_ingreso: sanitizeObservaciones(form.motivo_ingreso || '').slice(0, 500).trim(),
      codigos_dtc: sanitizeDtc(form.codigos_dtc, 255),
      diagnostico_tecnico: sanitizeObservaciones(form.diagnostico_tecnico || '').slice(0, 1000).trim(),
      recomendaciones: sanitizeObservaciones(form.recomendaciones || '').slice(0, 1000).trim(),
      otros_testigos_observaciones: sanitizeObservaciones(String(form.otros_testigos_observaciones || '')).slice(0, 255),
    };

    if (isEditMode) {
      await inspeccionesService.update(inspeccionId, payload);
      await guardarDetalles(inspeccionId);
      await photosGrid.value.guardarFotos();
      successMessage.value = 'Inspección actualizada correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
}

onMounted(() => {
  loadCatalogo();
  loadRecepcion();
  loadInspeccion();
  loadDetalles();
  loadFotos();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/inspecciones/" class="hover:text-primary-600">Inspecciones</a></li>
        <li v-if="recepcion" class="text-gray-400">/ 
          <a :href="`/crud/recepciones/ver/?id=${recepcion.id}`" class="hover:text-primary-600">Recepción #{{ recepcion.numero_recepcion || recepcion.id }}</a>
        </li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Nueva' }} Inspección</li>
      </ol>
    </nav>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
        {{ isEditMode ? (form.numero_inspeccion ? `Editar Inspección ${form.numero_inspeccion}` : 'Editar Inspección') : 'Nueva Inspección' }}
      </h1>
      <span
        v-if="isEditMode && estadoBadge"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
        :class="estadoBadge.color"
      >
        <component :is="estadoBadge.icon" class="w-4 h-4" aria-hidden="true" />
        {{ estadoBadge.label }}
      </span>
      <div v-if="isEditMode" class="flex items-center gap-2 ml-auto flex-wrap">
        <button
          v-if="estadoInspeccion === 'PENDIENTE'"
          type="button"
          :disabled="transicionEstado"
          title="Marcar la inspección como en proceso"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="cambiarEstado('EN_PROCESO')"
        >
          <IconPlayerPlayFilled class="w-4 h-4" />
          Iniciar inspección
        </button>
        <button
          v-if="estadoInspeccion === 'EN_PROCESO'"
          type="button"
          :disabled="transicionEstado"
          title="Cerrar el diagnóstico de la inspección"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 dark:bg-primary-700 dark:hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="solicitarFinalizacion"
        >
          <IconChecklist class="w-4 h-4" />
          Finalizar inspección
        </button>
          <FormSaveActions
          :is-loading="isSaving"
          :is-edit-mode="isEditMode"
          cancel-href="/crud/inspecciones/"
          :on-submit="submit"
        />
      </div>
    </div>
  </div>

  <div v-if="recepcion" class="relative mx-auto max-w-6xl px-4 pt-4 rounded-lg">
    <ol class="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-primary-600 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-primary-500"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold whitespace-nowrap"
            >1</span
          >
          <span
            class="whitespace-nowrap text-primary-blue-600 dark:text-primary-blue-400"
            >Recepción</span
          >
        </span>
      </li>
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-primary-600 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-primary-500"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold whitespace-nowrap"
            >2</span
          >
          <span
            class="whitespace-nowrap text-primary-blue-600 dark:text-primary-blue-400"
            >Inspección</span
          >
        </span>
      </li>
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-gray-200 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-gray-700"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold whitespace-nowrap"
            >3</span
          >
          <span class="whitespace-nowrap">Cotización</span>
        </span>
      </li>
      <li class="flex flex-none items-center">
        <span class="flex items-center whitespace-nowrap">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold whitespace-nowrap"
            >4</span
          >
          <span class="whitespace-nowrap">Orden de Trabajo</span>
        </span>
      </li>
    </ol>
  </div>

  <div class="px-4 pt-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4">
        <div class="flex items-center gap-2 mb-4">
          <FileText class="w-5 h-5 text-gray-900 dark:text-gray-900" />
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Información General</h3>
          <span v-if="recepcion" class="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
            Recepción #{{ recepcion.numero_recepcion || recepcion.id }}
          </span>
        </div>

        <div v-if="recepcion" class="grid grid-cols-5 gap-4">
          <div class="col-span-3">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</label>
            <div class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              {{ clienteInfo?.nombre || '—' }}
            </div>
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.identificacion || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.telefono || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteInfo?.email || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="col-span-2">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo</label>
            <div class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              {{ vehiculoInfo?.placa || '—' }}
            </div>
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <TagIcon class="w-3.5 h-3.5 shrink-0" /> Marca:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.marca || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.modelo || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoInfo?.color || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-5 gap-4">
          <div class="col-span-3">
            <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</label>
            <ClienteSearchSelect
              id="cliente"
              v-model="clienteSearch"
              :error="Boolean(formErrors.cliente)"
              :error-message="formErrors.cliente"
              :show-create="true"
              @select="selectCliente"
              @clear="clearCliente"
              @create="showClientCreateModal = true"
            />
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteSeleccionado?.identificacion || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteSeleccionado?.telefono || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ clienteSeleccionado?.email || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="relative col-span-2">
            <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo</label>
            <VehiculoSearchSelect
              id="vehiculo"
              v-model="vehiculoSearch"
              :cliente-id="clienteSeleccionado?.id || null"
              :disabled="!clienteSeleccionado"
              :placeholder="clienteSeleccionado ? 'Buscar placa...' : 'Selecciona un cliente primero'"
              class="relative"
              @select="selectVehiculo"
            />
            <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <TagIcon class="w-3.5 h-3.5 shrink-0" /> Marca:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoSeleccionado?.marca || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoSeleccionado?.modelo || '—' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculoSeleccionado?.color || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative p-6 bg-white rounded-lg shadow dark:bg-gray-800">
        <div v-if="isLoading" class="p-4 text-sm text-gray-500 dark:text-gray-400">Cargando inspección...</div>

        <template v-else>
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="flex flex-wrap -mb-px">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'informacion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'informacion'"
              >
                <ClipboardList class="w-4 h-4" />
                1. Inspección
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'testigos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'testigos'"
              >
                <TriangleAlert class="w-4 h-4" />
                2. Testigos luminosos
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'fotos' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'fotos'"
              >
                <CameraIcon class="w-4 h-4" />
                3. Evidencia
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'servicios' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'servicios'"
              >
                <Toolbox class="w-4 h-4" />
                4. Servicios &amp; Repuestos
              </button>
            </nav>
          </div>

          <form class="p-4 space-y-6" novalidate @submit.prevent="submit">
            <div v-show="activeTab === 'informacion'" class="col-span-1 space-y-4">
              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <h5 class="mb-4 font-semibold text-gray-900 dark:text-white">Clasificación</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="col-span-1">
                  <label for="tipo_inspeccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Inspección</label>
                  <select id="tipo_inspeccion" v-model="form.tipo_inspeccion" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                    <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                    <option value="CORRECTIVO">Revisión Correctiva</option>
                    <option value="DIAGNOSTICO">Diagnóstico</option>
                    <option value="ESTETICA">Evaluación Estética</option>
                    <option value="GARANTIA">Revisión por Garantía</option>
                  </select>
                </div>
                <div class="col-span-1">
                  <label for="codigos_dtc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Códigos de Falla (DTC OBD2)</label>
                  <input id="codigos_dtc" v-model="form.codigos_dtc" maxlength="255" placeholder="Ej: P0300, P0171..." class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                </div>
                </div>
              </div>

              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo * </label>
                <textarea id="motivo_ingreso" v-model="form.motivo_ingreso" rows="3" maxlength="500" placeholder="Razón por la cual el cliente trae el vehículo o falla reportada..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_ingreso ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
                <p v-if="formErrors.motivo_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
              </div>

              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <TextImprover
                  v-model="form.diagnostico_tecnico"
                  contexto="diagnóstico técnico de una inspección vehicular"
                  v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <label for="diagnostico_tecnico" class="block text-sm font-medium text-gray-900 dark:text-white">Diagnóstico *</label>
                    <button
                      type="button"
                      title="Mejorar el texto con IA"
                      :disabled="mejorando"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 focus:ring-4 focus:ring-primary-blue-300 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="mejorar"
                    >
                      <Wand2 v-if="!mejorando" class="w-4 h-4" />
                      <Loader2 v-else class="w-4 h-4 animate-spin" />
                      {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                    </button>
                  </div>
                  <textarea id="diagnostico_tecnico" v-model="form.diagnostico_tecnico" rows="4" maxlength="1000" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.diagnostico_tecnico ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
                  <p v-if="formErrors.diagnostico_tecnico" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.diagnostico_tecnico }}</p>
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

              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <TextImprover
                  v-model="form.recomendaciones"
                  contexto="recomendaciones y plan de acción de una inspección vehicular"
                  v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <label for="recomendaciones" class="block text-sm font-medium text-gray-900 dark:text-white">Recomendaciones *</label>
                    <button
                      type="button"
                      title="Mejorar el texto con IA"
                      :disabled="mejorando"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 focus:ring-4 focus:ring-primary-blue-300 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="mejorar"
                    >
                      <Wand2 v-if="!mejorando" class="w-4 h-4" />
                      <Loader2 v-else class="w-4 h-4 animate-spin" />
                      {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                    </button>
                  </div>
                  <textarea id="recomendaciones" v-model="form.recomendaciones" rows="3" maxlength="1000" :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.recomendaciones ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
                  <p v-if="formErrors.recomendaciones" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.recomendaciones }}</p>
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

            <div v-show="activeTab === 'testigos'" class="col-span-1">
              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <TestigosTablero v-model="testigos" />
              </div>
            </div>

            <div v-show="activeTab === 'fotos'" class="col-span-1">
              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  Opcional: hasta {{ FOTO_MAX }} fotos de evidencia de los hallazgos (DTC en pantalla, desgastes, fugas, testigos encendidos).
                  JPG, PNG o WebP de máximo 5 MB.
                </p>

                <PhotoUploadGrid
                  ref="photosGrid"
                  v-model="fotosInspeccion"
                  :entity-id="fotosEntityId"
                  entity-field="inspeccion"
                  :service="inspeccionesService"
                  :max="FOTO_MAX"
                  entity-label="inspección"
                  :disabled="isEditMode && estadoInspeccion === 'FINALIZADA'"
                  disabled-message="La inspección está finalizada; reábrela para poder modificar las fotos."
                />
              </div>
            </div>

            <div v-show="activeTab === 'servicios'" class="col-span-1 space-y-4">
              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">
                  <span class="inline-flex items-center gap-2">
                    <Toolbox class="w-5 h-5 text-gray-800 dark:text-white" />
                    Servicios / Mano de Obra
                  </span>
                </h5>
                <div class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-visible">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Servicio</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Horas</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Opcional</th>
                        <th class="p-2"></th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-if="!serviciosDetectados.length">
                        <td colspan="5" class="p-4 text-sm text-center text-gray-500 dark:text-gray-400">No hay servicios detectados.</td>
                      </tr>
                      <tr v-for="(s, index) in serviciosDetectados" :key="s.id || s.sufijo">
                        <td class="p-2">
                          <CatalogoSelect
                            :input-id="`svc-desc-${s.sufijo}`"
                            v-model="s.descripcion"
                            :catalogo="catalogoServicios"
                            placeholder="Busca y selecciona..."
                            mensaje-sin-resultados="Sin coincidencias. Puedes escribir un servicio libre."
                            :error="!!s.error"
                            :error-message="s.error"
                            @select="(item) => seleccionarServicio(item, s)"
                          />
                        </td>
                        <td class="p-2">
                          <input :id="`svc-horas-${s.sufijo}`" v-model="s.horas_estimadas" type="number" step="0.25" min="0" max="999.99" class="block w-20 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
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
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="flex justify-end mt-3">
                  <button
                    type="button"
                    title="Añadir servicio detectado"
                    aria-label="Añadir servicio"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-700 hover:bg-primary-blue-800 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarServicioVacio"
                  >
                    <Plus class="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>

              <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4">
                <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">
                  <span class="inline-flex items-center gap-2">
                    <WrenchIcon class="w-5 h-5 text-gray-800 dark:text-white" />
                    Repuestos
                  </span>
                </h5>
                <div class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-visible">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead class="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Repuesto</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Cant.</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Prioridad</th>
                        <th class="p-2 text-xs font-medium text-left text-gray-700 uppercase dark:text-gray-300">Opcional</th>
                        <th class="p-2"></th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      <tr v-if="!repuestosSugeridos.length">
                        <td colspan="5" class="p-4 text-sm text-center text-gray-500 dark:text-gray-400">No hay repuestos sugeridos.</td>
                      </tr>
                      <tr v-for="(r, index) in repuestosSugeridos" :key="r.id || r.sufijo">
                        <td class="p-2">
                          <CatalogoSelect
                            :input-id="`rpt-desc-${r.sufijo}`"
                            v-model="r.descripcion"
                            :catalogo="catalogoRepuestos"
                            placeholder="Busca y selecciona..."
                            mostrar-stock
                            mensaje-sin-resultados="Sin coincidencias. Puedes escribir un repuesto libre."
                            :error="!!r.error"
                            :error-message="r.error"
                            @select="(item) => seleccionarRepuesto(item, r)"
                          />
                        </td>
                        <td class="p-2">
                          <input :id="`rpt-cant-${r.sufijo}`" v-model="r.cantidad" type="number" step="0.5" min="0" max="9999.99" class="block w-20 p-2 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
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
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="flex justify-end mt-3">
                  <button
                    type="button"
                    title="Añadir repuesto sugerido"
                    aria-label="Añadir repuesto"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-blue-700 hover:bg-primary-blue-800 focus:ring-4 focus:ring-primary-blue-300 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarRepuestoVacio"
                  >
                    <Plus class="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="activeTabIndex <= 0"
                @click="goToTab(-1)"
              >
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
                </svg>
                Anterior
              </button>
              <button
                type="button"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="activeTabIndex >= TAB_ORDER.length - 1"
                @click="goToTab(1)"
              >
                Siguiente
                <svg class="w-6 h-6 text-gray-800 dark:text-white ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
                </svg>
              </button>
            </div>
          </form>
        </template>
      </div>
      </div>
      <div class="lg:col-span-1 space-y-4">
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4">
          <div class="flex items-center gap-2 mb-3">
            <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-900" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Resumen de la inspección</h2>
          </div>
          <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div v-if="form.numero_inspeccion">
              <dt class="font-medium text-gray-700 dark:text-gray-300">N° Inspección</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ form.numero_inspeccion }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Cliente</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ clienteInfo?.nombre || '—' }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Vehículo</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ formatPlaca(vehiculoInfo?.placa) || '—' }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ tipoInspeccionLabel }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Estado</dt>
              <dd>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border" :class="estadoResumenBadge.classes">
                  <span class="w-2 h-2 rounded-full" :class="estadoResumenBadge.dot"></span>
                  {{ estadoResumenBadge.label }}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4">
          <div class="flex items-center gap-2 mb-3">
            <Car class="w-4 h-4 text-primary-blue-600 dark:text-primary-blue-400" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Vehículo</h3>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="vehiculoImagenSrc" class="h-full min-h-40 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
            </div>
            <div v-else class="h-full min-h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 dark:bg-gray-700 dark:border-gray-600">
              <div class="flex flex-col items-center gap-1.5 text-center">
                <Camera class="w-6 h-6" />
                <span>Foto del vehículo</span>
              </div>
            </div>
            <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5">
                    <IconEngine class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                    N° Motor:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculoInfo?.numero_motor || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5">
                    <component :is="transmisionIcon" class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                    Transmisión:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ transmisionLabel || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5">
                    <IconGasStation class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                    Combustible:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ combustibleLabel || '—' }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientCreated"
  />

  <ConfirmModal
    v-model="showFinalizarModal"
    title="Finalizar inspección"
    :message="'Al finalizar la inspección el diagnóstico queda cerrado. Podrás reabrirla desde el detalle si necesitas hacer cambios. ¿Deseas continuar?'"
    :icon="CheckCircle2"
    icon-class="text-primary-600 dark:text-primary-400"
    confirm-text="Sí, finalizar"
    confirming-text="Finalizando..."
    variant="primary"
    :is-deleting="transicionEstado"
    @confirm="confirmarFinalizar"
    @cancel="showFinalizarModal = false"
  />
</template>