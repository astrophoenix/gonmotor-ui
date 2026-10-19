<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { X, Save, Wallet, Calendar, Tag, AlignLeft, FileText } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import FichaCampos from '../../../shared/components/FichaCampos.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateOnly } from '../../../shared/utils/datetime';
import { useSucursalDocumento } from '../../../shared/composables/useSucursalDocumento';
import { gastosService } from '../services/gastosService';
import { CATEGORIAS_GASTO, categoriaLabel } from '../constants/categoriasGasto';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  gastoId: { type: [Number, String], default: null },
  // Variante de consulta: ficha de lectura y solo «Cerrar» (rol sin `modificar`).
  soloLectura: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const {
  tallerId: tallerSucursalId,
  error: tallerSucursalError,
  mostrar: mostrarSucursal,
  cargarSucursal,
  validar: validarSucursal,
} = useSucursalDocumento();

const isEditMode = computed(() => Boolean(props.gastoId));

const form = reactive({
  fecha: '',
  categoria: 'OTROS',
  monto: '',
  descripcion: '',
});

const tallerNombre = ref('');

const camposFicha = computed(() => [
  ...(tallerNombre.value ? [{ etiqueta: 'Taller', valor: tallerNombre.value }] : []),
  { etiqueta: 'Fecha', valor: formatDateOnly(form.fecha) },
  { etiqueta: 'Categoría', valor: categoriaLabel(form.categoria) },
  { etiqueta: 'Monto', valor: form.monto !== '' ? formatCurrency(form.monto) : '' },
  { etiqueta: 'Descripción', valor: form.descripcion, ancho: 'completo' },
]);

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const fieldErrors = ref({});
const formSnapshot = ref(null);
const showDiscardWarning = ref(false);

function getComparableState() {
  return {
    taller: tallerSucursalId.value,
    fecha: form.fecha,
    categoria: form.categoria,
    monto: form.monto,
    descripcion: form.descripcion,
  };
}

const hasChanges = computed(() =>
  JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState())
);

function showError(error) {
  errorMessage.value = error?.message || 'No fue posible completar la operación.';
}

function validateForm() {
  fieldErrors.value = {};
  const errors = {};

  if (!form.fecha) errors.fecha = 'La fecha del gasto es obligatoria.';
  if (!form.categoria) errors.categoria = 'Selecciona una categoría.';

  const montoNumerico = parseFloat(form.monto);
  if (form.monto === '' || form.monto === null || form.monto === undefined) {
    errors.monto = 'El monto es obligatorio.';
  } else if (Number.isNaN(montoNumerico)) {
    errors.monto = 'Ingresa un monto numérico válido.';
  } else if (montoNumerico <= 0) {
    errors.monto = 'El monto debe ser mayor a 0.';
  }

  if (form.descripcion && form.descripcion.length > 255) {
    errors.descripcion = 'La descripción no debe superar los 255 caracteres.';
  }

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0 && validarSucursal();
}

function resetForm() {
  tallerSucursalId.value = null;
  tallerSucursalError.value = '';
  form.fecha = '';
  form.categoria = 'OTROS';
  form.monto = '';
  form.descripcion = '';
  tallerNombre.value = '';
  fieldErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

function applyBackendErrors(data) {
  if (!data || typeof data !== 'object') return;
  const newErrors = { ...fieldErrors.value };
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val) && val.length) {
      newErrors[key] = val[0];
    } else if (typeof val === 'string') {
      newErrors[key] = val;
    }
  });
  fieldErrors.value = newErrors;
}

function buildPayload() {
  const payload = {
    categoria: form.categoria,
    fecha: form.fecha,
    monto: form.monto,
    descripcion: form.descripcion || '',
  };
  if (mostrarSucursal.value && tallerSucursalId.value) {
    payload.taller = tallerSucursalId.value;
  }
  return payload;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (isEditMode.value) {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await gastosService.getById(props.gastoId);
      form.fecha = data.fecha || '';
      form.categoria = data.categoria || 'OTROS';
      form.monto = data.monto != null ? String(data.monto) : '';
      form.descripcion = data.descripcion || '';
      tallerNombre.value = data.taller_nombre || '';
      cargarSucursal(data.taller);
      nextTick().then(() => {
        formSnapshot.value = getComparableState();
      });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

async function submit() {
  errorMessage.value = '';
  fieldErrors.value = {};
  isSaving.value = true;

  try {
    if (!validateForm()) {
      isSaving.value = false;
      return;
    }

    if (isEditMode.value) {
      const response = await gastosService.update(props.gastoId, buildPayload());
      emit('updated', response);
    } else {
      const response = await gastosService.create(buildPayload());
      emit('created', response);
    }
  } catch (error) {
    showError(error);
    if (error.data) {
      applyBackendErrors(error.data);
    }
  } finally {
    isSaving.value = false;
  }
}

function close() {
  if (!props.soloLectura && hasChanges.value && !isSaving.value && !isLoading.value) {
    if (!showDiscardWarning.value) {
      showDiscardWarning.value = true;
      return;
    }
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

// Sanitiza la descripción al escribir o pegar (mismo criterio que observaciones).
watch(() => form.descripcion, (valor) => {
  const limpio = sanitizeObservaciones(valor);
  if (limpio !== valor) form.descripcion = limpio;
});

watch(() => props.modelValue, (val) => {
  if (val) open();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Wallet v-if="!isEditMode" class="w-5 h-5 inline-block me-2" />
            <Tag v-if="isEditMode" class="w-5 h-5 inline-block me-2" />
            {{ soloLectura ? 'Detalle del gasto' : (isEditMode ? 'Editar gasto' : 'Nuevo gasto') }}
          </span>
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar los cambios."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando gasto...</div>
        <FichaCampos v-else-if="soloLectura" :campos="camposFicha" />
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white flex items-center gap-2">
            <FileText class="w-4 h-4 text-gray-800 dark:text-white" />
            Información General
          </h4>

          <div class="grid grid-cols-6 gap-4">
            <div v-if="mostrarSucursal" class="col-span-6">
              <label for="modal_taller" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Taller emisor <span class="text-accent-500">*</span>
              </label>
              <TallerSelect
                v-model="tallerSucursalId"
                variante="campo"
                placeholder="Seleccionar taller…"
                :invalid="Boolean(tallerSucursalError)"
              />
              <p v-if="tallerSucursalError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ tallerSucursalError }}</p>
              <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">Selecciona el taller al que corresponde el gasto.</p>
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="modal_fecha" :class="['block mb-1.5 text-sm font-medium', fieldErrors.fecha ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300']">Fecha <span class="text-accent-500">*</span></label>
              <div class="relative">
                <Calendar class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400" />
                <input
                  id="modal_fecha"
                  v-model="form.fecha"
                  type="date"
                  required
                  :class="fieldErrors.fecha ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'"
                  class="block w-full pl-9 pr-3 py-2 bg-white border text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p v-if="fieldErrors.fecha" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.fecha }}</p>
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="modal_categoria" :class="['block mb-1.5 text-sm font-medium', fieldErrors.categoria ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300']">Categoría <span class="text-accent-500">*</span></label>
              <select
                id="modal_categoria"
                v-model="form.categoria"
                required
                :class="fieldErrors.categoria ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'"
                class="block w-full px-3 py-2 bg-white border text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option v-for="cat in CATEGORIAS_GASTO" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
              <p v-if="fieldErrors.categoria" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.categoria }}</p>
            </div>

            <div class="col-span-6 sm:col-span-3">
              <label for="modal_monto" :class="['block mb-1.5 text-sm font-medium', fieldErrors.monto ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300']">Monto <span class="text-accent-500">*</span></label>
              <div class="relative">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  id="modal_monto"
                  v-model="form.monto"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  :class="fieldErrors.monto ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'"
                  class="block w-full pl-7 pr-3 py-2 bg-white border text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p v-if="fieldErrors.monto" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.monto }}</p>
            </div>

            <div class="col-span-6">
              <label for="modal_descripcion" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
              <div class="relative">
                <AlignLeft class="absolute left-2.5 top-3 w-4 h-4 text-gray-400 dark:text-gray-400" />
                <textarea
                  id="modal_descripcion"
                  v-model="form.descripcion"
                  rows="2"
                  maxlength="255"
                  placeholder="Detalle del gasto (opcional)"
                  :class="fieldErrors.descripcion ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'"
                  class="block w-full pl-9 pr-3 py-2 bg-white border text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                ></textarea>
              </div>
              <p v-if="fieldErrors.descripcion" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.descripcion }}</p>
            </div>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          v-if="soloLectura"
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          @click="close"
        >
          Cerrar
        </button>
        <template v-else>
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="isSaving || isLoading"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || isLoading"
          class="inline-flex items-center text-white bg-brand-900 rounded hover:bg-brand-800 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="submit"
        >
          <Save v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" />
          <svg v-else class="w-5 h-5 mr-1.5 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear') }}
        </button>
        </template>
      </div>
    </div>
  </div>
</template>
