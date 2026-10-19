<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeftRight,
  ChevronDown,
  IdCardIcon,
  Loader2,
  Mail,
  MessageSquareText,
  Package,
  PaintBucket,
  Pen,
  Phone,
  Send,
  Shapes,
  Store,
  TagIcon,
  UserCheck,
  Users,
  Workflow,
  Toolbox,
  Wrench,
  ListChecks,
} from 'lucide-vue-next';
import { IconBrandWhatsapp, IconLockOpen2 } from '@tabler/icons-vue';
import { cotizacionesService } from '../services/cotizacionesService';
import { formatPlate } from '../../../shared/utils/formatPlate';
import { formatDateTime } from '../../../shared/utils/datetime';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeCotizacion } from '../../../shared/utils/relacionesFlujo';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';
import CotizacionCiclo from './CotizacionCiclo.vue';
import CotizacionTotales from './CotizacionTotales.vue';
import CotizacionVigencia from './CotizacionVigencia.vue';
import { correoCotizacionHref, whatsappCotizacionHref } from '../utils/envioCotizacion';

const METODOS_ACEPTACION = [
  { value: 'PRESENCIAL', label: 'Presencial en taller' },
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEFONO', label: 'Teléfono' },
];

// --- Estilos compartidos con el resto del flujo (recepción / inspección) ---
const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const ETIQUETA = 'text-xs font-medium text-gray-500 dark:text-gray-400';
const VALOR = 'mt-0.5 text-sm font-semibold text-gray-900 dark:text-white';
const ENLACE = 'hover:text-brand-coral';
const BOTON_PRIMARIO = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed';
const BOTON_SECUNDARIO = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800';

const cotizacionId = computed(() => new URLSearchParams(window.location.search).get('id'));

const cotizacion = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

const mostrarModalReabrir = ref(false);
const mostrarModalGenerarOrden = ref(false);
const procesandoReapertura = ref(false);
const procesandoGeneracionOrden = ref(false);
const menuEnvioAbierto = ref(false);
const procesandoEnvio = ref(false);

const canalesEnvio = computed(() => [
  { key: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp, iconClass: 'text-green-600 dark:text-green-400', href: whatsappCotizacionHref(cotizacion.value), falta: 'El cliente no tiene teléfono registrado' },
  { key: 'correo', label: 'Correo electrónico', icon: Mail, iconClass: 'text-brand-700 dark:text-brand-200', href: correoCotizacionHref(cotizacion.value), falta: 'El cliente no tiene correo registrado' },
]);

const ordenGenerada = computed(() => cotizacion.value?.orden_generada_numero || '');
const ordenHref = computed(() => (
  cotizacion.value?.orden_generada_id ? `/crud/ordenes/ver/?id=${encodeURIComponent(cotizacion.value.orden_generada_id)}` : ''
));
const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('cotizaciones'));
const aceptadaSinOrden = computed(() => cotizacion.value?.estado === 'ACEPTADA' && !ordenGenerada.value);
// Generar la orden crea otro documento: hace falta poder crear órdenes.
const puedeGenerarOrden = computed(() => aceptadaSinOrden.value && puedeModificar.value && puede('ordenes'));
const puedeReabrir = computed(() => aceptadaSinOrden.value && puedeModificar.value);
const puedeEditar = computed(() => Boolean(cotizacion.value) && puedeModificar.value && cotizacion.value.estado !== 'ACEPTADA');
const esperandoRespuesta = computed(() => ['PENDIENTE', 'ENVIADA'].includes(cotizacion.value?.estado));

const metodoAceptacionLabel = computed(() => {
  const metodo = cotizacion.value?.metodo_aceptacion;
  if (!metodo) return '';
  return (METODOS_ACEPTACION.find((m) => m.value === metodo) || {}).label || metodo;
});

const iconoMetodoAceptacion = computed(() => {
  const iconos = { WHATSAPP: IconBrandWhatsapp, EMAIL: Mail, TELEFONO: Phone, PRESENCIAL: UserCheck };
  return iconos[cotizacion.value?.metodo_aceptacion] || UserCheck;
});

const clienteUrl = computed(() => (cotizacion.value?.cliente ? `/crud/clientes/ver/?id=${encodeURIComponent(cotizacion.value.cliente)}` : null));
const vehiculoUrl = computed(() => (cotizacion.value?.vehiculo ? `/crud/vehiculos/ver/?id=${encodeURIComponent(cotizacion.value.vehiculo)}` : null));

const relacionesCotizacion = computed(() => relacionesDeCotizacion(cotizacion.value));

const servicios = computed(() => cotizacion.value?.servicios || []);
const repuestos = computed(() => cotizacion.value?.repuestos || []);

// Los subtotales por categoría se derivan únicamente del campo `subtotal` que
// ya calcula el backend en cada servicio/repuesto (sin recalcular precios*horas).
const subtotalServicios = computed(() => servicios.value.reduce((acc, s) => acc + (Number(s.subtotal) || 0), 0));
const subtotalRepuestos = computed(() => repuestos.value.reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0));
const opcionales = computed(() => [...servicios.value, ...repuestos.value].filter((i) => i.es_opcional).length);

const GRUPOS = computed(() => [
  {
    key: 'svc',
    titulo: 'Servicios',
    singular: 'Servicio',
    icon: Toolbox,
    filas: servicios.value,
    columna: 'Horas',
    cantidad: (f) => f.horas_estimadas ?? '—',
    precio: (f) => f.precio_unitario,
    subtotal: subtotalServicios.value,
    vacio: 'Sin servicios en esta cotización.',
  },
  {
    key: 'rpt',
    titulo: 'Repuestos y materiales',
    singular: 'Repuesto',
    icon: Package,
    filas: repuestos.value,
    columna: 'Cant.',
    cantidad: (f) => f.cantidad ?? '—',
    precio: (f) => f.precio_unitario_referencial,
    subtotal: subtotalRepuestos.value,
    vacio: 'Sin repuestos ni materiales en esta cotización.',
  },
]);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ivaLabel(valor) {
  return `${((Number(valor) || 0) * 100).toFixed(0)}%`;
}

function goTo(path) {
  window.location.assign(path);
}

function irAEditar() {
  if (!cotizacionId.value) return;
  goTo(`/crud/cotizaciones/editar/?id=${encodeURIComponent(cotizacionId.value)}`);
}

// El PDF se genera en el backend y está disponible en cualquier estado de la
// cotización: el botón depende únicamente de que exista una cotización guardada.
function descargarPdf() {
  return cotizacionesService.exportarPdf(cotizacionId.value);
}

// La ventana se abre antes de cualquier await para que el navegador no la
// bloquee; si la cotización seguía pendiente, queda marcada como enviada.
async function enviarPor(canal) {
  menuEnvioAbierto.value = false;
  if (!canal.href || procesandoEnvio.value) return;
  window.open(canal.href, '_blank', 'noopener');
  if (cotizacion.value?.estado !== 'PENDIENTE') return;
  procesandoEnvio.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
    successMessage.value = `Cotización enviada al cliente por ${canal.label}.`;
    await cargar();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo marcar la cotización como enviada.';
  } finally {
    procesandoEnvio.value = false;
  }
}

async function confirmarGenerarOrden() {
  if (!cotizacionId.value || !cotizacion.value || procesandoGeneracionOrden.value) return;
  procesandoGeneracionOrden.value = true;
  try {
    const resultado = await cotizacionesService.generarOrden(cotizacionId.value, {
      metodo_aceptacion: cotizacion.value.metodo_aceptacion || 'PRESENCIAL',
    });
    mostrarModalGenerarOrden.value = false;
    successMessage.value = `Orden de trabajo N° ${resultado.numero_orden} generada correctamente.`;
    await cargar();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo completar la operación.';
  } finally {
    procesandoGeneracionOrden.value = false;
  }
}

async function confirmarReabrir() {
  if (!cotizacionId.value || !cotizacion.value || procesandoReapertura.value) return;
  procesandoReapertura.value = true;
  try {
    await cotizacionesService.update(cotizacionId.value, { estado: 'ENVIADA' });
    mostrarModalReabrir.value = false;
    irAEditar();
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo reabrir la cotización.';
  } finally {
    procesandoReapertura.value = false;
  }
}

async function cargar() {
  if (!cotizacionId.value) {
    errorMessage.value = 'Falta el identificador de la cotización.';
    loading.value = false;
    return;
  }
  try {
    cotizacion.value = await cotizacionesService.getById(cotizacionId.value);
  } catch (error) {
    errorMessage.value = error.message || 'Error al cargar la cotización.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('cotizaciones')) {
    loading.value = false;
    return;
  }
  cargar();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('cotizaciones')" seccion="Cotizaciones" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Cotización"
    :record-number="cotizacion ? cotizacion.numero_cotizacion : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Cotizaciones', href: '/crud/cotizaciones/' },
      { label: 'Cotización' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="cotizacion && soloConsulta('cotizaciones')" objeto="esta cotización" acciones="editarla o enviarla" />
    </template>
    <template #badges>
      <EstadoCotizacionBadge v-if="cotizacion" :estado="cotizacion.estado" :estado-display="cotizacion.estado_display" size="md" />
    </template>

    <template #actions>
      <button v-if="puedeReabrir" type="button" :disabled="procesandoReapertura" :class="BOTON_SECUNDARIO" @click="mostrarModalReabrir = true">
        <IconLockOpen2 class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Reabrir
      </button>
      <button v-if="puedeEditar" type="button" :class="BOTON_SECUNDARIO" @click="irAEditar">
        <Pen class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Editar
      </button>
      <PdfExportButton v-if="cotizacion" :descargador="descargarPdf" label="Exportar" @error="errorMessage = $event" />
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-6">
    <div class="space-y-4">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
    </div>

    <div v-if="loading" :class="[SECCION, 'mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
      <Loader2 class="w-4 h-4 animate-spin" />
      Cargando cotización...
    </div>

    <div v-else-if="!cotizacion" :class="[SECCION, 'mt-4 text-center text-sm text-gray-500 dark:text-gray-400']">
      Cotización no encontrada.
    </div>

    <template v-else>
      <!-- Ciclo de vida + siguiente paso -->
      <CotizacionCiclo
        class="mt-4"
        :estado="cotizacion.estado"
        :creada="cotizacion.created_at"
        :enviada="cotizacion.fecha_envio"
        :aceptada="cotizacion.fecha_aceptacion"
        :orden-numero="cotizacion.orden_generada_numero || ''"
        :orden-href="ordenHref"
      >
        <template v-if="puedeGenerarOrden" #accion>
          <button type="button" :class="BOTON_PRIMARIO" @click="mostrarModalGenerarOrden = true">
            <Wrench class="w-5 h-5 -ms-1" aria-hidden="true" />
            Generar orden de trabajo
          </button>
        </template>
        <template v-else-if="puedeEditar && cotizacion.estado === 'PENDIENTE'" #accion>
          <div class="relative" @keydown.esc="menuEnvioAbierto = false">
            <button
              type="button"
              :class="BOTON_PRIMARIO"
              :disabled="procesandoEnvio"
              aria-haspopup="menu"
              :aria-expanded="menuEnvioAbierto"
              @click="menuEnvioAbierto = !menuEnvioAbierto"
            >
              <Loader2 v-if="procesandoEnvio" class="w-4 h-4 -ms-0.5 animate-spin" aria-hidden="true" />
              <Send v-else class="w-4 h-4 -ms-0.5" aria-hidden="true" />
              Enviar al cliente
              <ChevronDown class="w-4 h-4 -me-0.5 transition-transform" :class="{ 'rotate-180': menuEnvioAbierto }" aria-hidden="true" />
            </button>
            <template v-if="menuEnvioAbierto">
              <div class="fixed inset-0 z-40" @click="menuEnvioAbierto = false" />
              <div
                class="absolute end-0 z-50 mt-1 w-56 overflow-hidden rounded-base border border-default bg-white py-1 shadow-md dark:bg-gray-800"
                role="menu"
                aria-label="Enviar cotización"
              >
                <button
                  v-for="canal in canalesEnvio"
                  :key="canal.key"
                  type="button"
                  role="menuitem"
                  :disabled="!canal.href"
                  :title="canal.href ? `Enviar por ${canal.label}` : canal.falta"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-gray-700"
                  @click="enviarPor(canal)"
                >
                  <component :is="canal.icon" class="w-4 h-4 shrink-0" :class="canal.iconClass" aria-hidden="true" />
                  <span>
                    {{ canal.label }}
                    <span v-if="!canal.href" class="block text-xs text-gray-500 dark:text-gray-400">{{ canal.falta }}</span>
                  </span>
                </button>
              </div>
            </template>
          </div>
        </template>
        <template v-else-if="puedeEditar && esperandoRespuesta" #accion>
          <button type="button" :class="BOTON_PRIMARIO" @click="irAEditar">
            <Pen class="w-4 h-4 -ms-0.5" aria-hidden="true" />
            Registrar respuesta
          </button>
        </template>
      </CotizacionCiclo>

      <div class="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-4">
        <div class="space-y-4 lg:col-span-3">
          <!-- Cliente, vehículo y asesor -->
          <section :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-4']">
              <Users class="w-4 h-4" />
              Cliente y vehículo
            </h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="min-w-0">
                <p :class="ETIQUETA">Cliente</p>
                <a v-if="clienteUrl" :href="clienteUrl" :class="[VALOR, ENLACE, 'block truncate text-base']" :title="cotizacion.cliente_nombre">{{ cotizacion.cliente_nombre || '—' }}</a>
                <p v-else :class="[VALOR, 'truncate text-base']">{{ cotizacion.cliente_nombre || '—' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Identificación:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.cliente_identificacion || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <dt>Teléfono:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.cliente_telefono || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <dt>Correo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.cliente_email || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
                <p :class="ETIQUETA">Vehículo</p>
                <a v-if="vehiculoUrl" :href="vehiculoUrl" :class="[VALOR, ENLACE, 'block font-mono text-base tracking-widest']">{{ formatPlate(cotizacion.vehiculo_placa) || '—' }}</a>
                <p v-else :class="[VALOR, 'font-mono text-base tracking-widest']">{{ formatPlate(cotizacion.vehiculo_placa) || '—' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <TagIcon class="w-3.5 h-3.5 shrink-0" />
                    <dt>Marca:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_marca || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Shapes class="w-3.5 h-3.5 shrink-0" />
                    <dt>Modelo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_modelo || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                    <dt>Color:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.vehiculo_color || '—' }}</dd>
                  </div>
                </dl>
              </div>

              <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
                <p :class="ETIQUETA">Responsable</p>
                <p :class="[VALOR, 'truncate text-base']">{{ cotizacion.asesor_nombre || '—' }}</p>
                <dl class="mt-3 space-y-1.5 text-xs">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <dt>Teléfono:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.asesor_telefono || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <dt>Correo:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.asesor_email || '—' }}</dd>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Store class="w-3.5 h-3.5 shrink-0" />
                    <dt>Taller:</dt>
                    <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cotizacion.sucursal_nombre || '—' }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <!-- Detalle: servicios y repuestos -->
          <section v-for="grupo in GRUPOS" :key="grupo.key" :class="SECCION">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 :class="TITULO_SECCION">
                <component :is="grupo.icon" class="w-4 h-4" />
                {{ grupo.titulo }}
                <span class="px-1.5 text-xs font-medium normal-case tracking-normal rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 tabular-nums">{{ grupo.filas.length }}</span>
              </h4>
            </div>
            <div class="relative overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th scope="col" class="px-4 py-2.5 font-medium">{{ grupo.singular }}</th>
                    <th scope="col" class="w-20 px-4 py-2.5 font-medium text-right">{{ grupo.columna }}</th>
                    <th scope="col" class="w-28 px-4 py-2.5 font-medium text-right">P. unitario</th>
                    <th scope="col" class="w-28 px-4 py-2.5 font-medium text-right">Descuento</th>
                    <th scope="col" class="w-16 px-4 py-2.5 font-medium text-right">IVA</th>
                    <th scope="col" class="w-28 px-4 py-2.5 font-medium text-right">Neto</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr v-if="!grupo.filas.length">
                    <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{{ grupo.vacio }}</td>
                  </tr>
                  <tr v-for="(fila, index) in grupo.filas" :key="fila.id || index" class="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/40">
                    <td class="px-4 py-3">
                      <span class="font-medium text-gray-900 dark:text-white">{{ fila.descripcion || '—' }}</span>
                      <span
                        v-if="fila.es_opcional"
                        class="ms-2 px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/30 dark:text-brand-200 dark:ring-brand-500/50"
                        title="El cliente puede postergarlo"
                      >Opcional</span>
                    </td>
                    <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{{ grupo.cantidad(fila) }}</td>
                    <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">$ {{ formatMoney(grupo.precio(fila)) }}</td>
                    <td class="px-4 py-3 text-right tabular-nums" :class="Number(fila.descuento) ? 'text-accent-600 dark:text-accent-400' : 'text-gray-400'">
                      {{ Number(fila.descuento) ? `− $ ${formatMoney(fila.descuento)}` : '—' }}
                    </td>
                    <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{{ ivaLabel(fila.iva_porcentaje) }}</td>
                    <td class="px-4 py-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(fila.subtotal) }}</td>
                  </tr>
                </tbody>
                <tfoot v-if="grupo.filas.length" class="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th scope="row" colspan="5" class="px-4 py-2.5 text-xs font-medium text-right uppercase text-gray-500 dark:text-gray-400">Subtotal {{ grupo.titulo.toLowerCase() }}</th>
                    <td class="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">$ {{ formatMoney(grupo.subtotal) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <!-- Observaciones -->
          <section :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-3']">
              <MessageSquareText class="w-4 h-4" />
              Observaciones para el cliente
            </h4>
            <p
              v-if="cotizacion.observaciones"
              class="p-3 text-sm leading-relaxed whitespace-pre-line text-gray-900 border-s-4 border-brand-500 bg-brand-50/60 rounded-e-lg dark:bg-gray-700/50 dark:border-brand-300 dark:text-white"
            >{{ cotizacion.observaciones }}</p>
            <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin observaciones.</p>
          </section>
        </div>

        <aside class="lg:col-span-1">
          <div class="space-y-4 lg:sticky lg:top-4">
            <CotizacionTotales
              :subtotal-servicios="subtotalServicios"
              :subtotal-repuestos="subtotalRepuestos"
              :subtotal-neto="Number(cotizacion.subtotal_neto) || 0"
              :descuento="Number(cotizacion.descuento) || 0"
              :base0="Number(cotizacion.subtotal_base_0) || 0"
              :base-gravada="Number(cotizacion.subtotal_base_gravada) || 0"
              :iva="Number(cotizacion.total_iva) || 0"
              :total="Number(cotizacion.total) || 0"
              :n-servicios="servicios.length"
              :n-repuestos="repuestos.length"
            />

            <p v-if="opcionales" class="flex items-start gap-2 px-1 text-xs text-gray-500 dark:text-gray-400">
              <ListChecks class="w-4 h-4 shrink-0" />
              {{ opcionales }} ítem{{ opcionales === 1 ? '' : 's' }} opcional{{ opcionales === 1 ? '' : 'es' }} incluido{{ opcionales === 1 ? '' : 's' }} en el total.
            </p>

            <CotizacionVigencia
              :model-value="Number(cotizacion.validez_dias) || 15"
              :desde="cotizacion.fecha_envio || ''"
              :mostrar-restante="cotizacion.estado === 'ENVIADA'"
            />

            <!-- Aceptación -->
            <section v-if="cotizacion.fecha_aceptacion" :class="SECCION">
              <h4 :class="[TITULO_SECCION, 'mb-3']">
                <UserCheck class="w-4 h-4" />
                Aceptación
              </h4>
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <component :is="iconoMetodoAceptacion" class="w-5 h-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ metodoAceptacionLabel || 'Aceptada' }}</p>
                  <p class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatDateTime(cotizacion.fecha_aceptacion) }}</p>
                </div>
              </div>
            </section>

            <!-- Relaciones del flujo -->
            <section :class="SECCION">
              <h4 :class="[TITULO_SECCION, 'mb-1']">
                <Workflow class="w-4 h-4" />
                Relaciones del flujo
              </h4>
              <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">Recepción, inspección y orden de trabajo relacionadas.</p>
              <RelacionesFlujo :pasos="relacionesCotizacion" />
            </section>
          </div>
        </aside>
      </div>
    </template>
  </div>

  <ConfirmModal
    v-model="mostrarModalReabrir"
    title="Reabrir cotización"
    message='Al reabrir la cotización, volverá al estado "Enviada al cliente" y el cliente deberá aceptarla nuevamente. Serás trasladado a la pantalla de edición para ajustarla.'
    :icon="IconLockOpen2"
    icon-class="text-brand-700 dark:text-brand-200"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    variant="primary"
    :is-deleting="procesandoReapertura"
    @confirm="confirmarReabrir"
  />

  <ConfirmModal
    v-model="mostrarModalGenerarOrden"
    title="Generar orden de trabajo"
    message="Se generará una orden de trabajo a partir de esta cotización aceptada."
    :icon="ArrowLeftRight"
    icon-class="text-brand-700 dark:text-brand-200"
    confirm-text="Generar orden"
    confirming-text="Generando..."
    variant="primary"
    :is-deleting="procesandoGeneracionOrden"
    @confirm="confirmarGenerarOrden"
  />
  </template>
</template>
