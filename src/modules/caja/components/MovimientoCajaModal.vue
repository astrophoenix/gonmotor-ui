<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, reactive, ref, watch } from 'vue';
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { CATEGORIAS_GASTO } from '../../gastos/constants/categoriasGasto';
import { cajaService } from '../services/cajaService';

/**
 * Ingreso o egreso de efectivo de la caja (compra menor, cambio, retiro...).
 * Un egreso puede quedar también como gasto del taller si el usuario tiene
 * permiso de gastos (`puedeRegistrarGasto`, lo informa el backend).
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sesionId: { type: String, default: '' },
  tipo: { type: String, default: 'EGRESO' },
  efectivoDisponible: { type: [String, Number], default: 0 },
  puedeRegistrarGasto: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'registrado']);

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-white border border-gray-300 text-gray-900 focus:ring-primary-200 focus:border-primary-500 dark:border-gray-600 dark:text-white';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';

const esEgreso = computed(() => props.tipo === 'EGRESO');
const form = reactive({ monto: '', motivo: '', comoGasto: false, categoria: 'INSUMOS' });
const errores = ref({});
const errorMessage = ref('');
const guardando = ref(false);

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  Object.assign(form, { monto: '', motivo: '', comoGasto: false, categoria: 'INSUMOS' });
  errores.value = {};
  errorMessage.value = '';
});

function dinero(valor) {
  return Number(valor || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cerrar() {
  if (!guardando.value) emit('update:modelValue', false);
}

async function guardar() {
  const nuevos = {};
  const monto = Number(form.monto);
  if (!form.monto || Number.isNaN(monto) || monto <= 0) nuevos.monto = 'Ingresa un monto mayor a cero.';
  else if (esEgreso.value && monto > Number(props.efectivoDisponible) + 0.0001) {
    nuevos.monto = `En la caja solo hay $ ${dinero(props.efectivoDisponible)} en efectivo.`;
  }
  if (!form.motivo.trim()) nuevos.motivo = 'Indica el motivo.';
  errores.value = nuevos;
  if (Object.keys(nuevos).length || guardando.value) return;

  guardando.value = true;
  errorMessage.value = '';
  try {
    const movimiento = await cajaService.registrarMovimiento(props.sesionId, {
      tipo: props.tipo,
      monto: monto.toFixed(2),
      motivo: form.motivo.trim(),
      categoria_gasto: esEgreso.value && form.comoGasto ? form.categoria : '',
    });
    emit('registrado', movimiento);
    emit('update:modelValue', false);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    errores.value = Object.fromEntries(
      ['monto', 'motivo', 'categoria_gasto'].filter((c) => data[c]).map((c) => [c, [].concat(data[c])[0]]),
    );
    if (!Object.keys(errores.value).length) errorMessage.value = error.message || 'No se pudo registrar el movimiento.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg my-auto bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <ModalCabecera
        :icono="esEgreso ? ArrowUpFromLine : ArrowDownToLine"
        :titulo="esEgreso ? 'Registrar egreso de efectivo' : 'Registrar ingreso de efectivo'"
        @cerrar="cerrar"
      />

      <form class="px-6 py-4 space-y-4" novalidate @submit.prevent="guardar">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <p v-if="esEgreso" class="text-sm text-gray-600 dark:text-gray-300">
          Efectivo en caja: <span class="font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ dinero(efectivoDisponible) }}</span>
        </p>
        <div>
          <label for="mov-monto" :class="ETIQUETA">Monto <span class="text-accent-500 dark:text-accent-400">*</span></label>
          <div class="relative">
            <span class="absolute inset-y-0 flex items-center text-sm text-gray-500 start-0 ps-3 dark:text-gray-400">$</span>
            <input id="mov-monto" v-model="form.monto" type="number" inputmode="decimal" min="0.01" step="0.01" :class="[BASE_INPUT, errores.monto ? INPUT_ERROR : INPUT_OK, 'ps-7 tabular-nums']">
          </div>
          <p v-if="errores.monto" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.monto }}</p>
        </div>
        <div>
          <label for="mov-motivo" :class="ETIQUETA">Motivo <span class="text-accent-500 dark:text-accent-400">*</span></label>
          <input
            id="mov-motivo"
            v-model="form.motivo"
            type="text"
            maxlength="255"
            :placeholder="esEgreso ? 'Ej.: compra de guaipe' : 'Ej.: sencillo para cambio'"
            :class="[BASE_INPUT, errores.motivo ? INPUT_ERROR : INPUT_OK]">
          <p v-if="errores.motivo" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.motivo }}</p>
        </div>
        <div v-if="esEgreso && puedeRegistrarGasto" class="space-y-2">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.comoGasto" type="checkbox" class="w-4 h-4 border-gray-300 rounded text-brand-700 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
            Registrar también como gasto del taller
          </label>
          <select v-if="form.comoGasto" v-model="form.categoria" aria-label="Categoría del gasto" :class="[BASE_INPUT, errores.categoria_gasto ? INPUT_ERROR : INPUT_OK]">
            <option v-for="cat in CATEGORIAS_GASTO" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
          <p v-if="errores.categoria_gasto" class="text-sm text-red-600 dark:text-red-400">{{ errores.categoria_gasto }}</p>
        </div>
      </form>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="guardando"
          @click="cerrar">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="guardando"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="guardar">
          <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
          {{ guardando ? 'Registrando...' : 'Registrar' }}
        </button>
      </div>
    </div>
  </div>
</template>
