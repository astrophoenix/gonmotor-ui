<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from "vue";
import { IconClipboardSearch } from "@tabler/icons-vue";

import {
  FileText,
  FileCheck,
  TriangleAlert,
  FileSearch,
  Camera,
  Signature,
  BrushCleaning,
  CircleMinus,
  CircleAlert,
  CheckCircle2,
  Wand2,
  Loader2,
  X,
  CreditCard,
  Phone,
  Mail,
  CalendarDays,
  Info,
  Eye,
  Lock,
  Gauge,
  Fuel,
  Car,
  Tag,
  Users,
  ClipboardList,
  Search,
  IdCardIcon,
  TagIcon,
  EvCharger,
  Shapes,
  PaintBucket,
  NotebookPen,
  Notebook,
  Trash2,
} from "lucide-vue-next";
import {
  IconEngine,
  IconManualGearbox,
  IconAutomaticGearbox,
  IconGasStation,
} from "@tabler/icons-vue";
import { recepcionesService } from "../services/recepcionesService";
import { request } from "../../../shared/services/httpClient";
import { API_BASE_URL } from "../../../shared/config/env";
import {
  sanitizeObservaciones,
  sanitizeNombre,
  sanitizeTelefono,
} from "../../../shared/utils/sanitize";
import {
  testigoDefaults,
  testigoFromData,
  testigoPayload,
} from "../../../shared/config/testigos";
import Alert from "../../../shared/components/Alert.vue";
import FormSaveActions from "../../../shared/components/FormSaveActions.vue";
import TestigosTablero from "../../../shared/components/TestigosTablero.vue";
import PhotoSlotGrid from "../../../shared/components/PhotoSlotGrid.vue";
import ClientModal from "../../clientes/components/ClientModal.vue";
import TextImprover from "../../../shared/components/TextImprover.vue";
import ClienteSearchSelect from "../../../shared/components/ClienteSearchSelect.vue";
import VehiculoSearchSelect from "../../../shared/components/VehiculoSearchSelect.vue";

const recepcionId = new URLSearchParams(window.location.search).get("id");
const isEditMode = Boolean(recepcionId);
const isLoading = ref(true);
const readOnly = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const savedError = ref("");
const formErrors = ref({});
const fotoErrors = ref({});
const fotosPresence = ref({});

function pad2(n) {
  return String(n).padStart(2, "0");
}

function localDatetimeNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const defaultNow = localDatetimeNow();

function toLocalDatetimeInput(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }
    return value.slice(0, 16);
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}T${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  return "";
}

const form = reactive({
  cliente: null,
  vehiculo: null,
  tipo_recepcion: "DIAGNOSTICO",
  motivo_ingreso: "",
  fecha_ingreso: defaultNow,
  fecha_salida: "",
  recibido_por: null,
  kilometraje_ingreso: null,
  nivel_combustible: "1/4",
  ingreso_en_grua: false,
  datos_grua: "",
  cantidad_llaves: 0,
  tiene_llave_control: false,
  pertenencia_celular: false,
  pertenencia_billetera: false,
  pertenencia_dinero: false,
  pertenencia_documentos: false,
  pertenencia_gafas: false,
  pertenencia_equipaje: false,
  pertenencia_otros: false,
  pertenencias_observaciones: "",
  compania_seguro: "",
  numero_poliza: "",
  numero_reclamo: "",
  ajustador_nombre: "",
  ajustador_telefono: "",
  tiene_espejo_izquierdo: false,
  tiene_espejo_derecho: false,
  tiene_vidrios: false,
  tiene_radio: false,
  tiene_pantalla: false,
  tiene_encendedor: false,
  tiene_antena: false,
  tiene_control_puertas: false,
  tiene_cargador_celular: false,
  tiene_triangulos: false,
  tiene_cubresol: false,
  tiene_herramientas: false,
  tiene_gata_palanca: false,
  tiene_llanta_repuesto: false,
  tiene_faros_lunas: false,
  tiene_tapa_gasolina: false,
  tiene_placas: false,
  tiene_tapetes: false,
  tiene_extintor: false,
  tiene_botiquin: false,
  tiene_copas_ruedas: false,
  tiene_llave_tuercas: false,
  datos_danos_carroceria: null,
  detalles_carroceria: "",
  cliente_identificacion: "",
  cliente_telefono: "",
  cliente_email: "",
  vehiculo_color: "",
  firma_cliente: null,
  fecha_firma_cliente: null,
  aceptacion_condiciones: false,
  estado: "PENDIENTE",
  motivo_no_recepcion: "",
});

const testigos = reactive(testigoDefaults());

const GRUPO_BLUEPRINT_MAP = {
  AUTO: "liviano",
  JEEP: "suv",
  CAMN: "camioneta",
  FURG: "furgoneta",
  BUS: "bus",
};
const MAX_DETALLES_CARROCERIA = 20;

const clienteSearch = ref("");
const vehiculoSearch = ref("");
const showClientCreateModal = ref(false);
const empleadoActiveIndex = ref(-1);
const blueprintImageUrl = ref("");
const marcas = ref([]);
const detallesSyncVersion = ref(0);
const blueprintError = ref("");
const detallesErrors = ref({});
const activeTab = ref("informacion");
const TAB_ORDER = ["informacion", "inspeccion", "evidencias", "autorizacion"];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    activeTab.value = TAB_ORDER[next];
  }
}

const empleados = ref([]);
const recibidoPorSearch = ref("");
const showEmpleadoDropdown = ref(false);
const empleadoOptions = ref([]);
const empleadoDropdownRef = ref(null);

const firmaClienteData = ref(null);
const firmaClienteCanvas = ref(null);
const isDrawingCliente = ref(false);
const clienteNoFirma = ref(false);
const showContradiccionModal = ref(false);

const esNoAceptada = computed(
  () => clienteNoFirma.value || (form.motivo_no_recepcion || "").trim() !== "",
);

const tipoRecepcionLabel = computed(() => {
  const map = {
    MANTENIMIENTO: "Mantenimiento",
    REPARACIÓN: "Reparación",
    DIAGNOSTICO: "Diagnóstico",
    ESTETICA: "Estética",
    GARANTIA: "Garantía",
    SINISTRO: "Siniestro",
    OTRO: "Otro",
  };
  return map[form.tipo_recepcion] || form.tipo_recepcion || "—";
});

const FUEL_LEVELS = [
  {
    value: "VACIO",
    label: "Vacío",
    fill: 0,
    icon: "text-red-600 dark:text-red-500",
  },
  {
    value: "RESERVA",
    label: "Reserva",
    fill: 1,
    icon: "text-red-500 dark:text-red-400",
  },
  { value: "1/4", label: "1/4", fill: 2, icon: "text-orange-500" },
  { value: "1/2", label: "1/2", fill: 3, icon: "text-amber-500" },
  { value: "3/4", label: "3/4", fill: 5, icon: "text-lime-600" },
  { value: "LLENO", label: "Lleno", fill: 6, icon: "text-emerald-600" },
];

const SEGMENT_COLORS = [
  "bg-gradient-to-t from-red-500 to-red-400 dark:from-red-700 dark:to-red-500",
  "bg-gradient-to-t from-orange-500 to-orange-400 dark:from-orange-700 dark:to-orange-500",
  "bg-gradient-to-t from-amber-500 to-amber-400 dark:from-amber-700 dark:to-amber-400",
  "bg-gradient-to-t from-yellow-500 to-yellow-400 dark:from-yellow-700 dark:to-yellow-400",
  "bg-gradient-to-t from-lime-500 to-lime-400 dark:from-lime-700 dark:to-lime-400",
  "bg-gradient-to-t from-emerald-500 to-emerald-400 dark:from-emerald-700 dark:to-emerald-500",
];

const fuelFill = computed(() => {
  const nivel = FUEL_LEVELS.find((l) => l.value === form.nivel_combustible);
  return nivel ? nivel.fill : 0;
});

const fuelLabel = computed(() => {
  const nivel = FUEL_LEVELS.find((l) => l.value === form.nivel_combustible);
  return nivel ? nivel.label : form.nivel_combustible || "—";
});

const fuelIcon = computed(() => {
  const nivel = FUEL_LEVELS.find((l) => l.value === form.nivel_combustible);
  return nivel ? nivel.icon : "text-gray-400";
});

function onFuelKeydown(event, index) {
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key))
    return;
  event.preventDefault();
  let next = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown")
    next = Math.min(FUEL_LEVELS.length - 1, index + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowUp")
    next = Math.max(0, index - 1);
  if (next !== index) {
    form.nivel_combustible = FUEL_LEVELS[next].value;
  }
}

const transmisionLabel = computed(() => {
  const map = { M: "Manual / Mecánica", A: "Automática", C: "CVT" };
  const value = form.vehiculo?.transmision || "";
  return map[value] || value || "";
});

const transmisionIcon = computed(() => {
  const type = form.vehiculo?.transmision || "";
  if (type === "M") return IconManualGearbox;
  return IconAutomaticGearbox;
});

const combustibleLabel = computed(() => {
  const map = {
    GAS: "Gasolina",
    DIE: "Diésel",
    HIB: "Híbrido",
    ELE: "Eléctrico",
    GNV: "Gas Natural Vehicular (GNV)",
  };
  const value = form.vehiculo?.combustible || form.vehiculo?.combustible || "";
  return map[value] || value || "";
});

function resolveMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

const vehiculoImagenSrc = computed(() =>
  resolveMediaUrl(form.vehiculo?.imagen),
);

function formatMiles(n) {
  if (n == null || n === "") return "";
  const digits = String(n).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-EC");
}

const kilometrajeDisplay = computed({
  get() {
    return formatMiles(form.kilometraje_ingreso);
  },
  set(value) {
    form.kilometraje_ingreso = String(value).replace(/\D/g, "");
  },
});

const vehiculoKilometrajeText = computed(() => {
  const km = form.vehiculo?.kilometraje_actual;
  if (km == null) return "";
  return formatMiles(km);
});

const estadoRecepcionBadge = computed(() => {
  const map = {
    ACEPTADA: {
      label: "Aceptada",
      classes:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
      dot: "bg-green-600 dark:bg-green-400",
    },
    NO_ACEPTADA: {
      label: "No Aceptada",
      classes:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
      dot: "bg-red-600 dark:bg-red-400",
    },
    PENDIENTE: {
      label: "Pendiente",
      classes:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700",
      dot: "bg-yellow-600 dark:bg-yellow-400",
    },
  };
  return map[form.estado] || map.PENDIENTE;
});

const TAB_ERROR_MAP = {
  fecha_ingreso: "Ingreso",
  fecha_salida: "Ingreso",
  recibido_por: "Ingreso",
  motivo_ingreso: "Ingreso",
  tipo_recepcion: "Ingreso",
  kilometraje_ingreso: "Ingreso",
  datos_grua: "Ingreso",
  numero_poliza: "Ingreso",
  detalles_carroceria: "Revisión",
  fotos: "Evidencias",
  motivo_no_recepcion: "Autorización",
};

const TAB_ORDER_LABELS = [
  "Información General",
  "Ingreso",
  "Revisión",
  "Evidencias",
  "Autorización",
];

const seccionesConErrores = computed(() => {
  const encontradas = new Set();
  Object.entries(TAB_ERROR_MAP).forEach(([campo, seccion]) => {
    if (formErrors.value[campo]) encontradas.add(seccion);
  });
  if (formErrors.value.cliente || formErrors.value.vehiculo) {
    encontradas.add("Información General");
  }
  return TAB_ORDER_LABELS.filter((seccion) => encontradas.has(seccion));
});

const mensajeErroresValidacion = computed(() => {
  const secciones = seccionesConErrores.value;
  if (secciones.length === 0) {
    return "Completa correctamente los campos obligatorios.";
  }
  return `Completa correctamente los campos obligatorios en: ${secciones.join(", ")}.`;
});

const FOTO_VISTAS = [
  { key: "FRONTAL", label: "Vista Frontal *" },
  { key: "LATERAL_IZQ", label: "Lateral Izquierda *" },
  { key: "LATERAL_DER", label: "Lateral Derecha *" },
  { key: "POSTERIOR", label: "Posterior *" },
  { key: "TABLERO", label: "Tablero / Kilometraje *" },
];

const PERTENENCIAS = [
  { campo: "pertenencia_celular", label: "Celular" },
  { campo: "pertenencia_billetera", label: "Billetera" },
  { campo: "pertenencia_dinero", label: "Dinero en efectivo" },
  { campo: "pertenencia_documentos", label: "Documentos personales" },
  { campo: "pertenencia_gafas", label: "Gafas / Lentes" },
  { campo: "pertenencia_equipaje", label: "Equipaje / Bolsos" },
  { campo: "pertenencia_otros", label: "Otros objetos de valor" },
];

const fotoGridRef = ref(null);
const fotosExisting = ref({});

function formatPlaca(placa) {
  if (!placa) return "";
  const cleaned = String(placa).replace(/-/g, "").toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function formatFechaFirma(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function syncDetallesCarroceria() {
  const lines = marcas.value
    .map((punto, idx) => ({
      numero: idx + 1,
      descripcion: (punto.descripcion || "").trim(),
    }))
    .filter((item) => item.descripcion.length > 0)
    .map((item) => `${item.numero}: ${item.descripcion}`);
  form.detalles_carroceria = lines.join("\n");
  detallesSyncVersion.value += 1;
}

function sanitizeDetalleCarroceria(punto, value) {
  punto.descripcion = sanitizeObservaciones(value).slice(0, 80);
}

function sanitizeDatosGrua(value) {
  form.datos_grua = sanitizeObservaciones(value);
}

function sanitizeAjustadorNombre(value) {
  form.ajustador_nombre = sanitizeNombre(value).slice(0, 120);
}

function sanitizeNumeroReclamo(value) {
  form.numero_reclamo = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 80);
}

function sanitizeAjustadorTelefono(value) {
  form.ajustador_telefono = sanitizeTelefono(value, 15);
}

function sanitizeNumeroPoliza(value) {
  form.numero_poliza = String(value ?? "")
    .replace(/[^A-Za-z0-9\-/]/g, "")
    .slice(0, 20);
}

function parseDetallesCarroceria(texto) {
  if (!texto) {
    return [];
  }
  const regex = /^(\d+):\s*(.+)$/gm;
  const items = [];
  let match;
  while ((match = regex.exec(texto)) !== null) {
    items.push({ numero: parseInt(match[1], 10), descripcion: match[2] });
  }
  items.sort((a, b) => a.numero - b.numero);
  return items.map((item) => item.descripcion);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showError(error) {
  errorMessage.value =
    error.message || "No fue posible completar la operación.";
}

function onFotosChange() {
  if (fotoGridRef.value) {
    fotosPresence.value = fotoGridRef.value.getPresence();
  }
}

function initCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function getCanvasCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function startDrawing(canvas, isDrawingRef, saveRef, event) {
  isDrawingRef.value = true;
  const ctx = canvas.getContext("2d");
  const coords = getCanvasCoords(canvas, event);
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
}

function draw(canvas, isDrawingRef, event) {
  if (!isDrawingRef.value) return;
  const ctx = canvas.getContext("2d");
  const coords = getCanvasCoords(canvas, event);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
}

function stopDrawing(canvas, isDrawingRef, saveRef) {
  if (!isDrawingRef.value) return;
  isDrawingRef.value = false;
  saveRef.value = canvas.toDataURL("image/png");
}

function borrarFirmaCliente() {
  clearCanvas(firmaClienteCanvas.value, firmaClienteData, isDrawingCliente);
  form.aceptacion_condiciones = false;
}

function clearCanvas(canvas, saveRef, isDrawingRef) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.beginPath();
  initCanvas(canvas);
  if (isDrawingRef) isDrawingRef.value = false;
  saveRef.value = null;
  if (saveRef === firmaClienteData) form.fecha_firma_cliente = null;
}

function onClientePointerDown(event) {
  if (readOnly.value) return;
  const canvas = firmaClienteCanvas.value;
  if (!canvas) return;
  startDrawing(canvas, isDrawingCliente, firmaClienteData, event);
}

function onClientePointerMove(event) {
  const canvas = firmaClienteCanvas.value;
  if (!canvas) return;
  draw(canvas, isDrawingCliente, event);
}

function onClientePointerUp(event) {
  const canvas = firmaClienteCanvas.value;
  if (!canvas || !isDrawingCliente.value) return;
  stopDrawing(canvas, isDrawingCliente, firmaClienteData);
  if (tieneTrazado(canvas)) {
    form.aceptacion_condiciones = true;
  }
}

function tieneTrazado(canvas) {
  if (!canvas) return false;
  const ctx = canvas.getContext("2d");
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (
        alpha !== 0 &&
        (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255)
      ) {
        return true;
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

function hasCanvasContent(canvas) {
  if (!canvas) return false;
  const ctx = canvas.getContext("2d");
  const pixel = ctx.getImageData(1, 1, 1, 1).data;
  return pixel[3] !== 255;
}

async function loadEmpleados() {
  try {
    const data = await request("/api/auth/empleados/?page=1&page_size=100");
    empleados.value = Array.isArray(data?.results) ? data.results : [];
    if (empleados.value.length > 0 && !form.recibido_por) {
      form.recibido_por = empleados.value[0].user?.id || null;
      recibidoPorSearch.value =
        `${empleados.value[0].user?.first_name || ""} ${empleados.value[0].user?.last_name || ""}`.trim() +
        " - " +
        (empleados.value[0].rol_display || empleados.value[0].rol);
    }
  } catch (error) {
    console.error("No se pudieron cargar empleados:", error);
  }
}

function selectEmpleado(empleado) {
  form.recibido_por = empleado.user?.id || null;
  recibidoPorSearch.value =
    `${empleado.user?.first_name || ""} ${empleado.user?.last_name || ""}`.trim() +
    " - " +
    (empleado.rol_display || empleado.rol);
  showEmpleadoDropdown.value = false;
}

function clearEmpleado() {
  form.recibido_por = null;
  recibidoPorSearch.value = "";
  empleadoOptions.value = [];
}

async function searchEmpleados() {
  if (readOnly.value) return;
  const term = recibidoPorSearch.value.trim();
  if (!term) {
    empleadoOptions.value = [];
    return;
  }
  try {
    const params = new URLSearchParams({
      search: term,
      page: "1",
      page_size: "10",
    });
    const data = await request(`/api/auth/empleados/?${params.toString()}`);
    empleadoOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error("No se pudieron buscar empleados:", error);
  }
}

async function loadRecepcion() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await recepcionesService.getById(recepcionId);
    if (data) {
      if (data.aceptacion_condiciones && data.fecha_firma_cliente) {
        readOnly.value = true;
      }
      Object.assign(form, {
        ...data,
        cliente: data.cliente || null,
        vehiculo: data.vehiculo || null,
        tipo_recepcion: data.tipo_recepcion || "DIAGNOSTICO",
        motivo_ingreso: data.motivo_ingreso || "",
        fecha_ingreso: toLocalDatetimeInput(data.fecha_ingreso),
        fecha_salida: toLocalDatetimeInput(data.fecha_salida),
        recibido_por: data.recibido_por || null,
        firma_cliente: data.firma_cliente || null,
        fecha_firma_cliente: data.fecha_firma_cliente || null,
        aceptacion_condiciones: data.aceptacion_condiciones || false,
        estado: data.estado || "PENDIENTE",
        motivo_no_recepcion: data.motivo_no_recepcion || "",
      });
      clienteNoFirma.value = data.estado === "NO_ACEPTADA";
      if (data.cliente) {
        form.cliente_identificacion = data.cliente.identificacion || "";
        form.cliente_telefono = data.cliente.telefono || "";
        form.cliente_email = data.cliente.email || "";
        clienteSearch.value = data.cliente.nombre;
      } else {
        form.cliente_identificacion = "";
        form.cliente_telefono = "";
        form.cliente_email = "";
        clienteSearch.value = "";
      }
      if (data.vehiculo) {
        form.vehiculo_color = data.vehiculo.color || "";
        vehiculoSearch.value = formatPlaca(data.vehiculo.placa);
        await cargarBlueprint(data.vehiculo.grupo_blueprint);
      } else {
        form.vehiculo_color = "";
        vehiculoSearch.value = "";
      }
      Object.assign(testigos, testigoFromData(data));
      if (Array.isArray(data.fotos)) {
        const existing = {};
        FOTO_VISTAS.forEach((v) => {
          const foto = data.fotos.find((f) => f.tipo_vista === v.key);
          if (foto) {
            existing[v.key] = foto.imagen;
          }
        });
        fotosExisting.value = existing;
      } else {
        fotosExisting.value = {};
      }
      await nextTick();
      onFotosChange();
      const descripciones = parseDetallesCarroceria(data.detalles_carroceria);
      if (descripciones.length > 0) {
        marcas.value = marcas.value.map((punto, idx) => ({
          ...punto,
          descripcion: descripciones[idx] || "",
        }));
      }
      if (data.recibido_por) {
        recibidoPorSearch.value =
          data.recibido_por_nombre || data.recibido_por.username || "";
      }
      firmaClienteData.value = data.firma_cliente || null;
      await nextTick();
      if (data.firma_cliente) {
        const img = new Image();
        img.onload = () => {
          const canvas = firmaClienteCanvas.value;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = data.firma_cliente;
      }
    }
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function cargarBlueprint(grupo) {
  const grupoFinal =
    grupo ||
    (form.vehiculo?.grupo_blueprint
      ? GRUPO_BLUEPRINT_MAP[form.vehiculo?.tipo]
      : null);
  if (!grupoFinal) {
    blueprintImageUrl.value = "";
    return;
  }
  const candidates = [grupoFinal, "liviano"];
  for (const candidate of candidates) {
    const url = `/images/blueprint_${candidate}.png`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        blueprintImageUrl.value = url;
        return;
      }
    } catch {
      // ignore and try fallback
    }
  }
  blueprintImageUrl.value = "";
}

function onBlueprintClick(event) {
  if (readOnly.value) return;
  if (marcas.value.length >= MAX_DETALLES_CARROCERIA) {
    blueprintError.value =
      "No se pueden agregar más de 20 detalles. Eliminá uno existente para continuar.";
    return;
  }
  blueprintError.value = "";
  const container = event.currentTarget;
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  marcas.value = [
    ...marcas.value,
    { id: Date.now(), x: Math.round(x), y: Math.round(y), descripcion: "" },
  ];
}

function selectCliente(cliente) {
  form.cliente = cliente;
  form.cliente_identificacion = cliente.identificacion || "";
  form.cliente_telefono = cliente.telefono || "";
  form.cliente_email = cliente.email || "";
  clienteSearch.value = cliente.nombre;
  form.vehiculo = null;
  form.vehiculo_color = "";
  vehiculoSearch.value = "";
}

function selectVehiculo(vehiculo) {
  form.vehiculo = vehiculo;
  form.vehiculo_color = vehiculo.color || "";
  vehiculoSearch.value = formatPlaca(vehiculo.placa);
  marcas.value = [];
  cargarBlueprint(vehiculo.grupo_blueprint);
}

function clearMarcas() {
  marcas.value = [];
}

function clearCliente() {
  form.cliente = null;
  form.cliente_identificacion = "";
  form.cliente_telefono = "";
  form.cliente_email = "";
  clienteSearch.value = "";
  clearVehiculo();
}

function onClientCreated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
    const nombre = cliente.nombre || "el cliente";
    successMessage.value = `Cliente "${nombre}" creado correctamente. Continúa con la recepción.`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function onClientReactivated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
    const nombre = cliente.nombre || "el cliente";
    successMessage.value = `Cliente "${nombre}" reactivado correctamente. Continúa con la recepción.`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function clearVehiculo() {
  form.vehiculo = null;
  form.vehiculo_color = "";
  vehiculoSearch.value = "";
}

function moveActiveIndex(activeIndex, listLength, direction) {
  if (!listLength) return 0;
  return (activeIndex + direction + listLength) % listLength;
}

function scrollActiveIntoView(containerRef, activeIndex) {
  const container = containerRef.value;
  if (!container) return;
  const el = container.querySelector(`[data-option-index="${activeIndex}"]`);
  if (el) el.scrollIntoView({ block: "nearest" });
}

function onEmpleadoKeydown(event) {
  if (!empleadoOptions.value.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    showEmpleadoDropdown.value = true;
    empleadoActiveIndex.value = moveActiveIndex(
      empleadoActiveIndex.value,
      empleadoOptions.value.length,
      1,
    );
    scrollActiveIntoView(empleadoDropdownRef, empleadoActiveIndex.value);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    showEmpleadoDropdown.value = true;
    empleadoActiveIndex.value = moveActiveIndex(
      empleadoActiveIndex.value,
      empleadoOptions.value.length,
      -1,
    );
    scrollActiveIntoView(empleadoDropdownRef, empleadoActiveIndex.value);
  } else if (event.key === "Enter") {
    const item = empleadoOptions.value[empleadoActiveIndex.value];
    if (item) {
      event.preventDefault();
      selectEmpleado(item);
    }
  } else if (event.key === "Escape") {
    showEmpleadoDropdown.value = false;
  }
}

function validateRecepcion() {
  const errors = {};
  const esNoAceptadaValor = esNoAceptada.value;

  if (!form.cliente) {
    errors.cliente = "El cliente es obligatorio.";
  }

  if (!form.vehiculo) {
    errors.vehiculo = "El vehículo / placa es obligatorio.";
  }

  if (!form.recibido_por) {
    errors.recibido_por = "El empleado que recibe es obligatorio.";
  }

  if (!form.fecha_ingreso) {
    errors.fecha_ingreso = "La fecha de ingreso es obligatoria.";
  }

  if (esNoAceptadaValor && !form.fecha_salida) {
    errors.fecha_salida = "La fecha de salida es obligatoria.";
  }

  if (form.fecha_ingreso && form.fecha_salida) {
    const fechain = new Date(form.fecha_ingreso);
    const fechasal = new Date(form.fecha_salida);
    if (
      !Number.isNaN(fechain.getTime()) &&
      !Number.isNaN(fechasal.getTime()) &&
      fechain >= fechasal
    ) {
      errors.fecha_salida =
        "La fecha de salida debe ser posterior a la fecha de ingreso.";
    }
  }

  if (!form.tipo_recepcion) {
    errors.tipo_recepcion = "El tipo de recepción es obligatorio.";
  }

  if (esNoAceptadaValor && !(form.motivo_no_recepcion || "").trim()) {
    errors.motivo_no_recepcion =
      "Registra el motivo por el cual el cliente no desea firmar la recepción.";
  }

  if (!esNoAceptadaValor) {
    const kmRaw = form.kilometraje_ingreso;
    const kmStr = kmRaw == null ? "" : String(kmRaw).trim();
    if (kmStr === "") {
      errors.kilometraje_ingreso =
        "El kilometraje es obligatorio y debe ser mayor a 0.";
    } else {
      const km = Number(kmStr);
      if (Number.isNaN(km)) {
        errors.kilometraje_ingreso =
          "El kilometraje no es válido. Ingresa solo números enteros mayores a 0.";
      } else if (km < 0) {
        errors.kilometraje_ingreso =
          "El kilometraje no puede ser negativo. Por favor ingresa un valor mayor a 0.";
      } else if (km === 0) {
        errors.kilometraje_ingreso = "El kilometraje debe ser mayor a 0.";
      } else if (!Number.isInteger(km)) {
        errors.kilometraje_ingreso =
          "El kilometraje debe ser un número entero mayor a 0.";
      } else if (form.vehiculo && form.vehiculo.kilometraje_actual != null) {
        const kmVehiculo = Number(form.vehiculo.kilometraje_actual);
        const conservarKmEnEdicion = isEditMode && km === kmVehiculo;
        if (km < kmVehiculo || (km === kmVehiculo && !conservarKmEnEdicion)) {
          errors.kilometraje_ingreso = `El kilometraje de ingreso debe ser mayor al kilometraje registrado del vehículo (${kmVehiculo} km).`;
        }
      }
    }

    if (!form.motivo_ingreso || !form.motivo_ingreso.trim()) {
      errors.motivo_ingreso = "El motivo de ingreso es obligatorio.";
    }

    if (form.ingreso_en_grua && !form.datos_grua) {
      errors.datos_grua = "Ingresa los datos de la grúa o chófer.";
    }

    const poliza = (form.numero_poliza || "").trim();
    if (poliza && !/^[A-Za-z0-9\-/]{8,20}$/.test(poliza)) {
      errors.numero_poliza =
        "El número de póliza debe tener entre 8 y 20 caracteres (letras, números, guiones o barras).";
    }

    const detallesVacios = marcas.value.filter(
      (p) => !(p.descripcion || "").trim(),
    );
    if (detallesVacios.length > 0) {
      errors.detalles_carroceria =
        "Completa todas las descripciones de carrocería.";
    }

    const presenciaFotos = fotoGridRef.value
      ? fotoGridRef.value.getPresence()
      : fotosPresence.value;
    const fotoErrs = {};
    FOTO_VISTAS.forEach((v) => {
      if (!presenciaFotos[v.key]) {
        fotoErrs[v.key] = `Debes subir la foto de ${v.label.toLowerCase()}.`;
      }
    });
    fotoErrors.value = fotoErrs;
    if (Object.keys(fotoErrs).length > 0) {
      errors.fotos = "Las 5 fotos de la recepción son obligatorias.";
    }
  } else {
    fotoErrors.value = {};
  }

  formErrors.value = errors;
  detallesErrors.value = {};
  if (!esNoAceptadaValor) {
    marcas.value.forEach((p, idx) => {
      if (!(p.descripcion || "").trim()) {
        detallesErrors.value[idx] = "La descripción es obligatoria.";
      }
    });
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (readOnly.value) return;
  errorMessage.value = "";
  successMessage.value = "";
  savedError.value = "";
  formErrors.value = {};
  isSaving.value = true;

  const isValid = validateRecepcion();
  if (!isValid) {
    errorMessage.value = mensajeErroresValidacion.value;
    window.scrollTo({ top: 0, behavior: "smooth" });
    isSaving.value = false;
    return;
  }

  if (tieneContradiccionNoAceptacion()) {
    isSaving.value = false;
    showContradiccionModal.value = true;
    return;
  }

  await ejecutarGuardado();
}

function tieneContradiccionNoAceptacion() {
  return (
    !!firmaClienteData.value &&
    !!form.aceptacion_condiciones &&
    (form.motivo_no_recepcion || "").trim() !== ""
  );
}

async function confirmarGuardadoNoAceptada() {
  showContradiccionModal.value = false;
  isSaving.value = true;
  await ejecutarGuardado();
}

async function ejecutarGuardado() {
  const esAceptadaYFirmada = () =>
    !esNoAceptada.value &&
    !!firmaClienteData.value &&
    !!form.aceptacion_condiciones;

  try {
    const payload = {
      cliente: form.cliente?.id || null,
      vehiculo: form.vehiculo?.id || null,
      tipo_recepcion: form.tipo_recepcion,
      motivo_ingreso: form.motivo_ingreso?.trim() || "",
      fecha_ingreso: form.fecha_ingreso || localDatetimeNow(),
      fecha_salida: form.fecha_salida || null,
      recibido_por: form.recibido_por || null,
      kilometraje_ingreso:
        esNoAceptada.value &&
        String(form.kilometraje_ingreso ?? "").trim() === ""
          ? null
          : Number(form.kilometraje_ingreso),
      nivel_combustible: form.nivel_combustible,
      ingreso_en_grua: form.ingreso_en_grua,
      datos_grua: form.ingreso_en_grua ? form.datos_grua : null,
      cantidad_llaves: Number(form.cantidad_llaves) || 0,
      tiene_llave_control: form.tiene_llave_control,
      pertenencia_celular: form.pertenencia_celular,
      pertenencia_billetera: form.pertenencia_billetera,
      pertenencia_dinero: form.pertenencia_dinero,
      pertenencia_documentos: form.pertenencia_documentos,
      pertenencia_gafas: form.pertenencia_gafas,
      pertenencia_equipaje: form.pertenencia_equipaje,
      pertenencia_otros: form.pertenencia_otros,
      pertenencias_observaciones:
        (form.pertenencias_observaciones || "").trim() || null,
      compania_seguro: (form.compania_seguro || "").trim() || null,
      numero_poliza: (form.numero_poliza || "").trim() || null,
      numero_reclamo: (form.numero_reclamo || "").trim() || null,
      ajustador_nombre: (form.ajustador_nombre || "").trim() || null,
      ajustador_telefono: (form.ajustador_telefono || "").trim() || null,
      tiene_espejo_izquierdo: form.tiene_espejo_izquierdo,
      tiene_espejo_derecho: form.tiene_espejo_derecho,
      tiene_vidrios: form.tiene_vidrios,
      tiene_radio: form.tiene_radio,
      tiene_pantalla: form.tiene_pantalla,
      tiene_encendedor: form.tiene_encendedor,
      tiene_antena: form.tiene_antena,
      tiene_control_puertas: form.tiene_control_puertas,
      tiene_cargador_celular: form.tiene_cargador_celular,
      tiene_triangulos: form.tiene_triangulos,
      tiene_cubresol: form.tiene_cubresol,
      tiene_herramientas: form.tiene_herramientas,
      tiene_gata_palanca: form.tiene_gata_palanca,
      tiene_llanta_repuesto: form.tiene_llanta_repuesto,
      tiene_faros_lunas: form.tiene_faros_lunas,
      tiene_tapa_gasolina: form.tiene_tapa_gasolina,
      tiene_placas: form.tiene_placas,
      tiene_tapetes: form.tiene_tapetes,
      tiene_extintor: form.tiene_extintor,
      tiene_botiquin: form.tiene_botiquin,
      tiene_copas_ruedas: form.tiene_copas_ruedas,
      tiene_llave_tuercas: form.tiene_llave_tuercas,
      ...testigoPayload(testigos),
      datos_danos_carroceria: marcas.value,
      detalles_carroceria: form.detalles_carroceria || "",
      firma_cliente: esNoAceptada.value ? null : firmaClienteData.value,
      aceptacion_condiciones: esNoAceptada.value
        ? false
        : !!form.aceptacion_condiciones,
      estado: esNoAceptada.value
        ? "NO_ACEPTADA"
        : form.estado && form.estado !== "NO_ACEPTADA"
          ? form.estado
          : "PENDIENTE",
      motivo_no_recepcion: (form.motivo_no_recepcion || "").trim() || null,
    };

    const fd = new FormData();
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === undefined) {
        return;
      }
      if (value === null) {
        if (key === "firma_cliente") {
          fd.append(key, "");
        }
        return;
      }
      if (Array.isArray(value)) {
        fd.append(key, JSON.stringify(value));
        return;
      }
      fd.append(key, String(value));
    });
    const fotosSubidas = fotoGridRef.value ? fotoGridRef.value.getFiles() : {};
    Object.keys(fotosSubidas).forEach((key) => {
      const file = fotosSubidas[key];
      if (file) {
        fd.append(`foto_${key}`, file, file.name);
      }
    });

    if (isEditMode) {
      await recepcionesService.update(recepcionId, fd);
      if (esNoAceptada.value) {
        sessionStorage.setItem(
          "recepcion_exito",
          "Recepción actualizada correctamente. Registrada como 'No Aceptada / Sin Firma'.",
        );
        window.location.assign(
          `/crud/recepciones/ver/?id=${encodeURIComponent(recepcionId)}`,
        );
        return;
      }
      if (esAceptadaYFirmada()) {
        sessionStorage.setItem(
          "recepcion_aceptada_exito",
          "La recepción ha sido aceptada y firmada con éxito.",
        );
        window.location.assign(
          `/crud/recepciones/ver/?id=${encodeURIComponent(recepcionId)}`,
        );
        return;
      }
      successMessage.value = "Recepción actualizada correctamente.";
    } else {
      const saved = await recepcionesService.create(fd);
      if (saved?.id) {
        sessionStorage.setItem(
          "recepcion_exito",
          esNoAceptada.value
            ? "Recepción creada correctamente. Registrada como 'No Aceptada / Sin Firma'."
            : "Recepción creada correctamente.",
        );
        if (esNoAceptada.value || esAceptadaYFirmada()) {
          window.location.assign(
            `/crud/recepciones/ver/?id=${encodeURIComponent(saved.id)}`,
          );
        } else {
          window.location.assign(
            `/crud/recepciones/editar/?id=${encodeURIComponent(saved.id)}`,
          );
        }
        return;
      }
      successMessage.value = "Recepción creada correctamente.";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showError(error);
    if (error?.data) savedError.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } finally {
    isSaving.value = false;
  }
}

watch(empleadoOptions, () => {
  empleadoActiveIndex.value = -1;
});

watch(
  () => recibidoPorSearch.value,
  () => {
    if (!recibidoPorSearch.value.trim()) {
      clearEmpleado();
      return;
    }
    searchEmpleados();
  },
);

watch(
  () => form.vehiculo?.tipo,
  (tipo) => {
    const grupo = tipo ? GRUPO_BLUEPRINT_MAP[tipo] : null;
    if (grupo) {
      cargarBlueprint(grupo);
    } else {
      blueprintImageUrl.value = "";
    }
  },
);

watch(
  () => marcas.value,
  () => {
    syncDetallesCarroceria();
  },
  { deep: true },
);

watch(
  () => form.motivo_ingreso,
  (val) => {
    const clean = sanitizeObservaciones(val).slice(0, 500);
    if (clean !== val) form.motivo_ingreso = clean;
  },
);

watch(
  () => form.ajustador_nombre,
  (val) => {
    const clean = sanitizeNombre(val).slice(0, 120);
    if (clean !== val) form.ajustador_nombre = clean;
  },
);

watch(
  () => form.numero_reclamo,
  (val) => {
    const clean = String(val ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 80);
    if (clean !== val) form.numero_reclamo = clean;
  },
);

watch(
  () => form.ajustador_telefono,
  (val) => {
    const clean = sanitizeTelefono(val, 15);
    if (clean !== val) form.ajustador_telefono = clean;
  },
);

watch(
  () => form.numero_poliza,
  (val) => {
    const clean = String(val ?? "")
      .replace(/[^A-Za-z0-9\-/]/g, "")
      .slice(0, 20);
    if (clean !== val) form.numero_poliza = clean;
  },
);

watch(
  () => form.pertenencias_observaciones,
  (val) => {
    const clean = sanitizeObservaciones(val).slice(0, 255);
    if (clean !== val) form.pertenencias_observaciones = clean;
  },
);

onMounted(() => {
  const mensajeExito = sessionStorage.getItem("recepcion_exito");
  if (mensajeExito) {
    successMessage.value = mensajeExito;
    sessionStorage.removeItem("recepcion_exito");
  }
  loadRecepcion();
  loadEmpleados();
});
</script>

<template>
  <div
    class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700"
  >
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol
        class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2"
      >
        <li>
          <a
            href="/"
            class="text-gray-700 hover:text-primary-600 dark:text-gray-300"
            >Inicio</a
          >
        </li>
        <li class="text-gray-400">
          /
          <a href="/crud/recepciones/" class="hover:text-primary-600"
            >Recepciones</a
          >
        </li>
        <li class="text-gray-400">/ {{ isEditMode ? "Editar" : "Nueva" }}</li>
      </ol>
    </nav>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white"
      >
        {{ isEditMode ? "Editar recepción" : "Nueva recepción" }}
      </h1>
      <FormSaveActions
        :is-loading="isSaving"
        :is-edit-mode="isEditMode"
        :disabled="readOnly"
        cancel-href="/crud/recepciones/"
        :on-submit="submit"
      />
    </div>
  </div>
  <div class="relative mx-auto max-w-6xl p-4 rounded-lg">
    <ol
      class="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base"
    >
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-primary-600 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-primary-500"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold whitespace-nowrap"
            >1</span
          >
          <span
            class="whitespace-nowrap text-primary-blue-600 dark:text-primary-blue-400"
            >Recepción</span
          >
        </span>
      </li>
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-gray-200 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-gray-700"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold whitespace-nowrap"
            >2</span
          >
          <span class="whitespace-nowrap">Inspección</span>
        </span>
      </li>
      <li
        class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:bg-gray-200 after:inline-block after:mx-6 xl:after:mx-10 dark:after:bg-gray-700"
      >
        <span class="flex items-center">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold whitespace-nowrap"
            >3</span
          >
          <span class="whitespace-nowrap">Cotización</span>
        </span>
      </li>
      <li class="flex flex-none items-center">
        <span class="flex items-center whitespace-nowrap">
          <span
            class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold whitespace-nowrap"
            >4</span
          >
          <span class="whitespace-nowrap">Orden de Trabajo</span>
        </span>
      </li>
    </ol>
  </div>

  <div class="px-4 pt-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <Alert
          v-if="successMessage"
          type="success"
          :message="successMessage"
          dismissible
          @dismiss="successMessage = ''"
        />
        <Alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          dismissible
          @dismiss="errorMessage = ''"
        />
        <Alert
          v-if="readOnly"
          type="info"
          title="Solo lectura"
          message="Esta recepción ya fue aceptada y firmada por el cliente, por lo que solo es posible modificarla."
        />
        <div
          class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4"
        >
          <div class="flex items-center gap-2 mb-4">
            <FileText class="w-5 h-5 text-gray-900 dark:text-gray-900" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              Información General
            </h3>
          </div>
          <div class="grid grid-cols-5 gap-4">
            <div class="col-span-3">
              <label
                for="cliente"
                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >Cliente</label
              >
              <ClienteSearchSelect
                id="cliente"
                v-model="clienteSearch"
                :error="Boolean(formErrors.cliente)"
                :error-message="formErrors.cliente"
                :show-create="!readOnly"
                :disabled="readOnly"
                @select="selectCliente"
                @clear="clearCliente"
                @create="showClientCreateModal = true"
              />
              <div class="mt-3 space-y-1.5">
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" /> Identificación:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.cliente_identificacion || "—" }}</span
                  >
                </div>
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <Phone class="w-3.5 h-3.5 shrink-0" /> Teléfono:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.cliente_telefono || "—" }}</span
                  >
                </div>
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <Mail class="w-3.5 h-3.5 shrink-0" /> Correo:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.cliente_email || "—" }}</span
                  >
                </div>
              </div>
            </div>

            <div class="relative col-span-2">
              <label
                for="vehiculo"
                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >Vehículo</label
              >
              <VehiculoSearchSelect
                id="vehiculo"
                v-model="vehiculoSearch"
                :cliente-id="form.cliente?.id || null"
                :disabled="readOnly || !form.cliente"
                :placeholder="
                  form.cliente
                    ? 'Buscar placa...'
                    : 'Selecciona un cliente primero'
                "
                class="relative"
                @select="selectVehiculo"
              />
              <div class="mt-3 space-y-1.5">
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <TagIcon class="w-3.5 h-3.5 shrink-0" />
                  Marca:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.vehiculo ? form.vehiculo.marca : "—" }}</span
                  >
                </div>
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  Modelo:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.vehiculo ? form.vehiculo.modelo : "—" }}</span
                  >
                </div>
                <div
                  class="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-400"
                >
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  Color:
                  <span
                    class="truncate font-bold text-gray-900 dark:text-white"
                    >{{ form.vehiculo_color || "—" }}</span
                  >
                  {{
                    form.kilometraje_actual
                      ? `(${form.vehiculo.kilometraje_actual} km)`
                      : ""
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="relative p-6 bg-white rounded-lg shadow dark:bg-gray-800">
          <div
            v-if="isLoading"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            Cargando recepción...
          </div>
          <form
            v-else-if="!savedError"
            class="space-y-6"
            novalidate
            @submit.prevent="submit"
          >
            <div
              class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <div class="border-b border-gray-200 dark:border-gray-700">
                <nav class="flex flex-wrap -mb-px">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                    :class="
                      activeTab === 'informacion'
                        ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'informacion'"
                  >
                    <Notebook class="w-4 h-4" />
                    1. Ingreso
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                    :class="
                      activeTab === 'inspeccion'
                        ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'inspeccion'"
                  >
                    <IconClipboardSearch class="w-4 h-4" />
                    2. Revisión
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                    :class="
                      activeTab === 'evidencias'
                        ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'evidencias'"
                  >
                    <Camera class="w-4 h-4" />
                    3. Evidencias
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2"
                    :class="
                      activeTab === 'autorizacion'
                        ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'autorizacion'"
                  >
                    <NotebookPen class="w-4 h-4" />
                    4. Autorización
                  </button>
                </nav>
              </div>
              <div>
                <div v-show="activeTab === 'informacion'" class="p-4 space-y-4">
                  <div
                    class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          for="fecha_ingreso"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                          >Fecha Ingreso *</label
                        >
                        <input
                          id="fecha_ingreso"
                          v-model="form.fecha_ingreso"
                          type="datetime-local"
                          :disabled="readOnly"
                          :class="[
                            'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                            formErrors.fecha_ingreso
                              ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                              : '',
                          ]"
                        />
                        <p
                          v-if="formErrors.fecha_ingreso"
                          class="mt-2 text-sm text-red-600 dark:text-red-500"
                        >
                          {{ formErrors.fecha_ingreso }}
                        </p>
                      </div>
                      <div>
                        <label
                          for="fecha_salida"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                          >Fecha de Salida</label
                        >
                        <input
                          id="fecha_salida"
                          v-model="form.fecha_salida"
                          type="datetime-local"
                          :disabled="readOnly"
                          :class="[
                            'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                            formErrors.fecha_salida
                              ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                              : '',
                          ]"
                        />
                        <p
                          v-if="formErrors.fecha_salida"
                          class="mt-2 text-sm text-red-600 dark:text-red-500"
                        >
                          {{ formErrors.fecha_salida }}
                        </p>
                      </div>
                      <div class="relative">
                        <label
                          for="recibido_por"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                          >Asesor *</label
                        >
                        <input
                          id="recibido_por"
                          v-model="recibidoPorSearch"
                          autocomplete="off"
                          :disabled="readOnly"
                          placeholder="Buscar empleado..."
                          :class="[
                            'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                            formErrors.recibido_por
                              ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                              : '',
                          ]"
                          @focus="showEmpleadoDropdown = true"
                          @blur="
                            async () => {
                              await wait(150);
                              showEmpleadoDropdown = false;
                            }
                          "
                          @keydown="onEmpleadoKeydown"
                        />
                        <p
                          v-if="formErrors.recibido_por"
                          class="mt-2 text-sm text-red-600 dark:text-red-500"
                        >
                          {{ formErrors.recibido_por }}
                        </p>
                        <div
                          ref="empleadoDropdownRef"
                          v-if="showEmpleadoDropdown && empleadoOptions.length"
                          class="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                          <button
                            v-for="(item, index) in empleadoOptions"
                            :key="item.id"
                            :data-option-index="index"
                            type="button"
                            class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                            :class="
                              index === empleadoActiveIndex
                                ? 'bg-primary-blue-50 dark:bg-gray-600'
                                : ''
                            "
                            @mouseenter="empleadoActiveIndex = index"
                            @mousedown="selectEmpleado(item)"
                          >
                            {{ item.user?.first_name }}
                            {{ item.user?.last_name }} -
                            {{ item.rol_display || item.rol }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                      class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4"
                    >
                      <div class="space-y-4">
                        <TextImprover
                          v-model="form.motivo_ingreso"
                          contexto="motivo de ingreso"
                          v-slot="{
                            mejorar,
                            restaurar,
                            mejorando,
                            error,
                            mejorado,
                            tieneOriginal,
                          }"
                        >
                          <div
                            class="flex items-center justify-between gap-2 mb-2"
                          >
                            <label
                              for="motivo_ingreso"
                              class="block text-sm font-medium text-gray-900 dark:text-white"
                              >Motivo *</label
                            >
                            <button
                              type="button"
                              title="Mejorar el texto con IA"
                              :disabled="mejorando || readOnly"
                              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50 focus:ring-4 focus:ring-primary-blue-300 dark:border-primary-blue-400 dark:text-primary-blue-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              @click="mejorar"
                            >
                              <Wand2 v-if="!mejorando" class="w-4 h-4" />
                              <Loader2 v-else class="w-4 h-4 animate-spin" />
                              {{ mejorando ? "Mejorando..." : "Mejorar texto" }}
                            </button>
                          </div>
                          <textarea
                            id="motivo_ingreso"
                            v-model="form.motivo_ingreso"
                            rows="4"
                            maxlength="500"
                            :disabled="readOnly"
                            placeholder="Describe la razón por la que el cliente trae el vehículo..."
                            :class="[
                              'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                              formErrors.motivo_ingreso
                                ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                                : '',
                            ]"
                          ></textarea>
                          <p
                            v-if="formErrors.motivo_ingreso"
                            class="mt-2 text-sm text-red-600 dark:text-red-500"
                          >
                            {{ formErrors.motivo_ingreso }}
                          </p>
                          <p
                            v-if="error"
                            class="mt-2 text-sm text-red-600 dark:text-red-500"
                          >
                            {{ error }}
                          </p>
                          <div
                            v-if="mejorado && !error"
                            class="mt-2 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 class="w-5 h-5 shrink-0" />
                            <div class="flex flex-wrap items-center gap-x-2">
                              <p>Texto mejorado. Revisa antes de guardar.</p>
                              <button
                                v-if="tieneOriginal"
                                type="button"
                                class="text-sm font-medium underline hover:no-underline"
                                @click="restaurar"
                                :disabled="readOnly"
                              >
                                Restaurar original
                              </button>
                            </div>
                          </div>
                        </TextImprover>
                        <div>
                          <label
                            for="tipo_recepcion"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >Tipo de Recepción</label
                          >
                          <select
                            id="tipo_recepcion"
                            v-model="form.tipo_recepcion"
                            :disabled="readOnly"
                            :class="[
                              'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                              formErrors.tipo_recepcion
                                ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                                : '',
                            ]"
                          >
                            <option value="MANTENIMIENTO">Mantenimiento</option>
                            <option value="REPARACIÓN">Reparación</option>
                            <option value="DIAGNOSTICO">Diagnóstico</option>
                            <option value="ESTETICA">Estética</option>
                            <option value="GARANTIA">Garantía</option>
                            <option value="SINISTRO">Siniestro</option>
                            <option value="OTRO">Otro</option>
                          </select>
                          <p
                            v-if="formErrors.tipo_recepcion"
                            class="mt-2 text-sm text-red-600 dark:text-red-500"
                          >
                            {{ formErrors.tipo_recepcion }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4"
                    >
                      <div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div class="space-y-4">
                            <div>
                              <label
                                for="kilometraje_ingreso"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                >Kilometraje *</label
                              >
                              <input
                                id="kilometraje_ingreso"
                                v-model="kilometrajeDisplay"
                                type="text"
                                inputmode="numeric"
                                :disabled="readOnly"
                                placeholder="Ingresa el kilometraje"
                                :class="[
                                  'block w-full p-2 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                                  formErrors.kilometraje_ingreso
                                    ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                                    : '',
                                ]"
                              />
                              <p
                                v-if="formErrors.kilometraje_ingreso"
                                class="mt-2 text-sm text-red-600 dark:text-red-500"
                              >
                                {{ formErrors.kilometraje_ingreso }}
                              </p>
                              <span
                                v-if="vehiculoKilometrajeText"
                                class="mt-1 block text-xs text-gray-500 dark:text-gray-400"
                              >
                                Kilometraje actual:
                                {{ vehiculoKilometrajeText }} km
                              </span>
                            </div>
                            <div class="flex items-center gap-2 mt-10">
                              <label
                                class="relative inline-flex items-center cursor-pointer"
                              >
                                <input
                                  v-model="form.ingreso_en_grua"
                                  type="checkbox"
                                  class="sr-only peer"
                                  :disabled="readOnly"
                                />
                                <div
                                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                                ></div>
                                <span
                                  class="ml-3 text-sm font-medium text-gray-900 dark:text-white"
                                  >¿Ingresó en grúa?</span
                                >
                              </label>
                            </div>
                          </div>
                          <div class="space-y-4">
                            <div>
                              <label
                                id="nivel_combustible_label"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                >Nivel de Combustible *</label
                              >
                              <div
                                id="nivel_combustible"
                                role="radiogroup"
                                aria-labelledby="nivel_combustible_label"
                                class="flex flex-col gap-2"
                              >
                                <div
                                  class="flex w-full gap-1 p-1 rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                                >
                                  <button
                                    v-for="(opcion, index) in FUEL_LEVELS"
                                    :key="opcion.value"
                                    type="button"
                                    role="radio"
                                    :disabled="readOnly"
                                    :aria-checked="
                                      form.nivel_combustible === opcion.value
                                    "
                                    :title="opcion.label"
                                    class="h-7 flex-1 rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                    :class="
                                      opcion.fill <= fuelFill && fuelFill > 0
                                        ? `${SEGMENT_COLORS[index]} shadow-inner`
                                        : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    "
                                    @click="
                                      form.nivel_combustible = opcion.value
                                    "
                                    @keydown="onFuelKeydown($event, index)"
                                  ></button>
                                </div>
                                <span
                                  class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white"
                                >
                                  <Fuel
                                    class="w-4 h-4 transition-colors duration-300"
                                    :class="fuelIcon"
                                  />
                                  {{ fuelLabel }}
                                </span>
                              </div>
                            </div>
                            <div v-if="form.ingreso_en_grua">
                              <label
                                for="datos_grua"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                >Datos de la grúa / Chófer</label
                              >
                              <textarea
                                id="datos_grua"
                                :value="form.datos_grua"
                                @input="sanitizeDatosGrua($event.target.value)"
                                :disabled="readOnly"
                                placeholder="Datos Grúa / chófer"
                                maxlength="80"
                                rows="3"
                                :class="[
                                  'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                                  formErrors.datos_grua
                                    ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500'
                                    : '',
                                ]"
                              ></textarea>
                              <p
                                v-if="formErrors.datos_grua"
                                class="mt-2 text-sm text-red-600 dark:text-red-500"
                              >
                                {{ formErrors.datos_grua }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                      class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4"
                    >
                      <h5
                        class="mb-4 font-semibold text-gray-900 dark:text-white"
                      >
                        Custodia y pertenencias
                      </h5>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label
                            for="cantidad_llaves"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >Cantidad de llaves</label
                          >
                          <select
                            id="cantidad_llaves"
                            v-model="form.cantidad_llaves"
                            :disabled="readOnly"
                            class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                          >
                            <option :value="0">0</option>
                            <option :value="1">1</option>
                            <option :value="2">2</option>
                            <option :value="3">3</option>
                            <option :value="4">4 o más</option>
                          </select>
                        </div>
                        <div class="flex items-end pb-2.5">
                          <label
                            class="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white"
                          >
                            <input
                              v-model="form.tiene_llave_control"
                              type="checkbox"
                              :disabled="readOnly"
                              class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                            />
                            Llave de control / Control remoto
                          </label>
                        </div>
                      </div>
                      <div class="mb-4">
                        <label
                          for="pertenencias_observaciones"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                          >Objetos de valor dejados en el vehículo</label
                        >
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <label
                            v-for="item in PERTENENCIAS"
                            :key="item.campo"
                            class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <input
                              v-model="form[item.campo]"
                              type="checkbox"
                              :disabled="readOnly"
                              class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {{ item.label }}
                          </label>
                        </div>
                        <input
                          id="pertenencias_observaciones"
                          v-model="form.pertenencias_observaciones"
                          type="text"
                          :disabled="readOnly"
                          placeholder="Observaciones (ej. otros objetos no listados)"
                          maxlength="255"
                          class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div
                      class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 p-4"
                    >
                      <h5
                        class="mb-4 font-semibold text-gray-900 dark:text-white"
                      >
                        Seguro / Siniestros
                      </h5>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            for="compania_seguro"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >Compañía de seguro</label
                          >
                          <input
                            id="compania_seguro"
                            v-model="form.compania_seguro"
                            type="text"
                            maxlength="100"
                            :disabled="readOnly"
                            class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label
                            for="numero_poliza"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >N° póliza</label
                          >
                          <input
                            id="numero_poliza"
                            v-model="form.numero_poliza"
                            type="text"
                            maxlength="20"
                            :disabled="readOnly"
                            :class="[
                              'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                              formErrors.numero_poliza
                                ? 'border-red-500 dark:border-red-500'
                                : '',
                            ]"
                          />
                          <p
                            v-if="formErrors.numero_poliza"
                            class="mt-2 text-sm text-red-600 dark:text-red-500"
                          >
                            {{ formErrors.numero_poliza }}
                          </p>
                        </div>
                        <div>
                          <label
                            for="numero_reclamo"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >N° reclamo / siniestro</label
                          >
                          <input
                            id="numero_reclamo"
                            v-model="form.numero_reclamo"
                            type="text"
                            maxlength="80"
                            :disabled="readOnly"
                            :class="[
                              'block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white',
                              formErrors.numero_reclamo
                                ? 'border-red-500 dark:border-red-500'
                                : '',
                            ]"
                          />
                          <p
                            v-if="formErrors.numero_reclamo"
                            class="mt-2 text-sm text-red-600 dark:text-red-500"
                          >
                            {{ formErrors.numero_reclamo }}
                          </p>
                        </div>
                        <div>
                          <label
                            for="ajustador_nombre"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >Nombre del perito seguro</label
                          >
                          <input
                            id="ajustador_nombre"
                            v-model="form.ajustador_nombre"
                            type="text"
                            maxlength="120"
                            :disabled="readOnly"
                            class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label
                            for="ajustador_telefono"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                            >Teléfono del perito seguro</label
                          >
                          <input
                            id="ajustador_telefono"
                            v-model="form.ajustador_telefono"
                            type="text"
                            maxlength="15"
                            :disabled="readOnly"
                            class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="activeTab === 'inspeccion'" class="p-4">
                  <h5 class="mb-2 font-semibold dark:text-white">
                    <span class="inline-flex items-center gap-2">
                      <FileCheck
                        class="w-6 h-6 text-gray-800 dark:text-white"
                      />
                      Inventario
                    </span>
                  </h5>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Registra los accesorios y objetos presentes en el vehículo
                    al momento de la recepción.
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Elementos Exteriores / Mecánicos
                      </p>
                      <div class="space-y-2">
                        <label
                          v-for="field in [
                            {
                              key: 'tiene_espejo_izquierdo',
                              label: 'Espejo Izquierdo',
                            },
                            {
                              key: 'tiene_espejo_derecho',
                              label: 'Espejo Derecho',
                            },
                            {
                              key: 'tiene_vidrios',
                              label: 'Vidrios / Cristales',
                            },
                            {
                              key: 'tiene_faros_lunas',
                              label: 'Faros / Lunas',
                            },
                            {
                              key: 'tiene_tapa_gasolina',
                              label: 'Tapa de Gasolina',
                            },
                            {
                              key: 'tiene_placas',
                              label: 'Placas de Circulación',
                            },
                          ]"
                          :key="field.key"
                          class="flex items-center"
                        >
                          <input
                            v-model="form[field.key]"
                            type="checkbox"
                            :disabled="readOnly"
                            class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span
                            class="ml-2 text-sm text-gray-900 dark:text-white"
                            >{{ field.label }}</span
                          >
                        </label>
                      </div>
                    </div>

                    <div>
                      <p
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Interiores / Confort
                      </p>
                      <div class="space-y-2">
                        <label
                          v-for="field in [
                            { key: 'tiene_radio', label: 'Radio / Mascarilla' },
                            {
                              key: 'tiene_pantalla',
                              label: 'Pantalla / Multimedia',
                            },
                            { key: 'tiene_encendedor', label: 'Encendedor' },
                            {
                              key: 'tiene_control_puertas',
                              label: 'Control de Puertas',
                            },
                            {
                              key: 'tiene_cargador_celular',
                              label: 'Cargador de Celular',
                            },
                            {
                              key: 'tiene_tapetes',
                              label: 'Tapetes / Alfombras',
                            },
                            { key: 'tiene_cubresol', label: 'Cubresol' },
                          ]"
                          :key="field.key"
                          class="flex items-center"
                        >
                          <input
                            v-model="form[field.key]"
                            type="checkbox"
                            :disabled="readOnly"
                            class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span
                            class="ml-2 text-sm text-gray-900 dark:text-white"
                            >{{ field.label }}</span
                          >
                        </label>
                      </div>
                    </div>

                    <div>
                      <p
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Seguridad y Emergencia
                      </p>
                      <div class="space-y-2">
                        <label
                          v-for="field in [
                            {
                              key: 'tiene_llanta_repuesto',
                              label: 'Llanta de Repuesto',
                            },
                            {
                              key: 'tiene_gata_palanca',
                              label: 'Gata y Palanca',
                            },
                            {
                              key: 'tiene_herramientas',
                              label: 'Juego de Herramientas',
                            },
                            { key: 'tiene_extintor', label: 'Extintor' },
                            { key: 'tiene_botiquin', label: 'Botiquín' },
                            {
                              key: 'tiene_triangulos',
                              label: 'Triángulos de Seguridad',
                            },
                            {
                              key: 'tiene_llave_tuercas',
                              label: 'Llave de Tuercas',
                            },
                          ]"
                          :key="field.key"
                          class="flex items-center"
                        >
                          <input
                            v-model="form[field.key]"
                            type="checkbox"
                            :disabled="readOnly"
                            class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span
                            class="ml-2 text-sm text-gray-900 dark:text-white"
                            >{{ field.label }}</span
                          >
                        </label>
                      </div>
                    </div>
                  </div>

                  <hr class="my-6 border-gray-200 dark:border-gray-700" />

                  <h5 class="mb-2 font-semibold dark:text-white">
                    <span class="inline-flex items-center gap-2">
                      <TriangleAlert
                        class="w-6 h-6 text-gray-800 dark:text-white"
                      />
                      Testigos luminosos
                    </span>
                  </h5>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Señala los testigos con problemas, daños o averías que se
                    encuentren encendidos en el tablero del vehículo.
                  </p>
                  <TestigosTablero v-model="testigos" :disabled="readOnly" />

                  <hr class="my-6 border-gray-200 dark:border-gray-700" />

                  <h5 class="mb-2 mt-4 font-semibold dark:text-white">
                    <span class="inline-flex items-center gap-2">
                      <FileSearch
                        class="w-6 h-6 text-gray-800 dark:text-white"
                      />
                      Inspección Física
                    </span>
                  </h5>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Marca sobre el diagrama la ubicación de daños en el
                    vehículo, como rayones, golpes u otros detalles, y describe
                    cada uno.
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-1">
                      <p
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Marcación de Daños (Clic en el diagrama)
                      </p>
                      <p
                        v-if="blueprintError"
                        class="mb-2 text-sm text-red-600 dark:text-red-500"
                      >
                        {{ blueprintError }}
                      </p>
                      <div
                        class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden"
                      >
                        <button
                          v-if="!readOnly && form.vehiculo && marcas.length"
                          type="button"
                          title="Limpiar marcaciones"
                          class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20"
                          @click="clearMarcas"
                        >
                          <BrushCleaning class="w-4 h-4" />
                        </button>
                        <div
                          v-if="!form.vehiculo"
                          class="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400"
                        >
                          Selecciona un vehículo para cargar el diagrama.
                        </div>
                        <div v-else class="relative" style="aspect-ratio: 4/3">
                          <img
                            v-if="blueprintImageUrl"
                            :src="blueprintImageUrl"
                            class="absolute inset-0 w-full h-full object-contain"
                            @click="onBlueprintClick"
                          />
                          <div class="absolute inset-0 pointer-events-none">
                            <span
                              v-for="(punto, idx) in marcas"
                              :key="punto.id"
                              class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full -translate-x-1/2 -translate-y-1/2"
                              :style="{
                                left: punto.x + '%',
                                top: punto.y + '%',
                              }"
                            >
                              {{ idx + 1 }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="col-span-1">
                      <label
                        for="detalles_carroceria"
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >Detalles</label
                      >
                      <div class="mt-2 space-y-2">
                        <div
                          v-for="(punto, idx) in marcas"
                          :key="punto.id"
                          class="flex items-start gap-2"
                        >
                          <span
                            class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full mt-1"
                            >{{ idx + 1 }}</span
                          >
                          <div class="flex-1">
                            <input
                              :value="punto.descripcion"
                              @input="
                                sanitizeDetalleCarroceria(
                                  punto,
                                  $event.target.value,
                                )
                              "
                              :disabled="readOnly"
                              type="text"
                              :name="`detalle_carroceria_${punto.id}`"
                              placeholder="Descripción del daño..."
                              maxlength="80"
                              :class="[
                                'block w-full p-2 text-sm bg-white border rounded-lg dark:bg-gray-700 dark:text-white',
                                detallesErrors[idx]
                                  ? 'border-red-500 text-red-900 dark:text-red-500 dark:border-red-500'
                                  : 'border-gray-300 dark:border-gray-600',
                              ]"
                            />
                            <p
                              v-if="detallesErrors[idx]"
                              class="mt-1 text-sm text-red-600 dark:text-red-500"
                            >
                              {{ detallesErrors[idx] }}
                            </p>
                          </div>
                          <button
                            v-if="!readOnly"
                            type="button"
                            class="inline-flex items-center justify-center w-8 h-8 text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20 mt-1"
                            @click="
                              marcas = marcas.filter((m) => m.id !== punto.id)
                            "
                          >
                            <Trash2
                              class="w-5 h-5 text-red-700 dark:text-red-400"
                            />
                          </button>
                        </div>
                      </div>
                      <textarea
                        id="detalles_carroceria"
                        v-model="form.detalles_carroceria"
                        hidden
                        rows="8"
                        placeholder="Describe golpes, rayones o estado de pintura..."
                        class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div v-show="activeTab === 'evidencias'" class="p-4">
                  <h5 class="mb-1 font-semibold dark:text-white">
                    <span class="inline-flex items-center gap-2">
                      <Camera class="w-6 h-6 text-gray-800 dark:text-white" />
                      Evidencia Fotográfica
                    </span>
                  </h5>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Fotografías del estado actual del vehículo. Adjunta las 5
                    vistas requeridas del vehículo.
                  </p>

                  <div v-if="formErrors.fotos" class="mb-4">
                    <Alert type="error" :message="formErrors.fotos" />
                  </div>

                  <div class="mb-8">
                    <PhotoSlotGrid
                      ref="fotoGridRef"
                      :slots="FOTO_VISTAS"
                      :existing="fotosExisting"
                      :errors="fotoErrors"
                      :disabled="readOnly"
                      previewable
                      @change="onFotosChange"
                    />
                  </div>
                </div>

                <div v-show="activeTab === 'autorizacion'" class="p-4">
                  <h5 class="mb-4 font-semibold dark:text-white">
                    <span class="inline-flex items-center gap-2">
                      <Signature
                        class="w-6 h-6 text-gray-800 dark:text-white"
                      />
                      Firma y Aceptación
                    </span>
                  </h5>

                  <div class="max-w-2xl">
                    <p
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Firma del Cliente
                    </p>
                    <div
                      v-if="form.fecha_firma_cliente"
                      class="mb-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Firmado el
                      {{ formatFechaFirma(form.fecha_firma_cliente) }}
                    </div>
                    <div
                      class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden"
                    >
                      <canvas
                        ref="firmaClienteCanvas"
                        width="400"
                        height="100"
                        class="w-full h-auto bg-white touch-none"
                        @pointerdown="onClientePointerDown"
                        @pointermove="onClientePointerMove"
                        @pointerup="onClientePointerUp"
                        @pointerleave="onClientePointerUp"
                      ></canvas>
                      <button
                        v-if="!readOnly"
                        type="button"
                        title="Borrar firma"
                        class="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20"
                        @click="borrarFirmaCliente"
                      >
                        <BrushCleaning class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div class="mt-4">
                    <label class="flex items-center gap-2">
                      <input
                        v-model="form.aceptacion_condiciones"
                        type="checkbox"
                        :disabled="
                          readOnly ||
                          (isEditMode && form.estado !== 'PENDIENTE')
                        "
                        class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        El cliente acepta las condiciones de recepción y el
                        estado reportado del vehículo.
                      </span>
                    </label>
                    <p
                      v-if="isEditMode && form.estado !== 'PENDIENTE'"
                      class="mt-1 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Esta opción no se puede modificar una vez creada la
                      recepción.
                    </p>
                  </div>

                  <div
                    class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4"
                  >
                    <div
                      class="p-4 bg-yellow-50 border border-yellow-300 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-500"
                    >
                      <p
                        class="mb-2 text-sm font-medium text-yellow-900 dark:text-yellow-200"
                      >
                        El cliente no firmará la recepción. Registra el motivo y
                        guarda para dejar la recepción como "No Aceptada / Sin
                        Firma".
                      </p>
                      <textarea
                        id="motivo_no_recepcion"
                        v-model="form.motivo_no_recepcion"
                        rows="2"
                        maxlength="500"
                        :disabled="readOnly"
                        placeholder="Registra el motivo por el cual el cliente no aceptó las condiciones o no dejó el vehículo..."
                        :class="[
                          'block w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 dark:bg-gray-700 dark:text-white',
                          formErrors.motivo_no_recepcion
                            ? 'bg-yellow-50 border-yellow-500 text-yellow-900 dark:bg-gray-700 dark:text-yellow-500 dark:border-yellow-500'
                            : '',
                        ]"
                      ></textarea>
                      <p
                        v-if="formErrors.motivo_no_recepcion"
                        class="mt-2 text-sm text-yellow-600 dark:text-yellow-500"
                      >
                        {{ formErrors.motivo_no_recepcion }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-1 md:col-span-4">
              <div
                class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <button
                  type="button"
                  class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="activeTabIndex <= 0"
                  @click="goToTab(-1)"
                >
                  <svg
                    class="w-6 h-6 text-gray-800 dark:text-white"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 12h14M5 12l4-4m-4 4 4 4"
                    />
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
                  <svg
                    class="w-6 h-6 text-gray-800 dark:text-white ml-1"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 12H5m14 0-4 4m4-4-4-4"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div class="lg:col-span-1 space-y-4">
        <div
          class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <ClipboardList class="w-5 h-5 text-gray-900 dark:text-gray-900" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
              Resumen de recepción
            </h2>
          </div>
          <dl class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">
                Cliente
              </dt>
              <dd class="font-medium text-sm text-black dark:text-white">
                {{ form.cliente?.nombre || "—" }}
              </dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">
                Vehículo
              </dt>
              <dd class="font-medium text-sm text-black dark:text-white">
                {{ formatPlaca(form.vehiculo?.placa) || "—" }}
              </dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">Tipo</dt>
              <dd class="font-medium text-sm text-black dark:text-white">
                {{ tipoRecepcionLabel }}
              </dd>
            </div>
            <div>
              <dt class="font-medium text-gray-700 dark:text-gray-300">
                Estado
              </dt>
              <dd>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="estadoRecepcionBadge.classes"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="estadoRecepcionBadge.dot"
                  ></span>
                  {{ estadoRecepcionBadge.label }}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <Car class="w-5 h-5 text-gray-900 dark:text-gray-900" />
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Vehículo</h2>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-if="vehiculoImagenSrc"
              class="h-full min-h-40 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              <img
                :src="vehiculoImagenSrc"
                alt="Foto del vehículo"
                class="h-full w-full object-contain"
              />
            </div>
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
                    <IconEngine
                      class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400"
                      stroke-width="1.8"
                    />
                    N° Motor:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">
                  {{ form.vehiculo?.numero_motor || "—" }}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5">
                    <component
                      :is="transmisionIcon"
                      class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400"
                      stroke-width="1.8"
                    />
                    Transmisión:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">
                  {{ transmisionLabel || "—" }}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-gray-700 dark:text-gray-300">
                  <span class="inline-flex items-center gap-1.5">
                    <IconGasStation
                      class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-400"
                      stroke-width="1.8"
                    />
                    Combustible:
                  </span>
                </dt>
                <dd class="font-medium text-sm text-black dark:text-white">
                  {{ combustibleLabel || "—" }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showContradiccionModal"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
  >
    <div
      class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800"
    >
      <div
        class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
      >
        <h3
          class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          <CircleAlert class="w-6 h-6 text-yellow-500" />
          ¿El cliente se retractó?
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="showContradiccionModal = false"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Hay firma y aceptación del cliente, pero también un motivo de no
          aceptación.
        </p>
        <p
          class="mt-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400"
        >
          Si continúas se guardará como "No Aceptada / Sin Firma" y se
          descartará la aceptación registrada.
        </p>
      </div>
      <div
        class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700"
      >
        <button
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          @click="showContradiccionModal = false"
        >
          <X class="w-5 h-5 mr-1.5 -ml-1 text-gray-500 dark:text-gray-300" />
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
          @click="confirmarGuardadoNoAceptada"
        >
          <CheckCircle2 class="w-5 h-5 mr-1.5 -ml-1" />
          Confirmar no aceptación
        </button>
      </div>
    </div>
  </div>

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientReactivated"
  />
</template>
