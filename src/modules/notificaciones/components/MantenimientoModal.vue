<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { CalendarClock, Save, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import VehiculoSearchSelect from '../../../shared/components/VehiculoSearchSelect.vue';
import { formatDateOnly, toIsoFromLocalInput } from '../../../shared/utils/datetime';
import { notificacionesService } from '../services/notificacionesService';
import { CANALES } from '../constants/notificaciones';

/**
 * Alta manual del próximo mantenimiento de un vehículo. Reemplaza el aviso de
 * mantenimiento pendiente que tuviera y actualiza la ficha del vehículo.
 *
 * Sin «Avisar el», el backend avisa `dias_antelacion` antes de la fecha
 * objetivo; sin fecha objetivo, usa el tope en meses de las preferencias.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'created']);

const vehiculoBusqueda = ref('');
const vehiculo = ref(null);
const form = reactive({
  km_objetivo: '',
  fecha_objetivo: '',
  fecha_programada: '',
  canal: 'whatsapp',
  mensaje: '',
});

const isSaving = ref(false);
const errorMessage = ref('');
const fieldErrors = ref({});
const showDiscardWarning = ref(false);

const hasChanges = computed(() => Boolean(
  vehiculo.value || form.km_objetivo || form.fecha_objetivo || form.fecha_programada || form.mensaje,
));

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  vehiculoBusqueda.value = '';
  vehiculo.value = null;
  Object.assign(form, { km_objetivo: '', fecha_objetivo: '', fecha_programada: '', canal: 'whatsapp', mensaje: '' });
  errorMessage.value = '';
  fieldErrors.value = {};
  showDiscardWarning.value = false;
});

function onVehiculo(seleccionado) {
  vehiculo.value = seleccionado;
  fieldErrors.value = { ...fieldErrors.value, vehiculo_id: '' };
  // Sugerencia: el siguiente intervalo estándar desde el odómetro actual.
  if (!form.km_objetivo && seleccionado?.kilometraje_actual) {
    form.km_objetivo = String(Number(seleccionado.kilometraje_actual) + 5000);
  }
}

function onLimpiarVehiculo() {
  vehiculo.value = null;
}

function validar() {
  const errores = {};
  if (!vehiculo.value) errores.vehiculo_id = 'Selecciona el vehículo.';
  if (!form.km_objetivo && !form.fecha_objetivo) {
    errores.km_objetivo = 'Indica el kilometraje o la fecha del próximo mantenimiento.';
  }
  fieldErrors.value = errores;
  return Object.keys(errores).length === 0;
}

function aplicarErroresBackend(data) {
  if (!data || typeof data !== 'object') return;
  const errores = { ...fieldErrors.value };
  Object.entries(data).forEach(([clave, valor]) => {
    if (Array.isArray(valor) && valor.length) errores[clave === 'non_field_errors' ? 'km_objetivo' : clave] = valor[0];
  });
  fieldErrors.value = errores;
}

async function guardar() {
  errorMessage.value = '';
  if (!validar()) return;
  isSaving.value = true;
  try {
    const payload = {
      vehiculo_id: vehiculo.value.id,
      canal: form.canal,
      km_objetivo: form.km_objetivo ? Number(form.km_objetivo) : null,
      fecha_objetivo: form.fecha_objetivo || null,
      fecha_programada: form.fecha_programada ? toIsoFromLocalInput(form.fecha_programada) : null,
    };
    if (form.mensaje.trim()) payload.mensaje = form.mensaje.trim();
    const creada = await notificacionesService.crearMantenimiento(payload);
    emit('created', creada);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo programar el mantenimiento.';
    aplicarErroresBackend(error.data);
  } finally {
    isSaving.value = false;
  }
}

function cerrar() {
  if (hasChanges.value && !isSaving.value && !showDiscardWarning.value) {
    showDiscardWarning.value = true;
    return;
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

const INPUT = 'block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
const INPUT_ERROR = 'block w-full px-3 py-2 bg-white border border-red-500 text-sm rounded focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CalendarClock class="w-5 h-5" />
          Programar próximo mantenimiento
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

        <div class="grid grid-cols-6 gap-4">
          <div class="col-span-6">
            <label for="mant_vehiculo" :class="ETIQUETA">Vehículo <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <VehiculoSearchSelect
              id="mant_vehiculo"
              v-model="vehiculoBusqueda"
              placeholder="Buscar vehículo por placa"
              :error="Boolean(fieldErrors.vehiculo_id)"
              :error-message="fieldErrors.vehiculo_id"
              class="relative"
              @select="onVehiculo"
              @clear="onLimpiarVehiculo"
            />
            <p v-if="vehiculo" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Odómetro actual: {{ Number(vehiculo.kilometraje_actual || 0).toLocaleString('es-EC') }} km
              <template v-if="vehiculo.proximo_mantenimiento_km || vehiculo.proxima_mantenimiento_fecha">
                · Próximo registrado:
                <template v-if="vehiculo.proximo_mantenimiento_km">{{ Number(vehiculo.proximo_mantenimiento_km).toLocaleString('es-EC') }} km</template>
                <template v-if="vehiculo.proxima_mantenimiento_fecha"> / {{ formatDateOnly(vehiculo.proxima_mantenimiento_fecha) }}</template>
              </template>
            </p>
          </div>

          <div class="col-span-6 sm:col-span-3">
            <label for="mant_km" :class="ETIQUETA">Kilometraje objetivo</label>
            <input id="mant_km" v-model="form.km_objetivo" type="number" min="1" step="1" placeholder="Ej.: 50000" :class="fieldErrors.km_objetivo ? INPUT_ERROR : INPUT" />
          </div>

          <div class="col-span-6 sm:col-span-3">
            <label for="mant_fecha" :class="ETIQUETA">Fecha objetivo</label>
            <input id="mant_fecha" v-model="form.fecha_objetivo" type="date" :class="fieldErrors.fecha_objetivo ? INPUT_ERROR : INPUT" />
          </div>
          <p v-if="fieldErrors.km_objetivo || fieldErrors.fecha_objetivo" class="col-span-6 -mt-2 text-sm text-red-600 dark:text-red-400">
            {{ fieldErrors.km_objetivo || fieldErrors.fecha_objetivo }}
          </p>

          <div class="col-span-6 sm:col-span-3">
            <label for="mant_aviso" :class="ETIQUETA">Avisar el (opcional)</label>
            <input id="mant_aviso" v-model="form.fecha_programada" type="datetime-local" :class="fieldErrors.fecha_programada ? INPUT_ERROR : INPUT" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Vacío: unos días antes de la fecha objetivo, según las preferencias.</p>
          </div>

          <div class="col-span-6 sm:col-span-3">
            <label for="mant_canal" :class="ETIQUETA">Canal preferido</label>
            <select id="mant_canal" v-model="form.canal" :class="INPUT">
              <option v-for="opcion in CANALES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
            </select>
          </div>

          <div class="col-span-6">
            <label for="mant_mensaje" :class="ETIQUETA">Mensaje (opcional)</label>
            <textarea
              id="mant_mensaje"
              v-model="form.mensaje"
              rows="4"
              placeholder="Vacío: se usa la plantilla de mantenimiento de las preferencias."
              :class="fieldErrors.mensaje ? INPUT_ERROR : INPUT"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="isSaving"
          @click="cerrar"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="guardar"
        >
          <Save class="w-5 h-5" />
          {{ isSaving ? 'Guardando...' : 'Programar' }}
        </button>
      </div>
    </div>
  </div>
</template>
