<script setup>
import { computed, onMounted, ref } from 'vue';
import { Package, Wand2, Loader2, Plus, X, Camera, FileText, ClipboardList, Car } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/env';
import { ordenesService } from '../services/ordenesService';
import { PRIORIDADES_ORDEN } from '../constants/estadosOrden';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import PhotoUploadGrid from '../../../shared/components/PhotoUploadGrid.vue';
import EstadoOrdenBadge from './EstadoOrdenBadge.vue';
import ClienteSearchSelect from '../../../shared/components/ClienteSearchSelect.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import EmpleadoSearchSelect from '../../../shared/components/EmpleadoSearchSelect.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';
import FlowSteps from '../../../shared/components/FlowSteps.vue';
import RelacionesFlujoEdit from '../../../shared/components/RelacionesFlujoEdit.vue';
import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
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
const mostrarServicios = ref(true);

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
const activeTab = ref('trabajo');

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

function seleccionarMecanico(empleado) {
  form.value.mecanico_principal = empleado?.user?.id ? String(empleado.user.id) : '';
  mecanicoSearch.value = nombreEmpleado(empleado);
}

function limpiarMecanico() {
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
  BAJA: { label: 'Baja', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  MEDIA: { label: 'Media', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ALTA: { label: 'Alta', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  URGENTE: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const prioridadBadge = computed(() => PRIORIDAD_BADGES[form.value.prioridad] || { label: form.value.prioridad || '—', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });

const TIPOS = TIPOS_TRABAJO_OPCIONES;

const tipoTrabajoLabel = computed(() => {
  const tipo = TIPOS.find((t) => t.value === form.value.tipo_trabajo);
  return tipo ? tipo.label : (form.value.tipo_trabajo || '—');
});

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

/*const pasosFlujo = computed(() => {
  const ord = orden.value || {};
  const recepcionOrigen = recepciones.value[0] || null;
  return buildPasosFlujo([
    {
      entidad: 'recepcion',
      estado: ord.recepcion_estado,
      estadoDisplay: ord.recepcion_estado_display,
      id: recepcionOrigen?.id,
      numero: recepcionOrigen?.numero_recepcion,
    },
    {
      entidad: 'inspeccion',
      estado: ord.inspeccion_estado,
      estadoDisplay: ord.inspeccion_estado_display,
      id: inspeccion.value?.id,
      numero: inspeccion.value?.numero_inspeccion,
    },
    {
      entidad: 'cotizacion',
      estado: ord.cotizacion_estado,
      estadoDisplay: ord.cotizacion_estado_display,
      id: ord.cotizacion_id || ord.cotizacion_origen,
      numero: ord.cotizacion_numero || ord.cotizacion_origen_numero,
    },
    {
      entidad: 'orden',
      estado: ord.estado,
      estadoDisplay: ord.estado_display,
      id: ord.id,
      numero: ord.numero_orden,
    },
  ]);
});*/

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
  focusInput(`svc-horas-${fila.sufijo}`);
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
  servicios.value = (data.servicios || []).map(mapearServicio);
  repuestos.value = (data.repuestos || []).map(mapearRepuesto);
  fotosOt.value = (data.fotos || []).map((f) => ({
    id: f.id,
    file: null,
    preview: null,
    url: f.imagen,
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
  const ordenRef = Number(idOrden);
  if (!ordenRef) return;
  const errores = [];

  for (const s of servicios.value) {
    const payload = {
      descripcion: sanitizeObservaciones(s.descripcion || ''),
      horas_aplicadas: String(s.horas_aplicadas ?? '1.00'),
      precio_unitario: String(s.precio_unitario ?? '0.00'),
      descuento: String(s.descuento ?? '0.00'),
      iva_porcentaje: normalizarIva(s.iva_porcentaje),
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
      errores.push(`Servicio eliminado (#${id})`);
    }
  }
  for (const id of repuestosEliminados.value) {
    try {
      await ordenesService.deleteRepuesto(id);
    } catch (err) {
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

onMounted(async () => {
  loadCatalogo();
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

async function handleSubmit() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  successMessage.value = '';

  formErrors.value = { cliente: '', vehiculo: '' };
  if (!clienteSeleccionado.value) formErrors.value.cliente = 'Selecciona el cliente de la orden.';
  if (!vehiculoSeleccionado.value) formErrors.value.vehiculo = 'Selecciona el vehículo a atender.';
  if (formErrors.value.cliente || formErrors.value.vehiculo) {
    error.value = 'Completa los campos obligatorios del panel Información General (cliente y vehículo).';
    saving.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (form.value.estado === 'EN_ESPERA' && !String(form.value.motivo_espera || '').trim()) {
    error.value = 'Indica el motivo de la espera de la orden.';
    saving.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const datosOrden = {
    cliente: clienteSeleccionado.value.id,
    vehiculo: vehiculoSeleccionado.value.id,
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
    return;
  }

  if (!orden.value) {
    saving.value = false;
    return;
  }

  try {
    await ordenesService.update(orden.value.id, datosOrden);
    await guardarDetalles(orden.value.id);
    await photosGrid.value.guardarFotos();
    successMessage.value = 'Orden de trabajo guardada correctamente.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    error.value = err.message || 'No se pudo guardar la orden de trabajo.';
  } finally {
    saving.value = false;
  }
}
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
      <template v-if="orden">
        <EstadoOrdenBadge
          :estado="orden.estado"
          :estado-display="orden.estado_display"
          size="md"
        />
        <span
          class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
          :class="prioridadBadge.color"
        >Prioridad {{ prioridadBadge.label }}</span>
      </template>
    </template>
    <template #actions>
      <FormSaveActions
        v-if="!loading"
        :is-loading="saving"
        :is-edit-mode="isEditMode"
        :cancel-href="isEditMode ? `/crud/ordenes/ver/?id=${ordenId}` : '/crud/ordenes/'"
        :on-submit="handleSubmit"
      />
    </template>
  </EntityHeader>

  <div class="p-4">
    <!--div v-if="orden" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div-->
    <Alert v-if="successMessage" type="success" title="Guardado correctamente" :message="successMessage" dismissible @dismiss="successMessage = ''" />
    <Alert v-if="error" type="error" title="Error" :message="error" dismissible @dismiss="error = ''" />

    <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
      Cargando orden de trabajo...
    </div>

    <div v-else-if="isEditMode && !orden && !error" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
      Orden de trabajo no encontrada.
    </div>

    <form v-else class="grid grid-cols-1 gap-4 lg:grid-cols-4" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4 lg:col-span-3">
        <!-- Panel Información General -->
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
          <div class="flex items-center gap-2 mb-4">
            <FileText class="w-5 h-5 text-gray-900 dark:text-white" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Información General</h3>
          </div>

          <div class="space-y-4">
            <!-- Fila 1: Cliente, Vehículo y Mecánico -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="min-w-0">
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
              </div>
              <div class="min-w-0">
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
              </div>
              <div class="min-w-0">
                <label for="mecanico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Mecánico</label>
                <EmpleadoSearchSelect
                  id="mecanico"
                  v-model="mecanicoSearch"
                  placeholder="Buscar mecánico..."
                  @select="seleccionarMecanico"
                  @clear="limpiarMecanico"/>
              </div>
            </div>

            <!-- Fila 2: Fechas y tipo de trabajo -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="min-w-0">
                <label for="fecha_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Ingreso</label>
                <input
                  id="fecha_ingreso"
                  :value="fechaIngresoDisplay"
                  type="text"
                  readonly
                  disabled
                  placeholder="Se registra al crear"
                  class="block w-full p-2.5 text-sm text-gray-500 bg-gray-100 rounded shadow-xs border border-gray-300 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
              </div>
              <div class="min-w-0">
                <label for="fecha_entrega" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Entrega</label>
                <input
                  id="fecha_entrega"
                  v-model="form.fecha_entrega"
                  type="datetime-local"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded shadow-xs border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              </div>
              <div class="min-w-0">
                <label for="tipo_trabajo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Trabajo</label>
                <select id="tipo_trabajo" v-model="form.tipo_trabajo" class="block w-full p-2.5 text-sm bg-gray-50 rounded shadow-xs border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <option v-for="tipo in TIPOS" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
                </select>
              </div>
            </div>

            <!-- Fila 3: Prioridad -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="min-w-0">
                <label for="prioridad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Prioridad</label>
                <select id="prioridad" v-model="form.prioridad" class="block w-full p-2.5 text-sm bg-gray-50 rounded shadow-xs border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <option v-for="prioridad in PRIORIDADES_ORDEN" :key="prioridad.value" :value="prioridad.value">{{ prioridad.label }}</option>
                </select>
              </div>
            </div>

            <!-- Fila 4: Motivo de espera (solo si la orden está en espera) -->
            <div v-if="form.estado === 'EN_ESPERA'" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="min-w-0 sm:col-span-3">
                <label for="motivo_espera" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Espera <span class="text-accent-500">*</span></label>
                <input
                  id="motivo_espera"
                  v-model="form.motivo_espera"
                  type="text"
                  maxlength="80"
                  placeholder="Ej.: esperando repuestos, aprobación del cliente..."
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded shadow-xs border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Body: pestañas Trabajo / Evidencia -->
        <div class="relative p-6 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex flex-wrap -mb-px">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'trabajo' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'trabajo'">
                  <Package class="w-4 h-4" />
                  1. Trabajo
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                  :class="activeTab === 'evidencia' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                  @click="activeTab = 'evidencia'">
                  <Camera class="w-4 h-4" />
                  2. Evidencia
                </button>
              </nav>
            </div>

            <div v-show="activeTab === 'trabajo'" class="p-4 space-y-1">
              <div class="flex gap-4 mb-4 border-b border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  :class="[mostrarServicios ? 'pb-2 text-sm font-medium border-b-2 border-primary-blue-700 text-primary-blue-700 dark:border-primary-blue-400 dark:text-primary-blue-400' : 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
                  @click="mostrarServicios = true">Servicios</button>
                <button
                  type="button"
                  :class="[!mostrarServicios ? 'pb-2 text-sm font-medium border-b-2 border-primary-blue-700 text-primary-blue-700 dark:border-primary-blue-400 dark:text-primary-blue-400' : 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
                  @click="mostrarServicios = false">Repuestos</button>
              </div>

              <!-- Servicios -->
              <div v-show="mostrarServicios">
                <div class="relative overflow-x-visible bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                  <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                    <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th class="px-4 py-3">Servicio</th>
                        <th class="px-4 py-3 w-24 text-center">Horas</th>
                        <th class="px-4 py-3 w-36 text-center">P. unitario</th>
                        <th class="px-4 py-3 w-28 text-center">Descuento</th>
                        <th class="px-4 py-3 w-28 text-center">IVA</th>
                        <th class="px-4 py-3 w-32 text-center">Neto</th>
                        <th class="px-4 py-3 w-14 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!servicios.length">
                        <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay servicios de mano de obra.</td>
                      </tr>
                      <tr v-for="(servicio, index) in servicios" :key="servicio.sufijo || servicio.id" class="border-t border-gray-200 dark:border-gray-600">
                        <td class="px-4 py-2.5">
                          <div class="relative">
                            <CatalogoSelect
                              :input-id="`svc-desc-${servicio.sufijo}`"
                              v-model="servicio.descripcion"
                              :catalogo="catalogoServicios"
                              placeholder="Busca y selecciona..."
                              mensaje-sin-resultados="Sin coincidencias. Puedes escribir un servicio libre."
                              @select="(item) => seleccionarServicio(item, servicio)"
                            />
                          </div>
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input :id="`svc-horas-${servicio.sufijo}`" v-model="servicio.horas_aplicadas" type="number" min="0" step="0.5" class="w-full p-2 text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="servicio.precio_unitario" type="number" min="0" step="0.01" class="w-full p-2 text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <input v-model="servicio.descuento" type="number" min="0" step="0.01" class="w-full p-2 text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5 text-center">
                          <select v-model="servicio.iva_porcentaje" class="w-full p-2 text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                            <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                          </select>
                        </td>
                        <td class="px-4 py-2.5 font-medium text-center">$ {{ formatNumber(netoServicio(servicio)) }}</td>
                        <td class="px-4 py-2.5 text-center">
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
                    type="button"
                    title="Añadir servicio o mano de obra"
                    aria-label="Añadir servicio"
                    class="add-row-btn inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary-blue-700 text-white hover:bg-primary-blue-800 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarServicioVacio"
                  >
                    <Plus class="w-4 h-4" />
                    Añadir servicio
                  </button>
                </div>
              </div>

              <!-- Repuestos -->
              <div v-show="!mostrarServicios">
                <div class="relative overflow-x-visible bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                  <table class="w-full text-sm text-left text-gray-900 dark:text-white">
                    <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th class="px-4 py-3">Repuesto</th>
                        <th class="px-4 py-3 w-24 text-center">Cant.</th>
                        <th class="px-4 py-3 w-36 text-center">P. unitario</th>
                        <th class="px-4 py-3 w-28 text-center">Descuento</th>
                        <th class="px-4 py-3 w-20 text-center">IVA</th>
                        <th class="px-4 py-3 w-32 text-center">Neto</th>
                        <th class="px-4 py-3 w-14 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!repuestos.length">
                        <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay repuestos o materiales.</td>
                      </tr>
                      <tr v-for="(repuesto, index) in repuestos" :key="repuesto.sufijo || repuesto.id" class="border-t border-gray-200 dark:border-gray-600">
                        <td class="px-4 py-2.5">
                          <div class="relative">
                            <CatalogoSelect
                              :input-id="`rpt-desc-${repuesto.sufijo}`"
                              v-model="repuesto.descripcion"
                              :catalogo="catalogoRepuestos"
                              placeholder="Busca y selecciona..."
                              mostrar-stock
                              mensaje-sin-resultados="Sin coincidencias. Puedes escribir un repuesto libre."
                              @select="(item) => seleccionarRepuesto(item, repuesto)"
                            />
                          </div>
                        </td>
                        <td class="px-4 py-2.5">
                          <input :id="`rpt-cant-${repuesto.sufijo}`" v-model="repuesto.cantidad" type="number" min="1" step="1" class="w-full p-2 text-center text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5">
                          <input v-model="repuesto.precio_unitario" type="number" min="0" step="0.01" class="w-full p-2 text-center text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5">
                          <input v-model="repuesto.descuento" type="number" min="0" step="0.01" class="w-full p-2 text-center text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        </td>
                        <td class="px-4 py-2.5">
                          <select v-model="repuesto.iva_porcentaje" class="w-full p-2 text-center text-center text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                            <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                          </select>
                        </td>
                        <td class="px-4 py-2.5 font-medium text-center">$ {{ formatNumber(netoRepuesto(repuesto)) }}</td>
                        <td class="px-4 py-2.5 text-center">
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
                    type="button"
                    title="Añadir repuesto o material"
                    aria-label="Añadir repuesto"
                    class="add-row-btn inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary-blue-700 text-white hover:bg-primary-blue-800 dark:bg-primary-blue-600 dark:hover:bg-primary-blue-700"
                    @click="agregarRepuestoVacio"
                  >
                    <Plus class="w-4 h-4" />
                    Añadir repuesto
                  </button>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'evidencia'" class="p-4">
              <!-- Fotos de la orden: subida -->
              <!--h4 class="mb-4 text-xl font-semibold dark:text-white">
                <span class="inline-flex items-center gap-2">
                  <Camera class="w-6 h-6 text-gray-800 dark:text-white" />
                  Fotos de la Orden
                </span>
              </h4-->
              <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Adjunta evidencia del trabajo realizado (hasta {{ FOTO_MAX }} fotos). Solo JPG, PNG o WebP de máximo 5 MB.
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
                disabled-message="La orden está cancelada; no se pueden subir fotos."
              />
            </div>
            <!-- Observaciones y Resumen (siempre visibles, fuera de pestañas) -->
            <div class="p-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <!-- Columna izquierda: Observaciones -->
              <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
                <TextImprover
                  v-model="form.observaciones"
                  contexto="observaciones de una orden de trabajo de un taller mecánico"
                  v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <label for="observaciones" class="block text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
                    <button
                      type="button"
                      title="Mejorar el texto con IA"
                      :disabled="mejorando"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="mejorar">
                      <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                      <Wand2 v-else class="w-4 h-4" />
                      {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                    </button>
                  </div>
                  <textarea id="observaciones" v-model="form.observaciones" rows="6" class="block w-full p-2.5 text-sm bg-gray-50 rounded shadow-xs border border-gray-300 focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder=""></textarea>
                  <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
                  <div v-if="mejorado && !errorMejora" class="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <p>Texto mejorado. Revisa antes de guardar.</p>
                    <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
                  </div>
                </TextImprover>
              </div>
    
              <!-- Columna derecha: Resumen (igual que Cotización) -->
              <div class="p-5 space-y-2 text-sm rounded-lg border border-gray-200 dark:bg-gray-700/40 dark:border-gray-600/60">
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal servicios</span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(subtotalServicios) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal repuestos </span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(subtotalRepuestos) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal neto</span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(subtotalNeto) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Descuento total</span>
                  <span class="font-medium tabular-nums text-accent-600 dark:text-accent-400">$ {{ formatNumber(descuentoTotal) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal base 0%</span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(subtotalBase0) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal base gravada</span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(subtotalBaseGravada) }}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>IVA total</span>
                  <span class="font-medium tabular-nums">$ {{ formatNumber(montoIva) }}</span>
                </div>
                <div class="flex items-center justify-between pt-3 mt-3 text-base font-bold border-t border-gray-200 text-gray-900 dark:border-gray-600 dark:text-white">
                  <span>Total</span>
                  <span class="tabular-nums">$ {{ formatNumber(totalOt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      <!-- Panel lateral: resumen de la orden -->
      <div class="space-y-4 lg:col-span-1">
        <div v-if="!isEditMode || orden" class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
          <div class="flex items-center gap-2 mb-3">
            <ClipboardList class="w-5 h-5 text-gray-900 dark:text-white" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Resumen de la orden</h2>
          </div>
          <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div v-if="orden?.numero_orden">
              <dt class="font-medium text-gray-700 dark:text-gray-300">N° Orden</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ orden.numero_orden }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Cliente</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ cliente?.nombre || '—' }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Vehículo</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ formatPlaca(vehiculo?.placa) || '—' }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Mecánico</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ mecanicoSearch || '—' }}</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo de trabajo</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ tipoTrabajoLabel }}</dd>
            </div>
            <div v-if="fechaIngresoDisplay">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Fecha de ingreso</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ fechaIngresoDisplay }}</dd>
            </div>
            <div v-if="form.fecha_entrega">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Fecha de entrega</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ formatDate(form.fecha_entrega) }}</dd>
            </div>
            <div v-if="orden?.sucursal_nombre">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Taller</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ orden.sucursal_nombre }}</dd>
            </div>
            <div v-if="orden?.asesor_nombre">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Asesor</dt>
              <dd class="font-medium text-sm text-black dark:text-white">{{ orden.asesor_nombre }}</dd>
            </div>
            <div v-if="orden">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Estado</dt>
              <dd>
                <EstadoOrdenBadge
                  :estado="orden.estado"
                  :estado-display="orden.estado_display"
                  size="sm"
                />
              </dd>
            </div>
            <div v-if="orden?.cotizacion_origen">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Cotización de origen</dt>
              <dd class="font-medium text-sm">
                <a :href="`/crud/cotizaciones/editar/?id=${orden.cotizacion_origen}`" class="text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                  {{ orden.cotizacion_origen_numero || `#${orden.cotizacion_origen}` }}
                </a>
              </dd>
            </div>
            <div v-if="inspeccion">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Inspección</dt>
              <dd class="font-medium text-sm">
                <a :href="`/crud/inspecciones/ver/?id=${inspeccion.id}`" class="text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                  {{ inspeccion.numero_inspeccion || `#${inspeccion.id}` }}
                </a>
              </dd>
            </div>
            <div v-if="recepciones.length">
              <dt class="font-medium text-gray-700 dark:text-gray-300">Recepción / es</dt>
              <dd class="font-medium text-sm">
                <a
                  v-for="recepcion in recepciones"
                  :key="recepcion.id"
                  :href="`/crud/recepciones/ver/?id=${recepcion.id}`"
                  class="text-primary-blue-700 hover:underline dark:text-primary-blue-400"
                >
                  {{ recepcion.numero_recepcion || `#${recepcion.id}` }}<span v-if="recepcion !== recepciones[recepciones.length - 1]">, </span>
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Panel lateral: vehículo -->
        <div v-if="vehiculo" class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
          <div class="flex items-center gap-2 mb-3">
            <Car class="w-5 h-5 text-gray-900 dark:text-white" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Vehículo</h2>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="vehiculoImagenSrc" class="h-full min-h-40 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
            </div>
            <div v-else class="flex h-full min-h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
              <div class="flex flex-col items-center gap-1.5 text-center">
                <Camera class="w-6 h-6" />
                <span>Foto del vehículo</span>
              </div>
            </div>
            <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Marca</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo.marca || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Modelo</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo.modelo || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Año</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo.anio || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Color</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo.color || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Kilometraje actual</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo.kilometraje_actual != null ? `${vehiculo.kilometraje_actual} km` : '—' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <RelacionesFlujoEdit
          v-if="isEditMode && relacionesCargadas"
          class="relative mx-auto max-w-6xl mb-5"
          tipo-entidad="orden"
          :entidad-id="ordenId"
          :relaciones="relacionesOrden"
          :puede-agregar="puedeAgregarRelacion"
          :al-vincular="vincularRelacion"
          :al-desvincular="desvincularRelacion"
        />
      </div>
    </form>
  </div>

  <ClientModal v-model="showClientCreateModal" @created="onClientCreated" />
</template>
