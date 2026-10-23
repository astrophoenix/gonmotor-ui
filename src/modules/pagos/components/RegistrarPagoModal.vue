<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Banknote, Loader2, Undo2, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { pagosService } from '../services/pagosService';
import { FORMAS_CON_REFERENCIA, FORMAS_PAGO } from '../constants/pagos';

/**
 * Registra un pago (abono) o una devolución sobre una orden de trabajo.
 *
 * El backend valida el saldo: un pago no supera el saldo pendiente (no hay
 * saldos a favor) y una devolución no supera lo pagado neto. El modal propone
 * ese tope como monto. Emite `registrado` con el movimiento creado.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Orden del detalle: `id`, `numero_orden`, `saldo`, `pagado_neto`. */
  orden: { type: Object, default: null },
  tipo: { type: String, default: 'PAGO' },
});

const emit = defineEmits(['update:modelValue', 'registrado']);

const BASE_INPUT = 'block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';

const esDevolucion = computed(() => props.tipo === 'DEVOLUCION');
const tope = computed(() => Number(esDevolucion.value ? props.orden?.pagado_neto : props.orden?.saldo) || 0);

const form = reactive({ monto: '', forma_pago: 'EFECTIVO', referencia: '', observacion: '' });
let inicial = '';
const errores = ref({});
const errorMessage = ref('');
const guardando = ref(false);
const confirmandoDescarte = ref(false);

const pideReferencia = computed(() => FORMAS_CON_REFERENCIA.includes(form.forma_pago));
const hayCambios = computed(() => JSON.stringify(form) !== inicial);
// El backend no registra pagos con la caja del taller cerrada.
const cajaCerrada = computed(() => /caja .* está cerrada/i.test(errorMessage.value));

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  Object.assign(form, {
    monto: tope.value > 0 ? tope.value.toFixed(2) : '',
    forma_pago: 'EFECTIVO',
    referencia: '',
    observacion: '',
  });
  inicial = JSON.stringify(form);
  errores.value = {};
  errorMessage.value = '';
  confirmandoDescarte.value = false;
});

function cerrar() {
  if (guardando.value) return;
  if (hayCambios.value && !confirmandoDescarte.value) {
    confirmandoDescarte.value = true;
    return;
  }
  emit('update:modelValue', false);
}

function primerError(valor) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function validar() {
  const nuevos = {};
  const monto = Number(form.monto);
  if (!form.monto || Number.isNaN(monto) || monto <= 0) {
    nuevos.monto = 'Ingresa un monto mayor a cero.';
  } else if (monto > tope.value + 0.0001) {
    nuevos.monto = esDevolucion.value
      ? `La devolución no puede superar lo pagado ($ ${formatNumber(tope.value)}).`
      : `El pago no puede superar el saldo pendiente ($ ${formatNumber(tope.value)}).`;
  }
  if (pideReferencia.value && !form.referencia.trim()) {
    nuevos.referencia = 'Indica el número de comprobante.';
  }
  errores.value = nuevos;
  return !Object.keys(nuevos).length;
}

async function guardar() {
  if (!props.orden?.id || guardando.value || !validar()) return;
  guardando.value = true;
  errorMessage.value = '';
  try {
    const pago = await pagosService.registrar({
      orden_trabajo: props.orden.id,
      tipo: props.tipo,
      forma_pago: form.forma_pago,
      monto: Number(form.monto).toFixed(2),
      referencia: form.referencia.trim(),
      observacion: form.observacion.trim(),
    });
    emit('registrado', pago);
    emit('update:modelValue', false);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    errores.value = Object.fromEntries(
      ['monto', 'forma_pago', 'referencia', 'observacion']
        .filter((campo) => data[campo])
        .map((campo) => [campo, primerError(data[campo])]),
    );
    if (!Object.keys(errores.value).length) {
      errorMessage.value = error.message || 'No se pudo registrar el movimiento.';
    }
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <component :is="esDevolucion ? Undo2 : Banknote" class="w-5 h-5" />
          {{ esDevolucion ? 'Registrar devolución' : 'Registrar pago' }}
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="cerrar"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form class="px-6 py-4 space-y-4" novalidate @submit.prevent="guardar">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <p v-if="cajaCerrada" class="-mt-2 text-sm">
          <a href="/crud/caja/" class="font-medium text-brand-700 underline dark:text-brand-200">Ir a Caja para abrirla</a>
        </p>

        <p class="text-sm text-gray-600 dark:text-gray-300">
          Orden <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ orden?.numero_orden }}</span> ·
          <template v-if="esDevolucion">
            pagado por el cliente: <span class="font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(tope) }}</span>
          </template>
          <template v-else>
            saldo pendiente: <span class="font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(tope) }}</span>
          </template>
        </p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="pago-monto" :class="ETIQUETA">Monto <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <div class="relative">
              <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-gray-500 dark:text-gray-400">$</span>
              <input
                id="pago-monto"
                v-model="form.monto"
                type="number"
                inputmode="decimal"
                min="0.01"
                step="0.01"
                :class="[BASE_INPUT, errores.monto ? INPUT_ERROR : INPUT_OK, 'ps-7 tabular-nums']"
              >
            </div>
            <p v-if="errores.monto" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.monto }}</p>
          </div>
          <div>
            <label for="pago-forma" :class="ETIQUETA">Forma de pago <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <select id="pago-forma" v-model="form.forma_pago" :class="[BASE_INPUT, errores.forma_pago ? INPUT_ERROR : INPUT_OK]">
              <option v-for="forma in FORMAS_PAGO" :key="forma.value" :value="forma.value">{{ forma.label }}</option>
            </select>
            <p v-if="errores.forma_pago" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.forma_pago }}</p>
          </div>
        </div>

        <div>
          <label for="pago-referencia" :class="ETIQUETA">
            Número de comprobante
            <span v-if="pideReferencia" class="text-accent-500 dark:text-accent-400">*</span>
          </label>
          <input
            id="pago-referencia"
            v-model="form.referencia"
            type="text"
            maxlength="100"
            placeholder="Transferencia, voucher o cheque"
            :class="[BASE_INPUT, errores.referencia ? INPUT_ERROR : INPUT_OK]"
          >
          <p v-if="errores.referencia" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.referencia }}</p>
        </div>

        <div>
          <label for="pago-observacion" :class="ETIQUETA">Observación</label>
          <input
            id="pago-observacion"
            v-model="form.observacion"
            type="text"
            maxlength="255"
            :placeholder="esDevolucion ? 'Ej.: repuesto que no se usó' : 'Ej.: anticipo para repuestos'"
            :class="[BASE_INPUT, errores.observacion ? INPUT_ERROR : INPUT_OK]"
          >
          <p v-if="errores.observacion" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.observacion }}</p>
        </div>
      </form>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <template v-if="confirmandoDescarte">
          <p class="me-auto text-sm text-gray-700 dark:text-gray-300">¿Descartar los datos ingresados?</p>
          <button
            type="button"
            class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
            @click="confirmandoDescarte = false"
          >
            Seguir editando
          </button>
          <button
            type="button"
            class="text-white bg-red-600 rounded hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium text-sm px-4 py-2.5"
            @click="cerrar"
          >
            Descartar
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
            :disabled="guardando"
            @click="cerrar"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="guardando"
            class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
            @click="guardar"
          >
            <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
            <component :is="esDevolucion ? Undo2 : Banknote" v-else class="w-5 h-5" />
            {{ guardando ? 'Registrando...' : (esDevolucion ? 'Registrar devolución' : 'Registrar pago') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
