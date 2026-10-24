<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Save, Star, Images, Package, IdCard, Receipt, Warehouse, NotebookPen, Link2 } from 'lucide-vue-next';
import { repuestosService } from '../services/repuestosService';
import Alert from '../../../../shared/components/Alert.vue';
import ImageField from '../../../../shared/components/ImageField.vue';
import FichaCampos from '../../../../shared/components/FichaCampos.vue';
import { formatCurrency, formatNumber } from '../../../../shared/utils/format';
import { IVA_OPCIONES, normalizarIva } from '../../../../shared/utils/impuestos';
import { recortarEspacios } from '../../../../shared/utils/sanitize';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  repuestoId: { type: [Number, String], default: null },
  // Variante de consulta: ficha de lectura y solo «Cerrar» (rol sin `modificar`).
  soloLectura: { type: Boolean, default: false },
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

function etiquetaDe(opciones, valor) {
  return opciones.find((o) => o.value === valor)?.label || valor;
}

const camposFicha = computed(() => [
  { etiqueta: 'Código', valor: form.codigo },
  { etiqueta: 'Nombre del repuesto', valor: form.nombre },
  { etiqueta: 'Categoría', valor: etiquetaDe(CATEGORIAS, form.categoria) },
  { etiqueta: 'Marca / Fabricante', valor: form.marca },
  { etiqueta: 'Número de parte', valor: form.numero_parte },
  { etiqueta: 'Unidad de medida', valor: etiquetaDe(UNIDADES, form.unidad_medida) },
  { etiqueta: 'Costo referencial (compra)', valor: formatCurrency(form.costo_referencial) },
  { etiqueta: 'Precio de venta (sin IVA)', valor: formatCurrency(form.precio_venta) },
  { etiqueta: 'Stock actual', valor: formatNumber(form.stock_actual) },
  { etiqueta: 'Stock mínimo', valor: formatNumber(form.stock_minimo) },
  { etiqueta: 'Ubicación / Estante', valor: form.ubicacion },
  { etiqueta: 'Proveedor habitual', valor: form.proveedor },
  { etiqueta: 'IVA por defecto', valor: etiquetaDe(IVA_OPCIONES, form.iva_porcentaje_defecto) },
  { etiqueta: 'ID Producto Contífico', valor: form.contifico_producto_id },
  { etiqueta: 'Cuenta contable Contífico', valor: form.contifico_cuenta_contable },
  { etiqueta: 'Descripción', valor: form.descripcion, ancho: 'completo' },
]);
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
const cuerpo = ref(null);
const seccionImagenes = ref(null);

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-white border border-gray-300 text-gray-900 focus:ring-primary-200 focus:border-primary-500 dark:border-gray-600 dark:text-white dark:focus:ring-primary-500/40 dark:focus:border-primary-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';

// Clases de un input/select según tenga o no error de validación.
function inputClass(campo, extra = '') {
  return [BASE_INPUT, repuestoErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
}

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
        miniatura: img.miniatura || img.imagen,
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

// Desplaza solo el cuerpo del modal (scrollIntoView movería también el fondo).
function desplazarCuerpoA(elemento) {
  if (!cuerpo.value) return;
  const top = elemento
    ? elemento.getBoundingClientRect().top - cuerpo.value.getBoundingClientRect().top - 16
    : -cuerpo.value.scrollTop;
  cuerpo.value.scrollBy({ top, behavior: 'smooth' });
}

async function focusPrimeraImagenConError() {
  await nextTick();
  const index = imagenes.value.findIndex((img) => img.error);
  const card = index >= 0 ? imagenCardRefs[index] : null;
  desplazarCuerpoA(card || seccionImagenes.value);
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
    // Solo al crear: después el stock cambia con movimientos del kardex.
    ...(isEditMode.value ? {} : { stock_actual: String(form.stock_actual ?? '0.00') }),
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
        desplazarCuerpoA(null);
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
  if (!props.soloLectura && hasChanges.value && !isSaving.value) {
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

// Un solo aviso a la vez: el nuevo descarta al anterior.
watch(bannerGeneral, (val, anterior) => {
  if (val && (!anterior || val.descripcion !== anterior.descripcion)) showDiscardWarning.value = false;
});
watch(showDiscardWarning, (val) => {
  if (val) errorMessage.value = '';
});

watch(() => form.codigo, (val) => {
  form.codigo = (val || '').trim().toUpperCase();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/70 p-2 sm:p-4">
    <div class="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] my-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
      <!-- Cabecera -->
      <ModalCabecera
        compacto
        :icono="Package"
        :titulo="soloLectura ? 'Detalle del repuesto' : (isEditMode ? 'Editar repuesto' : 'Nuevo repuesto')"
        :subtitulo="soloLectura ? '' : (isEditMode ? 'Actualiza los datos, precios e imágenes del repuesto.' : 'Registra los datos, precios, stock inicial e imágenes del repuesto.')"
        @cerrar="close"
      />

      <!-- Cuerpo con scroll propio: cabecera y botones siempre visibles -->
      <div ref="cuerpo" class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-gray-50/60 dark:bg-gray-900/30">
        <!-- Un solo aviso a la vez: el más reciente reemplaza al anterior -->
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />
        <Alert
          v-else-if="bannerGeneral"
          type="error"
          :title="bannerGeneral.titulo"
          :message="bannerGeneral.descripcion"
          :dismissible="bannerGeneral.dismissible"
          @dismiss="errorMessage = ''"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando repuesto...</div>
        <div v-else-if="soloLectura" class="space-y-5">
          <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <FichaCampos :campos="camposFicha" />
          </section>
          <section v-if="imagenes.length" class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
              <Images class="w-4 h-4" />
              Imágenes
            </h4>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <a
                v-for="(img, index) in imagenes"
                :key="img.id || index"
                :href="img.url"
                target="_blank"
                rel="noopener"
                class="relative block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                :title="`Ver imagen ${index + 1} completa`"
              >
                <img :src="img.miniatura || img.url" :alt="`Imagen ${index + 1} del repuesto`" loading="lazy" class="aspect-[2/1] w-full object-cover" />
                <span
                  v-if="img.es_principal"
                  class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-xs dark:bg-gray-800/90 dark:text-gray-200"
                >
                  <Star class="h-3 w-3" fill="currentColor" aria-hidden="true" />
                  Principal
                </span>
              </a>
            </div>
          </section>
        </div>
        <div v-else class="space-y-5">
          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <!-- Identificación -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <IdCard class="w-4 h-4" />
                Identificación
              </h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label for="rep_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <input id="rep_codigo" v-model="form.codigo" maxlength="50" placeholder="FR-001" :class="inputClass('codigo', 'font-mono uppercase placeholder:font-sans')">
                  <p v-if="repuestoErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.codigo }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label for="rep_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del repuesto <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <input id="rep_nombre" v-model="form.nombre" maxlength="150" placeholder="Filtro de aceite" :class="inputClass('nombre')" @blur="recortar('nombre')">
                  <p v-if="repuestoErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.nombre }}</p>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
                <div>
                  <label for="rep_categoria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoría</label>
                  <select id="rep_categoria" v-model="form.categoria" :class="inputClass('categoria')">
                    <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>
                <div>
                  <label for="rep_unidad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Unidad de medida</label>
                  <select id="rep_unidad" v-model="form.unidad_medida" :class="inputClass('unidad_medida')">
                    <option v-for="item in UNIDADES" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>
                <div>
                  <label for="rep_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca / Fabricante</label>
                  <input id="rep_marca" v-model="form.marca" maxlength="100" :class="inputClass('marca')" @blur="recortar('marca')">
                </div>
                <div>
                  <label for="rep_numero_parte" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de parte</label>
                  <input id="rep_numero_parte" v-model="form.numero_parte" maxlength="100" :class="inputClass('numero_parte', 'font-mono')" @blur="recortar('numero_parte')">
                </div>
              </div>
            </section>

            <div class="space-y-5">
              <!-- Precio e impuestos -->
              <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
                <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  <Receipt class="w-4 h-4" />
                  Precio e impuestos
                </h4>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label for="rep_costo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Costo (compra)</label>
                    <div class="relative">
                      <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">$</span>
                      <input id="rep_costo" v-model="form.costo_referencial" type="number" step="0.01" min="0" :class="inputClass('costo_referencial', 'ps-7 tabular-nums')">
                    </div>
                    <p v-if="repuestoErrors.costo_referencial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.costo_referencial }}</p>
                  </div>
                  <div>
                    <label for="rep_precio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Venta (sin IVA)</label>
                    <div class="relative">
                      <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">$</span>
                      <input id="rep_precio" v-model="form.precio_venta" type="number" step="0.01" min="0" :class="inputClass('precio_venta', 'ps-7 tabular-nums')">
                    </div>
                    <p v-if="repuestoErrors.precio_venta" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.precio_venta }}</p>
                  </div>
                  <div>
                    <label for="rep_iva" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">IVA por defecto</label>
                    <select id="rep_iva" v-model="form.iva_porcentaje_defecto" :class="inputClass('iva_porcentaje_defecto')">
                      <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- Stock y almacén -->
              <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
                <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  <Warehouse class="w-4 h-4" />
                  Stock y almacén
                </h4>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label for="rep_stock_actual" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ isEditMode ? 'Stock actual' : 'Stock inicial' }}</label>
                    <!-- Tras el alta, el stock solo cambia con movimientos (ajuste, despacho o compra). -->
                    <input id="rep_stock_actual" v-model="form.stock_actual" type="number" step="0.01" min="0" :disabled="isEditMode" :class="inputClass('stock_actual', 'tabular-nums disabled:cursor-not-allowed disabled:opacity-70')">
                    <p v-if="repuestoErrors.stock_actual" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.stock_actual }}</p>
                    <p v-else-if="isEditMode" class="mt-2 text-xs text-gray-500 dark:text-gray-400">Se cambia con «Kardex y stock» en el listado.</p>
                  </div>
                  <div>
                    <label for="rep_stock_minimo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Stock mínimo</label>
                    <input id="rep_stock_minimo" v-model="form.stock_minimo" type="number" step="0.01" min="0" :class="inputClass('stock_minimo', 'tabular-nums')">
                    <p v-if="repuestoErrors.stock_minimo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.stock_minimo }}</p>
                  </div>
                  <div>
                    <label for="rep_ubicacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ubicación / Estante</label>
                    <input id="rep_ubicacion" v-model="form.ubicacion" maxlength="100" :class="inputClass('ubicacion')" @blur="recortar('ubicacion')">
                  </div>
                  <div>
                    <label for="rep_proveedor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Proveedor habitual</label>
                    <input id="rep_proveedor" v-model="form.proveedor" maxlength="150" :class="inputClass('proveedor')" @blur="recortar('proveedor')">
                  </div>
                </div>
              </section>
            </div>
          </div>

          <!-- Imágenes -->
          <section ref="seccionImagenes" class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <h4 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
              <Images class="w-4 h-4" />
              Imágenes <span class="text-accent-500 dark:text-accent-400">*</span>
              <span
                :class="[
                  'px-2 py-0.5 text-xs font-semibold normal-case tracking-normal rounded-full tabular-nums',
                  hayErroresImagenes || avisoCantidadImagenes ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200',
                ]"
              >{{ imagenes.length }}/{{ MAX_IMAGENES }}</span>
            </h4>
            <p class="mt-1 mb-4 text-xs text-gray-500 dark:text-gray-400">Sube de {{ MIN_IMAGENES }} a {{ MAX_IMAGENES }} imágenes y marca una como principal.</p>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="(img, index) in imagenes"
                :key="img.id || img.preview || index"
                :ref="(el) => setImagenCardRef(el, index)"
              >
                <ImageField
                  :image-url="img.preview || img.url || ''"
                  :alt="'Imagen ' + (index + 1)"
                  perfil="repuesto"
                  aspect="wide"
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
                  aspect="wide"
                  compact
                  @upload="agregarImagen"
                />
              </div>
            </div>
          </section>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <!-- Descripción -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <NotebookPen class="w-4 h-4" />
                <label for="rep_descripcion">Descripción</label>
              </h4>
              <textarea id="rep_descripcion" v-model="form.descripcion" rows="4" placeholder="Compatibilidad, especificaciones, detalles a tener en cuenta..." :class="inputClass('descripcion')" @blur="recortar('descripcion')"></textarea>
            </section>

            <!-- Contífico -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Link2 class="w-4 h-4" />
                Contífico
                <span class="ms-auto px-2 py-0.5 text-xs font-medium normal-case tracking-normal rounded-sm bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Opcional</span>
              </h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="rep_contifico_producto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto</label>
                  <input id="rep_contifico_producto" v-model="form.contifico_producto_id" maxlength="100" :class="inputClass('contifico_producto_id')" @blur="recortar('contifico_producto_id')">
                </div>
                <div>
                  <label for="rep_contifico_cuenta" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cuenta contable</label>
                  <input id="rep_contifico_cuenta" v-model="form.contifico_cuenta_contable" maxlength="50" :class="inputClass('contifico_cuenta_contable')" @blur="recortar('contifico_cuenta_contable')">
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- Pie fijo -->
      <div class="flex flex-col-reverse gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700">
        <p v-if="!soloLectura" class="hidden text-xs text-gray-500 sm:block dark:text-gray-400"><span class="text-accent-500 dark:text-accent-400">*</span> Campos obligatorios</p>
        <div class="flex items-center justify-end gap-3 sm:ms-auto">
          <button
            v-if="soloLectura"
            type="button"
            class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
            @click="close">
            Cerrar
          </button>
          <template v-else>
            <button
              type="button"
              class="px-5 py-2.5 text-sm font-medium text-gray-900 rounded bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              @click="close">
              Cancelar
            </button>
            <button
              type="button"
              :disabled="isSaving || isLoading"
              class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-500 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="submit"
            >
              <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
              <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear repuesto') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
