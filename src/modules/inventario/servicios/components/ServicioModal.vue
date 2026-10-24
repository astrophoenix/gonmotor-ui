<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Save, Hammer, ClipboardList, Receipt, ShieldCheck, BellRing, NotebookPen } from 'lucide-vue-next';
import { serviciosService } from '../services/serviciosService';
import Alert from '../../../../shared/components/Alert.vue';
import FichaCampos from '../../../../shared/components/FichaCampos.vue';
import { IVA_OPCIONES, normalizarIva } from '../../../../shared/utils/impuestos';
import { formatCurrency } from '../../../../shared/utils/format';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  servicioId: { type: [Number, String], default: null },
  // Variante de consulta: ficha de lectura y solo «Cerrar» (rol sin `modificar`).
  soloLectura: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'reactivated']);

const isEditMode = computed(() => Boolean(props.servicioId));

const CATEGORIAS = [
  { value: 'MECANICA', label: 'Mecánica General' },
  { value: 'ELECTRICO', label: 'Eléctrico / Electrónica' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento Preventivo' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico / Escaneo' },
  { value: 'ENDEREZADA', label: 'Enderezada / Pintura' },
  { value: 'GARANTIA', label: 'Garantía' },
];

function textoIntervalo(km, meses) {
  const partes = [];
  if (km) partes.push(`cada ${Number(km).toLocaleString('es-EC')} km`);
  if (meses) partes.push(`cada ${meses} meses`);
  return partes.length ? partes.join(' o ') : 'Según las preferencias de notificaciones';
}

function createEmptyForm() {
  return {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'MECANICA',
    tiempo_estimado_minutos: 60,
    tareas_estandar: '',
    garantia_dias: 0,
    garantia_km: 0,
    intervalo_km: '',
    intervalo_meses: '',
    precio_referencial: '0.00',
    iva_porcentaje_defecto: '0.1500',
    contifico_producto_id: '',
  };
}

const form = reactive(createEmptyForm());

const camposFicha = computed(() => [
  { etiqueta: 'Código', valor: form.codigo },
  { etiqueta: 'Nombre del servicio', valor: form.nombre },
  { etiqueta: 'Categoría', valor: CATEGORIAS.find((c) => c.value === form.categoria)?.label || form.categoria },
  { etiqueta: 'Tiempo estimado', valor: form.tiempo_estimado_minutos != null ? `${form.tiempo_estimado_minutos} min` : '' },
  { etiqueta: 'Precio referencial de mano de obra', valor: formatCurrency(form.precio_referencial) },
  { etiqueta: 'IVA por defecto', valor: IVA_OPCIONES.find((o) => o.value === form.iva_porcentaje_defecto)?.label || '' },
  { etiqueta: 'ID Producto/Servicio Contífico', valor: form.contifico_producto_id },
  { etiqueta: 'Garantía', valor: `${form.garantia_dias || 0} días / ${form.garantia_km || 0} km (0: sin límite en esa unidad; ambos 0: sin garantía)` },
  { etiqueta: 'Próximo mantenimiento', valor: textoIntervalo(form.intervalo_km, form.intervalo_meses) },
  { etiqueta: 'Tareas estándar incluidas', valor: form.tareas_estandar, ancho: 'completo' },
  { etiqueta: 'Descripción', valor: form.descripcion, ancho: 'completo' },
]);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const servicioErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    descripcion: form.descripcion,
    categoria: form.categoria,
    tiempo_estimado_minutos: form.tiempo_estimado_minutos,
    tareas_estandar: form.tareas_estandar,
    garantia_dias: form.garantia_dias,
    garantia_km: form.garantia_km,
    intervalo_km: form.intervalo_km,
    intervalo_meses: form.intervalo_meses,
    precio_referencial: form.precio_referencial,
    iva_porcentaje_defecto: form.iva_porcentaje_defecto,
    contifico_producto_id: form.contifico_producto_id,
  };
}

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-white border border-gray-300 text-gray-900 focus:ring-primary-200 focus:border-primary-500 dark:border-gray-600 dark:text-white dark:focus:ring-primary-500/40 dark:focus:border-primary-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';

// Clases de un input/select según tenga o no error de validación.
function inputClass(campo, extra = '') {
  return [BASE_INPUT, servicioErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  servicioErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await serviciosService.getById(props.servicioId);
      Object.assign(form, createEmptyForm(), data);
      form.iva_porcentaje_defecto = normalizarIva(form.iva_porcentaje_defecto);
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function validate() {
  servicioErrors.value = {};
  const errors = {};

  if (!form.codigo || !form.codigo.trim()) {
    errors.codigo = 'El código es obligatorio.';
  }
  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre del servicio es obligatorio.';
  }

  const tiempo = Number(form.tiempo_estimado_minutos);
  if (Number.isNaN(tiempo) || tiempo < 0) {
    errors.tiempo_estimado_minutos = 'Debe ser un número mayor o igual a 0.';
  }

  for (const campo of ['intervalo_km', 'intervalo_meses']) {
    const valor = form[campo];
    if (valor !== '' && valor !== null && (!Number.isInteger(Number(valor)) || Number(valor) < 1)) {
      errors[campo] = 'Debe ser un número entero mayor a 0, o vacío.';
    }
  }

  for (const campo of ['garantia_dias', 'garantia_km']) {
    if (!Number.isInteger(Number(form[campo])) || Number(form[campo]) < 0) errors[campo] = 'Ingresa un entero mayor o igual a 0.';
  }

  const precio = Number(form.precio_referencial);
  if (Number.isNaN(precio) || precio < 0) {
    errors.precio_referencial = 'Debe ser un número mayor o igual a 0.';
  }

  servicioErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...servicioErrors.value };
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[key] = val[0];
    } else if (typeof val === 'string') {
      newErrors[key] = val;
    }
  });
  servicioErrors.value = newErrors;
}

function buildPayload() {
  return {
    codigo: (form.codigo || '').trim().toUpperCase(),
    nombre: (form.nombre || '').trim(),
    descripcion: form.descripcion || '',
    categoria: form.categoria,
    tiempo_estimado_minutos: Number(form.tiempo_estimado_minutos ?? 60),
    tareas_estandar: form.tareas_estandar || '',
    garantia_dias: Number(form.garantia_dias || 0),
    garantia_km: Number(form.garantia_km || 0),
    intervalo_km: form.intervalo_km === '' || form.intervalo_km === null ? null : Number(form.intervalo_km),
    intervalo_meses: form.intervalo_meses === '' || form.intervalo_meses === null ? null : Number(form.intervalo_meses),
    precio_referencial: String(form.precio_referencial ?? '0.00'),
    iva_porcentaje_defecto: normalizarIva(form.iva_porcentaje_defecto),
    contifico_producto_id: form.contifico_producto_id || '',
  };
}

async function reactivateInactive(inactiveId) {
  isSaving.value = true;
  try {
    const response = await serviciosService.update(inactiveId, { ...buildPayload(), is_active: true });
    emit('reactivated', response);
  } catch (error) {
    showError(error);
    if (error.data) applyBackendErrors(error.data);
  } finally {
    isSaving.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  servicioErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validate();
    if (!valid) {
      errorMessage.value = 'Completa correctamente los campos del servicio.';
      isSaving.value = false;
      return;
    }

    const payload = buildPayload();

    if (isEditMode.value) {
      const response = await serviciosService.update(props.servicioId, payload);
      emit('updated', response);
    } else {
      const response = await serviciosService.create(payload);
      emit('created', response);
    }
  } catch (error) {
    const inactive = error.data && error.data.inactive_duplicate;
    if (!isEditMode.value && inactive && inactive.id) {
      if (window.confirm(
        `El servicio con código "${inactive.codigo}" (${inactive.nombre}) existe en el sistema como desactivado. ¿Deseas activarlo en lugar de crear uno nuevo?`
      )) {
        await reactivateInactive(inactive.id);
      } else {
        errorMessage.value = `El servicio "${inactive.codigo}" no se agregó. El registro permanece desactivado.`;
      }
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
watch(errorMessage, (val) => {
  if (val) showDiscardWarning.value = false;
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
        :icono="Hammer"
        :titulo="soloLectura ? 'Detalle del servicio' : (isEditMode ? 'Editar servicio' : 'Nuevo servicio')"
        :subtitulo="soloLectura ? '' : (isEditMode ? 'Actualiza la mano de obra, su precio y sus condiciones.' : 'Registra la mano de obra, su precio y sus condiciones.')"
        @cerrar="close"
      />

      <!-- Cuerpo con scroll propio: cabecera y botones siempre visibles -->
      <div class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-gray-50/60 dark:bg-gray-900/30">
        <!-- Un solo aviso a la vez: el más reciente reemplaza al anterior -->
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />
        <Alert v-else-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando servicio...</div>
        <section v-else-if="soloLectura" class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <FichaCampos :campos="camposFicha" />
        </section>
        <div v-else class="space-y-5">
          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <!-- Datos del servicio -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <ClipboardList class="w-4 h-4" />
                Datos del servicio
              </h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label for="ser_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <input id="ser_codigo" v-model="form.codigo" maxlength="50" placeholder="MO-001" :class="inputClass('codigo', 'font-mono uppercase placeholder:font-sans')">
                  <p v-if="servicioErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.codigo }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label for="ser_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del servicio <span class="text-accent-500 dark:text-accent-400">*</span></label>
                  <input id="ser_nombre" v-model="form.nombre" maxlength="150" placeholder="Cambio de aceite y filtro" :class="inputClass('nombre')">
                  <p v-if="servicioErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.nombre }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label for="ser_categoria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoría</label>
                  <select id="ser_categoria" v-model="form.categoria" :class="inputClass('categoria')">
                    <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>
                <div>
                  <label for="ser_tiempo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tiempo estimado</label>
                  <div class="relative">
                    <input id="ser_tiempo" v-model="form.tiempo_estimado_minutos" type="number" min="0" step="5" :class="inputClass('tiempo_estimado_minutos', 'pe-12 tabular-nums')">
                    <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">min</span>
                  </div>
                  <p v-if="servicioErrors.tiempo_estimado_minutos" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.tiempo_estimado_minutos }}</p>
                </div>
              </div>
            </section>

            <!-- Precio e impuestos -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <Receipt class="w-4 h-4" />
                Precio e impuestos
              </h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="ser_precio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Precio referencial de mano de obra</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">$</span>
                    <input id="ser_precio" v-model="form.precio_referencial" type="number" step="0.01" min="0" :class="inputClass('precio_referencial', 'ps-7 tabular-nums')">
                  </div>
                  <p v-if="servicioErrors.precio_referencial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.precio_referencial }}</p>
                </div>
                <div>
                  <label for="ser_iva" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">IVA por defecto</label>
                  <select id="ser_iva" v-model="form.iva_porcentaje_defecto" :class="inputClass('iva_porcentaje_defecto')">
                    <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label for="ser_contifico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto/Servicio Contífico</label>
                  <input id="ser_contifico" v-model="form.contifico_producto_id" maxlength="100" :class="inputClass('contifico_producto_id')">
                  <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Opcional. Solo si sincronizas con Contífico.</p>
                </div>
              </div>
            </section>
          </div>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <!-- Garantía -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <ShieldCheck class="w-4 h-4" />
                Garantía por defecto
                <span class="ms-auto px-2 py-0.5 text-xs font-medium normal-case tracking-normal rounded-sm bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Opcional</span>
              </h4>
              <p class="mt-1 mb-4 text-xs text-gray-500 dark:text-gray-400">Ambos en 0: sin garantía. Con ambos límites, vence al superar cualquiera. Cambiar el catálogo no modifica trabajos ya registrados.</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-for="campo in ['garantia_dias', 'garantia_km']" :key="campo">
                  <label :for="`ser_${campo}`" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ campo === 'garantia_dias' ? 'Duración' : 'Recorrido' }}</label>
                  <div class="relative">
                    <input :id="`ser_${campo}`" v-model="form[campo]" type="number" min="0" step="1" :class="inputClass(campo, 'pe-14 tabular-nums')">
                    <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">{{ campo === 'garantia_dias' ? 'días' : 'km' }}</span>
                  </div>
                  <p v-if="servicioErrors[campo]" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors[campo] }}</p>
                </div>
              </div>
            </section>

            <!-- Próximo mantenimiento -->
            <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
              <h4 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                <BellRing class="w-4 h-4" />
                Próximo mantenimiento
                <span class="ms-auto px-2 py-0.5 text-xs font-medium normal-case tracking-normal rounded-sm bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Opcional</span>
              </h4>
              <p class="mt-1 mb-4 text-xs text-gray-500 dark:text-gray-400">Al entregar una orden con este servicio se programa el aviso al cliente con este intervalo. Vacío: se usan las preferencias de notificaciones.</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="ser_intervalo_km" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Repetir cada</label>
                  <div class="relative">
                    <input id="ser_intervalo_km" v-model="form.intervalo_km" type="number" step="1" min="1" placeholder="5000" :class="inputClass('intervalo_km', 'pe-14 tabular-nums')">
                    <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">km</span>
                  </div>
                  <p v-if="servicioErrors.intervalo_km" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.intervalo_km }}</p>
                </div>
                <div>
                  <label for="ser_intervalo_meses" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">O cada</label>
                  <div class="relative">
                    <input id="ser_intervalo_meses" v-model="form.intervalo_meses" type="number" step="1" min="1" placeholder="6" :class="inputClass('intervalo_meses', 'pe-16 tabular-nums')">
                    <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">meses</span>
                  </div>
                  <p v-if="servicioErrors.intervalo_meses" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.intervalo_meses }}</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tareas y descripción -->
          <section class="p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <h4 class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
              <NotebookPen class="w-4 h-4" />
              Tareas y descripción
            </h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label for="ser_tareas" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tareas estándar incluidas</label>
                <textarea id="ser_tareas" v-model="form.tareas_estandar" rows="3" placeholder="Drenar aceite, reemplazar filtro, verificar niveles y fugas..." :class="inputClass('tareas_estandar')"></textarea>
              </div>
              <div>
                <label for="ser_descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
                <textarea id="ser_descripcion" v-model="form.descripcion" rows="3" :class="inputClass('descripcion')"></textarea>
              </div>
            </div>
          </section>
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
              {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear servicio') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
