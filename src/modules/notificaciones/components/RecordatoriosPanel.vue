<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  BellRing,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Settings2,
  RefreshCw,
  ListChecks,
  Play,
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import ToastContainer from '../../../shared/components/ToastContainer.vue';
import { useNotificaciones } from '../composables/useNotificaciones';

const {
  isLoadingEstado,
  isLoadingRegistros,
  isSending,
  isEjecutando,
  isGuardandoPreferencias,
  configuracion,
  preferencias,
  registros,
  totalRegistros,
  fetchEstado,
  fetchRegistros,
  enviarPrueba,
  ejecutar,
  guardarPreferencias,
} = useNotificaciones();

const alerta = ref({ type: 'default', title: '', message: '' });

const prueba = reactive({
  celular: '',
  mensaje: '',
});

const candidatos = ref([]);
const showCandidatos = ref(false);

const formPreferencias = reactive({
  intervalo_km: 5000,
  dias_antelacion: 7,
  frecuencia_dias: 30,
  notificaciones_activas: true,
  notificar_vehiculos_sin_programar: false,
  mensaje_plantilla: '',
});

const modoLabel = computed(() => {
  const modo = configuracion.value?.modo;
  if (modo === 'mock') return 'Modo de prueba (mock) — sin costo';
  if (modo === 'twilio_sandbox') return 'Twilio WhatsApp Sandbox';
  if (modo === 'meta_api') return 'Meta WhatsApp Cloud API (prueba)';
  return modo || '';
});

const estadoBadgeClass = computed(() => {
  if (!configuracion.value) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return configuracion.value.configurado
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
});

function aplicarPreferenciasEnForm() {
  const p = preferencias.value;
  if (!p) return;
  formPreferencias.intervalo_km = p.intervalo_km ?? 5000;
  formPreferencias.dias_antelacion = p.dias_antelacion ?? 7;
  formPreferencias.frecuencia_dias = p.frecuencia_dias ?? 30;
  formPreferencias.notificaciones_activas = Boolean(p.notificaciones_activas);
  formPreferencias.notificar_vehiculos_sin_programar = Boolean(p.notificar_vehiculos_sin_programar);
  formPreferencias.mensaje_plantilla = p.mensaje_plantilla || '';
}

async function init() {
  try {
    await fetchEstado();
    if (preferencias.value) aplicarPreferenciasEnForm();
    await fetchRegistros();
  } catch (error) {
    alerta.value = { type: 'error', title: '', message: error.message };
  }
}

function showAlert(type, message) {
  alerta.value = { type, title: '', message };
}

function hideAlert() {
  alerta.value = { type: 'default', title: '', message: '' };
}

async function onEnviarPrueba() {
  if (!prueba.celular.trim()) {
    showAlert('error', 'Escribe un número de teléfono para la prueba.');
    return;
  }
  try {
    const resultado = await enviarPrueba({
      celular: prueba.celular.trim(),
      mensaje: prueba.mensaje.trim(),
    });
    if (resultado?.ok) {
      showAlert('success', resultado.descripcion || 'Mensaje de prueba procesado correctamente.');
      prueba.mensaje = '';
      await fetchRegistros();
    } else {
      showAlert('error', resultado?.descripcion || 'No se pudo enviar el mensaje de prueba.');
    }
  } catch (error) {
    showAlert('error', error.message);
  }
}

async function onEjecutar() {
  try {
    await ejecutar({ preview: false });
    showAlert('success', 'Proceso de recordatorios finalizado.');
    await fetchRegistros();
  } catch (error) {
    showAlert('error', error.message);
  }
}

async function onPreview() {
  try {
    const resultado = await ejecutar({ preview: true });
    candidatos.value = resultado.candidatos || [];
    showCandidatos.value = true;
  } catch (error) {
    showAlert('error', error.message);
  }
}

async function onGuardarPreferencias() {
  try {
    const payload = {
      intervalo_km: Number(formPreferencias.intervalo_km) || 5000,
      dias_antelacion: Number(formPreferencias.dias_antelacion) || 7,
      frecuencia_dias: Number(formPreferencias.frecuencia_dias) || 30,
      notificaciones_activas: formPreferencias.notificaciones_activas,
      notificar_vehiculos_sin_programar: formPreferencias.notificar_vehiculos_sin_programar,
      mensaje_plantilla: formPreferencias.mensaje_plantilla,
    };
    preferencias.value = await guardarPreferencias(payload);
    showAlert('success', 'Preferencias guardadas correctamente.');
  } catch (error) {
    showAlert('error', error.message);
  }
}

function estadoStyle(estado) {
  if (estado === 'ENVIADO') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (estado === 'SIMULADO') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (estado === 'ERROR') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

onMounted(init);
</script>

<template>
  <div>
    <ToastContainer />
    <div class="p-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div class="mb-4">
        <nav class="flex mb-5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Notificaciones WhatsApp</li>
          </ol>
        </nav>
        <h1 class="flex items-center text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <BellRing class="w-6 h-6 mr-2" />
          Recordatorios de mantenimiento por WhatsApp
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Recuerda a tus clientes su próximo mantenimiento. Estrategia gratuita o en sandbox.
        </p>
      </div>

      <Alert :type="alerta.type" :title="alerta.title" :message="alerta.message" dismissible @dismiss="hideAlert" />

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full" :class="estadoBadgeClass">
          <Loader2 v-if="isLoadingEstado" class="w-3.5 h-3.5 mr-1 animate-spin" />
          <RefreshCw v-else class="w-3.5 h-3.5 mr-1" />
          {{ configuracion?.modo || 'cargando…' }}
        </span>
        <span class="text-sm text-gray-600 dark:text-gray-300">{{ modoLabel }}</span>
      </div>
      <p v-if="configuracion?.descripcion" class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ configuracion.descripcion }}</p>
    </div>

    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <!-- Enviar mensaje de prueba -->
      <div class="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 class="flex items-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Send class="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Mensaje de prueba
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Verifica la integración enviando un mensaje gratuito a tu propio número de WhatsApp
          (el propietario del taller puede usarlo para probar sin costos).
        </p>
        <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="prueba-celular">
          Número de WhatsApp (ej. 0991234567)
        </label>
        <input
          id="prueba-celular"
          v-model="prueba.celular"
          type="tel"
          placeholder="0991234567"
          class="mb-3 block w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
        <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="prueba-mensaje">
          Mensaje (opcional)
        </label>
        <textarea
          id="prueba-mensaje"
          v-model="prueba.mensaje"
          rows="3"
          placeholder="Mensaje de prueba desde Gonmotor…"
          class="mb-4 block w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        ></textarea>
        <button
          type="button"
          :disabled="isSending"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-wait"
          @click="onEnviarPrueba"
        >
          <Loader2 v-if="isSending" class="w-4 h-4 mr-2 animate-spin" />
          <MessageCircle v-else class="w-4 h-4 mr-2" />
          Enviar prueba
        </button>
      </div>

      <!-- Ejecutar proceso -->
      <div class="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 class="flex items-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Play class="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Proceso automático
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Detecta los vehículos de la empresa cuyo próximo mantenimiento
          (por fecha o kilometraje) esté por vencer y les envía el recordatorio.
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            :disabled="isEjecutando"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-wait"
            @click="onEjecutar"
          >
            <Loader2 v-if="isEjecutando" class="w-4 h-4 mr-2 animate-spin" />
            <CheckCircle2 v-else class="w-4 h-4 mr-2" />
            Ejecutar ahora
          </button>
          <button
            type="button"
            :disabled="isEjecutando"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
            @click="onPreview"
          >
            <ListChecks class="w-4 h-4 mr-2" />
            Previsualizar candidatos
          </button>
        </div>

        <template v-if="showCandidatos">
          <div class="mt-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ candidatos.length === 0 ? 'No hay vehículos pendientes de recordatorio.' : `${candidatos.length} vehículo(s) pendiente(s):` }}
            </p>
            <ul v-if="candidatos.length" class="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              <li v-for="c in candidatos" :key="c.vehiculo_id" class="flex items-center justify-between p-2.5 text-sm">
                <span class="font-medium text-gray-900 dark:text-white">{{ c.placa }}</span>
                <span class="text-gray-600 dark:text-gray-300">{{ c.vehiculo }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ c.cliente }} · {{ c.celular }}</span>
                <span class="text-xs capitalize text-primary-600 dark:text-primary-400">{{ c.motivo }}</span>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 p-4 pt-0 lg:grid-cols-2">
      <!-- Preferencias -->
      <div class="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 class="flex items-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Settings2 class="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Preferencias de mantenimiento
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="pf-intervalo">
              Intervalo (km)
            </label>
            <input id="pf-intervalo" v-model.number="formPreferencias.intervalo_km" type="number" min="1" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="pf-antelacion">
              Antelación (días)
            </label>
            <input id="pf-antelacion" v-model.number="formPreferencias.dias_antelacion" type="number" min="0" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="pf-reintento">
              Reintento (días)
            </label>
            <input id="pf-reintento" v-model.number="formPreferencias.frecuencia_dias" type="number" min="1" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>
        <label class="flex items-start mt-4 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="formPreferencias.notificaciones_activas" type="checkbox" class="mt-0.5 mr-2 w-4 h-4 rounded border-gray-300 text-primary-600 dark:bg-gray-700" />
          Enviar recordatorios automáticamente
        </label>
        <label class="flex items-start mt-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="formPreferencias.notificar_vehiculos_sin_programar" type="checkbox" class="mt-0.5 mr-2 w-4 h-4 rounded border-gray-300 text-primary-600 dark:bg-gray-700" />
          Incluir vehículos sin próximo mantenimiento registrado (demo)
        </label>
        <label class="block mt-4 mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" for="pf-plantilla">
          Plantilla del mensaje
        </label>
        <textarea
          id="pf-plantilla"
          v-model="formPreferencias.mensaje_plantilla"
          rows="4"
          placeholder="{cliente}, {empresa}, {marca}, {modelo}, {placa}, {kilometraje}"
          class="mb-2 block w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        ></textarea>
        <p class="text-xs text-gray-400 mb-3">Placeholders: {cliente} {empresa} {marca} {modelo} {placa} {kilometraje}</p>
        <button
          type="button"
          :disabled="isGuardandoPreferencias"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-wait"
          @click="onGuardarPreferencias"
        >
          <Loader2 v-if="isGuardandoPreferencias" class="w-4 h-4 mr-2 animate-spin" />
          <Settings2 v-else class="w-4 h-4 mr-2" />
          Guardar preferencias
        </button>
      </div>

      <!-- Bitácora -->
      <div class="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <MessageCircle class="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
            Últimos mensajes ({{ totalRegistros }})
          </h2>
          <button
            type="button"
            class="inline-flex items-center px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg dark:text-primary-400 dark:hover:bg-gray-700"
            :disabled="isLoadingRegistros"
            @click="fetchRegistros()"
          >
            <RefreshCw class="w-4 h-4 mr-1" :class="{ 'animate-spin': isLoadingRegistros }" />
            Refrescar
          </button>
        </div>
        <div class="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-lg dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Estado</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Cliente</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Celular</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Vehículo</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="isLoadingRegistros">
                <td colspan="5" class="px-4 py-6 text-center text-gray-400">Cargando…</td>
              </tr>
              <tr v-else-if="registros.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-gray-400">Aún no hay mensajes enviados.</td>
              </tr>
              <tr v-for="r in registros" :key="r.id">
                <td class="px-4 py-2.5">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="estadoStyle(r.estado)">
                    {{ r.estado_display }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-gray-800 dark:text-gray-200">{{ r.cliente_nombre || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-800 dark:text-gray-200">{{ r.celular }}</td>
                <td class="px-4 py-2.5 text-gray-800 dark:text-gray-200">{{ r.vehiculo_resumen || 'Prueba' }}</td>
                <td class="px-4 py-2.5 text-gray-500 dark:text-gray-400">{{ new Date(r.created_at).toLocaleDateString('es-EC') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-xs text-gray-400">
          En modo mock el mensaje no sale por WhatsApp: se registra como "Simulado" y queda el enlace
          <code class="px-1 bg-gray-100 dark:bg-gray-700 rounded">wa.me</code> para abrirlo manualmente.
        </p>
      </div>
    </div>
  </div>
</template>