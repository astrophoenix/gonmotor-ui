<script setup>
import { reactive, ref, watch } from 'vue';
import { Loader2, X } from 'lucide-vue-next';
import { IconFileTypeXls } from '@tabler/icons-vue';
import Alert from '../../../shared/components/Alert.vue';
import { descargarBlob, filenameDesdeContentDisposition } from '../../../shared/utils/download';
import { FORMAS_PAGO } from '../constants/pagos';
import { pagosService } from '../services/pagosService';

/**
 * Exporta a Excel los pagos y devoluciones de un rango de fechas (para el
 * contador). Emite `exportado` con el nombre del archivo descargado.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Taller explícito del filtro de la página (UUID) o null. */
  sucursal: { type: String, default: null },
});

const emit = defineEmits(['update:modelValue', 'exportado']);

const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';
const CAMPO = 'block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';

function isoLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const filtros = reactive({ fecha_desde: '', fecha_hasta: '', tipo: '', forma_pago: '', anulado: 'false' });
const exportando = ref(false);
const errorMessage = ref('');

// Por defecto, el mes en curso hasta hoy.
watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  const hoy = new Date();
  Object.assign(filtros, {
    fecha_desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    fecha_hasta: isoLocal(hoy),
    tipo: '',
    forma_pago: '',
    anulado: 'false',
  });
  errorMessage.value = '';
});

function cerrar() {
  if (exportando.value) return;
  emit('update:modelValue', false);
}

async function exportar() {
  if (filtros.fecha_desde && filtros.fecha_hasta && filtros.fecha_desde > filtros.fecha_hasta) {
    errorMessage.value = 'La fecha final no puede ser anterior a la inicial.';
    return;
  }
  exportando.value = true;
  errorMessage.value = '';
  try {
    const { blob, contentDisposition } = await pagosService.exportarExcel({ ...filtros, sucursal: props.sucursal });
    const archivo = filenameDesdeContentDisposition(contentDisposition, 'pagos.xlsx');
    descargarBlob(blob, archivo);
    emit('exportado', archivo);
    emit('update:modelValue', false);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo generar el Excel de pagos.';
  } finally {
    exportando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <IconFileTypeXls class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Exportar pagos
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

      <div class="px-6 py-4 space-y-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Pagos y devoluciones de todas las órdenes del rango; las devoluciones salen en negativo.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="exp-desde" :class="ETIQUETA">Desde</label>
            <input id="exp-desde" v-model="filtros.fecha_desde" type="date" :class="CAMPO">
          </div>
          <div>
            <label for="exp-hasta" :class="ETIQUETA">Hasta</label>
            <input id="exp-hasta" v-model="filtros.fecha_hasta" type="date" :class="CAMPO">
          </div>
          <div>
            <label for="exp-tipo" :class="ETIQUETA">Movimiento</label>
            <select id="exp-tipo" v-model="filtros.tipo" :class="CAMPO">
              <option value="">Pagos y devoluciones</option>
              <option value="PAGO">Solo pagos</option>
              <option value="DEVOLUCION">Solo devoluciones</option>
            </select>
          </div>
          <div>
            <label for="exp-forma" :class="ETIQUETA">Forma de pago</label>
            <select id="exp-forma" v-model="filtros.forma_pago" :class="CAMPO">
              <option value="">Todas</option>
              <option v-for="forma in FORMAS_PAGO" :key="forma.value" :value="forma.value">{{ forma.label }}</option>
            </select>
          </div>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            v-model="filtros.anulado"
            type="checkbox"
            true-value=""
            false-value="false"
            class="w-4 h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600">
          Incluir movimientos anulados
        </label>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="exportando"
          @click="cerrar"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="exportando"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="exportar"
        >
          <Loader2 v-if="exportando" class="w-5 h-5 animate-spin" />
          <IconFileTypeXls v-else class="w-5 h-5" />
          {{ exportando ? 'Generando...' : 'Exportar Excel' }}
        </button>
      </div>
    </div>
  </div>
</template>
