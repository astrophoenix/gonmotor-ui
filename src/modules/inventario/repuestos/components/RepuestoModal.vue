<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { repuestosService } from '../services/repuestosService';
import Alert from '../../../../shared/components/Alert.vue';

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
    aplica_iva: true,
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
    aplica_iva: form.aplica_iva,
    stock_actual: form.stock_actual,
    stock_minimo: form.stock_minimo,
    ubicacion: form.ubicacion,
    proveedor: form.proveedor,
    contifico_producto_id: form.contifico_producto_id,
    contifico_cuenta_contable: form.contifico_cuenta_contable,
  };
}

const hasChanges = computed(() => JSON.stringify(formSnapshot.value) !== JSON.stringify(getComparableState()));

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  repuestoErrors.value = {};
  errorMessage.value = '';
  showDiscardWarning.value = false;
}

async function open() {
  resetForm();
  formSnapshot.value = getComparableState();

  if (isEditMode.value) {
    isLoading.value = true;
    try {
      const data = await repuestosService.getById(props.repuestoId);
      Object.assign(form, createEmptyForm(), data);
      nextTick().then(() => { formSnapshot.value = getComparableState(); });
    } catch (error) {
      showError(error);
    } finally {
      isLoading.value = false;
    }
  }
}

function validate() {
  repuestoErrors.value = {};
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

  repuestoErrors.value = errors;
  return Object.keys(errors).length === 0;
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

function buildPayload() {
  return {
    codigo: (form.codigo || '').trim().toUpperCase(),
    nombre: (form.nombre || '').trim(),
    descripcion: form.descripcion || '',
    categoria: form.categoria,
    marca: form.marca || '',
    numero_parte: form.numero_parte || '',
    unidad_medida: form.unidad_medida,
    costo_referencial: String(form.costo_referencial ?? '0.00'),
    precio_venta: String(form.precio_venta ?? '0.00'),
    aplica_iva: Boolean(form.aplica_iva),
    stock_actual: String(form.stock_actual ?? '0.00'),
    stock_minimo: String(form.stock_minimo ?? '0.00'),
    ubicacion: form.ubicacion || '',
    proveedor: form.proveedor || '',
    contifico_producto_id: form.contifico_producto_id || '',
    contifico_cuenta_contable: form.contifico_cuenta_contable || '',
  };
}

async function reactivateInactive(inactiveId) {
  isSaving.value = true;
  try {
    const response = await repuestosService.update(inactiveId, { ...buildPayload(), is_active: true });
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
  repuestoErrors.value = {};
  isSaving.value = true;

  try {
    const valid = validate();
    if (!valid) {
      errorMessage.value = 'Completa correctamente los campos del repuesto.';
      isSaving.value = false;
      return;
    }

    const payload = buildPayload();

    if (isEditMode.value) {
      const response = await repuestosService.update(props.repuestoId, payload);
      emit('updated', response);
    } else {
      const response = await repuestosService.create(payload);
      emit('created', response);
    }
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

watch(() => form.nombre, (val) => {
  if (val && val.length > 1 && val !== val.trim()) form.nombre = val.trim();
});
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative block w-full max-w-5xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Editar repuesto' : 'Nuevo repuesto' }}
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="close"
        >
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
        </button>
      </div>

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

        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando repuesto...</div>
        <template v-else>
          <h4 class="mb-4 text-base font-semibold dark:text-white">Información General</h4>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="col-span-1">
              <label for="rep_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código</label>
              <input id="rep_codigo" v-model="form.codigo" maxlength="50" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.codigo ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: FR-001">
              <p v-if="repuestoErrors.codigo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ repuestoErrors.codigo }}</p>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="rep_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre del Repuesto</label>
              <input id="rep_nombre" v-model="form.nombre" maxlength="150" :class="['block w-full p-2.5 text-sm rounded-lg dark:bg-gray-700 dark:text-white', repuestoErrors.nombre ? 'bg-red-50 border border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']" placeholder="Ej: Filtro de aceite">
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
              <input id="rep_marca" v-model="form.marca" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_numero_parte" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de Parte</label>
              <input id="rep_numero_parte" v-model="form.numero_parte" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
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
              <input id="rep_ubicacion" v-model="form.ubicacion" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label for="rep_proveedor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Proveedor Habitual</label>
              <input id="rep_proveedor" v-model="form.proveedor" maxlength="150" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1">
              <label class="inline-flex items-center mt-6">
                <input v-model="form.aplica_iva" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Sujeto a IVA</span>
              </label>
            </div>
            <div class="col-span-1 md:col-span-3">
              <label for="rep_descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
              <textarea id="rep_descripcion" v-model="form.descripcion" rows="3" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
            <div class="col-span-1 md:col-span-2">
              <label for="rep_contifico_producto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID Producto Contífico</label>
              <input id="rep_contifico_producto" v-model="form.contifico_producto_id" maxlength="100" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            </div>
            <div class="col-span-1 md:col-span-2">
              <label for="rep_contifico_cuenta" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cuenta Contable Contífico</label>
              <input id="rep_contifico_cuenta" v-model="form.contifico_cuenta_contable" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
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
          <svg v-if="!isSaving" class="w-5 h-5 mr-1.5 -ml-1 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 0 1 1-1h11.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z"/>
            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M8 4h8v4H8V4Zm7 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
          </svg>
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