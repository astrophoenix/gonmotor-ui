<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeft,
  Pencil,
  Plus,
  FolderInput,
  FileCheck,
  FileSearch,
  TriangleAlert,
  Camera,
  Signature,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  KeyRound,
  ShieldCheck,
  FileText,
  Loader2,
  IdCard,
  Phone,
  Mail,
  Tag,
  Shapes,
  PaintBucket,
  Car,
  ClipboardList,
} from 'lucide-vue-next';
import {
  IconEngine,
  IconManualGearbox,
  IconAutomaticGearbox,
  IconGasStation,
} from '@tabler/icons-vue';
import Alert from '../../../shared/components/Alert.vue';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import FlowSteps from '../../../shared/components/FlowSteps.vue';
import { buildPasosFlujo } from '../../../shared/utils/estadoFlujo';
import { TESTIGOS } from '../../../shared/config/testigos';
import { useRecepciones } from '../composables/useRecepciones';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';

const { loading, error, loadRecepcion } = useRecepciones();
const recepcion = ref(null);
const blueprintImageUrl = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const successMessage = ref('');
const creandoInspeccion = ref(false);
const errorCrearInspeccion = ref('');

const activeTab = ref('informacion');
const TAB_ORDER = ['informacion', 'inspeccion', 'evidencias', 'autorizacion'];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    activeTab.value = TAB_ORDER[next];
  }
}

const FOTO_VISTAS = [
  { key: 'FRONTAL', label: 'Vista Frontal' },
  { key: 'LATERAL_IZQ', label: 'Lateral Izquierda' },
  { key: 'LATERAL_DER', label: 'Lateral Derecha' },
  { key: 'POSTERIOR', label: 'Posterior' },
  { key: 'TABLERO', label: 'Tablero' },
];

const TIPO_RECEPCION = {
  MANTENIMIENTO: 'Mantenimiento',
  REPARACIÓN: 'Reparación',
  DIAGNOSTICO: 'Diagnóstico',
  ESTETICA: 'Estética',
  GARANTIA: 'Garantía',
  SINISTRO: 'Siniestro',
  OTRO: 'Otro',
};

const COMBUSTIBLE_LABELS = {
  VACIO: 'Vacío',
  RESERVA: 'Reserva',
  '1/4': '1/4',
  '1/2': '1/2',
  '3/4': '3/4',
  LLENO: 'Lleno',
};

const accesorios = [
  {
    titulo: 'Elementos Exteriores / Mecánicos',
    items: [
      { key: 'tiene_espejo_izquierdo', label: 'Espejo Izquierdo' },
      { key: 'tiene_espejo_derecho', label: 'Espejo Derecho' },
      { key: 'tiene_vidrios', label: 'Vidrios / Cristales' },
      { key: 'tiene_faros_lunas', label: 'Faros / Lunas' },
      { key: 'tiene_tapa_gasolina', label: 'Tapa de Gasolina' },
      { key: 'tiene_placas', label: 'Placas de Circulación' },
    ],
  },
  {
    titulo: 'Interiores / Confort',
    items: [
      { key: 'tiene_radio', label: 'Radio / Mascarilla' },
      { key: 'tiene_pantalla', label: 'Pantalla / Multimedia' },
      { key: 'tiene_encendedor', label: 'Encendedor' },
      { key: 'tiene_control_puertas', label: 'Control de Puertas' },
      { key: 'tiene_cargador_celular', label: 'Cargador de Celular' },
      { key: 'tiene_tapetes', label: 'Tapetes / Alfombras' },
      { key: 'tiene_cubresol', label: 'Cubresol' },
    ],
  },
  {
    titulo: 'Seguridad y Emergencia',
    items: [
      { key: 'tiene_llanta_repuesto', label: 'Llanta de Repuesto' },
      { key: 'tiene_gata_palanca', label: 'Gata y Palanca' },
      { key: 'tiene_herramientas', label: 'Juego de Herramientas' },
      { key: 'tiene_extintor', label: 'Extintor' },
      { key: 'tiene_botiquin', label: 'Botiquín' },
      { key: 'tiene_triangulos', label: 'Triángulos de Seguridad' },
      { key: 'tiene_llave_tuercas', label: 'Llave de Tuercas' },
    ],
  },
];

const testigosMeta = TESTIGOS;

const PERTENENCIAS = [
  { key: 'pertenencia_celular', label: 'Celular' },
  { key: 'pertenencia_billetera', label: 'Billetera' },
  { key: 'pertenencia_dinero', label: 'Dinero en efectivo' },
  { key: 'pertenencia_documentos', label: 'Documentos personales' },
  { key: 'pertenencia_gafas', label: 'Gafas / Lentes' },
  { key: 'pertenencia_equipaje', label: 'Equipaje / Bolsos' },
  { key: 'pertenencia_otros', label: 'Otros objetos de valor' },
];

const pertenenciasActivas = computed(() => {
  const r = recepcion.value;
  if (!r) return [];
  return PERTENENCIAS.filter((p) => Boolean(r[p.key])).map((p) => p.label);
});

const hayDatosSeguro = computed(() => {
  const r = recepcion.value;
  if (!r) return false;
  return Boolean(
    r.compania_seguro || r.numero_poliza || r.numero_reclamo ||
    r.ajustador_nombre || r.ajustador_telefono
  );
});

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function resolveBlueprint(grupo) {
  const candidates = [grupo, 'liviano'].filter(Boolean);
  for (const candidate of candidates) {
    const url = `/images/blueprint_${candidate}.png`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return url;
    } catch {
      // seguir con el siguiente candidato
    }
  }
  return '';
}

onMounted(async () => {
  const mensajeExito = sessionStorage.getItem('recepcion_aceptada_exito') || sessionStorage.getItem('recepcion_exito');
  if (mensajeExito) {
    successMessage.value = mensajeExito;
    sessionStorage.removeItem('recepcion_aceptada_exito');
    sessionStorage.removeItem('recepcion_exito');
  }
  const id = getIdFromUrl();
  if (id) {
    recepcion.value = await loadRecepcion(id);
    blueprintImageUrl.value = await resolveBlueprint(recepcion.value?.vehiculo?.grupo_blueprint);
  }
});

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function goTo(path) {
  window.location.assign(path);
}

const tieneInspeccion = computed(() => (recepcion.value?.inspecciones?.length ?? 0) > 0);

const puedeEditar = computed(() => {
  const r = recepcion.value;
  if (!r) return false;
  if (r.estado === 'NO_ACEPTADA') return false;
  return !(r.aceptacion_condiciones && r.fecha_firma_cliente);
});

const pasosFlujo = computed(() => {
  const r = recepcion.value || {};
  const inspec = (r.inspecciones && r.inspecciones[0]) || null;
  const cotizaciones = r.cotizaciones_generadas || [];
  const cotizacion = cotizaciones[cotizaciones.length - 1] || null;
  return buildPasosFlujo([
    { entidad: 'recepcion', estado: r.estado, estadoDisplay: r.estado_display, id: r.id, numero: r.numero_recepcion },
    {
      entidad: 'inspeccion',
      estado: inspec?.estado,
      estadoDisplay: inspec?.estado_display,
      id: inspec?.id,
      numero: inspec?.numero_inspeccion,
    },
    {
      entidad: 'cotizacion',
      estado: cotizacion?.estado || (cotizacion ? 'BORRADOR' : null),
      estadoDisplay: cotizacion?.estado_display,
      id: cotizacion?.id,
      numero: cotizacion?.numero_cotizacion,
    },
    {
      entidad: 'orden',
      estado: r.orden_trabajo_estado,
      estadoDisplay: r.orden_trabajo_estado_display,
      id: r.orden_trabajo,
      numero: r.orden_trabajo_numero,
    },
  ]);
});

const estadoBadge = computed(() => {
  const estado = recepcion.value?.estado || 'PENDIENTE';
  const map = {
    ACEPTADA: {
      label: 'Aceptada y Firmada',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle2,
    },
    NO_ACEPTADA: {
      label: 'No Aceptada / Sin Firma',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: XCircle,
    },
    PENDIENTE: {
      label: 'Pendiente de Firma',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: Clock,
    },
  };
  return map[estado] || map.PENDIENTE;
});

const cliente = computed(() => recepcion.value?.cliente || null);

const vehiculo = computed(() => recepcion.value?.vehiculo || null);

const numeroRecepcion = computed(
  () => recepcion.value?.numero_recepcion || `#${recepcion.value?.id}`
);

const tipoRecepcionDisplay = computed(() => {
  const r = recepcion.value;
  if (!r || !r.tipo_recepcion) return '-';
  return TIPO_RECEPCION[r.tipo_recepcion] || r.tipo_recepcion;
});

const nivelCombustibleDisplay = computed(() => {
  const r = recepcion.value;
  if (!r || !r.nivel_combustible) return '-';
  return COMBUSTIBLE_LABELS[r.nivel_combustible] || r.nivel_combustible;
});

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

const placaDisplay = computed(() => formatPlaca(vehiculo.value?.placa || recepcion.value?.placa));

const transmisionLabel = computed(() => {
  const map = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };
  const value = vehiculo.value?.transmision || '';
  return map[value] || value || '';
});

const transmisionIcon = computed(() => {
  const type = vehiculo.value?.transmision || '';
  if (type === 'M') return IconManualGearbox;
  return IconAutomaticGearbox;
});

const combustibleLabel = computed(() => {
  const map = {
    GAS: 'Gasolina',
    DIE: 'Diésel',
    HIB: 'Híbrido',
    ELE: 'Eléctrico',
    GNV: 'Gas Natural Vehicular (GNV)',
  };
  const value = vehiculo.value?.combustible || '';
  return map[value] || value || '';
});

const detallesCarroceriaList = computed(() => {
  const texto = recepcion.value?.detalles_carroceria || '';
  const items = [];
  const regex = /^(\d+):\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    items.push({ numero: parseInt(match[1], 10), descripcion: match[2] });
  }
  return items;
});

const marcasCarroceria = computed(() => {
  const raw = recepcion.value?.datos_danos_carroceria;
  const puntos = Array.isArray(raw) ? raw.filter((p) => p && typeof p === 'object') : [];
  const descripciones = detallesCarroceriaList.value;
  const items = [];
  for (let i = 0; i < puntos.length; i += 1) {
    const p = puntos[i];
    items.push({
      numero: Number.isFinite(Number(p.numero)) ? Number(p.numero) : i + 1,
      x: p.x == null ? null : Number(p.x),
      y: p.y == null ? null : Number(p.y),
      descripcion: p.descripcion || descripciones[i]?.descripcion || '',
    });
  }
  if (puntos.length === 0) {
    descripciones.forEach((d) => {
      items.push({ numero: d.numero, x: null, y: null, descripcion: d.descripcion });
    });
  }
  return items;
});

const marcasConPosicion = computed(() => marcasCarroceria.value.filter((m) => m.x != null && m.y != null));

const fotosOrdenadas = computed(() => {
  const fotos = recepcion.value?.fotos || [];
  return FOTO_VISTAS.map((v) => ({
    key: v.key,
    label: v.label,
    url: fotos.find((f) => f.tipo_vista === v.key)?.imagen || null,
  }));
});

function testigoActivo(testigo) {
  return Boolean(recepcion.value?.[testigo.key]);
}

function getTestigoCardClasses(testigo) {
  const base = 'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 opacity-70`;
  if (testigo.color === 'red') return `${base} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500`;
  if (testigo.color === 'green') return `${base} bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-500`;
  return `${base} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500`;
}

function getTestigoIconClasses(testigo) {
  const base = 'w-8 h-8 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${base} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
  if (testigo.color === 'green') return `${base} text-green-500 dark:text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`;
  return `${base} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

async function crearInspeccion(recepcion) {
  if (creandoInspeccion.value || !recepcion?.id) return;
  creandoInspeccion.value = true;
  errorCrearInspeccion.value = '';
  try {
    const inspeccion = await inspeccionesService.crearDesdeRecepcion(recepcion.id);
    if (inspeccion?.id) {
      goTo(`/crud/inspecciones/editar/?id=${inspeccion.id}&creada=1`);
    }
  } catch (err) {
    errorCrearInspeccion.value = err?.message || 'No se pudo crear la inspección.';
  } finally {
    creandoInspeccion.value = false;
  }
}

function irAInspeccion(recepcion) {
  const inspeccion = recepcion.inspecciones?.[0];
  if (!inspeccion) return;
  if (inspeccion.tiene_orden_trabajo || inspeccion.estado === 'FINALIZADA') {
    goTo(`/crud/inspecciones/ver/?id=${inspeccion.id}`);
  } else {
    goTo(`/crud/inspecciones/editar/?id=${inspeccion.id}`);
  }
}
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li class="inline-flex items-center">
          <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
        </li>
        <li class="text-gray-400">/ <a href="/crud/recepciones/" class="hover:text-primary-600">Recepciones</a></li>
        <li class="text-gray-400">/ Recepción / {{ numeroRecepcion }}</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
      <a href="/crud/recepciones/" title="Volver al listado" class="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
        <ArrowLeft class="w-5 h-5" />
      </a>
      <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
        Recepción {{ numeroRecepcion }}
      </h1>
      <span v-if="recepcion" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium" :class="estadoBadge.color">
        <component :is="estadoBadge.icon" class="w-4 h-4" aria-hidden="true" />
        {{ estadoBadge.label }}
      </span>
      <div v-if="recepcion" class="flex items-center gap-2 ml-auto flex-wrap">
        <button
          v-if="puedeEditar"
          type="button"
          title="Editar recepción"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 rounded-lg border border-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-gray-800"
          @click="goTo(`/crud/recepciones/editar/?id=${recepcion.id}`)"
        >
          <Pencil class="w-4 h-4" />
          Editar
        </button>
        <button
          v-if="!tieneInspeccion && recepcion.estado === 'ACEPTADA'"
          type="button"
          :disabled="creandoInspeccion"
          title="Crear Inspección heredando los datos de la recepción"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800"
          @click="crearInspeccion(recepcion)"
        >
          <Loader2 v-if="creandoInspeccion" class="w-4 h-4 animate-spin" />
          {{ creandoInspeccion ? 'Creando...' : 'Crear Inspección' }}
          <svg v-if="!creandoInspeccion" class="w-6 h-6 text-primary-800 dark:text-white ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
          </svg>
        </button>
        <!--template v-if="tieneInspeccion && recepcion.estado === 'ACEPTADA'">
          <a
            v-if="recepcion.inspecciones[0]?.tiene_orden_trabajo || recepcion.inspecciones[0]?.estado === 'FINALIZADA'"
            :href="`/crud/inspecciones/ver/?id=${recepcion.inspecciones[0].id}`"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-800"
          >
            <Eye class="w-4 h-4" />
            Ver Inspección
          </a>
          <button
            type="button"
            title="Ver / Editar Inspección"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 rounded-lg border border-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-400 dark:hover:bg-gray-800"
            @click="irAInspeccion(recepcion)"
          >
            <Pencil class="w-4 h-4" />
            Ver / Editar Inspección
          </button>
        </template-->
        <button
          v-if="recepcion.cotizaciones_generadas?.length"
          type="button"
          class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-700 rounded-lg border border-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
          @click="goTo(`/crud/cotizaciones/editar/?id=${recepcion.cotizaciones_generadas[0]?.id}`)"
        >
          Ver Cotización
        </button>
        <button
          v-if="recepcion.orden_trabajo"
          type="button"
          class="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-800"
          @click="goTo(`/crud/ordenes/ver/?id=${recepcion.orden_trabajo}`)"
        >
          Ver Orden
        </button>
      </div>
    </div>
  </div>

  <div class="p-4">
    <div v-if="recepcion" class="relative mx-auto max-w-6xl mb-5">
      <FlowSteps :steps="pasosFlujo" />
    </div>
    <div class="relative mx-auto max-w-8xl">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorCrearInspeccion" type="error" :message="errorCrearInspeccion" dismissible @dismiss="errorCrearInspeccion = ''" />

      <div v-if="error" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-200">
        {{ error }}
      </div>

      <div v-if="loading" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Cargando recepción...
      </div>

      <div v-else-if="!recepcion" class="p-6 text-center text-sm text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
        Recepción no encontrada.
      </div>

      <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div class="lg:col-span-3 p-6 bg-white rounded-lg shadow dark:bg-gray-800">
        <div class="mb-4 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
          <div class="flex items-center gap-2 mb-4">
            <FileText class="w-5 h-5 text-gray-900 dark:text-gray-900" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              Información General
            </h3>
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr_1fr]">
            <div>
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Cliente
              </p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                {{ cliente?.nombre || '—' }}
              </p>
              <div class="mt-3 space-y-1.5">
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <IdCard class="w-3.5 h-3.5 shrink-0" /> Identificación:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</span>
                </div>
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Vehículo
              </p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                {{ vehiculo?.placa || recepcion.placa || '—' }}
              </p>
              <div class="mt-3 space-y-1.5">
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <Tag class="w-3.5 h-3.5 shrink-0" /> Marca:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" /> Modelo:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" /> Color:
                  <span class="truncate font-bold text-gray-900 dark:text-white">
                    {{ vehiculo?.color || '—' }}
                    <template v-if="vehiculo?.kilometraje_actual">({{ vehiculo.kilometraje_actual }} km)</template>
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Asesor
              </p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                {{ recepcion.recibido_por_nombre || '—' }}
              </p>
              <div class="mt-3 space-y-1.5">
                <div class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" /> Rol:
                  <span class="truncate font-bold text-gray-900 dark:text-white">{{ recepcion.recibido_por_rol_display || recepcion.recibido_por_rol || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="flex flex-wrap -mb-px">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'informacion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'informacion'"
            >
              <FolderInput class="w-4 h-4" />
              1. Ingreso
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'inspeccion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'inspeccion'"
            >
              <FileCheck class="w-4 h-4" />
              2. Revisión
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'evidencias' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'evidencias'"
            >
              <Camera class="w-4 h-4" />
              3. Evidencias
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
              :class="activeTab === 'autorizacion' ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
              @click="activeTab = 'autorizacion'"
            >
              <Signature class="w-4 h-4" />
              4. Autorización
            </button>
          </nav>
        </div>

        <div v-show="activeTab === 'informacion'" class="p-4 space-y-4">
          <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Ingreso</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ formatDate(recepcion.fecha_ingreso || recepcion.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Salida (estimada)</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ formatDate(recepcion.fecha_salida) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Recepción</dt>
                <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ tipoRecepcionDisplay }}</dd>
              </div>
              <div v-if="recepcion.inspecciones?.length">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Inspección</dt>
                <dd class="mt-0.5 text-sm font-semibold">
                  <a
                    :href="`/crud/inspecciones/ver/?id=${recepcion.inspecciones[0]?.id}`"
                    class="text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {{ recepcion.inspecciones[0]?.numero_inspeccion || `#${recepcion.inspecciones[0]?.id}` }}
                  </a>
                </dd>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso</p>
              <p class="text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ recepcion.motivo_ingreso || '—' }}</p>
            </div>

            <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje de Ingreso</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ recepcion.kilometraje_ingreso }} km</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresó en Grúa</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.ingreso_en_grua ? 'Sí' : 'No' }}</dd>
                  </div>
                </div>
                <div class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nivel de Combustible</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ nivelCombustibleDisplay }}</dd>
                  </div>
                  <div v-if="recepcion.ingreso_en_grua">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Datos de la Grúa / Chófer</dt>
                    <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.datos_grua || '—' }}</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
              <h5 class="mb-4 font-semibold text-gray-900 dark:text-white">
                <span class="inline-flex items-center gap-2">
                  <KeyRound class="w-5 h-5 text-gray-800 dark:text-white" />
                  Custodia y pertenencias
                </span>
              </h5>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cantidad de llaves</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ recepcion.cantidad_llaves ?? 0 }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Llave de control / Control remoto</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.tiene_llave_control ? 'Sí' : 'No' }}</dd>
                </div>
              </div>
              <div class="mt-4">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Objetos de valor dejados en el vehículo</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ pertenenciasActivas.length ? pertenenciasActivas.join(', ') : '—' }}
                </dd>
              </div>
              <div class="mt-4">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Observaciones (otros objetos no listados)</dt>
                <dd class="mt-0.5 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ recepcion.pertenencias_observaciones || '—' }}</dd>
              </div>
            </div>

            <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
              <h5 class="mb-4 font-semibold text-gray-900 dark:text-white">
                <span class="inline-flex items-center gap-2">
                  <ShieldCheck class="w-5 h-5 text-gray-800 dark:text-white" />
                  Seguro / Siniestros
                </span>
              </h5>
              <div v-if="hayDatosSeguro" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Compañía de seguro</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{{ recepcion.compania_seguro || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° póliza</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.numero_poliza || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">N° reclamo / siniestro</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.numero_reclamo || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre del perito seguro</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.ajustador_nombre || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono del perito seguro</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ recepcion.ajustador_telefono || '—' }}</dd>
                </div>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-400">Sin datos de seguro registrados.</p>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'inspeccion'" class="p-4">
          <div>
            <h4 class="mb-2 font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <FileCheck class="w-6 h-6 text-gray-800 dark:text-white" />
                Inventario
              </span>
            </h4>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Registra los accesorios y objetos presentes en el vehículo al momento de la recepción.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div v-for="grupo in accesorios" :key="grupo.titulo">
                <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ grupo.titulo }}</p>
                <div class="space-y-2">
                  <label v-for="field in grupo.items" :key="field.key" class="flex items-center">
                    <input
                      :checked="Boolean(recepcion[field.key])"
                      type="checkbox"
                      disabled
                      class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 opacity-70"
                    />
                    <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <hr class="my-6 border-gray-200 dark:border-gray-700" />

          <div>
            <h4 class="mb-2 font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <TriangleAlert class="w-6 h-6 text-gray-800 dark:text-white" />
                Testigos luminosos
              </span>
            </h4>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Señala los testigos con problemas, daños o averías que se encuentren encendidos en el tablero del vehículo.
            </p>
            <div class="space-y-4">
              <div class="grid grid-cols-5 lg:grid-cols-10 gap-2 lg:gap-3">
                <div
                  v-for="testigo in testigosMeta"
                  :key="testigo.key"
                  :class="getTestigoCardClasses(testigo)"
                >
                  <MdiIcon :path="testigo.path" :class="getTestigoIconClasses(testigo)" />
                  <span class="mt-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300">
                    {{ testigo.label }}
                  </span>
                </div>
              </div>
              <div class="col-span-1">
                <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Otros Testigos u Observaciones del Tablero</p>
                <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
                  {{ recepcion.otros_testigos_observaciones || '-' }}
                </div>
              </div>
            </div>
          </div>

          <hr class="my-6 border-gray-200 dark:border-gray-700" />

          <div>
            <h4 class="mb-2 font-semibold dark:text-white">
              <span class="inline-flex items-center gap-2">
                <FileSearch class="w-6 h-6 text-gray-800 dark:text-white" />
                Inspección Física
              </span>
            </h4>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Marca sobre el diagrama la ubicación de daños en el vehículo, como rayones, golpes u otros detalles, y describe cada uno.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-1">
                <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marcación de Daños</p>
                <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
                  <div v-if="!blueprintImageUrl" class="flex items-center justify-center h-56 text-sm text-gray-500 dark:text-gray-400">Sin diagrama disponible.</div>
                  <div v-else class="relative" style="aspect-ratio: 4/3;">
                    <img :src="blueprintImageUrl" class="absolute inset-0 w-full h-full object-contain" alt="Diagrama del vehículo" />
                    <div class="absolute inset-0 pointer-events-none">
                      <span
                        v-for="detalle in marcasConPosicion"
                        :key="detalle.numero"
                        class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full -translate-x-1/2 -translate-y-1/2"
                        :style="{ left: detalle.x + '%', top: detalle.y + '%' }"
                      >
                        {{ detalle.numero }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-span-1">
                <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalles</p>
                <div v-if="marcasCarroceria.length" class="space-y-2">
                  <div v-for="detalle in marcasCarroceria" :key="detalle.numero" class="flex items-start gap-2">
                    <span class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full mt-1">{{ detalle.numero }}</span>
                    <div class="flex-1 block w-full p-2 text-sm bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-400">
                      {{ detalle.descripcion }}
                    </div>
                  </div>
                </div>
                <div v-else class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
                  Sin daños registrados.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'evidencias'" class="p-4">
          <h4 class="mb-1 font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <Camera class="w-6 h-6 text-gray-800 dark:text-white" />
              Evidencia Fotográfica
            </span>
          </h4>
          <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Fotografías del estado actual del vehículo. Se registran las 5 vistas requeridas.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              v-for="foto in fotosOrdenadas"
              :key="foto.key"
              class="border border-gray-200 rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
            >
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ foto.label }}</p>
              <div
                class="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
                :class="{ 'cursor-zoom-in': foto.url }"
                @click="abrirFoto(foto.url)"
              >
                <img
                  v-if="foto.url"
                  :src="foto.url"
                  :alt="foto.label"
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'autorizacion'" class="p-4">
          <h4 class="mb-4 font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <Signature class="w-6 h-6 text-gray-800 dark:text-white" />
              Firma y Aceptación
            </span>
          </h4>

          <div class="max-w-2xl">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Firma del Cliente</p>
            <div v-if="recepcion.fecha_firma_cliente" class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Firmado el {{ formatDate(recepcion.fecha_firma_cliente) }}
            </div>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <img
                v-if="recepcion.firma_cliente"
                :src="recepcion.firma_cliente"
                alt="Firma del cliente"
                class="w-full h-auto"
              />
              <div v-else class="flex items-center justify-center w-full aspect-[4/1] text-xs text-gray-500 bg-white">Sin firma</div>
            </div>
          </div>

          <div class="mt-4">
            <label class="flex items-center gap-2">
              <input
                :checked="Boolean(recepcion.aceptacion_condiciones)"
                type="checkbox"
                disabled
                class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 opacity-70"
              />
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                El cliente acepta las condiciones de recepción y el estado reportado del vehículo.
              </span>
            </label>
            <div
              v-if="recepcion.estado === 'NO_ACEPTADA'"
              class="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-500">
              <p class="text-sm font-medium text-yellow-900 dark:text-yellow-200">Recepción no aceptada por el cliente</p>
              <p class="mt-1 text-sm whitespace-pre-line text-yellow-800 dark:text-yellow-300">
                {{ recepcion.motivo_no_recepcion || 'No se registró un motivo.' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="activeTabIndex <= 0"
            @click="goToTab(-1)"
          >
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
            </svg>
            Anterior
          </button>
          <button
            type="button"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="activeTabIndex >= TAB_ORDER.length - 1"
            @click="goToTab(1)"
          >
            Siguiente
            <svg class="w-6 h-6 text-gray-800 dark:text-white ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
            </svg>
          </button>
        </div>
        </div>

        <div class="lg:col-span-1 space-y-4">
          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-3">
              <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                Resumen de recepción
              </h4>
            </div>
            <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Cliente</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ cliente?.nombre || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Vehículo</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ placaDisplay || '—' }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo</dt>
                <dd class="font-medium text-sm text-black dark:text-white">{{ tipoRecepcionDisplay }}</dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">Estado</dt>
                <dd>
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" :class="estadoBadge.color">
                    <component :is="estadoBadge.icon" class="w-3.5 h-3.5" aria-hidden="true" />
                    {{ estadoBadge.label }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
            <div class="flex items-center gap-2 mb-3">
              <Car class="w-5 h-5 text-gray-900 dark:text-gray-900" />
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Vehículo</h4>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-if="vehiculo?.imagen"
                type="button"
                title="Ver foto del vehículo"
                class="h-full min-h-40 overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in dark:bg-gray-700"
                @click="abrirFoto(vehiculo.imagen)"
              >
                <img :src="vehiculo.imagen" alt="Foto del vehículo" class="h-full w-full object-contain" />
              </button>
              <div
                v-else
                class="h-full min-h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 dark:bg-gray-700 dark:border-gray-600"
              >
                <div class="flex flex-col items-center gap-1.5 text-center">
                  <Camera class="w-6 h-6" />
                  <span>Foto del vehículo</span>
                </div>
              </div>
              <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <IconEngine class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      N° Motor:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ vehiculo?.numero_motor || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <component :is="transmisionIcon" class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      Transmisión:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ transmisionLabel || '—' }}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700 dark:text-gray-300">
                    <span class="inline-flex items-center gap-1.5">
                      <IconGasStation class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400" stroke-width="1.8" />
                      Combustible:
                    </span>
                  </dt>
                  <dd class="font-medium text-sm text-black dark:text-white">{{ combustibleLabel || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Foto ampliada" />
    </div>
  </div>
</template>