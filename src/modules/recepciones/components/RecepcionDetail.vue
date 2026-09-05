<script setup>
import { computed, onMounted, ref } from 'vue';
import Alert from '../../../shared/components/Alert.vue';
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

const TIPO_RECEPCION_LABELS = {
  PREVENTIVO: 'Mantenimiento Preventivo',
  CORRECTIVO: 'Reparación Correctiva',
  DIAGNOSTICO: 'Solo Diagnóstico / Escaneo',
  ESTETICA: 'Enderezada, Pintura o Detailing',
  GARANTIA: 'Garantía / Retorno',
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

const testigosMeta = [
  { key: 'testigo_check_engine', label: 'Check Engine', color: 'yellow', icon: 'checkEngine' },
  { key: 'testigo_abs', label: 'ABS', color: 'yellow', icon: 'abs' },
  { key: 'testigo_airbag', label: 'Airbag', color: 'red', icon: 'airbag' },
  { key: 'testigo_bateria', label: 'Batería', color: 'red', icon: 'battery' },
  { key: 'testigo_aceite', label: 'Presión de Aceite', color: 'red', icon: 'oil' },
  { key: 'testigo_temperatura', label: 'Temperatura', color: 'yellow', icon: 'temperature' },
];

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
  const mensajeExito = sessionStorage.getItem('recepcion_aceptada_exito');
  if (mensajeExito) {
    successMessage.value = mensajeExito;
    sessionStorage.removeItem('recepcion_aceptada_exito');
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
    ACEPTADA: { label: 'Aceptada y Firmada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    NO_ACEPTADA: { label: 'No Aceptada / Sin Firma', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    PENDIENTE: { label: 'Pendiente de Firma', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  };
  return map[estado] || map.PENDIENTE;
});

const cliente = computed(() => recepcion.value?.cliente || null);

const vehiculo = computed(() => recepcion.value?.vehiculo || null);

const tipoRecepcionDisplay = computed(() => {
  const r = recepcion.value;
  if (!r || !r.tipo_recepcion) return '-';
  return TIPO_RECEPCION_LABELS[r.tipo_recepcion] || r.tipo_recepcion;
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
  const base = 'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 opacity-70`;
  if (testigo.color === 'red') return `${base} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500`;
  return `${base} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500`;
}

function getTestigoIconClasses(testigo) {
  const base = 'w-8 h-8 transition-all duration-200';
  if (!testigoActivo(testigo)) return `${base} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${base} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
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
  if (inspeccion) {
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
        <li class="text-gray-400">/ Cedula de recepción #{{ recepcion?.id }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
      Recepción #{{ recepcion?.id }}
    </h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
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
        <div class="flex items-center justify-between gap-2 mb-6 flex-wrap">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            Detalle de la recepción
            <span :class="['px-2 py-1 rounded-full text-xs font-medium', estadoBadge.color]">
              {{ estadoBadge.label }}
            </span>
          </h2>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-if="puedeEditar"
              type="button"
              title="Editar recepción"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 rounded-lg border border-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-gray-800"
              @click="goTo(`/crud/recepciones/editar/?id=${recepcion.id}`)"
            >
              <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 4.8 2.9 2.9M7 17l-1 4 4-1 9.3-9.3a2 2 0 0 0-2.8-2.8L7 17Z"/>
              </svg>
              Editar
            </button>
            <button
              v-if="!tieneInspeccion && recepcion.estado === 'ACEPTADA'"
              type="button"
              title="Crear Diagnóstico"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 rounded-lg border border-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-gray-800"
              @click="irADiagnostico(recepcion)"
            >
              <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13.5h14M12 6.5v14"/>
              </svg>
              Crear Diagnóstico
            </button>
            <template v-if="tieneInspeccion && recepcion.estado === 'ACEPTADA'">
              <button
                type="button"
                title="Ver / Editar Diagnóstico"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 rounded-lg border border-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-400 dark:hover:bg-gray-800"
                @click="irAInspeccion(recepcion)"
              >
                <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 4.8 2.9 2.9M7 17l-1 4 4-1 9.3-9.3a2 2 0 0 0-2.8-2.8L7 17Z"/>
                </svg>
                Ver / Editar Diagnóstico
              </button>
            </template>
            <button
              v-if="recepcion.cotizaciones_generadas?.length"
              type="button"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-700 rounded-lg border border-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-gray-800"
              @click="goTo(`/crud/cotizaciones/ver/${recepcion.cotizaciones_generadas[0]?.id}/`)"
            >
              Ver Cotización
            </button>
            <button
              v-if="recepcion.orden_trabajo_id"
              type="button"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 rounded-lg border border-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-800"
              @click="goTo(`/crud/ordenes/ver/${recepcion.orden_trabajo_id}/`)"
            >
              Ver Orden
            </button>
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
            Información General
          </span>
        </h4>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</h5>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ cliente?.nombre || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ cliente?.identificacion || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ cliente?.telefono || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ cliente?.email || '-' }}
            </div>
          </div>
        </div>

        <h5 class="mt-8 mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ vehiculo?.placa || recepcion.placa || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ vehiculo?.marca || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ vehiculo?.modelo || '-' }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ vehiculo?.color || '-' }}
            </div>
          </div>
        </div>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
            Información de Ingreso
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Ingreso</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ formatDate(recepcion.fecha_ingreso || recepcion.created_at) }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Salida (estimada)</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ formatDate(recepcion.fecha_salida) }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Recepción</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ tipoRecepcionDisplay }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recibido por</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ recepcion.recibido_por_nombre || '-' }}
            </div>
          </div>

          <div class="col-span-1 md:col-span-4">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso</p>
            <div class="block w-full p-2.5 text-sm whitespace-pre-line rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ recepcion.motivo_ingreso || '-' }}
            </div>
          </div>

          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje de Ingreso</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ recepcion.kilometraje_ingreso }} km
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nivel de Combustible</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ nivelCombustibleDisplay }}
            </div>
          </div>
          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ingresó en Grúa</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ recepcion.ingreso_en_grua ? 'Sí' : 'No' }}
            </div>
          </div>
          <div v-if="recepcion.ingreso_en_grua" class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Datos de la Grúa / Chófer</p>
            <div class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400">
              {{ recepcion.datos_grua || '-' }}
            </div>
          </div>
        </div>

        <h4 class="mt-10 mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 7 2 2 4-4m-5-9v4h4V3h-4Z"/>
            </svg>
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
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            Luces Tablero
          </span>
        </h4>

        <div class="space-y-4">
          <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div
              v-for="testigo in testigosMeta"
              :key="testigo.key"
              :class="getTestigoCardClasses(testigo)"
            >
              <svg
                v-if="testigo.icon === 'checkEngine'"
                :class="getTestigoIconClasses(testigo)"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <svg
                v-else-if="testigo.icon === 'abs'"
                :class="getTestigoIconClasses(testigo)"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <text x="12" y="15" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor" stroke="none">ABS</text>
              </svg>
              <svg
                v-else-if="testigo.icon === 'airbag'"
                :class="getTestigoIconClasses(testigo)"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 2.5 1.5 4.5 3.5 5.5L12 22l3.5-7.5C17.5 13.5 19 11.5 19 9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5z" />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              <svg
                v-else-if="testigo.icon === 'battery'"
                :class="getTestigoIconClasses(testigo)"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
                <line x1="22" y1="11" x2="22" y2="13" />
                <line x1="6" y1="11" x2="6" y2="13" />
                <line x1="10" y1="11" x2="10" y2="13" />
                <line x1="14" y1="11" x2="14" y2="13" />
              </svg>
              <svg
                v-else-if="testigo.icon === 'oil'"
                :class="getTestigoIconClasses(testigo)"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2C12 2 19 9 19 14C19 17.87 15.87 21 12 21C8.13 21 5 17.87 5 14C5 9 12 2 12 2Z" />
                <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" />
              </svg>
              <svg
                v-else-if="testigo.icon === 'temperature'"
                :class="getTestigoIconClasses(testigo)"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                <circle cx="11.5" cy="17.5" r="1.5" fill="currentColor" />
              </svg>
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
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
            </svg>
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
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M3 7a1 1 0 0 1 1-1h11.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M8 4h1v3H8V4Zm4 0h1v3h-1V4Zm4 0h2v3h-2V4Z"/>
            </svg>
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
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h.75m3 3h.375a.375.375 0 0 0 .375-.375v-1.125a.375.375 0 0 0-.375-.375h-.375m0 0h3.75m-3.75 0v1.5m0 0h3.75m-3.75 0v1.5m0 0h3.75"/>
            </svg>
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
              <div v-else class="flex items-center justify-center h-24 text-xs text-gray-500 bg-white">Sin firma</div>
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
              <div v-else class="flex items-center justify-center h-24 text-xs text-gray-500 bg-white">Sin firma</div>
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
            <p class="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
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
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17 7M18 6 7 17"/>
        </svg>
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Foto ampliada" />
    </div>
  </div>
</template>