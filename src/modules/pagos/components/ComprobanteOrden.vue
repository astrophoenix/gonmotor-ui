<script setup>
import { computed, reactive, ref } from 'vue';
import { FileCheck2, Loader2, Pencil } from 'lucide-vue-next';
import { formatDateOnly } from '../../../shared/utils/datetime';
import { pagosService } from '../services/pagosService';
import { PATRON_COMPROBANTE, TIPOS_COMPROBANTE } from '../constants/pagos';

/**
 * Factura o nota de venta emitida fuera del sistema (facturador del SRI o
 * talonario), dentro de la sección «Cobro». Editarla exige
 * `facturacion`/`modificar`. Emite `cambio` con el mensaje de éxito.
 */
const props = defineProps({
  orden: { type: Object, required: true },
  puedeModificar: { type: Boolean, default: false },
});

const emit = defineEmits(['cambio']);

const BASE_INPUT = 'block w-full p-2 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400';
const INPUT_OK = 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white';
const INPUT_ERROR = 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500';
const ETIQUETA = 'block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300';

const editando = ref(false);
const guardando = ref(false);
const errores = ref({});
const errorGeneral = ref('');
const form = reactive({ tipo_comprobante: 'FACTURA', numero_factura: '', fecha_factura: '' });

const registrado = computed(() => Boolean(props.orden.numero_factura));
const anulada = computed(() => props.orden.estado === 'CANCELADO');

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function abrir() {
  Object.assign(form, {
    tipo_comprobante: props.orden.tipo_comprobante || 'FACTURA',
    numero_factura: props.orden.numero_factura || '',
    fecha_factura: props.orden.fecha_factura || hoy(),
  });
  errores.value = {};
  errorGeneral.value = '';
  editando.value = true;
}

// 001001000000123 → 001-001-000000123 al salir del campo.
function normalizarNumero() {
  const digitos = form.numero_factura.replace(/\D/g, '');
  if (digitos.length === 15) {
    form.numero_factura = `${digitos.slice(0, 3)}-${digitos.slice(3, 6)}-${digitos.slice(6)}`;
  }
}

async function guardar(quitar = false) {
  if (guardando.value) return;
  normalizarNumero();
  const numero = quitar ? '' : form.numero_factura.trim();
  if (!quitar) {
    const nuevos = {};
    if (!PATRON_COMPROBANTE.test(numero)) nuevos.numero_factura = 'Usa el formato del SRI: 001-001-000000123.';
    if (!form.fecha_factura) nuevos.fecha_factura = 'Indica la fecha del comprobante.';
    errores.value = nuevos;
    if (Object.keys(nuevos).length) return;
  }
  guardando.value = true;
  errorGeneral.value = '';
  try {
    await pagosService.registrarComprobante(props.orden.id, {
      tipo_comprobante: form.tipo_comprobante,
      numero_factura: numero,
      fecha_factura: quitar ? null : form.fecha_factura,
    });
    editando.value = false;
    emit('cambio', quitar ? 'Comprobante quitado de la orden.' : 'Comprobante registrado en la orden.');
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    errores.value = Object.fromEntries(
      ['numero_factura', 'fecha_factura', 'tipo_comprobante']
        .filter((campo) => data[campo])
        .map((campo) => [campo, [].concat(data[campo])[0]]),
    );
    if (!Object.keys(errores.value).length) errorGeneral.value = error.message || 'No se pudo guardar el comprobante.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div class="pt-3 mt-4 border-t border-gray-100 dark:border-gray-700">
    <div class="flex items-center justify-between gap-2 mb-1">
      <p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Comprobante emitido</p>
      <button
        v-if="puedeModificar && !editando && !anulada"
        type="button"
        class="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-200"
        @click="abrir">
        <Pencil class="w-3.5 h-3.5" />
        {{ registrado ? 'Editar' : 'Registrar' }}
      </button>
    </div>

    <template v-if="!editando">
      <p v-if="registrado" class="flex items-start gap-1.5 text-sm text-gray-900 dark:text-white">
        <FileCheck2 class="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          {{ orden.tipo_comprobante_display }}
          <span class="font-mono font-semibold">{{ orden.numero_factura }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ formatDateOnly(orden.fecha_factura) }}</span>
        </span>
      </p>
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">Sin factura ni nota de venta registrada.</p>
    </template>

    <form v-else class="space-y-2" novalidate @submit.prevent="guardar()">
      <p v-if="errorGeneral" class="text-sm text-red-600 dark:text-red-400">{{ errorGeneral }}</p>
      <div>
        <label for="comprobante-tipo" :class="ETIQUETA">Tipo</label>
        <select id="comprobante-tipo" v-model="form.tipo_comprobante" :class="[BASE_INPUT, INPUT_OK]">
          <option v-for="tipo in TIPOS_COMPROBANTE" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
        </select>
      </div>
      <div>
        <label for="comprobante-numero" :class="ETIQUETA">Número</label>
        <input
          id="comprobante-numero"
          v-model="form.numero_factura"
          type="text"
          inputmode="numeric"
          maxlength="17"
          placeholder="001-001-000000123"
          :class="[BASE_INPUT, errores.numero_factura ? INPUT_ERROR : INPUT_OK, 'font-mono']"
          @blur="normalizarNumero">
        <p v-if="errores.numero_factura" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errores.numero_factura }}</p>
      </div>
      <div>
        <label for="comprobante-fecha" :class="ETIQUETA">Fecha</label>
        <input
          id="comprobante-fecha"
          v-model="form.fecha_factura"
          type="date"
          :max="hoy()"
          :class="[BASE_INPUT, errores.fecha_factura ? INPUT_ERROR : INPUT_OK]">
        <p v-if="errores.fecha_factura" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errores.fecha_factura }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          :disabled="guardando"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-60">
          <Loader2 v-if="guardando" class="w-4 h-4 animate-spin" />
          Guardar
        </button>
        <button
          type="button"
          :disabled="guardando"
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
          @click="editando = false">
          Cancelar
        </button>
        <button
          v-if="registrado"
          type="button"
          :disabled="guardando"
          class="ms-auto text-xs font-medium text-red-700 hover:underline dark:text-red-400"
          @click="guardar(true)">
          Quitar
        </button>
      </div>
    </form>
  </div>
</template>
