<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  FilePen,
  FileCog,
  TriangleAlert,
  Camera,
  Signature,
  X,
  KeyRound,
  ShieldPlus,
  ShieldCheck,
  Loader2,
  IdCard,
  Phone,
  Mail,
  Tag,
  Shapes,
  PaintBucket,
  Car,
  ClipboardList,
  Workflow,
  Store,
  CalendarClock,
  BrushCleaning,
  Users,
  Notebook,
  NotebookPen,
  ListChecks,
  MapPin,
  Wrench,
  Gauge,
  Fuel,
  Truck,
  Armchair,
  LifeBuoy,
  Check,
  Minus,
  ArrowLeft,
  ArrowRight,
  PenLine,
  UserX,
  Clock,
  ZoomIn,
  History,
} from 'lucide-vue-next';
import {
  IconEngine,
  IconManualGearbox,
  IconAutomaticGearbox,
  IconGasStation,
  IconClipboardSearch,
  IconReportSearch,
} from '@tabler/icons-vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import EstadoRecepcionBadge from './EstadoRecepcionBadge.vue';
import TipoTrabajoBadge from '../../../shared/components/TipoTrabajoBadge.vue';
import MdiIcon from '../../../shared/components/MdiIcon.vue';
import { TESTIGOS } from '../../../shared/config/testigos';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeRecepcion } from '../../../shared/utils/relacionesFlujo';
import { useRecepciones } from '../composables/useRecepciones';
import { recepcionesService } from '../services/recepcionesService';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';
import { useAuthStore } from '../../auth/stores/authStore';
import { referenciaCorta } from '../../../shared/utils/format';

const { loading, error, loadRecepcion } = useRecepciones();
const authStore = useAuthStore();
const tallerSesion = computed(() => authStore.user?.taller_nombre || '');
const recepcion = ref(null);
const blueprintImageUrl = ref('');
const previewImg = ref('');
const showImageModal = ref(false);
const successMessage = ref('');
const creandoInspeccion = ref(false);
const errorCrearInspeccion = ref('');

// Re-firma de una recepción NO_ACEPTADA: el cliente cambia de opinión y firma;
// la transición va directo a ACEPTADA (nunca por PENDIENTE).
const showModalFirmar = ref(false);
const firmaClienteCanvas = ref(null);
const firmaClienteData = ref(null);
const isDrawingCliente = ref(false);
const aceptacionCliente = ref(false);
const firmando = ref(false);
const errorFirmar = ref('');

// --- Estilos compartidos con RecepcionEdit (misma estructura visual) ---
const SECCION =
  'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION =
  'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const ETIQUETA = 'text-xs font-medium text-gray-500 dark:text-gray-400';
const VALOR = 'mt-0.5 text-sm font-semibold text-gray-900 dark:text-white';
const CONTADOR = 'px-2 py-0.5 text-xs font-medium rounded-sm tabular-nums';
const CONTADOR_NEUTRO = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
const ENLACE = 'hover:text-brand-coral';

const PASOS = [
  { key: 'informacion', label: 'Ingreso', icon: Notebook },
  { key: 'inspeccion', label: 'Revisión', icon: IconClipboardSearch },
  { key: 'evidencias', label: 'Evidencias', icon: Camera },
  { key: 'autorizacion', label: 'Autorización', icon: NotebookPen },
];

const activeTab = ref('informacion');
const activeTabIndex = computed(() => PASOS.findIndex((p) => p.key === activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < PASOS.length) activeTab.value = PASOS[next].key;
}

const FOTO_VISTAS = [
  { key: 'FRONTAL', label: 'Vista frontal' },
  { key: 'LATERAL_IZQ', label: 'Lateral izquierda' },
  { key: 'LATERAL_DER', label: 'Lateral derecha' },
  { key: 'POSTERIOR', label: 'Posterior' },
  { key: 'TABLERO', label: 'Tablero' },
];

const FUEL_LEVELS = [
  { value: 'VACIO', label: 'Vacío', fill: 0, icon: 'text-red-600 dark:text-red-500' },
  { value: 'RESERVA', label: 'Reserva', fill: 1, icon: 'text-red-500 dark:text-red-400' },
  { value: '1/4', label: '1/4', fill: 2, icon: 'text-orange-500' },
  { value: '1/2', label: '1/2', fill: 3, icon: 'text-amber-500' },
  { value: '3/4', label: '3/4', fill: 5, icon: 'text-lime-600' },
  { value: 'LLENO', label: 'Lleno', fill: 6, icon: 'text-emerald-600' },
];

const SEGMENT_COLORS = [
  'bg-gradient-to-t from-red-500 to-red-400 dark:from-red-700 dark:to-red-500',
  'bg-gradient-to-t from-orange-500 to-orange-400 dark:from-orange-700 dark:to-orange-500',
  'bg-gradient-to-t from-amber-500 to-amber-400 dark:from-amber-700 dark:to-amber-400',
  'bg-gradient-to-t from-yellow-500 to-yellow-400 dark:from-yellow-700 dark:to-yellow-400',
  'bg-gradient-to-t from-lime-500 to-lime-400 dark:from-lime-700 dark:to-lime-400',
  'bg-gradient-to-t from-emerald-500 to-emerald-400 dark:from-emerald-700 dark:to-emerald-500',
];

const INVENTARIO = [
  {
    titulo: 'Exteriores',
    icon: Car,
    campos: [
      { key: 'tiene_espejo_izquierdo', label: 'Espejo izquierdo' },
      { key: 'tiene_espejo_derecho', label: 'Espejo derecho' },
      { key: 'tiene_vidrios', label: 'Vidrios / Cristales' },
      { key: 'tiene_faros_lunas', label: 'Faros / Lunas' },
      { key: 'tiene_tapa_gasolina', label: 'Tapa de gasolina' },
      { key: 'tiene_placas', label: 'Placas de circulación' },
    ],
  },
  {
    titulo: 'Interiores',
    icon: Armchair,
    campos: [
      { key: 'tiene_radio', label: 'Radio / Mascarilla' },
      { key: 'tiene_pantalla', label: 'Pantalla / Multimedia' },
      { key: 'tiene_encendedor', label: 'Encendedor' },
      { key: 'tiene_control_puertas', label: 'Control de puertas' },
      { key: 'tiene_cargador_celular', label: 'Cargador de celular' },
      { key: 'tiene_tapetes', label: 'Tapetes / Alfombras' },
      { key: 'tiene_cubresol', label: 'Cubresol' },
    ],
  },
  {
    titulo: 'Seguridad',
    icon: LifeBuoy,
    campos: [
      { key: 'tiene_llanta_repuesto', label: 'Llanta de repuesto' },
      { key: 'tiene_gata_palanca', label: 'Gata y palanca' },
      { key: 'tiene_herramientas', label: 'Juego de herramientas' },
      { key: 'tiene_extintor', label: 'Extintor' },
      { key: 'tiene_botiquin', label: 'Botiquín' },
      { key: 'tiene_triangulos', label: 'Triángulos de seguridad' },
      { key: 'tiene_llave_tuercas', label: 'Llave de tuercas' },
    ],
  },
];
const TOTAL_INVENTARIO = INVENTARIO.reduce((n, g) => n + g.campos.length, 0);

const PERTENENCIAS = [
  { key: 'pertenencia_celular', label: 'Celular' },
  { key: 'pertenencia_billetera', label: 'Billetera' },
  { key: 'pertenencia_dinero', label: 'Dinero en efectivo' },
  { key: 'pertenencia_documentos', label: 'Documentos personales' },
  { key: 'pertenencia_gafas', label: 'Gafas / Lentes' },
  { key: 'pertenencia_equipaje', label: 'Equipaje / Bolsos' },
  { key: 'pertenencia_otros', label: 'Otros objetos de valor' },
];

function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
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
  await cargarPermisos().catch(() => {});
  if (sinAcceso('recepciones')) return;
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
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatKm(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero.toLocaleString('es-EC');
}

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function goTo(path) {
  window.location.assign(path);
}

const cliente = computed(() => recepcion.value?.cliente || null);
const vehiculo = computed(() => recepcion.value?.vehiculo || null);
const relacionesRecepcion = computed(() => relacionesDeRecepcion(recepcion.value));
const numeroRecepcion = computed(() => recepcion.value?.numero_recepcion || referenciaCorta(recepcion.value?.id));
const placaDisplay = computed(() => formatPlaca(vehiculo.value?.placa || recepcion.value?.placa));
const clienteUrl = computed(() => (cliente.value?.id ? `/crud/clientes/ver/?id=${encodeURIComponent(cliente.value.id)}` : null));
const vehiculoUrl = computed(() => (vehiculo.value?.id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(vehiculo.value.id)}` : null));
const tieneInspeccion = computed(() => (recepcion.value?.inspecciones?.length ?? 0) > 0);

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('recepciones'));
// Crear la inspección crea otro documento: hacen falta ambos permisos.
const puedeCrearInspeccion = computed(() => puede('recepciones') && puede('inspecciones'));

const puedeEditar = computed(() => {
  const r = recepcion.value;
  if (!r || !puedeModificar.value || r.estado === 'NO_ACEPTADA') return false;
  return !(r.aceptacion_condiciones && r.fecha_firma_cliente);
});

const firmada = computed(() => Boolean(recepcion.value?.aceptacion_condiciones && recepcion.value?.fecha_firma_cliente));
const noAceptada = computed(() => recepcion.value?.estado === 'NO_ACEPTADA');

// --- Ingreso ---
const kmIngreso = computed(() => formatKm(recepcion.value?.kilometraje_ingreso));
const nivelCombustible = computed(() => FUEL_LEVELS.find((l) => l.value === recepcion.value?.nivel_combustible) || null);
const fuelFill = computed(() => nivelCombustible.value?.fill ?? 0);
const cantidadLlaves = computed(() => {
  const n = Number(recepcion.value?.cantidad_llaves ?? 0);
  return n >= 3 ? '3 o más' : String(n);
});
const pertenenciasActivas = computed(() => PERTENENCIAS.filter((p) => Boolean(recepcion.value?.[p.key])).map((p) => p.label));
const hayDatosSeguro = computed(() => {
  const r = recepcion.value;
  return Boolean(r && (r.compania_seguro || r.numero_poliza || r.numero_reclamo || r.ajustador_nombre || r.ajustador_telefono));
});

// --- Revisión ---
function presentesEnGrupo(grupo) {
  return grupo.campos.filter((c) => recepcion.value?.[c.key]).length;
}
const inventarioPresente = computed(() => INVENTARIO.reduce((n, g) => n + presentesEnGrupo(g), 0));
const testigosActivos = computed(() => TESTIGOS.filter((t) => Boolean(recepcion.value?.[t.key])));

function testigoCardClass(testigo) {
  const base = 'flex flex-col items-center justify-center p-3 rounded-xl border-2';
  if (!recepcion.value?.[testigo.key]) return `${base} bg-gray-50 border-gray-200 opacity-60 dark:bg-gray-700 dark:border-gray-600`;
  if (testigo.color === 'red') return `${base} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500`;
  if (testigo.color === 'green') return `${base} bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-500`;
  return `${base} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500`;
}

function testigoIconClass(testigo) {
  const base = 'w-8 h-8';
  if (!recepcion.value?.[testigo.key]) return `${base} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${base} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
  if (testigo.color === 'green') return `${base} text-green-500 dark:text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`;
  return `${base} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

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
  if (!puntos.length) {
    return descripciones.map((d) => ({ numero: d.numero, x: null, y: null, descripcion: d.descripcion }));
  }
  return puntos.map((p, i) => ({
    numero: Number.isFinite(Number(p.numero)) ? Number(p.numero) : i + 1,
    x: p.x == null ? null : Number(p.x),
    y: p.y == null ? null : Number(p.y),
    descripcion: p.descripcion || descripciones[i]?.descripcion || '',
  }));
});
const marcasConPosicion = computed(() => marcasCarroceria.value.filter((m) => m.x != null && m.y != null));

// --- Evidencias ---
const fotosOrdenadas = computed(() => {
  const fotos = recepcion.value?.fotos || [];
  return FOTO_VISTAS.map((v) => {
    const foto = fotos.find((f) => f.tipo_vista === v.key);
    return { ...v, url: foto?.imagen || null, miniatura: foto?.miniatura || foto?.imagen || null };
  });
});
const fotosCargadas = computed(() => fotosOrdenadas.value.filter((f) => f.url).length);

// Resumen bajo cada paso (equivale al de RecepcionEdit, pero con lo registrado).
const resumenPaso = computed(() => ({
  informacion: kmIngreso.value ? `${kmIngreso.value} km · ${nivelCombustible.value?.label || 'sin combustible'}` : 'Datos del ingreso',
  inspeccion: `${inventarioPresente.value}/${TOTAL_INVENTARIO} accesorios · ${marcasCarroceria.value.length} daño${marcasCarroceria.value.length === 1 ? '' : 's'}`,
  evidencias: `${fotosCargadas.value}/${FOTO_VISTAS.length} fotos`,
  autorizacion: firmada.value ? 'Firmada por el cliente' : noAceptada.value ? 'No aceptada' : 'Pendiente de firma',
}));

function pasoCirculoClass(key) {
  return activeTab.value === key
    ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

// --- Vehículo (aside) ---
const transmisionLabel = computed(() => {
  const map = { M: 'Manual / Mecánica', A: 'Automática', C: 'CVT' };
  const value = vehiculo.value?.transmision || '';
  return map[value] || value || '';
});
const transmisionIcon = computed(() => (vehiculo.value?.transmision === 'M' ? IconManualGearbox : IconAutomaticGearbox));
const combustibleLabel = computed(() => {
  const map = { GAS: 'Gasolina', DIE: 'Diésel', HIB: 'Híbrido', ELE: 'Eléctrico', GNV: 'Gas Natural Vehicular (GNV)' };
  const value = vehiculo.value?.combustible || '';
  return map[value] || value || '';
});

// Historial de la recepción (timeline del aside).
const historial = computed(() => {
  const r = recepcion.value;
  if (!r) return [];
  const eventos = [
    { key: 'ingreso', titulo: 'Ingreso al taller', fecha: r.fecha_ingreso || r.created_at, detalle: r.recibido_por_nombre ? `Recibido por ${r.recibido_por_nombre}` : '' },
  ];
  if (firmada.value) {
    eventos.push({ key: 'firma', titulo: 'Firma del cliente', fecha: r.fecha_firma_cliente, detalle: 'Acepta el estado registrado' });
  } else if (noAceptada.value) {
    eventos.push({ key: 'no_aceptada', titulo: 'No aceptada por el cliente', fecha: null, detalle: 'Sin firma de conformidad' });
  }
  if (r.fecha_salida) {
    eventos.push({ key: 'salida', titulo: noAceptada.value ? 'Salida del vehículo' : 'Salida estimada', fecha: r.fecha_salida, detalle: '' });
  }
  return eventos;
});

function abrirFoto(url) {
  if (!url) return;
  previewImg.value = url;
  showImageModal.value = true;
}

function cerrarFoto() {
  showImageModal.value = false;
  previewImg.value = '';
}

// --- Crear inspección ---
const showModalCrearInspeccion = ref(false);
const mensajeCrearInspeccion = computed(
  () => `Se generará la inspección de la recepción ${numeroRecepcion.value || ''} con el cliente y el vehículo ya registrados. El técnico agrega los servicios y repuestos que encuentre durante el diagnóstico.`,
);

async function confirmarCrearInspeccion() {
  if (creandoInspeccion.value || !recepcion.value?.id) return;
  creandoInspeccion.value = true;
  errorCrearInspeccion.value = '';
  try {
    const inspeccion = await inspeccionesService.crearDesdeRecepcion(recepcion.value.id);
    if (inspeccion?.id) goTo(`/crud/inspecciones/editar/?id=${inspeccion.id}&creada=1`);
  } catch (err) {
    errorCrearInspeccion.value = err?.message || 'No se pudo crear la inspección.';
    showModalCrearInspeccion.value = false;
  } finally {
    creandoInspeccion.value = false;
  }
}

// --- Firma de aceptación (recepción NO_ACEPTADA) ---
// El modal se cierra solo con la X o Cancelar, así que el fondo queda bloqueado.
watch(showModalFirmar, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : '';
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});

function initFirmaCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function getFirmaCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

function onFirmaPointerDown(event) {
  const canvas = firmaClienteCanvas.value;
  if (!canvas) return;
  isDrawingCliente.value = true;
  const ctx = canvas.getContext('2d');
  const coords = getFirmaCoords(canvas, event);
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
}

function onFirmaPointerMove(event) {
  if (!isDrawingCliente.value) return;
  const canvas = firmaClienteCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const coords = getFirmaCoords(canvas, event);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
}

function onFirmaPointerUp() {
  if (!isDrawingCliente.value) return;
  isDrawingCliente.value = false;
  firmaClienteData.value = firmaClienteCanvas.value?.toDataURL('image/png') || null;
}

function borrarFirmaCliente() {
  const canvas = firmaClienteCanvas.value;
  if (canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    initFirmaCanvas(canvas);
  }
  firmaClienteData.value = null;
  aceptacionCliente.value = false;
}

function abrirModalFirmar() {
  firmaClienteData.value = null;
  aceptacionCliente.value = false;
  errorFirmar.value = '';
  showModalFirmar.value = true;
  nextTick(() => initFirmaCanvas(firmaClienteCanvas.value));
}

function cerrarModalFirmar() {
  if (firmando.value) return;
  showModalFirmar.value = false;
}

async function confirmarFirma() {
  if (!recepcion.value?.id || firmando.value) return;
  errorFirmar.value = '';
  if (!firmaClienteData.value) {
    errorFirmar.value = 'Captura la firma del cliente antes de continuar.';
    return;
  }
  if (!aceptacionCliente.value) {
    errorFirmar.value = 'El cliente debe aceptar las condiciones de recepción.';
    return;
  }
  firmando.value = true;
  try {
    await recepcionesService.firmar(recepcion.value.id, firmaClienteData.value);
    showModalFirmar.value = false;
    recepcion.value = await loadRecepcion(recepcion.value.id);
    successMessage.value = 'Recepción firmada y aceptada correctamente.';
  } catch (err) {
    errorFirmar.value = err?.message || 'No se pudo registrar la firma.';
  } finally {
    firmando.value = false;
  }
}
</script>

<template>
  <SinAcceso v-if="sinAcceso('recepciones')" seccion="Recepciones" />
  <template v-else>
  <EntityHeader
    mode="detail"
    entity="Recepción"
    :record-number="recepcion ? numeroRecepcion : ''"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Recepciones', href: '/crud/recepciones/' },
      { label: 'Recepción' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="recepcion && soloConsulta('recepciones')" objeto="esta recepción" acciones="editarla o registrar la firma" />
    </template>
    <template #badges>
      <EstadoRecepcionBadge
        v-if="recepcion"
        :estado="recepcion.estado"
        :estado-display="recepcion.estado_display"
        size="md"
      />
    </template>

    <template #actions>
      <button
        v-if="recepcion && noAceptada && puedeModificar"
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30"
        @click="abrirModalFirmar">
        <Signature class="w-5 h-5 -ms-1" aria-hidden="true" />
        Firmar aceptación
      </button>
      <button
        v-if="recepcion && !tieneInspeccion && recepcion.estado === 'ACEPTADA' && puedeCrearInspeccion"
        type="button"
        :disabled="creandoInspeccion"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded shadow-xs bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="showModalCrearInspeccion = true">
        <Loader2 v-if="creandoInspeccion" class="w-4 h-4 animate-spin" aria-hidden="true" />
        <FileCog v-else class="w-5 h-5 -ms-1" aria-hidden="true" />
        {{ creandoInspeccion ? 'Creando...' : 'Crear inspección' }}
      </button>
      <button
        v-if="puedeEditar"
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        @click="goTo(`/crud/recepciones/editar/?id=${recepcion.id}`)">
        <FilePen class="w-5 h-5 -ms-1 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        Editar
      </button>
    </template>
  </EntityHeader>

  <div class="px-4 pt-4 pb-6">
    <div class="space-y-4">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorCrearInspeccion" type="error" :message="errorCrearInspeccion" dismissible @dismiss="errorCrearInspeccion = ''" />
      <Alert v-if="error" type="error" :message="error" />
    </div>

    <div v-if="loading" :class="[SECCION, 'mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
      <Loader2 class="w-4 h-4 animate-spin" />
      Cargando recepción...
    </div>

    <div v-else-if="!recepcion" :class="[SECCION, 'mt-4 text-center text-sm text-gray-500 dark:text-gray-400']">
      Recepción no encontrada.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-4">
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
              <a v-if="clienteUrl" :href="clienteUrl" :class="[VALOR, ENLACE, 'block truncate text-base']" :title="cliente?.nombre">{{ cliente?.nombre }}</a>
              <p v-else :class="[VALOR, 'truncate text-base']">{{ cliente?.nombre || '—' }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCard class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.identificacion || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.telefono || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" />
                  <dt>Correo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ cliente?.email || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
              <p :class="ETIQUETA">Vehículo</p>
              <a v-if="vehiculoUrl" :href="vehiculoUrl" :class="[VALOR, ENLACE, 'block font-mono text-base tracking-widest']">{{ placaDisplay }}</a>
              <p v-else :class="[VALOR, 'font-mono text-base tracking-widest']">{{ placaDisplay || '—' }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Tag class="w-3.5 h-3.5 shrink-0" />
                  <dt>Marca:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.marca || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  <dt>Modelo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.modelo || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  <dt>Color:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ vehiculo?.color || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div class="min-w-0 md:border-s md:border-gray-200 md:ps-4 md:dark:border-gray-700">
              <p :class="ETIQUETA">Responsable</p>
              <p :class="[VALOR, 'truncate text-base']">{{ recepcion.recibido_por_nombre || '—' }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
                  <dt>Rol:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ recepcion.recibido_por_rol_display || recepcion.recibido_por_rol || '—' }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Store class="w-3.5 h-3.5 shrink-0" />
                  <dt>Taller:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ recepcion.sucursal_nombre || tallerSesion || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <!-- Pasos (pestañas) -->
          <nav aria-label="Secciones de la recepción" class="border-b border-gray-200 dark:border-gray-700">
            <ol class="grid grid-cols-4" role="tablist">
              <li v-for="(paso, index) in PASOS" :key="paso.key">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === paso.key"
                  class="flex w-full h-full flex-col items-center gap-1.5 px-2 py-3 -mb-px text-center border-b-2 transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
                  :class="activeTab === paso.key
                    ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'"
                  @click="activeTab = paso.key"
                >
                  <span class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-sm font-semibold" :class="pasoCirculoClass(paso.key)">
                    <component :is="paso.icon" class="w-4 h-4" />
                  </span>
                  <span class="min-w-0">
                    <span
                      class="block text-xs font-semibold sm:text-sm"
                      :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'"
                    >
                      {{ index + 1 }}. {{ paso.label }}
                    </span>
                    <span class="hidden text-xs truncate text-gray-500 sm:block dark:text-gray-400">{{ resumenPaso[paso.key] }}</span>
                  </span>
                </button>
              </li>
            </ol>
          </nav>

          <div class="p-4 sm:p-5 bg-gray-50/60 dark:bg-gray-900/30">
            <!-- 1. Ingreso -->
            <div v-show="activeTab === 'informacion'" class="space-y-4">
              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <CalendarClock class="w-4 h-4" />
                  Datos del ingreso
                </h4>
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt :class="ETIQUETA">Fecha de ingreso</dt>
                    <dd :class="[VALOR, 'tabular-nums']">{{ formatDate(recepcion.fecha_ingreso || recepcion.created_at) }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">{{ noAceptada ? 'Fecha de salida' : 'Fecha de salida estimada' }}</dt>
                    <dd :class="[VALOR, 'tabular-nums']">
                      <template v-if="recepcion.fecha_salida">{{ formatDate(recepcion.fecha_salida) }}</template>
                      <span v-else class="font-normal text-gray-400 dark:text-gray-500">Sin fecha</span>
                    </dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Tipo de recepción</dt>
                    <dd class="mt-1"><TipoTrabajoBadge :tipo="recepcion.tipo_recepcion" size="md" /></dd>
                  </div>
                </dl>
              </section>

              <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-3']">
                    <Wrench class="w-4 h-4" />
                    Motivo de ingreso
                  </h4>
                  <p
                    v-if="recepcion.motivo_ingreso"
                    class="p-3 text-sm leading-relaxed whitespace-pre-line text-gray-900 border-s-4 border-brand-500 bg-brand-50/60 rounded-e-lg dark:bg-gray-700/50 dark:border-brand-300 dark:text-white"
                  >{{ recepcion.motivo_ingreso }}</p>
                  <p v-else class="text-sm text-gray-400 dark:text-gray-500">Sin motivo registrado.</p>
                </section>

                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <Gauge class="w-4 h-4" />
                    Estado al ingresar
                  </h4>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p :class="ETIQUETA">Kilometraje</p>
                      <p class="mt-0.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                        <template v-if="kmIngreso">{{ kmIngreso }} <span class="text-sm font-medium text-gray-500 dark:text-gray-400">km</span></template>
                        <span v-else class="text-sm font-normal text-gray-400 dark:text-gray-500">Sin registro</span>
                      </p>
                    </div>
                    <div>
                      <p :class="[ETIQUETA, 'mb-1.5']">Combustible</p>
                      <div
                        class="flex w-full gap-1 p-1 rounded bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                        role="meter"
                        aria-label="Nivel de combustible"
                        :aria-valuenow="fuelFill"
                        aria-valuemin="0"
                        :aria-valuemax="SEGMENT_COLORS.length"
                        :aria-valuetext="nivelCombustible?.label || 'Sin registro'"
                      >
                        <span
                          v-for="(color, index) in SEGMENT_COLORS"
                          :key="index"
                          class="h-5 flex-1 rounded-md"
                          :class="index < fuelFill ? `${color} shadow-inner` : 'bg-white dark:bg-gray-800'"
                        ></span>
                      </div>
                      <div class="flex items-center justify-between mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>Vacío</span>
                        <span class="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                          <Fuel class="w-4 h-4" :class="nivelCombustible?.icon || 'text-gray-400'" />
                          {{ nivelCombustible?.label || '—' }}
                        </span>
                        <span>Lleno</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-sm"
                      :class="recepcion.ingreso_en_grua ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : CONTADOR_NEUTRO"
                    >
                      <Truck class="w-3.5 h-3.5" />
                      {{ recepcion.ingreso_en_grua ? 'Ingresó en grúa' : 'Sin grúa' }}
                    </span>
                    <span v-if="recepcion.ingreso_en_grua" class="text-sm text-gray-700 dark:text-gray-300">{{ recepcion.datos_grua || 'Sin datos de la grúa' }}</span>
                  </div>
                </section>
              </div>

              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <KeyRound class="w-4 h-4" />
                  Custodia y pertenencias
                </h4>
                <div class="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-[auto_1fr]">
                  <div>
                    <p :class="ETIQUETA">Llaves entregadas</p>
                    <p class="mt-0.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ cantidadLlaves }}</p>
                    <span
                      class="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 text-xs font-medium rounded-sm"
                      :class="recepcion.tiene_llave_control ? 'bg-brand-100 text-brand-900 dark:bg-brand-700/40 dark:text-white' : CONTADOR_NEUTRO"
                    >
                      <component :is="recepcion.tiene_llave_control ? Check : Minus" class="w-3 h-3" />
                      {{ recepcion.tiene_llave_control ? 'Con control remoto' : 'Sin control remoto' }}
                    </span>
                  </div>
                  <div>
                    <p :class="[ETIQUETA, 'mb-2']">Objetos de valor dejados en el vehículo</p>
                    <div v-if="pertenenciasActivas.length" class="flex flex-wrap gap-2">
                      <span
                        v-for="item in pertenenciasActivas"
                        :key="item"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-brand-50 border border-brand-200 text-brand-900 dark:bg-brand-700/30 dark:border-brand-500 dark:text-white"
                      >
                        <Check class="w-3.5 h-3.5" />
                        {{ item }}
                      </span>
                    </div>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">Ninguno.</p>
                    <p v-if="recepcion.pertenencias_observaciones" class="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      <span class="font-medium text-gray-900 dark:text-white">Otros:</span>
                      {{ recepcion.pertenencias_observaciones }}
                    </p>
                  </div>
                </div>
              </section>

              <section :class="SECCION">
                <div class="flex items-center justify-between gap-3" :class="{ 'mb-4': hayDatosSeguro }">
                  <h4 :class="TITULO_SECCION">
                    <ShieldPlus class="w-4 h-4" />
                    Seguro / siniestro
                  </h4>
                  <span :class="[CONTADOR, hayDatosSeguro ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : CONTADOR_NEUTRO]">
                    {{ hayDatosSeguro ? 'Aplica' : 'No aplica' }}
                  </span>
                </div>
                <dl v-if="hayDatosSeguro" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <dt :class="ETIQUETA">Compañía de seguro</dt>
                    <dd :class="VALOR">{{ recepcion.compania_seguro || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">N° de póliza</dt>
                    <dd :class="[VALOR, 'font-mono uppercase']">{{ recepcion.numero_poliza || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">N° de reclamo / siniestro</dt>
                    <dd :class="[VALOR, 'font-mono uppercase']">{{ recepcion.numero_reclamo || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Perito del seguro</dt>
                    <dd :class="VALOR">{{ recepcion.ajustador_nombre || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Teléfono del perito</dt>
                    <dd :class="VALOR">{{ recepcion.ajustador_telefono || '—' }}</dd>
                  </div>
                </dl>
                <p v-else class="mt-1 text-sm text-gray-500 dark:text-gray-400">El vehículo no ingresó por un reclamo a la aseguradora.</p>
              </section>
            </div>

            <!-- 2. Revisión -->
            <div v-show="activeTab === 'inspeccion'" class="space-y-4">
              <section :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h4 :class="TITULO_SECCION">
                    <ListChecks class="w-4 h-4" />
                    Inventario
                  </h4>
                  <span :class="[CONTADOR, CONTADOR_NEUTRO]">{{ inventarioPresente }}/{{ TOTAL_INVENTARIO }} presentes</span>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div v-for="grupo in INVENTARIO" :key="grupo.titulo">
                    <p class="flex items-center gap-1.5 mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      <component :is="grupo.icon" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      {{ grupo.titulo }}
                      <span class="text-xs font-normal text-gray-500 dark:text-gray-400 tabular-nums">{{ presentesEnGrupo(grupo) }}/{{ grupo.campos.length }}</span>
                    </p>
                    <ul class="divide-y divide-gray-100 border border-gray-200 rounded-lg dark:divide-gray-700 dark:border-gray-700">
                      <li v-for="campo in grupo.campos" :key="campo.key" class="flex items-center gap-2.5 px-3 py-2 text-sm">
                        <span
                          class="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded"
                          :class="recepcion[campo.key] ? 'bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'"
                        >
                          <component :is="recepcion[campo.key] ? Check : Minus" class="w-3 h-3" />
                        </span>
                        <span :class="recepcion[campo.key] ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through dark:text-gray-500'">
                          {{ campo.label }}
                        </span>
                        <span class="sr-only">{{ recepcion[campo.key] ? 'presente' : 'ausente' }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h4 :class="TITULO_SECCION">
                    <TriangleAlert class="w-4 h-4" />
                    Testigos del tablero
                  </h4>
                  <span
                    :class="[CONTADOR, testigosActivos.length ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : CONTADOR_NEUTRO]"
                  >
                    {{ testigosActivos.length ? `${testigosActivos.length} encendido${testigosActivos.length === 1 ? '' : 's'}` : 'Ninguno encendido' }}
                  </span>
                </div>
                <div class="grid grid-cols-5 gap-2 lg:grid-cols-10 lg:gap-3">
                  <div v-for="testigo in TESTIGOS" :key="testigo.key" :class="testigoCardClass(testigo)" :title="testigo.label">
                    <MdiIcon :path="testigo.path" :class="testigoIconClass(testigo)" />
                    <span class="mt-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300">{{ testigo.label }}</span>
                  </div>
                </div>
                <p v-if="recepcion.otros_testigos_observaciones" class="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  <span class="font-medium text-gray-900 dark:text-white">Observaciones:</span>
                  {{ recepcion.otros_testigos_observaciones }}
                </p>
              </section>

              <section :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h4 :class="TITULO_SECCION">
                    <MapPin class="w-4 h-4" />
                    Daños en carrocería
                  </h4>
                  <span :class="[CONTADOR, marcasCarroceria.length ? 'bg-accent-100 text-accent-700 dark:bg-accent-600/20 dark:text-accent-400' : CONTADOR_NEUTRO]">
                    {{ marcasCarroceria.length ? `${marcasCarroceria.length} marcado${marcasCarroceria.length === 1 ? '' : 's'}` : 'Sin daños' }}
                  </span>
                </div>
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div class="relative overflow-hidden bg-white border border-gray-300 rounded-lg dark:border-gray-600">
                    <div v-if="!blueprintImageUrl" class="flex flex-col items-center justify-center gap-2 h-64 text-sm text-gray-500">
                      <Car class="w-8 h-8 text-gray-400" />
                      Sin diagrama disponible.
                    </div>
                    <div v-else class="relative" style="aspect-ratio: 4/3">
                      <img :src="blueprintImageUrl" alt="Diagrama del vehículo" class="absolute inset-0 w-full h-full object-contain" />
                      <div class="absolute inset-0 pointer-events-none">
                        <span
                          v-for="detalle in marcasConPosicion"
                          :key="detalle.numero"
                          class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-accent-500 rounded-full ring-2 ring-white shadow -translate-x-1/2 -translate-y-1/2"
                          :style="{ left: detalle.x + '%', top: detalle.y + '%' }"
                        >
                          {{ detalle.numero }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalle de cada daño</p>
                    <div
                      v-if="!marcasCarroceria.length"
                      class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-600"
                    >
                      <MapPin class="w-7 h-7 text-gray-400" />
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Sin daños registrados</p>
                      <p class="max-w-xs text-xs text-gray-500 dark:text-gray-400">El vehículo ingresó sin golpes ni rayones marcados.</p>
                    </div>
                    <ol v-else class="space-y-2">
                      <li
                        v-for="detalle in marcasCarroceria"
                        :key="detalle.numero"
                        class="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700/40 dark:border-gray-600"
                      >
                        <span class="inline-flex items-center justify-center w-6 h-6 shrink-0 text-xs font-bold text-white bg-accent-500 rounded-full">{{ detalle.numero }}</span>
                        <span class="pt-0.5 text-sm text-gray-900 dark:text-white">{{ detalle.descripcion || 'Sin descripción' }}</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </section>
            </div>

            <!-- 3. Evidencias -->
            <div v-show="activeTab === 'evidencias'">
              <section :class="SECCION">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4 :class="TITULO_SECCION">
                    <Camera class="w-4 h-4" />
                    Evidencia fotográfica
                  </h4>
                  <span
                    :class="[CONTADOR, fotosCargadas === FOTO_VISTAS.length ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : CONTADOR_NEUTRO]"
                  >
                    {{ fotosCargadas }}/{{ FOTO_VISTAS.length }} fotos
                  </span>
                </div>
                <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Estado en que el vehículo llegó al taller. Toca una foto para ampliarla.
                </p>
                <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <figure v-for="foto in fotosOrdenadas" :key="foto.key">
                    <button
                      v-if="foto.url"
                      type="button"
                      :title="`Ampliar ${foto.label}`"
                      class="group relative block w-full overflow-hidden rounded-lg aspect-square bg-gray-100 cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-brand-200 dark:bg-gray-700 dark:focus:ring-brand-700"
                      @click="abrirFoto(foto.url)"
                    >
                      <img :src="foto.miniatura" :alt="foto.label" loading="lazy" class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      <span class="absolute inset-0 flex items-center justify-center bg-brand-900/0 transition-colors group-hover:bg-brand-900/40">
                        <ZoomIn class="w-6 h-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    </button>
                    <div
                      v-else
                      class="flex flex-col items-center justify-center gap-1.5 w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-600"
                    >
                      <Camera class="w-5 h-5" />
                      Sin foto
                    </div>
                    <figcaption class="mt-2 text-sm font-medium text-center text-gray-900 dark:text-white">{{ foto.label }}</figcaption>
                  </figure>
                </div>
              </section>
            </div>

            <!-- 4. Autorización -->
            <div v-show="activeTab === 'autorizacion'" class="space-y-4">
              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <ClipboardList class="w-4 h-4" />
                  Resumen para el cliente
                </h4>
                <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
                  <div>
                    <dt :class="ETIQUETA">Kilometraje</dt>
                    <dd :class="[VALOR, 'tabular-nums']">{{ kmIngreso ? `${kmIngreso} km` : '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Combustible</dt>
                    <dd :class="VALOR">{{ nivelCombustible?.label || '—' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Llaves</dt>
                    <dd :class="VALOR">{{ cantidadLlaves }}{{ recepcion.tiene_llave_control ? ' · con control' : '' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Accesorios</dt>
                    <dd :class="[VALOR, 'tabular-nums']">{{ inventarioPresente }} de {{ TOTAL_INVENTARIO }} presentes</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Testigos encendidos</dt>
                    <dd :class="VALOR">{{ testigosActivos.length || 'Ninguno' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Daños marcados</dt>
                    <dd :class="VALOR">{{ marcasCarroceria.length || 'Ninguno' }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Fotos</dt>
                    <dd :class="[VALOR, 'tabular-nums']">{{ fotosCargadas }}/{{ FOTO_VISTAS.length }}</dd>
                  </div>
                  <div>
                    <dt :class="ETIQUETA">Objetos de valor</dt>
                    <dd :class="[VALOR, 'truncate']" :title="pertenenciasActivas.join(', ')">
                      {{ pertenenciasActivas.length ? pertenenciasActivas.join(', ') : 'Ninguno' }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section :class="SECCION">
                <h4 :class="[TITULO_SECCION, 'mb-4']">
                  <Signature class="w-4 h-4" />
                  Decisión del cliente
                </h4>

                <!-- Firmada y aceptada -->
                <div v-if="firmada" class="space-y-4">
                  <div class="flex items-start gap-3 p-4 rounded-lg border-2 border-brand-900 bg-brand-50 dark:border-brand-300 dark:bg-brand-700/30">
                    <PenLine class="w-5 h-5 mt-0.5 shrink-0 text-brand-700 dark:text-brand-200" />
                    <div>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">Firma y acepta</p>
                      <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                        Firmado el {{ formatDate(recepcion.fecha_firma_cliente) }}. El cliente acepta las condiciones de recepción y el estado reportado del vehículo.
                      </p>
                    </div>
                  </div>
                  <div class="max-w-2xl">
                    <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">Firma del cliente</p>
                    <div class="overflow-hidden bg-white border border-gray-300 rounded-lg dark:border-gray-600">
                      <img v-if="recepcion.firma_cliente" :src="recepcion.firma_cliente" alt="Firma del cliente" class="w-full h-auto" />
                      <div v-else class="flex items-center justify-center w-full aspect-[4/1] text-xs text-gray-500">Firma no disponible</div>
                    </div>
                  </div>
                </div>

                <!-- No aceptada -->
                <div v-else-if="noAceptada" class="p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20">
                  <div class="flex items-start gap-3">
                    <UserX class="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">No acepta / no firma</p>
                      <p class="mt-1 text-sm whitespace-pre-line text-amber-800 dark:text-amber-200">
                        {{ recepcion.motivo_no_recepcion || 'No se registró un motivo.' }}
                      </p>
                      <button
                        v-if="puedeModificar"
                        type="button"
                        class="inline-flex items-center gap-2 mt-3 px-3 py-2 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30"
                        @click="abrirModalFirmar">
                        <Signature class="w-4 h-4" />
                        El cliente cambió de opinión: firmar aceptación
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Pendiente -->
                <div v-else class="flex items-start gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Clock class="w-5 h-5 mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">Pendiente de firma</p>
                    <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      El cliente todavía no firma la conformidad.
                      <template v-if="puedeEditar">Usa <span class="font-medium">Editar</span> para registrar su decisión.</template>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <!-- Navegación entre pasos -->
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 sm:px-5 dark:border-gray-700">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              :class="activeTabIndex <= 0 ? 'invisible' : ''"
              @click="goToTab(-1)">
              <ArrowLeft class="w-4 h-4" />
              {{ PASOS[activeTabIndex - 1]?.label || 'Anterior' }}
            </button>
            <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Sección {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
              :class="activeTabIndex >= PASOS.length - 1 ? 'invisible' : ''"
              @click="goToTab(1)">
              {{ PASOS[activeTabIndex + 1]?.label || 'Siguiente' }}
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:col-span-1">
        <!-- Vehículo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <Car class="w-4 h-4" />
            Vehículo
          </h4>
          <button
            v-if="vehiculo?.imagen"
            type="button"
            title="Ampliar foto del vehículo"
            class="block w-full h-36 mb-3 overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in dark:bg-gray-700"
            @click="abrirFoto(vehiculo.imagen)"
          >
            <img :src="vehiculo.imagen" alt="Foto del vehículo" class="h-full w-full object-contain" />
          </button>
          <div
            v-else
            class="flex flex-col items-center justify-center gap-1.5 h-24 mb-3 text-xs text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg dark:bg-gray-700/40 dark:border-gray-600"
          >
            <Camera class="w-5 h-5" />
            Sin foto del vehículo
          </div>
          <p class="mb-3 font-mono text-base font-semibold tracking-widest text-gray-900 dark:text-white">{{ placaDisplay || '—' }}</p>
          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconEngine class="w-4 h-4 shrink-0" stroke-width="1.8" />
                N° motor
              </dt>
              <dd class="font-medium truncate text-gray-900 dark:text-white">{{ vehiculo?.numero_motor || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <component :is="transmisionIcon" class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Transmisión
              </dt>
              <dd class="font-medium text-right text-gray-900 dark:text-white">{{ transmisionLabel || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconGasStation class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Combustible
              </dt>
              <dd class="font-medium truncate text-gray-900 dark:text-white">{{ combustibleLabel || '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- Historial (timeline de Flowbite) -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-4']">
            <History class="w-4 h-4" />
            Historial
          </h4>
          <ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
            <li v-for="evento in historial" :key="evento.key" class="mb-5 ms-5 last:mb-0">
              <span
                class="absolute -start-1.5 mt-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-800"
                :class="evento.key === 'no_aceptada' ? 'bg-amber-500' : evento.key === 'firma' ? 'bg-green-600' : 'bg-brand-900 dark:bg-brand-300'"
              ></span>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ evento.titulo }}</p>
              <time v-if="evento.fecha" class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatDate(evento.fecha) }}</time>
              <p v-if="evento.detalle" class="text-xs text-gray-500 dark:text-gray-400">{{ evento.detalle }}</p>
            </li>
          </ol>
        </section>

        <!-- Relaciones del flujo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-1']">
            <Workflow class="w-4 h-4" />
            Relaciones del flujo
          </h4>
          <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">Documentos generados a partir de esta recepción.</p>
          <RelacionesFlujo :pasos="relacionesRecepcion" />
        </section>
      </aside>
    </div>
  </div>

  <ConfirmModal
    v-model="showModalCrearInspeccion"
    title="¿Crear la inspección de esta recepción?"
    :message="mensajeCrearInspeccion"
    :icon="IconReportSearch"
    variant="primary"
    confirm-text="Sí, crear inspección"
    confirming-text="Creando..."
    :is-deleting="creandoInspeccion"
    @confirm="confirmarCrearInspeccion"
  />

  <!-- Firmar aceptación (recepción NO_ACEPTADA) -->
  <div v-if="showModalFirmar" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-firmar-title">
    <!-- Fondo oscurecido: al hacer click aquí no se cierra el modal. -->
    <div class="fixed inset-0 bg-black/70" aria-hidden="true"></div>
    <div class="relative w-full max-w-xl bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 id="modal-firmar-title" class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Signature class="w-5 h-5 text-brand-700 dark:text-brand-200" />
          Firmar aceptación
        </h2>
        <button
          type="button"
          aria-label="Cerrar"
          class="inline-flex items-center justify-center w-8 h-8 text-gray-400 rounded-lg hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
          @click="cerrarModalFirmar">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Registra la firma del cliente para dejar la recepción {{ numeroRecepcion }} como aceptada.
        </p>
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white">Firma del cliente <span class="text-accent-500">*</span></p>
            <button
              v-if="firmaClienteData"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-red-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
              @click="borrarFirmaCliente">
              <BrushCleaning class="w-4 h-4" />
              Borrar firma
            </button>
          </div>
          <div class="relative overflow-hidden bg-white border-2 border-dashed border-gray-300 rounded-lg dark:border-gray-500">
            <canvas
              ref="firmaClienteCanvas"
              width="600"
              height="200"
              class="block w-full h-auto cursor-crosshair touch-none"
              @pointerdown="onFirmaPointerDown"
              @pointermove="onFirmaPointerMove"
              @pointerup="onFirmaPointerUp"
              @pointerleave="onFirmaPointerUp"></canvas>
            <div class="absolute inset-x-8 bottom-8 border-b border-gray-300 pointer-events-none"></div>
            <p v-if="!firmaClienteData" class="absolute inset-x-0 top-1/3 text-center text-sm text-gray-400 pointer-events-none">
              El cliente firma aquí con el dedo o el mouse
            </p>
          </div>
        </div>

        <label class="flex items-start gap-2">
          <input
            v-model="aceptacionCliente"
            type="checkbox"
            class="w-4 h-4 mt-0.5 text-brand-900 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 dark:ring-offset-gray-800"
          />
          <span class="text-sm text-gray-900 dark:text-white">
            El cliente acepta las condiciones de recepción y el estado reportado del vehículo.
          </span>
        </label>

        <Alert v-if="errorFirmar" type="error" :message="errorFirmar" />
      </div>

      <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          :disabled="firmando"
          class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
          @click="cerrarModalFirmar">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="firmando || !firmaClienteData || !aceptacionCliente"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmarFirma">
          <Loader2 v-if="firmando" class="w-4 h-4 animate-spin" />
          <Signature v-else class="w-4 h-4" />
          {{ firmando ? 'Firmando...' : 'Firmar y aceptar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Foto ampliada -->
  <div v-if="showImageModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" @click="cerrarFoto">
    <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800" @click.stop>
      <button
        type="button"
        aria-label="Cerrar"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        @click="cerrarFoto">
        <X class="w-5 h-5" />
      </button>
      <img :src="previewImg" class="max-h-[90vh] max-w-[90vw] object-contain" alt="Foto ampliada" />
    </div>
  </div>
  </template>
</template>
