<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Camera, CheckCircle2, Clock, FileText, Loader2, Plus, Trash2, Wand2, Wrench, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { IconChecklist, IconPlayerPlayFilled } from '@tabler/icons-vue';
import { request } from '../../../shared/services/httpClient';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
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
const FOTO_MAX_SIZE = 5 * 1024 * 1024;
const FOTO_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const fotosInspeccion = reactive({ items: [] });
const fotosEliminadas = ref([]);
const fotosError = ref('');
const fotoZoom = reactive({ visible: false, src: '', scale: 1 });

watch(fotosInspeccion.items, (items) => {
  items.forEach((foto) => {
    const clean = sanitizeObservaciones(foto.descripcion || '').slice(0, 255);
    if (clean !== foto.descripcion) foto.descripcion = clean;
  });
}, { deep: true });

function abrirFotoZoom(foto) {
  const src = foto.preview || foto.url;
  if (!src) return;
  fotoZoom.src = src;
  fotoZoom.scale = 1;
  fotoZoom.visible = true;
}

function cerrarFotoZoom() {
  fotoZoom.visible = false;
  fotoZoom.src = '';
  fotoZoom.scale = 1;
}

function zoomMas() {
  fotoZoom.scale = Math.min(3, fotoZoom.scale + 0.25);
}

function zoomMenos() {
  fotoZoom.scale = Math.max(0.5, fotoZoom.scale - 0.25);
}

function toggleZoom() {
  if (fotoZoom.scale === 1) {
    zoomMas();
  } else {
    fotoZoom.scale = 1;
  }
}

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
    fotosInspeccion.items.splice(0, fotosInspeccion.items.length, ...items);
  } catch (error) {
    fotosError.value = error.message || 'No se pudieron cargar las fotos de la inspección.';
  }
}

function onFotoSelected(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (!FOTO_ALLOWED.includes(file.type)) {
    fotosError.value = 'Formato no permitido. Solo JPG, PNG o WebP.';
    return;
  }
  if (file.size > FOTO_MAX_SIZE) {
    fotosError.value = 'La imagen supera el tamaño máximo de 5 MB.';
    return;
  }
  if (fotosInspeccion.items.length >= FOTO_MAX) {
    fotosError.value = `Solo se permiten hasta ${FOTO_MAX} fotos por inspección.`;
    return;
  }
  fotosError.value = '';
  fotosInspeccion.items.push({
    id: null,
    file,
    preview: URL.createObjectURL(file),
    url: null,
    descripcion: '',
    descripcionOriginal: '',
  });
}

function quitarFotoInspeccion(index) {
  const foto = fotosInspeccion.items.splice(index, 1)[0];
  if (!foto) return;
  if (foto.id) fotosEliminadas.value.push(foto.id);
  if (foto.preview) URL.revokeObjectURL(foto.preview);
}

async function guardarFotos(idInspeccion) {
  const inspeccionRef = Number(idInspeccion);
  if (!inspeccionRef) return;
  const errores = [];

  for (const id of fotosEliminadas.value) {
    try {
      await inspeccionesService.deleteFoto(id);
    } catch (error) {
      errores.push(`Foto eliminada (#${id})`);
    }
  }

  for (const f of fotosInspeccion.items) {
    if (!f.id && f.file) {
      try {
        const creada = await inspeccionesService.createFoto({
          inspeccion: inspeccionRef,
          imagen: f.file,
          descripcion: f.descripcion,
        });
        f.id = creada && creada.id;
        f.url = creada && creada.imagen;
        f.file = null;
        if (f.preview) URL.revokeObjectURL(f.preview);
        f.preview = null;
      } catch (error) {
        errores.push(`Foto "${traducirErrorItem(f.descripcion, 'sin descripción')}": ${error.message}`);
      }
    } else if (f.id && f.descripcion !== f.descripcionOriginal) {
      try {
        await inspeccionesService.updateFoto(f.id, { descripcion: f.descripcion });
        f.descripcionOriginal = f.descripcion;
      } catch (error) {
        errores.push(`Foto: ${error.message}`);
      }
    }
  }

  if (errores.length) {
    throw new Error(`No se pudieron guardar las fotos: ${errores.join(', ')}`);
  }

  fotosEliminadas.value = [];
}

function traducirErrorItem(valor, porDefecto) {
  return (typeof valor === 'string' && valor.trim()) ? valor.trim() : porDefecto;
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
      errorMessage.value = 'Completa correctamente los campos obligatorios.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const detalleError = validarDetalles();
    if (detalleError) {
      errorMessage.value = `Revisa los siguientes ítems: ${detalleError}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      ...testigoPayload(form),
      recepcion: form.recepcion && typeof form.recepcion === 'object' ? form.recepcion.id : form.recepcion,
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
      await guardarFotos(inspeccionId);
      successMessage.value = 'Inspección actualizada correctamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await inspeccionesService.create(payload);
      const nuevoId = response && response.id;
      if (nuevoId) {
        await guardarDetalles(nuevoId);
        await guardarFotos(nuevoId);
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
    <div class="flex items-center gap-3 flex-wrap">
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
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 rounded-lg border border-blue-700 hover:bg-blue-50 focus:ring-4 focus:ring-blue-300 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="solicitarFinalizacion"
        >
          <IconChecklist class="w-4 h-4" />
          Finalizar inspección
        </button>
      </div>
    </div>
  </div>

  <div class="p-4">
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <!--div v-if="recepcion" class="p-5 mb-6 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
        <div class="flex items-center mb-4">
          <svg class="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16h1a1 1 0 0 0 1-1V9.5H5V15a1 1 0 0 0 1 1h1m10 0v.5A1.5 1.5 0 0 1 15.5 18h-1A1.5 1.5 0 0 1 13 16.5V16m4 0h-4m-6 0v.5A1.5 1.5 0 0 1 7.5 18h-1A1.5 1.5 0 0 1 5 16.5V16m0-6.5h14M8 4h8l2.5 5.5H11.5l-1-2H9l-1 2H5.5L8 4Z"/>
          </svg>
          <h4 class="text-base font-semibold text-gray-900 dark:text-white">Recepción asociada</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Vehículo</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.vehiculo?.placa || recepcion.placa || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.vehiculo?.marca || recepcion.marca }} {{ recepcion.vehiculo?.modelo || recepcion.modelo }}</p>
              <p v-if="recepcion.vehiculo?.color || recepcion.color" class="mt-1 text-gray-500 dark:text-gray-400">Color: {{ recepcion.vehiculo?.color || recepcion.color }}</p>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Cliente</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="font-semibold text-gray-900 dark:text-white">{{ recepcion.cliente?.nombre || recepcion.cliente_nombre || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.identificacion || '-' }}</p>
              <p class="mt-1 text-gray-600 dark:text-gray-300">{{ recepcion.cliente?.telefono || '-' }}</p>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Ingreso</p>
            <div class="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <p class="text-gray-900 dark:text-white">{{ new Date(recepcion.created_at).toLocaleString('es-EC') }}</p>
              <p class="mt-1 text-gray-500 dark:text-gray-400">#{{ recepcion.id }}</p>
            </div>
          </div>
        </div>
      </div-->

      <h4 class="mb-4 text-xl font-semibold dark:text-white">
        <span class="inline-flex items-center gap-2">
          <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
          Información de la Inspección
        </span>
      </h4>

      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando inspección...</div>

      <form class="grid grid-cols-1 gap-8" novalidate @submit.prevent="submit">
        <div class="col-span-1 grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div class="col-span-1">
          <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso </label>
          <textarea id="motivo_ingreso" v-model="form.motivo_ingreso" rows="3" maxlength="500" placeholder="Razón por la cual el cliente trae el vehículo o falla reportada..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_ingreso ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
          <p v-if="formErrors.motivo_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
        </div>

        <div class="col-span-1">
          <TextImprover
            v-model="form.diagnostico_tecnico"
            contexto="diagnóstico técnico de una inspección vehicular"
            v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <label for="diagnostico_tecnico" class="block text-sm font-medium text-gray-900 dark:text-white">Diagnóstico</label>
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
            <textarea id="diagnostico_tecnico" v-model="form.diagnostico_tecnico" rows="4" maxlength="1000" placeholder="Describe el diagnóstico realizado por el mecánico..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.diagnostico_tecnico ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
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

        <div class="col-span-1">
          <TextImprover
            v-model="form.recomendaciones"
            contexto="recomendaciones y plan de acción de una inspección vehicular"
            v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <label for="recomendaciones" class="block text-sm font-medium text-gray-900 dark:text-white">Recomendaciones</label>
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
            <textarea id="recomendaciones" v-model="form.recomendaciones" rows="3" maxlength="1000" placeholder="Describe las recomendaciones y plan de acción sugerido..." :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.recomendaciones ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"></textarea>
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

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Testigos luminosos</h5>
          <TestigosTablero v-model="testigos" />
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Fotos de la Inspección</h5>
          <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Opcional: hasta {{ FOTO_MAX }} fotos de evidencia de los hallazgos (DTC en pantalla, desgastes, fugas, testigos encendidos).
            JPG, PNG o WebP de máximo 5 MB.
          </p>
          <Alert v-if="fotosError" type="error" :message="fotosError" dismissible @dismiss="fotosError = ''" class="mb-3" />

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div
              v-for="(foto, index) in fotosInspeccion.items"
              :key="foto.id || foto.preview || index"
              class="border border-gray-200 rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
            >
              <div
                class="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
                :class="{ 'cursor-zoom-in': foto.url || foto.preview }"
                @click="abrirFotoZoom(foto)"
              >
                <img v-if="foto.url || foto.preview" :src="foto.preview || foto.url" :alt="'Foto ' + (index + 1)" class="h-full w-full object-cover" />
                <span v-else class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>
                <span
                  v-if="foto.url || foto.preview"
                  class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/20 hover:opacity-100"
                >
                  <ZoomIn class="w-8 h-8 text-white drop-shadow" />
                </span>
                <button
                  type="button"
                  class="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white hover:bg-red-700"
                  aria-label="Quitar foto"
                  @click.stop="quitarFotoInspeccion(index)"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
              <input
                v-model="foto.descripcion"
                maxlength="255"
                placeholder="Descripción (opcional)"
                class="mt-2 block w-full p-2 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-600"
              >
            </div>

            <label
              v-if="fotosInspeccion.items.length < FOTO_MAX"
              class="flex min-h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Camera class="w-6 h-6" />
              Agregar foto
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                class="sr-only"
                @change="onFotoSelected"
              />
            </label>
          </div>

          <div
            v-if="fotoZoom.visible"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            @click="cerrarFotoZoom"
          >
            <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl" @click.stop>
              <button
                type="button"
                class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="Cerrar"
                @click="cerrarFotoZoom"
              >
                <X class="w-5 h-5" />
              </button>
              <div class="absolute top-2 left-2 z-10 inline-flex items-center gap-1">
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
                  aria-label="Alejar"
                  @click="zoomMenos"
                >
                  <ZoomOut class="w-5 h-5" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
                  aria-label="Acercar"
                  @click="zoomMas"
                >
                  <ZoomIn class="w-5 h-5" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
                  aria-label="Restablecer zoom"
                  @click="fotoZoom.scale = 1"
                >
                  {{ Math.round(fotoZoom.scale * 100) }}%
                </button>
              </div>
              <img
                :src="fotoZoom.src"
                class="max-h-[90vh] max-w-[90vw] object-contain cursor-zoom-in transition-transform duration-150 select-none"
                :style="{ transform: `scale(${fotoZoom.scale})` }"
                alt="Foto ampliada"
                @dblclick="toggleZoom"
              />
            </div>
          </div>
        </div>

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Servicios Detectados / Recomendados</h5>
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

        <div class="col-span-1">
          <h5 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Repuestos Sugeridos</h5>
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

        <div class="col-span-1">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/inspecciones/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>

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
