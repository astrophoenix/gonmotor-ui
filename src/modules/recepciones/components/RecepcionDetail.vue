<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  Pencil,
  Plus,
  FileText,
  FileDown,
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
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import { useRecepciones } from '../composables/useRecepciones';

const { loading, error, loadRecepcion } = useRecepciones();
const recepcion = ref(null);
const blueprintImageUrl = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const successMessage = ref('');

const FOTO_VISTAS = [
  { key: 'FRONTAL', label: 'Vista Frontal' },
  { key: 'LATERAL_IZQ', label: 'Lateral Izquierda' },
  { key: 'LATERAL_DER', label: 'Lateral Derecha' },
  { key: 'POSTERIOR', label: 'Posterior' },
  { key: 'TABLERO', label: 'Tablero / Kilometraje' },
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

function irADiagnostico(recepcion) {
  goTo(`/crud/inspecciones/nuevo/?recepcion=${recepcion.id}`);
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
        <li class="text-gray-400">/ Detalle recepción / {{ numeroRecepcion }}</li>
      </ol>
    </nav>
    <div class="flex items-center gap-3 flex-wrap">
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
          title="Crear Inspección"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 rounded-lg border border-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-gray-800"
          @click="irADiagnostico(recepcion)"
        >
          <Plus class="w-4 h-4" />
          Crear Inspección
        </button>
        <template v-if="tieneInspeccion && recepcion.estado === 'ACEPTADA'">
          <a
            v-if="recepcion.inspecciones[0]?.tiene_orden_trabajo || recepcion.inspecciones[0]?.estado === 'FINALIZADA'"
            :href="`/crud/inspecciones/ver/?id=${recepcion.inspecciones[0].id}`"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-800"
          >
            <Eye class="w-4 h-4" />
            Ver Inspección
          </a>
          <button
            v-else
            type="button"
            title="Ver / Editar Inspección"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 rounded-lg border border-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-400 dark:hover:bg-gray-800"
            @click="irAInspeccion(recepcion)"
          >
            <Pencil class="w-4 h-4" />
            Ver / Editar Inspección
          </button>
        </template>
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
    <div class="relative mx-auto max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />

      <div v-if="error" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-200">
        {{ error }}
      </div>

      <div v-if="loading" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Cargando recepción...
      </div>

      <div v-else-if="!recepcion" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Recepción no encontrada.
      </div>

      <div v-else>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
            Información General
          </span>
        </h4>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificación</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Correo</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
          </div>
        </dl>

        <h5 class="mt-8 mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.placa || recepcion.placa || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Color</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
          </div>
        </dl>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileDown class="w-6 h-6 text-gray-800 dark:text-white" />
            Información de Ingreso
          </span>
        </h4>

        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Ingreso</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(recepcion.fecha_ingreso || recepcion.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Salida (estimada)</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(recepcion.fecha_salida) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Recepción</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ tipoRecepcionDisplay }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Recibido por</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ recepcion.recibido_por_nombre || '—' }}</dd>
          </div>
          <div v-if="recepcion.inspecciones?.length">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Inspección</dt>
            <dd class="mt-1 text-sm font-semibold">
              <a
                :href="`/crud/inspecciones/ver/?id=${recepcion.inspecciones[0]?.id}`"
                class="text-purple-600 hover:underline dark:text-purple-400"
              >
                {{ recepcion.inspecciones[0]?.numero_inspeccion || `#${recepcion.inspecciones[0]?.id}` }}
              </a>
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kilometraje de Ingreso</dt>
            <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ recepcion.kilometraje_ingreso }} km</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nivel de Combustible</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ nivelCombustibleDisplay }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresó en Grúa</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ recepcion.ingreso_en_grua ? 'Sí' : 'No' }}</dd>
          </div>
          <div v-if="recepcion.ingreso_en_grua">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Datos de la Grúa / Chófer</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ recepcion.datos_grua || '—' }}</dd>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Motivo de Ingreso</dt>
            <dd class="mt-1 text-sm whitespace-pre-line text-gray-900 dark:text-white">{{ recepcion.motivo_ingreso || '—' }}</dd>
          </div>
        </dl>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileCheck class="w-6 h-6 text-gray-800 dark:text-white" />
            Inventario del Vehículo
          </span>
        </h4>

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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <TriangleAlert class="w-6 h-6 text-gray-800 dark:text-white" />
            Testigos luminosos
          </span>
        </h4>

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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileSearch class="w-6 h-6 text-gray-800 dark:text-white" />
            Inspección Física / Carrocería
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marcación de Daños</p>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <div v-if="!blueprintImageUrl" class="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">Sin diagrama disponible.</div>
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
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalles de Carrocería</p>
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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Camera class="w-6 h-6 text-gray-800 dark:text-white" />
            Evidencia Fotográfica del Vehículo
          </span>
        </h4>

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

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <Signature class="w-6 h-6 text-gray-800 dark:text-white" />
            Firma y Aceptación
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Firma del Receptor (Empleado)</p>
            <div v-if="recepcion.fecha_firma_receptor" class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Firmado el {{ formatDate(recepcion.fecha_firma_receptor) }}
            </div>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <img
                v-if="recepcion.firma_receptor"
                :src="recepcion.firma_receptor"
                alt="Firma del receptor"
                class="w-full h-auto"
              />
              <div v-else class="flex items-center justify-center w-full aspect-[4/1] text-xs text-gray-500 bg-white">Sin firma</div>
            </div>
          </div>

          <div class="col-span-1">
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