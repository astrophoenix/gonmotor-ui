<script setup>
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, User, Wrench, Package, Wand2, Loader2, Plus, X, Camera } from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { ordenesService } from '../services/ordenesService';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import PhotoUploadGrid from '../../../shared/components/PhotoUploadGrid.vue';
import FlowSteps from '../../../shared/components/FlowSteps.vue';
import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';

const orden = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const success = ref(false);
const empleados = ref([]);
const servicios = ref([]);
const repuestos = ref([]);
const serviciosEliminados = ref([]);
const repuestosEliminados = ref([]);
const catalogoServicios = ref([]);
const catalogoRepuestos = ref([]);
const mostrarServicios = ref(true);

const IVA_PORCENTAJE = 0.15;

const FOTO_MAX = 5;
const fotosOt = ref([]);
const photosGrid = ref(null);

const ordenId = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
});

const form = ref({
  estado: 'INGRESADO',
  prioridad: 'MEDIA',
  tipo_trabajo: 'PREVENTIVO',
  mecanico_principal: '',
  fecha_entrega: '',
  observaciones_internas: '',
});

const ESTADOS = [
  { value: 'INGRESADO', label: 'En Recepción / Diagnóstico' },
  { value: 'EN_PROCESO', label: 'En Trabajo / Ejecución' },
  { value: 'COMPLETADO', label: 'Trabajo Listo' },
  { value: 'ENTREGADO', label: 'Entregado y Cerrado' },
  { value: 'CANCELADO', label: 'Anulado / Cancelado' },
];

const ESTADO_BADGES = {
  INGRESADO: { label: 'En Recepción / Diagnóstico', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  EN_PROCESO: { label: 'En Trabajo / Ejecución', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  COMPLETADO: { label: 'Trabajo Listo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  ENTREGADO: { label: 'Entregado y Cerrado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  CANCELADO: { label: 'Anulado / Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const estadoBadge = computed(() => ESTADO_BADGES[form.value.estado] || { label: form.value.estado || '—', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });

const PRIORIDADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente / Emergencia' },
];

const PRIORIDAD_BADGES = {
  BAJA: { label: 'Baja', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  MEDIA: { label: 'Media', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ALTA: { label: 'Alta', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  URGENTE: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const prioridadBadge = computed(() => PRIORIDAD_BADGES[form.value.prioridad] || { label: form.value.prioridad || '—', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' });

const TIPOS = [
  { value: 'PREVENTIVO', label: 'Mantenimiento Preventivo' },
  { value: 'CORRECTIVO', label: 'Reparación Correctiva' },
  { value: 'DIAGNOSTICO', label: 'Solo Diagnóstico / Escaneo' },
  { value: 'ESTETICA', label: 'Enderezada, Pintura o Detailing' },
  { value: 'GARANTIA', label: 'Garantía / Retorno' },
];

const tipoTrabajoLabel = computed(() => {
  const tipo = TIPOS.find((t) => t.value === form.value.tipo_trabajo);
  return tipo ? tipo.label : (form.value.tipo_trabajo || '—');
});

const subtotalServicios = computed(() =>
  servicios.value.reduce((acc, s) => acc + (Number(s.horas_aplicadas) || 0) * (Number(s.precio_unitario) || 0), 0)
);
const subtotalRepuestos = computed(() =>
  repuestos.value.reduce((acc, r) => acc + (Number(r.cantidad) || 0) * (Number(r.precio_unitario) || 0), 0)
);
const subtotalNeto = computed(() => {
  const bruto = subtotalServicios.value + subtotalRepuestos.value;
  return Math.max(0, bruto - (Number(orden.value?.descuento) || 0));
});
const montoIva = computed(() => subtotalNeto.value * IVA_PORCENTAJE);
const totalOt = computed(() => subtotalNeto.value + montoIva.value);

const cliente = computed(() => orden.value?.cliente || null);
const vehiculo = computed(() => orden.value?.vehiculo || null);
const inspeccion = computed(() => orden.value?.inspeccion || null);
const recepciones = computed(() => orden.value?.recepciones || []);

const pasosFlujo = computed(() => {
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
});

const mecanicosOptions = computed(() => {
  const base = empleados.value.map((empleado) => ({
    value: String(empleado.user?.id),
    label: [empleado.user?.first_name, empleado.user?.last_name].filter(Boolean).join(' ')
      || empleado.user?.username
      || empleado.user?.email
      || 'Empleado',
  }));
  const actualId = form.value.mecanico_principal;
  const actualNombre = orden.value?.mecanico_nombre;
  if (actualId && actualNombre && !base.some((option) => option.value === String(actualId))) {
    base.unshift({ value: String(actualId), label: actualNombre });
  }
  return base;
});

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function goTo(path) {
  window.location.assign(path);
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

async function cargarEmpleados() {
  try {
    const data = await request('/api/auth/empleados/');
    const list = Array.isArray(data) ? data : (data && data.results) || [];
    empleados.value = list.filter((empleado) => Boolean(empleado.user?.id));
  } catch (err) {
    empleados.value = [];
  }
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
  focusInput(`svc-horas-${fila.sufijo}`);
}

function seleccionarRepuesto(item, fila) {
  fila.codigo_repuesto = item.codigo || '';
  fila.descripcion = formatearItem(item.codigo, item.nombre);
  fila.cantidad = '1';
  fila.precio_unitario = String(item.precio_venta ?? '0.00');
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
    estado: data.estado || 'INGRESADO',
    prioridad: data.prioridad || 'MEDIA',
    tipo_trabajo: data.tipo_trabajo || 'PREVENTIVO',
    mecanico_principal: data.mecanico_principal || '',
    fecha_entrega: toDateTimeLocal(data.fecha_entrega),
    observaciones_internas: data.observaciones_internas || '',
  };
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
  if (!ordenId.value) {
    error.value = 'Falta el identificador de la orden de trabajo.';
    loading.value = false;
    return;
  }
  cargarEmpleados();
  loadCatalogo();
  try {
    const data = await ordenesService.getById(ordenId.value);
    aplicarOrden(data);
  } catch (err) {
    error.value = err.message || 'Error al cargar la orden de trabajo.';
  } finally {
    loading.value = false;
  }
});

const fotoZoom = ref('');

function abrirFotoZoom(url) {
  if (!url) return;
  fotoZoom.value = url;
}

function cerrarFotoZoom() {
  fotoZoom.value = '';
}

async function handleSubmit() {
  if (!orden.value) return;
  saving.value = true;
  error.value = '';
  success.value = false;

  const payload = {
    estado: form.value.estado,
    prioridad: form.value.prioridad,
    tipo_trabajo: form.value.tipo_trabajo,
    observaciones_internas: form.value.observaciones_internas,
  };
  if (form.value.mecanico_principal) {
    payload.mecanico_principal = form.value.mecanico_principal;
  } else {
    payload.mecanico_principal = null;
  }
  if (form.value.fecha_entrega) {
    payload.fecha_entrega = new Date(form.value.fecha_entrega).toISOString();
  } else {
    payload.fecha_entrega = null;
  }

  try {
    await ordenesService.update(orden.value.id, payload);
    await guardarDetalles(orden.value.id);
    await photosGrid.value.guardarFotos();
    success.value = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => goTo(`/crud/ordenes/ver/?id=${orden.value.id}`), 1500);
  } catch (err) {
    error.value = err.message || 'No se pudo guardar la orden de trabajo.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400">/ <a href="/crud/ordenes/" class="hover:text-primary-600">Órdenes</a></li>
        <li class="text-gray-400">/ Editar orden {{ orden?.numero_orden || '' }}</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <a href="/crud/ordenes/" title="Volver al listado" class="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
          <ArrowLeft class="w-5 h-5" />
        </a>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          Editar Orden de Trabajo {{ orden?.numero_orden || '' }}
        </h1>
      </div>
      <span v-if="orden" class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium" :class="estadoBadge.color">
        {{ estadoBadge.label }}
      </span>
      <span v-if="orden" class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium" :class="prioridadBadge.color">
        Prioridad {{ prioridadBadge.label }}
      </span>
      <div class="flex items-center ml-auto gap-2 flex-wrap">
        <FormSaveActions
          v-if="orden"
          :is-loading="saving"
          :is-edit-mode="true"
          :cancel-href="`/crud/ordenes/ver/?id=${ordenId}`"
          :on-submit="handleSubmit"
        />
      </div>
    </div>
  </div>

  <div class="p-4">
    <div v-if="orden" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div>
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="success" type="success" title="Guardado correctamente" message="Redirigiendo al detalle..." dismissible @dismiss="success = false" />
      <Alert v-if="error" type="error" title="Error" :message="error" dismissible @dismiss="error = ''" />

      <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
        Cargando orden de trabajo...
      </div>

      <div v-else-if="!orden && !error" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Orden de trabajo no encontrada.
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <!-- Resumen: contexto de solo lectura -->
        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <User class="w-6 h-6 text-gray-800 dark:text-white" />
            Información General
          </span>
        </h4>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-700/40 dark:border-gray-600/60">
          <div>
            <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
            <div class="flex flex-col gap-4 sm:flex-row">
              <dl class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.placa || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje actual</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.kilometraje_actual != null ? `${vehiculo.kilometraje_actual} km` : '—' }}</dd>
                </div>
              </dl>
              <div class="w-full shrink-0 sm:w-36">
                <button
                  v-if="vehiculo?.imagen"
                  type="button"
                  title="Ver foto del vehículo"
                  class="block w-full overflow-hidden rounded-lg border border-gray-200 cursor-zoom-in dark:border-gray-600"
                  @click="abrirFotoZoom(vehiculo.imagen)"
                >
                  <img :src="vehiculo.imagen" alt="Foto del vehículo" class="h-28 w-full object-cover" />
                </button>
                <div v-else class="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  Sin foto
                </div>
              </div>
            </div>
          </div>

          <div class="sm:col-span-2 lg:col-span-2">
            <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Origen y Responsables</h5>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° Orden</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ orden.numero_orden || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Taller</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.sucursal_nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Trabajo</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ tipoTrabajoLabel }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Asesor</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.asesor_nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Mecánico Principal</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ orden.mecanico_nombre || 'Sin asignar' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Ingreso</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_ingreso || orden.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Entrega</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(orden.fecha_entrega) }}</dd>
              </div>
              <div v-if="orden.cotizacion_origen">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cotización de Origen</dt>
                <dd class="mt-0.5 text-sm font-semibold">
                  <a :href="`/crud/cotizaciones/editar/?id=${orden.cotizacion_origen}`" class="text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                    {{ orden.cotizacion_origen_numero || `#${orden.cotizacion_origen}` }}
                  </a>
                </dd>
              </div>
              <div v-if="inspeccion">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Inspección</dt>
                <dd class="mt-0.5 text-sm font-semibold">
                  <a :href="`/crud/inspecciones/ver/?id=${inspeccion.id}`" class="text-primary-blue-700 hover:underline dark:text-primary-blue-400">
                    {{ inspeccion.numero_inspeccion || `#${inspeccion.id}` }}
                  </a>
                </dd>
              </div>
              <div v-if="recepciones.length">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recepción / es</dt>
                <dd class="mt-0.5 text-sm font-semibold">
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
        </div>

        <!-- Ejecución: campos editables -->
        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Wrench class="w-6 h-6 text-gray-800 dark:text-white" />
            Ejecución de la Orden
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="estado" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Estado</label>
            <select id="estado" v-model="form.estado" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option v-for="estado in ESTADOS" :key="estado.value" :value="estado.value">{{ estado.label }}</option>
            </select>
          </div>
          <div>
            <label for="prioridad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Prioridad</label>
            <select id="prioridad" v-model="form.prioridad" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option v-for="prioridad in PRIORIDADES" :key="prioridad.value" :value="prioridad.value">{{ prioridad.label }}</option>
            </select>
          </div>
          <div>
            <label for="tipo_trabajo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Trabajo</label>
            <select id="tipo_trabajo" v-model="form.tipo_trabajo" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option v-for="tipo in TIPOS" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
            </select>
          </div>
          <div>
            <label for="mecanico_principal" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Mecánico Principal</label>
            <select id="mecanico_principal" v-model="form.mecanico_principal" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              <option value="">Sin asignar</option>
              <option v-for="mecanico in mecanicosOptions" :key="mecanico.value" :value="mecanico.value">{{ mecanico.label }}</option>
            </select>
          </div>
          <div>
            <label for="fecha_entrega" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Entrega</label>
            <input id="fecha_entrega" v-model="form.fecha_entrega" type="datetime-local" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </div>
          <div class="md:col-span-2">
            <TextImprover
              v-model="form.observaciones_internas"
              contexto="observaciones internas de una orden de trabajo de un taller mecánico"
              v-slot="{ mejorar, restaurar, mejorando, error: errorMejora, mejorado, tieneOriginal }"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <label for="observaciones_internas" class="block text-sm font-medium text-gray-900 dark:text-white">Observaciones Internas</label>
                <button
                  type="button"
                  title="Mejorar el texto con IA"
                  :disabled="mejorando"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="mejorar"
                >
                  <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                  <Wand2 v-else class="w-4 h-4" />
                  {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                </button>
              </div>
              <textarea id="observaciones_internas" v-model="form.observaciones_internas" rows="3" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Notas no visibles para el cliente"></textarea>
              <p v-if="errorMejora" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errorMejora }}</p>
              <div v-if="mejorado && !errorMejora" class="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                <p>Texto mejorado. Revisa antes de guardar.</p>
                <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
              </div>
            </TextImprover>
          </div>
        </div>

        <!-- Trabajos: líneas editables de la orden -->
        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Package class="w-6 h-6 text-gray-800 dark:text-white" />
            Trabajos de la Orden
          </span>
        </h4>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Servicios y repuestos que se ejecutarán en esta orden. Si la orden proviene de una cotización aceptada, ya vienen cargados; puedes ajustarlos o añadir líneas.
        </p>

        <div class="flex gap-4 mb-4 border-b border-gray-200 dark:border-gray-600">
          <button
            type="button"
            :class="[mostrarServicios ? 'pb-2 text-sm font-medium border-b-2 border-primary-blue-700 text-primary-blue-700 dark:border-primary-blue-400 dark:text-primary-blue-400' : 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
            @click="mostrarServicios = true"
          >Servicios</button>
          <button
            type="button"
            :class="[!mostrarServicios ? 'pb-2 text-sm font-medium border-b-2 border-primary-blue-700 text-primary-blue-700 dark:border-primary-blue-400 dark:text-primary-blue-400' : 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
            @click="mostrarServicios = false"
          >Repuestos / Materiales</button>
        </div>

        <!-- Servicios -->
        <div v-show="mostrarServicios">
          <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Servicios</h5>
          <div class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-visible">
            <table class="w-full text-sm text-left text-gray-900 dark:text-white">
              <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-4 py-3">Servicio</th>
                  <th class="px-4 py-3 w-24">Horas</th>
                  <th class="px-4 py-3 w-36">P. unitario</th>
                  <th class="px-4 py-3 w-36">Subtotal</th>
                  <th class="px-4 py-3 w-14"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!servicios.length">
                  <td colspan="5" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay servicios de mano de obra.</td>
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
                  <td class="px-4 py-2.5">
                    <input :id="`svc-horas-${servicio.sufijo}`" v-model="servicio.horas_aplicadas" type="number" min="0" step="0.5" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                  </td>
                  <td class="px-4 py-2.5">
                    <input v-model="servicio.precio_unitario" type="number" min="0" step="0.01" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                  </td>
                  <td class="px-4 py-2.5 font-medium">$ {{ formatNumber((Number(servicio.horas_aplicadas) || 0) * (Number(servicio.precio_unitario) || 0)) }}</td>
                  <td class="px-4 py-2.5">
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
          <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Repuestos / Materiales</h5>
          <div class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-visible">
            <table class="w-full text-sm text-left text-gray-900 dark:text-white">
              <thead class="text-xs uppercase bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-4 py-3">Repuesto</th>
                  <th class="px-4 py-3 w-24">Cant.</th>
                  <th class="px-4 py-3 w-36">P. unitario</th>
                  <th class="px-4 py-3 w-36">Subtotal</th>
                  <th class="px-4 py-3 w-14"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!repuestos.length">
                  <td colspan="5" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No hay repuestos o materiales.</td>
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
                    <input :id="`rpt-cant-${repuesto.sufijo}`" v-model="repuesto.cantidad" type="number" min="1" step="1" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                  </td>
                  <td class="px-4 py-2.5">
                    <input v-model="repuesto.precio_unitario" type="number" min="0" step="0.01" class="w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                  </td>
                  <td class="px-4 py-2.5 font-medium">$ {{ formatNumber((Number(repuesto.cantidad) || 0) * (Number(repuesto.precio_unitario) || 0)) }}</td>
                  <td class="px-4 py-2.5">
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

        <h5 class="mt-8 mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Montos</h5>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Servicios</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(subtotalServicios) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Repuestos</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(subtotalRepuestos) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Descuento</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(orden.descuento) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal Neto</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(subtotalNeto) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">IVA (15%)</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatNumber(montoIva) }} USD</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total</dt>
            <dd class="mt-1 text-lg font-bold text-gray-900 dark:text-white">{{ formatNumber(totalOt) }} USD</dd>
          </div>
        </dl>

        <!-- Fotos de la orden: subida -->
        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Camera class="w-6 h-6 text-gray-800 dark:text-white" />
            Fotos de la Orden
          </span>
        </h4>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Adjunta evidencia del trabajo realizado (hasta {{ FOTO_MAX }} fotos). Solo JPG, PNG o WebP de máximo 5 MB.
        </p>

        <PhotoUploadGrid
          ref="photosGrid"
          v-model="fotosOt"
          :entity-id="ordenId"
          entity-field="orden_trabajo"
          :service="ordenesService"
          :max="FOTO_MAX"
          entity-label="orden de trabajo"
          :disabled="orden.estado === 'CANCELADO'"
          disabled-message="La orden está cancelada; no se pueden subir fotos."
        />
      </form>
    </div>
  </div>

  <!-- Zoom de foto (galerías read-only) -->
  <div v-if="fotoZoom" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70" @click.self="cerrarFotoZoom">
    <div class="relative max-w-4xl w-full bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <button
        type="button"
        title="Cerrar"
        aria-label="Cerrar foto ampliada"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center p-2 text-white bg-gray-900/60 rounded-full hover:bg-gray-900/80"
        @click="cerrarFotoZoom"
      >
        <X class="w-5 h-5" />
      </button>
      <img :src="fotoZoom" alt="Foto ampliada" class="w-full max-h-[85vh] object-contain rounded-lg" />
    </div>
  </div>
</template>
