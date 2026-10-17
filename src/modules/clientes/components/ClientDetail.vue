<script setup>
import { computed, ref, onMounted } from 'vue';
import {
  CarFront, ChevronRight, FilePen, Mail, MapPin, MessageCircle, Phone, Plus, Search, Gauge,
} from 'lucide-vue-next';

import { clientsService } from '../services/clientesService';
import { request } from '../../../shared/services/httpClient';
import { formatPlate } from '../../../shared/utils/formatPlate';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ClientModal from './ClientModal.vue';
import VehicleModal from '../../vehiculos/components/VehicleModal.vue';
import {
  COMBUSTIBLE_LABELS,
  colorCss,
  formatKm,
  mantenimientoResumen,
} from '../../vehiculos/utils/fichaVehiculo';
import { usePermisos } from '../../../shared/composables/usePermisos';

const { puede } = usePermisos();
const puedeModificarClientes = computed(() => puede('clientes', 'modificar'));
const puedeModificarVehiculos = computed(() => puede('vehiculos', 'modificar'));

const client = ref(null);
const loading = ref(true);
const error = ref('');
const alert = ref({ type: 'success', message: '' });
const showClientModal = ref(false);
const clientModalId = ref(null);
const showVehicleModal = ref(false);
const busqueda = ref('');
const tipos = ref([]);

const TIPO_IDENTIFICACION = { C: 'Cédula', R: 'RUC', P: 'Pasaporte' };

const URGENCIA = { vacio: 0, pendiente: 1, pronto: 2, vencido: 3 };

// Con pocos vehículos el buscador estorba; aparece desde este número.
const MIN_VEHICULOS_BUSQUEDA = 4;

const params = new URLSearchParams(window.location.search);
const clientId = params.get('id') || '';

function formatMesAnio(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' });
}

function tipoLabel(value) {
  if (!value) return null;
  const item = tipos.value.find((entry) => entry.value === value);
  return item ? item.label : null;
}

// Enlace de WhatsApp: los móviles ecuatorianos (09…) se pasan a formato internacional (5939…).
function whatsappHref(telefono) {
  let digitos = String(telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10 && digitos.startsWith('0')) digitos = `593${digitos.slice(1)}`;
  return `https://wa.me/${digitos}`;
}

const iniciales = computed(() => {
  const nombre = (client.value && client.value.nombre) || '';
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('') || '?';
});

const vehiculos = computed(() => {
  const lista = (client.value && Array.isArray(client.value.vehiculos)) ? client.value.vehiculos : [];
  return lista
    .map((v) => ({
      ...v,
      titulo: [v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo sin marca',
      detalles: [
        v.anio,
        v.tipo ? tipoLabel(v.tipo) : null,
        COMBUSTIBLE_LABELS[v.combustible],
      ].filter(Boolean),
      mantenimiento: mantenimientoResumen(v),
    }))
    // Activos primero y, entre ellos, los que más urge atender.
    .sort((a, b) => Number(b.is_active !== false) - Number(a.is_active !== false)
      || URGENCIA[b.mantenimiento.tono] - URGENCIA[a.mantenimiento.tono]
      || String(a.placa || '').localeCompare(String(b.placa || '')));
});

const vehiculosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase().replace(/[\s-]/g, '');
  if (!termino) return vehiculos.value;
  return vehiculos.value.filter((v) => [v.placa, v.marca, v.modelo, v.color, v.anio]
    .some((campo) => String(campo || '').toLowerCase().replace(/[\s-]/g, '').includes(termino)));
});

const TONO_MANTENIMIENTO = {
  vacio: 'bg-gray-100 text-gray-500 ring-gray-500/10 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-400/20',
  pendiente: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-400/30',
  pronto: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/30',
  vencido: 'bg-amber-50 text-amber-800 ring-amber-600/30 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-400/40',
};

const PUNTO_MANTENIMIENTO = {
  vacio: 'bg-gray-400',
  pendiente: 'bg-green-500',
  pronto: 'bg-amber-500',
  vencido: 'bg-amber-600',
};

function abrirEditar() {
  if (!client.value) return;
  clientModalId.value = client.value.id;
  showClientModal.value = true;
}

async function cargarCliente() {
  client.value = await clientsService.getById(clientId);
}

async function recargar(mensaje) {
  loading.value = true;
  try {
    await cargarCliente();
    error.value = '';
    alert.value = { type: 'success', message: mensaje };
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo recargar el cliente.';
  } finally {
    loading.value = false;
  }
}

function onClientUpdated() {
  showClientModal.value = false;
  recargar('Cliente actualizado correctamente.');
}

function onVehicleCreated() {
  showVehicleModal.value = false;
  busqueda.value = '';
  recargar('Vehículo agregado al cliente.');
}

onMounted(async () => {
  if (!clientId) {
    error.value = 'Falta el identificador del cliente.';
    loading.value = false;
    return;
  }
  try {
    await cargarCliente();
  } catch (fetchError) {
    error.value = fetchError.message || 'No se pudo cargar el cliente.';
  } finally {
    loading.value = false;
  }
  // Las etiquetas de tipo de vehículo son un extra: si fallan, la ficha se muestra igual.
  try {
    const choices = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(choices && choices.tipo) ? choices.tipo : [];
  } catch {
    tipos.value = [];
  }
});
</script>

<template>
  <EntityHeader
    mode="detail"
    entity="Cliente"
    :title="client ? client.nombre : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Clientes', href: '/crud/clientes/' },
      { label: 'Ver' },
    ]"
  >
    <template #actions>
      <button
        v-if="client && puedeModificarClientes"
        type="button"
        title="Editar cliente"
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
    <Alert
      v-if="alert.message && !error"
      :type="alert.type"
      :title="alert.message"
      message=""
      dismissible
      @dismiss="alert.message = ''"
    />

    <!-- Carga -->
    <div v-if="loading" class="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando cliente">
      <div class="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="h-80 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
    </div>

    <template v-else-if="client">
      <!-- Resumen: identidad, estado y contacto -->
      <section class="shadow-sm rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center lg:p-8">
          <span
            class="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-800 dark:bg-brand-800 dark:text-brand-100 lg:h-20 lg:w-20 lg:text-2xl"
            aria-hidden="true"
          >
            {{ iniciales }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-4">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Cliente<template v-if="formatMesAnio(client.created_at)"> · desde {{ formatMesAnio(client.created_at) }}</template>
              </p>
              <span
                v-if="client.is_active !== false"
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
            <h2 class="mt-1 text-2xl font-semibold tracking-tight break-words text-gray-900 dark:text-white lg:text-3xl">
              {{ client.nombre }}
            </h2>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span
                v-if="client.identificacion"
                class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
              >
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ TIPO_IDENTIFICACION[client.tipo_identificacion] || 'ID' }}</span>
                <span class="font-mono font-semibold tracking-wider text-gray-900 dark:text-white">{{ client.identificacion }}</span>
              </span>
            </div>
          </div>
        </div>

        <dl class="grid grid-cols-1 gap-6 border-t border-gray-100 px-6 py-5 dark:border-gray-700 sm:grid-cols-3 lg:px-8">
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Phone class="h-3.5 w-3.5" aria-hidden="true" />
              Teléfono / WhatsApp
            </dt>
            <dd class="mt-2 flex items-center gap-2 text-base font-semibold tabular-nums text-gray-900 dark:text-white">
              <template v-if="client.telefono">
                <a :href="`tel:${client.telefono}`" class="hover:text-brand-700 hover:underline dark:hover:text-brand-200">
                  {{ client.telefono }}
                </a>
                <a
                  v-if="whatsappHref(client.telefono)"
                  :href="whatsappHref(client.telefono)"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Escribir por WhatsApp"
                  aria-label="Escribir por WhatsApp"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                >
                  <MessageCircle class="h-4 w-4" aria-hidden="true" />
                </a>
              </template>
              <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Mail class="h-3.5 w-3.5" aria-hidden="true" />
              Correo
            </dt>
            <dd class="mt-2 truncate text-base font-semibold text-gray-900 dark:text-white">
              <a v-if="client.email" :href="`mailto:${client.email}`" class="hover:text-brand-700 hover:underline dark:hover:text-brand-200" :title="client.email">
                {{ client.email }}
              </a>
              <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <MapPin class="h-3.5 w-3.5" aria-hidden="true" />
              Dirección
            </dt>
            <dd class="mt-2 text-base font-semibold break-words text-gray-900 dark:text-white">
              <span v-if="client.direccion">{{ client.direccion }}</span>
              <span v-else class="font-normal text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Vehículos del cliente -->
      <section class="shadow-sm rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            Vehículos
            <span v-if="vehiculos.length" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {{ vehiculos.length }}
            </span>
          </h3>
          <div class="flex items-center gap-2">
            <div v-if="vehiculos.length >= MIN_VEHICULOS_BUSQUEDA" class="relative w-full sm:w-56">
              <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                <Search class="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <input
                v-model="busqueda"
                type="search"
                aria-label="Buscar vehículo del cliente"
                placeholder="Buscar placa, marca…"
                class="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 ps-9 pe-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <button
              v-if="puedeModificarVehiculos"
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-300 dark:hover:text-brand-900 dark:focus:ring-brand-800"
              @click="showVehicleModal = true"
            >
              <Plus class="h-4 w-4" aria-hidden="true" />
              Agregar
            </button>
          </div>
        </div>

        <!-- Sin vehículos -->
        <div v-if="!vehiculos.length" class="mx-6 mb-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-600">
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
            <CarFront class="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Este cliente aún no tiene vehículos</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Registra su vehículo para crear citas, recepciones y órdenes.</p>
          </div>
        </div>

        <!-- Búsqueda sin coincidencias -->
        <p
          v-else-if="!vehiculosFiltrados.length"
          class="mx-6 mb-6 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400"
        >
          Ningún vehículo coincide con «{{ busqueda }}».
        </p>

        <ul v-else class="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
          <li v-for="veh in vehiculosFiltrados" :key="veh.id">
            <a
              :href="`/crud/vehiculos/ver/?id=${encodeURIComponent(veh.id)}`"
              class="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 dark:hover:bg-gray-700/40 dark:focus-visible:bg-gray-700/40"
              :class="{ 'opacity-60': veh.is_active === false }"
              :title="`Ver ficha del vehículo ${formatPlate(veh.placa)}`"
            >
              <span class="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100 dark:bg-gray-900/40 dark:ring-gray-700 sm:h-[4.5rem] sm:w-24">
                <img
                  v-if="veh.imagen"
                  :src="veh.imagen"
                  :alt="`Vehículo ${formatPlate(veh.placa)}`"
                  loading="lazy"
                  class="h-full w-full object-contain p-1"
                />
                <CarFront v-else class="h-7 w-7 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="truncate text-sm font-semibold text-gray-900 capitalize dark:text-white">{{ veh.titulo.toLowerCase() }}</span>
                  <span class="inline-flex items-center rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold tracking-widest text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    {{ formatPlate(veh.placa) || '—' }}
                  </span>
                  <span
                    v-if="veh.is_active === false"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
                    Inactivo
                  </span>
                </span>
                <span class="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="veh.color" class="inline-flex items-center gap-1 capitalize">
                    <span
                      v-if="colorCss(veh.color)"
                      class="h-2.5 w-2.5 rounded-full ring-1 ring-black/15 dark:ring-white/20"
                      :style="{ backgroundColor: colorCss(veh.color) }"
                      aria-hidden="true"
                    ></span>
                    {{ veh.color.toLowerCase() }}
                  </span>
                  <template v-for="(detalle, i) in veh.detalles" :key="detalle">
                    <span v-if="veh.color || i > 0" aria-hidden="true">·</span>
                    <span>{{ detalle }}</span>
                  </template>
                </span>
                <!-- En móvil el kilometraje y el servicio van bajo los datos -->
                <span class="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                  <span v-if="formatKm(veh.kilometraje_actual)" class="text-xs tabular-nums text-gray-600 dark:text-gray-300">{{ formatKm(veh.kilometraje_actual) }}</span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                    :class="TONO_MANTENIMIENTO[veh.mantenimiento.tono]"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="PUNTO_MANTENIMIENTO[veh.mantenimiento.tono]" aria-hidden="true"></span>
                    {{ veh.mantenimiento.etiqueta }}
                  </span>
                </span>
              </span>

              <span class="hidden w-28 shrink-0 text-right sm:block">
                <span class="flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Gauge class="h-3 w-3" aria-hidden="true" />
                  Km
                </span>
                <span class="mt-0.5 block text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {{ formatKm(veh.kilometraje_actual) || '—' }}
                </span>
              </span>

              <span class="hidden w-40 shrink-0 text-right sm:block">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                  :class="TONO_MANTENIMIENTO[veh.mantenimiento.tono]"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="PUNTO_MANTENIMIENTO[veh.mantenimiento.tono]" aria-hidden="true"></span>
                  {{ veh.mantenimiento.etiqueta }}
                </span>
                <span v-if="veh.mantenimiento.detalle" class="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ veh.mantenimiento.detalle }}
                </span>
              </span>

              <ChevronRight class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>
    </template>
  </div>

  <ClientModal
    v-model="showClientModal"
    :client-id="clientModalId"
    @updated="onClientUpdated"
  />

  <VehicleModal
    v-model="showVehicleModal"
    :cliente="client ? { id: client.id, nombre: client.nombre } : null"
    @created="onVehicleCreated"
    @reactivated="onVehicleCreated"
  />
</template>
