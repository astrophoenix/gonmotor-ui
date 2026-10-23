<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, reactive, ref, watch } from 'vue';
import { CheckCircle2, Loader2, Megaphone, PencilLine, Save, Wand2 } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import TextImprover from '../../../shared/components/TextImprover.vue';
import { toIsoFromLocalInput, toLocalDatetimeInput } from '../../../shared/utils/datetime';
import { notificacionesService } from '../services/notificacionesService';
import { CANALES, PLACEHOLDERS_CAMPANA } from '../constants/notificaciones';

/**
 * Crear / editar una campaña en borrador. El segmento se arma con filtros
 * simples; los destinatarios reales se revisan con «Ver audiencia» antes de
 * lanzarla. Solo reciben la campaña clientes que aceptaron promociones.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Campaña a editar (del listado); `null` para crear. */
  campana: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const isEditMode = computed(() => Boolean(props.campana?.id));

const form = reactive({
  nombre: '',
  canal: 'whatsapp',
  asunto: '',
  mensaje: '',
  fecha_programada: '',
  marca: '',
  sin_visita_dias: '',
  con_visita_dias: '',
});

const isSaving = ref(false);
const errorMessage = ref('');
const fieldErrors = ref({});
const snapshot = ref('');
const showDiscardWarning = ref(false);

const hasChanges = computed(() => snapshot.value !== JSON.stringify(form));

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  const c = props.campana || {};
  const segmento = c.segmento || {};
  Object.assign(form, {
    nombre: c.nombre || '',
    canal: c.canal || 'whatsapp',
    asunto: c.asunto || '',
    mensaje: c.mensaje || 'Hola {cliente}, en {empresa} ',
    fecha_programada: toLocalDatetimeInput(c.fecha_programada),
    marca: segmento.marca || '',
    sin_visita_dias: segmento.sin_visita_dias ?? '',
    con_visita_dias: segmento.con_visita_dias ?? '',
  });
  snapshot.value = JSON.stringify(form);
  errorMessage.value = '';
  fieldErrors.value = {};
  showDiscardWarning.value = false;
});

function validar() {
  const errores = {};
  if (!form.nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
  if (!form.mensaje.trim()) errores.mensaje = 'El mensaje es obligatorio.';
  fieldErrors.value = errores;
  return Object.keys(errores).length === 0;
}

function construirPayload() {
  // Conserva claves del segmento que este formulario no edita (p. ej. `clientes`).
  const segmento = { ...(props.campana?.segmento || {}) };
  segmento.marca = form.marca.trim();
  segmento.sin_visita_dias = form.sin_visita_dias === '' ? null : Number(form.sin_visita_dias);
  segmento.con_visita_dias = form.con_visita_dias === '' ? null : Number(form.con_visita_dias);
  return {
    nombre: form.nombre.trim(),
    canal: form.canal,
    asunto: form.asunto.trim(),
    mensaje: form.mensaje,
    fecha_programada: form.fecha_programada ? toIsoFromLocalInput(form.fecha_programada) : null,
    segmento,
  };
}

function aplicarErroresBackend(data) {
  if (!data || typeof data !== 'object') return;
  const errores = { ...fieldErrors.value };
  Object.entries(data).forEach(([clave, valor]) => {
    if (clave === 'segmento' && valor && typeof valor === 'object' && !Array.isArray(valor)) {
      Object.entries(valor).forEach(([sub, msgs]) => {
        errores[sub] = Array.isArray(msgs) ? msgs[0] : String(msgs);
      });
    } else if (Array.isArray(valor) && valor.length) {
      errores[clave] = valor[0];
    }
  });
  fieldErrors.value = errores;
}

async function guardar() {
  errorMessage.value = '';
  if (!validar()) return;
  isSaving.value = true;
  try {
    const payload = construirPayload();
    if (isEditMode.value) {
      emit('updated', await notificacionesService.actualizarCampana(props.campana.id, payload));
    } else {
      emit('created', await notificacionesService.crearCampana(payload));
    }
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo guardar la campaña.';
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

function insertarPlaceholder(texto) {
  form.mensaje = `${form.mensaje}${form.mensaje.endsWith(' ') || !form.mensaje ? '' : ' '}${texto}`;
}

const INPUT = 'block w-full p-2.5 bg-white border border-gray-300 text-sm rounded focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
const INPUT_ERROR = 'block w-full p-2.5 bg-white border border-red-500 text-sm rounded focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';
const BOTON_MEJORAR = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="isEditMode ? PencilLine : Megaphone"
        :titulo="isEditMode ? 'Editar campaña' : 'Nueva campaña'"
        @cerrar="cerrar"
      />

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
          <div class="col-span-6 sm:col-span-4">
            <label for="camp_nombre" :class="ETIQUETA">Nombre <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <input id="camp_nombre" v-model="form.nombre" type="text" maxlength="150" placeholder="Ej.: Promoción cambio de aceite" :class="fieldErrors.nombre ? INPUT_ERROR : INPUT" />
            <p v-if="fieldErrors.nombre" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.nombre }}</p>
          </div>
          <div class="col-span-6 sm:col-span-2">
            <label for="camp_canal" :class="ETIQUETA">Canal preferido</label>
            <select id="camp_canal" v-model="form.canal" :class="INPUT">
              <option v-for="opcion in CANALES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
            </select>
          </div>

          <div class="col-span-6">
            <label for="camp_asunto" :class="ETIQUETA">Asunto (solo correo)</label>
            <input id="camp_asunto" v-model="form.asunto" type="text" maxlength="200" placeholder="Vacío: se usa el nombre de la campaña" :class="INPUT" />
          </div>

          <div class="col-span-6">
            <TextImprover
              v-model="form.mensaje"
              contexto="mensaje promocional de un taller mecánico para sus clientes"
              v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }"
            >
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <label for="camp_mensaje" class="text-sm font-medium text-gray-700 dark:text-gray-300">Mensaje <span class="text-accent-500 dark:text-accent-400">*</span></label>
                <button type="button" title="Mejorar el texto con IA" :disabled="mejorando || !form.mensaje.trim()" :class="BOTON_MEJORAR" @click="mejorar">
                  <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                  <Wand2 v-else class="w-4 h-4" />
                  {{ mejorando ? 'Mejorando...' : 'Mejorar texto' }}
                </button>
              </div>
              <textarea id="camp_mensaje" v-model="form.mensaje" rows="5" :class="fieldErrors.mensaje ? INPUT_ERROR : INPUT"></textarea>
              <p v-if="fieldErrors.mensaje" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.mensaje }}</p>
              <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
              <div v-if="mejorado && !error" class="flex flex-wrap items-center gap-x-2 mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 class="w-4 h-4" />
                <p>Texto mejorado. Revisa que conserve {cliente} y {empresa}.</p>
                <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" @click="restaurar">Restaurar original</button>
              </div>
            </TextImprover>
            <div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              Insertar:
              <button
                v-for="placeholder in PLACEHOLDERS_CAMPANA"
                :key="placeholder"
                type="button"
                class="px-2 py-0.5 font-mono rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                @click="insertarPlaceholder(placeholder)"
              >
                {{ placeholder }}
              </button>
            </div>
          </div>

          <div class="col-span-6 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Destinatarios</h4>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Solo clientes activos que aceptaron mensajes promocionales y tienen teléfono o correo. Deja los filtros vacíos para incluirlos a todos.
            </p>
          </div>
          <div class="col-span-6 sm:col-span-2">
            <label for="camp_marca" :class="ETIQUETA">Marca del vehículo</label>
            <input id="camp_marca" v-model="form.marca" type="text" maxlength="100" placeholder="Ej.: Chevrolet" :class="fieldErrors.marca ? INPUT_ERROR : INPUT" />
            <p v-if="fieldErrors.marca" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.marca }}</p>
          </div>
          <div class="col-span-6 sm:col-span-2">
            <label for="camp_sin_visita" :class="ETIQUETA">Sin visita hace (días)</label>
            <input id="camp_sin_visita" v-model="form.sin_visita_dias" type="number" min="1" max="3650" placeholder="Ej.: 180" :class="fieldErrors.sin_visita_dias ? INPUT_ERROR : INPUT" />
            <p v-if="fieldErrors.sin_visita_dias" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.sin_visita_dias }}</p>
          </div>
          <div class="col-span-6 sm:col-span-2">
            <label for="camp_con_visita" :class="ETIQUETA">Con visita en (días)</label>
            <input id="camp_con_visita" v-model="form.con_visita_dias" type="number" min="1" max="3650" placeholder="Ej.: 30" :class="fieldErrors.con_visita_dias ? INPUT_ERROR : INPUT" />
            <p v-if="fieldErrors.con_visita_dias" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.con_visita_dias }}</p>
          </div>

          <div class="col-span-6 sm:col-span-3">
            <label for="camp_fecha" :class="ETIQUETA">Enviar a partir de (opcional)</label>
            <input id="camp_fecha" v-model="form.fecha_programada" type="datetime-local" :class="fieldErrors.fecha_programada ? INPUT_ERROR : INPUT" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Vacío: en cuanto se lance.</p>
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
          {{ isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </div>
  </div>
</template>
