<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Save, Hammer } from 'lucide-vue-next';
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

watch(() => form.codigo, (val) => {
  form.codigo = (val || '').trim().toUpperCase();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-4xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="Hammer"
        :titulo="soloLectura ? 'Detalle del servicio' : (isEditMode ? 'Editar servicio' : 'Nuevo servicio')"
        @cerrar="close"
      />

      <div class="px-6 py-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando servicio...</div>
        <FichaCampos v-else-if="soloLectura" :campos="camposFicha" />
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">Mano de Obra / Servicio</h4>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1">
              <label for="ser_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código</label>
              <input id="ser_codigo" v-model="form.codigo" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.codigo ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']" placeholder="Ej: MO-001">
              <p v-if="servicioErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.codigo }}</p>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="ser_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del Servicio</label>
              <input id="ser_nombre" v-model="form.nombre" maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.nombre ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']" placeholder="Ej: Cambio de aceite y filtro">
              <p v-if="servicioErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.nombre }}</p>
            </div>
            <div class="col-span-1">
              <label for="ser_categoria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoría</label>
              <select id="ser_categoria" v-model="form.categoria" class="block w-full p-2.5 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="item in CATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="col-span-1">
              <label for="ser_tiempo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tiempo Estimado (minutos)</label>
              <input id="ser_tiempo" v-model="form.tiempo_estimado_minutos" type="number" min="0" step="5" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.tiempo_estimado_minutos ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.tiempo_estimado_minutos" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.tiempo_estimado_minutos }}</p>
            </div>
            <div class="col-span-2">
              <label for="ser_precio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Precio Referencial de Mano de Obra</label>
              <input id="ser_precio" v-model="form.precio_referencial" type="number" step="0.01" min="0" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.precio_referencial ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.precio_referencial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.precio_referencial }}</p>
            </div>
            <div class="col-span-1">
              <label for="ser_iva" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">IVA por defecto</label>
              <select id="ser_iva" v-model="form.iva_porcentaje_defecto" class="block w-full p-2.5 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                <option v-for="opcion in IVA_OPCIONES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label for="ser_contifico" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto/Servicio Contífico</label>
              <input id="ser_contifico" v-model="form.contifico_producto_id" maxlength="100" class="block w-full p-2.5 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1 md:col-span-4">
              <p class="font-medium text-brand-900 dark:text-white">Garantía por defecto</p>
              <p class="text-xs text-brand-500 dark:text-brand-300">Opcional. Ambos en 0: sin garantía. Con ambos límites, vence al superar cualquiera. Cambiar el catálogo no modifica trabajos ya registrados.</p>
            </div>
            <div v-for="campo in ['garantia_dias', 'garantia_km']" :key="campo" class="col-span-2">
              <label :for="`ser_${campo}`" class="mb-2 block text-sm font-medium text-brand-900 dark:text-white">{{ campo === 'garantia_dias' ? 'Garantía (días)' : 'Garantía (km)' }}</label>
              <input :id="`ser_${campo}`" v-model="form[campo]" type="number" min="0" step="1" class="block w-full rounded-lg border border-brand-300 bg-brand-50 p-2.5 text-base text-brand-900 dark:bg-gray-700 dark:text-white">
              <p v-if="servicioErrors[campo]" class="text-sm text-red-600 dark:text-red-400">{{ servicioErrors[campo] }}</p>
            </div>
            <div class="col-span-1 md:col-span-4">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Próximo mantenimiento sugerido</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Al entregar una orden con este servicio se programa el aviso al cliente con este intervalo. Vacío: se usan las preferencias de notificaciones.</p>
            </div>
            <div class="col-span-2">
              <label for="ser_intervalo_km" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Repetir cada (km)</label>
              <input id="ser_intervalo_km" v-model="form.intervalo_km" type="number" step="1" min="1" placeholder="Ej.: 5000" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.intervalo_km ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.intervalo_km" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.intervalo_km }}</p>
            </div>
            <div class="col-span-2">
              <label for="ser_intervalo_meses" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Repetir cada (meses)</label>
              <input id="ser_intervalo_meses" v-model="form.intervalo_meses" type="number" step="1" min="1" placeholder="Ej.: 6" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', servicioErrors.intervalo_meses ? 'bg-red-50 border border-red-500' : 'bg-white border border-gray-300 dark:border-gray-600']">
              <p v-if="servicioErrors.intervalo_meses" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ servicioErrors.intervalo_meses }}</p>
            </div>
            <div class="col-span-1 md:col-span-4">
              <label for="ser_tareas" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tareas Estándar Incluidas</label>
              <textarea id="ser_tareas" v-model="form.tareas_estandar" rows="3" class="block w-full p-2.5 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white" placeholder="Ej: Drenar aceite, reemplazar filtro, verificar niveles y fugas..."></textarea>
            </div>
            <div class="col-span-1 md:col-span-4">
              <label for="ser_descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
              <textarea id="ser_descripcion" v-model="form.descripcion" rows="3" class="block w-full p-2.5 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          v-if="soloLectura"
          type="button"
          class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          @click="close"
        >
          Cerrar
        </button>
        <template v-else>
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear servicio') }}
        </button>
        </template>
      </div>
    </div>
  </div>
</template>