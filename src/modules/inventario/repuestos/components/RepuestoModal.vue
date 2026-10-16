<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { X, Save, Star, FileText, Images, Package } from 'lucide-vue-next';
import { repuestosService } from '../services/repuestosService';
import Alert from '../../../../shared/components/Alert.vue';
import ImageField from '../../../../shared/components/ImageField.vue';
import { IVA_OPCIONES, normalizarIva } from '../../../../shared/utils/impuestos';
import { recortarEspacios } from '../../../../shared/utils/sanitize';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  repuestoId: { type: [Number, String], default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.repuestoId));

const CATEGORIAS = [
  { value: 'FILTROS', label: 'Filtros' },
  { value: 'ACEITES', label: 'Aceites y Lubricantes' },
  { value: 'FRENOS', label: 'Sistema de Frenos' },
  { value: 'MOTOR', label: 'Motor' },
  { value: 'ELECTRICO', label: 'Sistema Eléctrico' },
  { value: 'SUSPENSION', label: 'Suspensión y Dirección' },
  { value: 'TRANSMISION', label: 'Transmisión' },
  { value: 'CARROCERIA', label: 'Carrocería' },
  { value: 'ILUMINACION', label: 'Iluminación' },
  { value: 'REFRIGERACION', label: 'Refrigeración' },
  { value: 'OTROS', label: 'Otros' },
];

const UNIDADES = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'GALON', label: 'Galón' },
  { value: 'KG', label: 'Kilogramo' },
  { value: 'METRO', label: 'Metro' },
];

const MIN_IMAGENES = 1;
const MAX_IMAGENES = 3;

const ERROR_IMAGEN_MENSAJE = {
  formato: 'Formato no compatible. Usa JPG, PNG, WebP o HEIC.',
  peso: 'Supera el tamaño máximo. Usa una imagen más liviana.',
  subida: 'No se pudo subir. Intenta nuevamente.',
  principal: 'No se pudo marcar como principal. Intenta nuevamente.',
};

const ERROR_IMAGEN_DESCRIPCION = {
  formato: {
    singular: 'no tiene un formato válido',
    plural: 'no tienen un formato válido',
    solucion: 'Cámbiala por un archivo JPG, PNG, WebP o HEIC.',
    solucionPlural: 'Cámbialas por archivos JPG, PNG, WebP o HEIC.',
  },
  peso: {
    singular: 'supera el tamaño máximo',
    plural: 'superan el tamaño máximo',
    solucion: 'Cámbiala por una más liviana.',
    solucionPlural: 'Cámbialas por unas más livianas.',
  },
  subida: {
    singular: 'no se pudo subir',
    plural: 'no se pudieron subir',
    solucion: 'Vuelve a intentarlo o reemplázala.',
    solucionPlural: 'Vuelve a intentarlo o reemplázalas.',
  },
  principal: {
    singular: 'no se pudo marcar como principal',
    plural: 'no se pudieron marcar como principal',
    solucion: 'Intenta marcarla como principal de nuevo.',
    solucionPlural: 'Intenta marcarlas como principal de nuevo.',
  },
};

function createEmptyForm() {
  return {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'OTROS',
    marca: '',
    numero_parte: '',
    unidad_medida: 'UNIDAD',
    costo_referencial: '0.00',
    precio_venta: '0.00',
    iva_porcentaje_defecto: '0.1500',
    stock_actual: '0.00',
    stock_minimo: '0.00',
    ubicacion: '',
    proveedor: '',
    contifico_producto_id: '',
    contifico_cuenta_contable: '',
  };
}

const form = reactive(createEmptyForm());
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const repuestoErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);
const persistedId = ref(null);

const imagenes = ref([]);
const imagenesEliminadas = ref([]);
const avisoCantidadImagenes = ref(null);
const imagenesSnapshot = ref('');
const addImagenField = ref(null);
const imagenCardRefs = {};
const activeTab = ref('general');

function getComparableState() {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    descripcion: form.descripcion,
    categoria: form.categoria,
    marca: form.marca,
    numero_parte: form.numero_parte,
    unidad_medida: form.unidad_medida,
    costo_referencial: form.costo_referencial,
    precio_venta: form.precio_venta,
    iva_porcentaje_defecto: form.iva_porcentaje_defecto,
    stock_actual: form.stock_actual,
    stock_minimo: form.stock_minimo,
    ubicacion: form.ubicacion,
    proveedor: form.proveedor,
    contifico_producto_id: form.contifico_producto_id,
    contifico_cuenta_contable: form.contifico_cuenta_contable,
  };
}

function getImagenesSignature() {
  const detalle = imagenes.value.map((img) => ({
    id: img.id,
    principal: img.es_principal,
    preview: img.preview,
    url: img.url,
  }));
  return `${JSON.stringify(detalle)}|${JSON.stringify(imagenesEliminadas.value)}`;
}

function clasificarErrorImagen(mensaje) {
  const texto = String(mensaje || '');
  if (/formato/i.test(texto)) {
    return { tipo: 'formato', mensaje: ERROR_IMAGEN_MENSAJE.formato };
  }
  if (/(tama|pesa|peso|mb)/i.test(texto)) {
    return { tipo: 'peso', mensaje: ERROR_IMAGEN_MENSAJE.peso };
  }
  return { tipo: 'subida', mensaje: ERROR_IMAGEN_MENSAJE.subida };
}

function listarConY(items) {
  if (!items.length) return '';
  if (items.length === 1) return String(items[0]);
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

const erroresImagenes = computed(() =>
  imagenes.value.reduce((acc, img, index) => {
    if (img.error) {
      acc.push({ posicion: index + 1, tipo: img.error.tipo, mensaje: img.error.mensaje });
    }
    return acc;
  }, []),
);

const hayErroresImagenes = computed(() => erroresImagenes.value.length > 0);

function construirMensajeGeneral(errores) {
  const total = errores.length;
  const titulo = total === 1
    ? 'Hay 1 imagen que no se puede guardar.'
    : `Hay ${total} imágenes que no se pueden guardar.`;

  const tipos = [...new Set(errores.map((error) => error.tipo))];
  const posiciones = errores.map((error) => error.posicion).sort((a, b) => a - b);

  if (tipos.length === 1) {
    const detalle = ERROR_IMAGEN_DESCRIPCION[tipos[0]] || ERROR_IMAGEN_DESCRIPCION.subida;
    const plural = total > 1;
    const sujeto = plural
      ? `Las imágenes ${listarConY(posiciones)}`
      : `La imagen ${posiciones[0]}`;
    return {
      titulo,
      descripcion: `${sujeto} ${plural ? detalle.plural : detalle.singular}. ${plural ? detalle.solucionPlural : detalle.solucion}`,
    };
  }

  const detalles = errores
    .slice()
    .sort((a, b) => a.posicion - b.posicion)
    .map((error) => {
      const detalle = ERROR_IMAGEN_DESCRIPCION[error.tipo] || ERROR_IMAGEN_DESCRIPCION.subida;
      return `la imagen ${error.posicion} ${detalle.singular}`;
    });

  return {
    titulo,
    descripcion: `Revisa estas imágenes: ${listarConY(detalles)}. Reemplázalas para poder guardar.`,
  };
}

const bannerImagenes = computed(() => {
  if (hayErroresImagenes.value) return construirMensajeGeneral(erroresImagenes.value);
  return avisoCantidadImagenes.value;
});

const bannerGeneral = computed(() => {
  if (errorMessage.value) {
    return { titulo: '', descripcion: errorMessage.value, dismissible: true };
  }
  if (bannerImagenes.value) {
    return {
      titulo: bannerImagenes.value.titulo,
      descripcion: bannerImagenes.value.descripcion,
      dismissible: false,
    };
  }
  return null;
});

const hasChanges = computed(
  () =>
    JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()) ||
    imagenesSnapshot.value !== getImagenesSignature(),
);

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  repuestoErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
  persistedId.value = null;
  imagenes.value = [];
  imagenesEliminadas.value = [];
  avisoCantidadImagenes.value = null;
  activeTab.value = 'general';
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();
  imagenesSnapshot.value = getImagenesSignature();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await repuestosService.getById(props.repuestoId);
      const { imagenes: imagenesData, ...repuestoData } = data || {};
      Object.assign(form, createEmptyForm(), repuestoData);
      form.iva_porcentaje_defecto = normalizarIva(form.iva_porcentaje_defecto);
      imagenes.value = (imagenesData || []).map((img) => ({
        id: img.id,
        file: null,
        preview: null,
        url: img.imagen,
        es_principal: Boolean(img.es_principal),
        error: null,
      }));
      if (imagenes.value.length && !imagenes.value.some((img) => img.es_principal)) {
        imagenes.value[0].es_principal = true;
      }
      nextTick().then(() => {
        formSnapshot.value = getComparableState();
        imagenesSnapshot.value = getImagenesSignature();
      });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function agregarImagen(file) {
  if (!file) return;
  if (imagenes.value.length >= MAX_IMAGENES) {
    avisoCantidadImagenes.value = {
      titulo: `Solo se permiten ${MAX_IMAGENES} imágenes`,
      descripcion: 'Quita una imagen antes de agregar otra.',
    };
  } else {
    avisoCantidadImagenes.value = null;
    const tienePrincipal = imagenes.value.some((img) => img.es_principal);
    imagenes.value.push({
      id: null,
      file,
      preview: URL.createObjectURL(file),
      url: null,
      es_principal: !tienePrincipal,
      error: null,
    });
  }
  if (addImagenField.value) addImagenField.value.resetPreview();
}

function quitarImagen(index) {
  const [img] = imagenes.value.splice(index, 1);
  if (!img) return;
  if (img.id) imagenesEliminadas.value.push(img.id);
  if (img.preview) URL.revokeObjectURL(img.preview);
  if (imagenes.value.length && !imagenes.value.some((item) => item.es_principal)) {
    imagenes.value[0].es_principal = true;
  }
  avisoCantidadImagenes.value = null;
}

function reemplazarImagen(index, file) {
  const img = imagenes.value[index];
  if (!img || !file) return;
  if (img.preview) URL.revokeObjectURL(img.preview);
  if (img.id) {
    imagenesEliminadas.value.push(img.id);
    img.id = null;
    img.url = null;
  }
  img.file = file;
  img.preview = URL.createObjectURL(file);
  img.error = null;
  avisoCantidadImagenes.value = null;
}

function setPrincipal(index) {
  imagenes.value.forEach((img, i) => {
    img.es_principal = i === index;
  });
}

function setImagenCardRef(el, index) {
  imagenCardRefs[index] = el;
}

async function focusPrimeraImagenConError() {
  activeTab.value = 'imagenes';
  await nextTick();
  const index = imagenes.value.findIndex((img) => img.error);
  const card = index >= 0 ? imagenCardRefs[index] : null;
  const target = card || (addImagenField.value && addImagenField.value.$el);
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function guardarImagenes(repuestoId) {
  const id = repuestoId ? String(repuestoId) : '';
  if (!id) throw new Error('No se pudo identificar el repuesto para guardar sus imágenes.');
  const fallosEliminacion = [];

  const pendientes = [...imagenesEliminadas.value];
  imagenesEliminadas.value = [];
  for (const imagenId of pendientes) {
    try {
      await repuestosService.deleteImagen(imagenId);
    } catch (error) {
      imagenesEliminadas.value.push(imagenId);
      fallosEliminacion.push(error.message || 'error');
    }
  }

  for (let index = 0; index < imagenes.value.length; index += 1) {
    const img = imagenes.value[index];
    img.error = null;
    if (!img.id && img.file) {
      try {
        const creada = await repuestosService.createImagen({
          repuesto: id,
          imagen: img.file,
          es_principal: img.es_principal,
        });
        img.id = creada && creada.id;
        img.url = creada && creada.imagen;
        img.file = null;
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
          img.preview = null;
        }
      } catch (error) {
        img.error = clasificarErrorImagen(error.message);
      }
    }
  }

  const principal = imagenes.value.find((img) => img.es_principal && img.id);
  if (principal) {
    try {
      await repuestosService.updateImagen(principal.id, { es_principal: true });
    } catch (error) {
      principal.error = { tipo: 'principal', mensaje: ERROR_IMAGEN_MENSAJE.principal };
    }
  }

  if (fallosEliminacion.length && !hayErroresImagenes.value) {
    throw new Error(`No se pudieron eliminar algunas imágenes: ${fallosEliminacion.join(' ')}`);
  }

  if (hayErroresImagenes.value) {
    const err = new Error('Una o más imágenes no se pudieron guardar.');
    err.isImageError = true;
    throw err;
  }
}

function validate() {
  repuestoErrors.value = {};
  avisoCantidadImagenes.value = null;
  const errors = {};

  if (!form.codigo || !form.codigo.trim()) {
    errors.codigo = 'El código es obligatorio.';
  }
  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre del repuesto es obligatorio.';
  }

  const stockActual = Number(form.stock_actual);
  const stockMinimo = Number(form.stock_minimo);
  if (Number.isNaN(stockActual) || stockActual < 0) {
    errors.stock_actual = 'El stock actual debe ser un número mayor o igual a 0.';
  }
  if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
    errors.stock_minimo = 'El stock mínimo debe ser un número mayor o igual a 0.';
  }

  ['costo_referencial', 'precio_venta'].forEach((key) => {
    const val = Number(form[key]);
    if (Number.isNaN(val) || val < 0) {
      errors[key] = 'Debe ser un número mayor o igual a 0.';
    }
  });

  if (imagenes.value.length < MIN_IMAGENES) {
    avisoCantidadImagenes.value = {
      titulo: 'Falta la imagen del repuesto',
      descripcion: 'Sube al menos una imagen para poder guardarlo.',
    };
  } else if (imagenes.value.length > MAX_IMAGENES) {
    avisoCantidadImagenes.value = {
      titulo: `Solo se permiten ${MAX_IMAGENES} imágenes`,
      descripcion: 'Quita las imágenes que sobran para poder guardar.',
    };
  }

  repuestoErrors.value = errors;
  return Object.keys(errors).length === 0 && !avisoCantidadImagenes.value;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...repuestoErrors.value };
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[key] = val[0];
    } else if (typeof val === 'string') {
      newErrors[key] = val;
    }
  });
  repuestoErrors.value = newErrors;
}

function recortar(campo) {
  form[campo] = recortarEspacios(form[campo]);
}

function buildPayload() {
  return {
    codigo: (form.codigo || '').trim().toUpperCase(),
    nombre: recortarEspacios(form.nombre),
    descripcion: recortarEspacios(form.descripcion),
    categoria: form.categoria,
    marca: recortarEspacios(form.marca),
    numero_parte: recortarEspacios(form.numero_parte),
    unidad_medida: form.unidad_medida,
    costo_referencial: String(form.costo_referencial ?? '0.00'),
    precio_venta: String(form.precio_venta ?? '0.00'),
    iva_porcentaje_defecto: normalizarIva(form.iva_porcentaje_defecto),
    stock_actual: String(form.stock_actual ?? '0.00'),
    stock_minimo: String(form.stock_minimo ?? '0.00'),
    ubicacion: recortarEspacios(form.ubicacion),
    proveedor: recortarEspacios(form.proveedor),
    contifico_producto_id: recortarEspacios(form.contifico_producto_id),
    contifico_cuenta_contable: recortarEspacios(form.contifico_cuenta_contable),
  };
}

async function reactivateInactive(inactiveId) {
  isSaving.value = true;
  try {
    const response = await repuestosService.update(inactiveId, { ...buildPayload(), is_active: true });
    await guardarImagenes(inactiveId);
    emit('reactivated', response);
  } catch (error) {
    if (error.isImageError) {
      await focusPrimeraImagenConError();
      return;
    }
    showError(error);
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  repuestoErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validate();
    if (!valid) {
      const tieneErroresCampos = Object.keys(repuestoErrors.value).length > 0;
      errorMessage.value = tieneErroresCampos
        ? 'Completa correctamente los campos del repuesto.'
        : '';
      if (tieneErroresCampos) {
        activeTab.value = 'general';
      } else {
        await focusPrimeraImagenConError();
      }
      isSaving.value = false;
      return;
    }

    const payload = buildPayload();
    const targetId = isEditMode.value ? props.repuestoId : persistedId.value;
    let response;

    if (targetId) {
      response = await repuestosService.update(targetId, payload);
      persistedId.value = targetId;
    } else {
      response = await repuestosService.create(payload);
      persistedId.value = response && response.id;
    }

    const repuestoId = response && response.id ? response.id : targetId;
    await guardarImagenes(repuestoId);

    emit(isEditMode.value ? 'updated' : 'created', response);
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El repuesto con código "${inactive.codigo}" (${inactive.nombre}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactive(inactive.id);
      } else {
        errorMessage.value = `El repuesto "${inactive.codigo}" no se agregó. El registro permanece desactivado.`;
      }
      return;
    }
    if (error.isImageError) {
      await focusPrimeraImagenConError();
      return;
    }
    showError(error);
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

function close() {
  if (hasChanges.value && !isSaving.value) {
    if (!showDiscardWarning.value) {
      showDiscardWarning.value = true;
      return;
    }
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (val) => {
  if (val) open();
});

watch(() => form.codigo, (val) => {
  form.codigo = (val || '').trim().toUpperCase();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-5xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Package class="w-5 h-5 inline-block me-2" />
            {{ isEditMode ? 'Editar repuesto' : 'Nuevo repuesto' }}
          </span>
        </h3>

        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-4">
        <Alert
          v-if="bannerGeneral"
          type="error"
          :title="bannerGeneral.titulo"
          :message="bannerGeneral.descripcion"
          :dismissible="bannerGeneral.dismissible"
          @dismiss="errorMessage = ''"
        />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando repuesto...</div>
        <template v-else>
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="flex flex-wrap -mb-px" role="tablist" aria-label="Secciones del repuesto">
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'general'"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'general' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'general'"
              >
                <FileText class="w-5 h-5 text-gray-900 dark:text-white" />
                Información General
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'imagenes'"
                class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                :class="activeTab === 'imagenes' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                @click="activeTab = 'imagenes'"
              >
                <Images class="w-4 h-4" />
                Imágenes
                <span
                  class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full"
                  :class="(hayErroresImagenes || avisoCantidadImagenes) && activeTab !== 'imagenes' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                >{{ imagenes.length }}/{{ MAX_IMAGENES }}</span>
              </button>
            </nav>
          </div>

          <h4 v-show="activeTab === 'general'" class="pt-4 mb-4 text-base font-semibold dark:text-white">Información General</h4>
          <div v-show="activeTab === 'general'" class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1">
              <label for="rep_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código</label>
              <input id="rep_codigo" v-model="form.codigo" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.codigo ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: FR-001">
              <p v-if="repuestoErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.codigo }}</p>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="rep_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del Repuesto</label>
              <input id="rep_nombre" v-model="form.nombre" maxlength="150" @blur="recortar('nombre')" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.nombre ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: Filtro de aceite">
              <p v-if="repuestoErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.nombre }}</p>
            </div>
            <div class="col-span-1">
              <label for="rep_categoria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoría</label>
              <select id="rep_categoria" v-model="form.categoria" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="rep_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca / Fabricante</label>
              <input id="rep_marca" v-model="form.marca" maxlength="100" @blur="recortar('marca')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_numero_parte" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de Parte</label>
              <input id="rep_numero_parte" v-model="form.numero_parte" maxlength="100" @blur="recortar('numero_parte')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_unidad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Unidad de Medida</label>
              <select id="rep_unidad" v-model="form.unidad_medida" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in UNIDADES" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="rep_costo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Costo Referencial (compra)</label>
              <input id="rep_costo" v-model="form.costo_referencial" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.costo_referencial ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="repuestoErrors.costo_referencial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.costo_referencial }}</p>
            </div>
            <div class="col-span-1">
              <label for="rep_precio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Precio de Venta (sin IVA)</label>
              <input id="rep_precio" v-model="form.precio_venta" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.precio_venta ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="repuestoErrors.precio_venta" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.precio_venta }}</p>
            </div>
            <div class="col-span-1">
              <label for="rep_stock_actual" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Stock Actual</label>
              <input id="rep_stock_actual" v-model="form.stock_actual" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.stock_actual ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="repuestoErrors.stock_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.stock_actual }}</p>
            </div>
            <div class="col-span-1">
              <label for="rep_stock_minimo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Stock Mínimo</label>
              <input id="rep_stock_minimo" v-model="form.stock_minimo" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.stock_minimo ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
              <p v-if="repuestoErrors.stock_minimo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.stock_minimo }}</p>
            </div>
            <div class="col-span-1">
              <label for="rep_ubicacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ubicación / Estante</label>
              <input id="rep_ubicacion" v-model="form.ubicacion" maxlength="100" @blur="recortar('ubicacion')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_proveedor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Proveedor Habitual</label>
              <input id="rep_proveedor" v-model="form.proveedor" maxlength="150" @blur="recortar('proveedor')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_iva" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">IVA por defecto</label>
              <select id="rep_iva" v-model="form.iva_porcentaje_defecto" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
              </select>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="rep_descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
              <textarea id="rep_descripcion" v-model="form.descripcion" rows="3" @blur="recortar('descripcion')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
            <div class="col-span-1 md:col-span-2">
              <label for="rep_contifico_producto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto Contífico</label>
              <input id="rep_contifico_producto" v-model="form.contifico_producto_id" maxlength="100" @blur="recortar('contifico_producto_id')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1 md:col-span-2">
              <label for="rep_contifico_cuenta" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cuenta Contable Contífico</label>
              <input id="rep_contifico_cuenta" v-model="form.contifico_cuenta_contable" maxlength="50" @blur="recortar('contifico_cuenta_contable')" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
          </div>

          <h4 v-show="activeTab === 'imagenes'" class="pt-4 mb-2 text-base font-semibold dark:text-white">Imágenes del Repuesto</h4>
          <p v-show="activeTab === 'imagenes'" class="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Sube de {{ MIN_IMAGENES }} a {{ MAX_IMAGENES }} imágenes. Marca una como principal.
          </p>
          <div v-show="activeTab === 'imagenes'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(img, index) in imagenes"
              :key="img.id || img.preview || index"
              :ref="(el) => setImagenCardRef(el, index)"
            >
              <ImageField
                :image-url="img.preview || img.url || ''"
                :alt="'Imagen ' + (index + 1)"
                perfil="repuesto"
                :show-hint="false"
                :droppable="false"
                :error="img.error ? img.error.mensaje : ''"
                compact
                @remove="quitarImagen(index)"
                @upload="reemplazarImagen(index, $event)"
              >
                <template #footer>
                  <button
                    type="button"
                    class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs font-medium transition"
                    :class="img.es_principal
                      ? 'border-brand bg-brand text-white'
                      : 'border-default bg-neutral-secondary-medium text-heading hover:bg-neutral-tertiary'"
                    :aria-pressed="img.es_principal"
                    @click="setPrincipal(index)"
                  >
                    <Star class="w-3.5 h-3.5" :fill="img.es_principal ? 'currentColor' : 'none'" />
                    {{ img.es_principal ? 'Principal' : 'Hacer principal' }}
                  </button>
                </template>
              </ImageField>
            </div>

            <div v-if="imagenes.length < MAX_IMAGENES">
              <ImageField
                ref="addImagenField"
                empty-label="Agregar imagen"
                perfil="repuesto"
                compact
                @upload="agregarImagen"
              />
            </div>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || isLoading"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="submit"
        >
          <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
          <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear repuesto') }}
        </button>
      </div>
    </div>
  </div>
</template>