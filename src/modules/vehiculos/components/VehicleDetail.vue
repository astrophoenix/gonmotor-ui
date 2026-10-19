<script setup>
import { ref, computed, onMounted } from 'vue';
import { FilePen, Image as ImageIcon, X, Gauge, CalendarClock, Wrench, ChevronRight, Maximize2 } from 'lucide-vue-next';
import { vehiclesService } from '../services/vehiclesService';
import { request } from '../../../shared/services/httpClient';
import { formatPlate } from '../../../shared/utils/formatPlate';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import VehicleModal from './VehicleModal.vue';
import VehicleHistory from './VehicleHistory.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import {
  TRANSMISION_LABELS,
  COMBUSTIBLE_LABELS,
  TONO_DETALLE,
  colorCss,
  formatKm,
  mantenimientoPorFecha,
  mantenimientoPorKm,
} from '../utils/fichaVehiculo';

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificarVehiculos = computed(() => puede('vehiculos', 'modificar'));

const vehicle = ref(null);
const loading = ref(true);
const error = ref('');
const tipos = ref([]);
const paises = ref([]);
const previewImg = ref('');
const showImageModal = ref(false);
const showVehicleModal = ref(false);
const vehicleModalId = ref(null);

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get('id');

// Pestañas de la ficha. Sin router: la pestaña vive en `?tab=` para poder
// enlazar directo al historial (búsqueda global, listado, documentos).
const PESTANAS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'historial', label: 'Historial' },
];
const pestana = ref(params.get('tab') === 'historial' ? 'historial' : 'resumen');

function cambiarPestana(valor) {
  pestana.value = valor;
  const url = new URL(window.location.href);
  if (valor === 'resumen') url.searchParams.delete('tab');
  else url.searchParams.set('tab', valor);
  window.history.replaceState(null, '', url);
}

function labelFor(list, value, key) {
  if (value == null || value === '') return '—';
  const item = list.value.find((entry) => entry[key] === value);
  return item ? (item.label || item.name) : value;
}

const tipoLabel = (value) => labelFor(tipos, value, 'value');
const paisLabel = (value) => labelFor(paises, value, 'code');

const titulo = computed(() => {
  if (!vehicle.value) return '';
  return [vehicle.value.marca, vehicle.value.modelo].filter(Boolean).join(' ') || 'Vehículo sin marca';
});

const iniciales = computed(() => {
  const nombre = (vehicle.value && vehicle.value.cliente_nombre) || '';
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('') || '?';
});

const fichaTecnica = computed(() => {
  const v = vehicle.value;
  if (!v) return [];
  return [
    { label: 'Marca', value: v.marca, capitalize: true },
    { label: 'Modelo', value: v.modelo, capitalize: true },
    { label: 'Año', value: v.anio },
    { label: 'Color', value: v.color, capitalize: true, color: colorCss(v.color) },
    { label: 'Tipo', value: v.tipo ? tipoLabel(v.tipo) : null },
    { label: 'Transmisión', value: TRANSMISION_LABELS[v.transmision] },
    { label: 'Combustible', value: COMBUSTIBLE_LABELS[v.combustible] },
    { label: 'País de origen', value: v.pais_origen ? paisLabel(v.pais_origen) : null },
    { label: 'VIN / Chasis', value: v.vin, mono: true },
    { label: 'Número de motor', value: v.numero_motor, mono: true },
  ];
});

const mantenimientoKm = computed(() => mantenimientoPorKm(vehicle.value));
const mantenimientoFecha = computed(() => mantenimientoPorFecha(vehicle.value));

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

function abrirEditar() {
  if (!vehicle.value) return;
  vehicleModalId.value = vehicle.value.id;
  showVehicleModal.value = true;
}

async function onVehicleUpdated() {
  showVehicleModal.value = false;
  loading.value = true;
  try {
    vehicle.value = await vehiclesService.getById(vehicleId);
    error.value = '';
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo recargar el vehículo.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('vehiculos')) {
    loading.value = false;
    return;
  }
  if (!vehicleId) {
    error.value = 'Falta el identificador del vehículo.';
    loading.value = false;
    return;
  }
  try {
    vehicle.value = await vehiclesService.getById(vehicleId);
    const choices = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(choices && choices.tipo) ? choices.tipo : [];
    paises.value = Array.isArray(choices && choices.paises) ? choices.paises : [];
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el vehículo.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('vehiculos')" seccion="Vehículos" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Vehículo"
    :title="vehicle ? formatPlate(vehicle.placa) : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Vehículos', href: '/crud/vehiculos/' },
      { label: pestana === 'historial' ? 'Historial' : 'Ver' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="vehicle && soloConsulta('vehiculos')" objeto="los datos de este vehículo" acciones="editarlos" />
    </template>
    <template #actions>
      <button
        v-if="vehicle && puedeModificarVehiculos"
        type="button"
        title="Editar vehículo"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="abrirEditar">
        <FilePen class="w-5 h-5 -ms-1 text-primary-blue-500 dark:text-primary-blue-100" aria-hidden="true" />
        Editar
      </button>
    </template>
  </EntityHeader>

  <div class="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
    <Alert
      v-if="error"
      type="error"
      :title="error"
      message=""
      dismissible
      @dismiss="error = ''"
    />

    <!-- Carga -->
    <div v-if="loading" class="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando vehículo">
      <div class="h-64 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="h-72 rounded-xl bg-gray-200 dark:bg-gray-700 lg:col-span-2"></div>
        <div class="h-40 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>

    <template v-else-if="vehicle">
      <nav class="flex gap-6 border-b border-gray-200 dark:border-gray-700" aria-label="Secciones del vehículo">
        <button
          v-for="tab in PESTANAS"
          :key="tab.value"
          type="button"
          class="-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
          :class="pestana === tab.value
            ? 'border-brand-700 text-gray-900 dark:border-brand-200 dark:text-white'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          :aria-current="pestana === tab.value ? 'page' : undefined"
          @click="cambiarPestana(tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <VehicleHistory v-if="pestana === 'historial'" :vehicle-id="vehicleId" @foto="abrirFoto" />

      <template v-else>
      <!-- Resumen: foto, identidad y kilometraje -->
      <section class="overflow-hidden shadow-sm rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="grid md:grid-cols-[minmax(0,20rem)_1fr]">
          <button
            v-if="vehicle.imagen"
            type="button"
            class="group relative flex aspect-[4/3] items-center justify-center bg-gray-50 p-6 cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-200 dark:bg-gray-900/40 md:aspect-auto md:min-h-64"
            title="Ampliar foto"
            @click="abrirFoto(vehicle.imagen)"
          >
            <img
              :src="vehicle.imagen"
              :alt="`Vehículo ${formatPlate(vehicle.placa)}`"
              class="max-h-full max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span class="absolute right-3 bottom-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300">
              <Maximize2 class="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
          <div
            v-else
            class="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500 md:aspect-auto md:min-h-64"
          >
            <ImageIcon class="h-10 w-10" aria-hidden="true" />
            <span class="text-xs">Sin foto</span>
          </div>

          <div class="flex flex-col justify-between gap-8 border-t border-gray-100 p-6 dark:border-gray-700 md:border-t-0 md:border-l lg:p-8">
            <div>
              <div class="flex items-center justify-between gap-4">
                <p class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {{ [vehicle.tipo ? tipoLabel(vehicle.tipo) : null, vehicle.anio].filter(Boolean).join(' · ') || 'Vehículo' }}
                </p>
                <span
                  v-if="vehicle.is_active !== false"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-900/30 dark:text-green-300 dark:ring-green-400/30"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true"></span>
                  Activo
                </span>
                <span
                  v-else
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-500/20 ring-inset dark:bg-gray-700 dark:text-gray-300"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
                  Inactivo
                </span>
              </div>
              <h2 class="mt-1 text-2xl font-semibold tracking-tight text-gray-900 capitalize dark:text-white lg:text-3xl">
                {{ titulo }}
              </h2>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 font-mono text-sm font-semibold tracking-widest text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                  {{ formatPlate(vehicle.placa) || '—' }}
                </span>
                <span
                  v-if="vehicle.color"
                  class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 capitalize dark:bg-gray-700 dark:text-gray-200"
                >
                  <span
                    v-if="colorCss(vehicle.color)"
                    class="h-3 w-3 rounded-full ring-1 ring-black/15 dark:ring-white/20"
                    :style="{ backgroundColor: colorCss(vehicle.color) }"
                    aria-hidden="true"
                  ></span>
                  {{ vehicle.color }}
                </span>
                <span
                  v-if="COMBUSTIBLE_LABELS[vehicle.combustible]"
                  class="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ COMBUSTIBLE_LABELS[vehicle.combustible] }}
                </span>
                <span
                  v-if="TRANSMISION_LABELS[vehicle.transmision]"
                  class="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ TRANSMISION_LABELS[vehicle.transmision] }}
                </span>
              </div>
            </div>

            <dl class="grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 dark:border-gray-700 sm:grid-cols-3">
              <div>
                <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Gauge class="h-3.5 w-3.5" aria-hidden="true" />
                  Kilometraje
                </dt>
                <dd class="mt-2 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                  {{ formatKm(vehicle.kilometraje_actual) || '—' }}
                </dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Wrench class="h-3.5 w-3.5" aria-hidden="true" />
                  Próximo servicio
                </dt>
                <dd class="mt-2">
                  <span class="block text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{{ mantenimientoKm.valor || '—' }}</span>
                  <span class="mt-0.5 block text-sm" :class="TONO_DETALLE[mantenimientoKm.tono]">{{ mantenimientoKm.detalle }}</span>
                </dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <CalendarClock class="h-3.5 w-3.5" aria-hidden="true" />
                  Fecha de servicio
                </dt>
                <dd class="mt-2">
                  <span class="block text-xl font-semibold text-gray-900 dark:text-white">{{ mantenimientoFecha.valor || '—' }}</span>
                  <span class="mt-0.5 block text-sm" :class="TONO_DETALLE[mantenimientoFecha.tono]">{{ mantenimientoFecha.detalle }}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div class="grid items-start gap-6 lg:grid-cols-3">
        <!-- Ficha técnica -->
        <section class="shadow-sm rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h3 class="px-6 pt-5 pb-3 text-sm font-semibold text-gray-900 dark:text-white">Ficha técnica</h3>
          <dl class="grid grid-cols-1 px-6 pb-3 sm:grid-cols-2 sm:gap-x-10">
            <div
              v-for="campo in fichaTecnica"
              :key="campo.label"
              class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-3 dark:border-gray-700"
            >
              <dt class="shrink-0 text-sm text-gray-500 dark:text-gray-400">{{ campo.label }}</dt>
              <dd
                class="flex min-w-0 items-center gap-1.5 text-right text-sm font-medium text-gray-900 dark:text-white"
                :class="{ 'font-mono text-[13px] tracking-wide break-all': campo.mono, capitalize: campo.capitalize }"
              >
                <span
                  v-if="campo.color"
                  class="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/20"
                  :style="{ backgroundColor: campo.color }"
                  aria-hidden="true"
                ></span>
                <span v-if="campo.value != null && campo.value !== ''">{{ campo.value }}</span>
                <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
              </dd>
            </div>
          </dl>
        </section>

        <div class="space-y-6">
          <!-- Propietario -->
          <section class="shadow-sm rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Propietario</h3>
            <a
              v-if="vehicle.cliente_id"
              :href="`/crud/clientes/ver/?id=${encodeURIComponent(vehicle.cliente_id)}`"
              class="group -mx-2 mt-3 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-800 dark:text-brand-100">
                {{ iniciales }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-gray-900 dark:text-white">{{ vehicle.cliente_nombre || 'Cliente' }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">Ver ficha del cliente</span>
              </span>
              <ChevronRight class="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">Sin propietario asignado.</p>
          </section>

          <!-- Observaciones -->
          <section class="shadow-sm rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Observaciones</h3>
            <p
              v-if="vehicle.observaciones"
              class="mt-3 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300"
            >{{ vehicle.observaciones }}</p>
            <p v-else class="mt-3 text-sm text-gray-400 dark:text-gray-500">Sin observaciones.</p>
          </section>
        </div>
      </div>
      </template>
    </template>
  </div>

  <div
    v-if="showImageModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click="cerrarFoto"
  >
    <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl" @click.stop>
      <button
        type="button"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Cerrar"
        @click="cerrarFoto"
      >
        <X class="w-5 h-5" />
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Imagen ampliada" />
    </div>
  </div>

  <VehicleModal
    v-model="showVehicleModal"
    :vehicle-id="vehicleModalId"
    @updated="onVehicleUpdated"
  />
  </template>
</template>
