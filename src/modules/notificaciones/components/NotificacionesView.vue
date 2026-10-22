<script setup>
import { computed, onMounted, ref } from 'vue';
import { BellRing, CalendarClock, History, Megaphone, Settings2 } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import ToastContainer from '../../../shared/components/ToastContainer.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import ProgramadasTab from './ProgramadasTab.vue';
import CampanasTab from './CampanasTab.vue';
import HistorialTab from './HistorialTab.vue';
import ConfiguracionTab from './ConfiguracionTab.vue';

/**
 * Página de notificaciones al cliente, en pestañas: cola de avisos
 * programados, campañas masivas, historial de envíos y configuración.
 * La pestaña activa vive en el hash de la URL (`#campanas`…) para poder
 * enlazarla y conservarla al recargar.
 */
const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();

const puedeModificar = computed(() => puede('notificaciones', 'modificar'));
// Lanzar campañas y configurar el proveedor exige además administrar la empresa.
const puedeAdministrar = computed(() => puedeModificar.value && puede('empresa', 'modificar'));

const PESTANAS = [
  { id: 'programadas', label: 'Programadas', icon: CalendarClock },
  { id: 'campanas', label: 'Campañas', icon: Megaphone },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'configuracion', label: 'Configuración', icon: Settings2 },
];

function pestanaDelHash() {
  const id = window.location.hash.replace('#', '');
  return PESTANAS.some((p) => p.id === id) ? id : 'programadas';
}

const pestana = ref(pestanaDelHash());
const cargado = ref(false);
const alert = ref({ type: 'default', message: '' });

function elegir(id) {
  pestana.value = id;
  alert.value = { type: 'default', message: '' };
  window.history.replaceState(null, '', `#${id}`);
}

function mostrarAviso({ type, message }) {
  alert.value = { type, message };
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  cargado.value = true;
});
</script>

<template>
  <SinAcceso v-if="cargado && sinAcceso('notificaciones')" seccion="Notificaciones" />
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <ToastContainer />
    <EntityHeader
      mode="list"
      entity="Notificaciones al cliente"
      :icon="BellRing"
      :breadcrumb="[
        { label: 'Inicio', href: '/' },
        { label: 'Notificaciones' },
      ]"
    >
      <template #title-aside>
        <ModoConsultaChip v-if="soloConsulta('notificaciones')" objeto="las notificaciones" acciones="programar, enviar o cancelar avisos" />
      </template>
    </EntityHeader>

    <div v-if="alert.message" class="px-4 pt-3">
      <Alert :type="alert.type" :message="alert.message" dismissible @dismiss="alert.message = ''" />
    </div>

    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <div class="mb-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div class="flex gap-1 -mb-px" role="tablist" aria-label="Secciones de notificaciones">
          <button
            v-for="p in PESTANAS"
            :key="p.id"
            type="button"
            role="tab"
            :aria-selected="pestana === p.id"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            :class="pestana === p.id
              ? 'border-accent-500 text-brand-900 dark:border-accent-400 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-brand-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="elegir(p.id)"
          >
            <component :is="p.icon" class="w-4 h-4" />
            {{ p.label }}
          </button>
        </div>
      </div>

      <template v-if="cargado">
        <ProgramadasTab v-if="pestana === 'programadas'" :puede-modificar="puedeModificar" @aviso="mostrarAviso" />
        <CampanasTab
          v-else-if="pestana === 'campanas'"
          :puede-modificar="puedeModificar"
          :puede-lanzar="puedeAdministrar"
          @aviso="mostrarAviso"
        />
        <HistorialTab v-else-if="pestana === 'historial'" />
        <ConfiguracionTab v-else :puede-configurar="puedeAdministrar" @aviso="mostrarAviso" />
      </template>
    </div>
  </div>
</template>
