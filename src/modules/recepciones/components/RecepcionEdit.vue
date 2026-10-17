<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from "vue";
import { IconClipboardSearch, IconReportSearch } from "@tabler/icons-vue";

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
  Tag,
  Users,
  ClipboardList,
  Search,
  ShieldCheck,
  IdCardIcon,
  TagIcon,
  EvCharger,
  Shapes,
  PaintBucket,
  NotebookPen,
  Notebook,
  Trash2,
  Car,
  Workflow,
  Check,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  ShieldPlus,
  ListChecks,
  CalendarClock,
  Wrench,
  Armchair,
  LifeBuoy,
  MapPin,
  PenLine,
  UserX,
  Truck,
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
import EstadoRecepcionBadge from "./EstadoRecepcionBadge.vue";
import EntityHeader from "../../../shared/components/EntityHeader.vue";
import {
  TIPOS_TRABAJO_OPCIONES,
  getTipoTrabajoLabel,
  normalizarTipoTrabajo,
} from "../../../shared/config/tiposTrabajo";
import FormSaveActions from "../../../shared/components/FormSaveActions.vue";
import ConfirmModal from "../../../shared/components/ConfirmModal.vue";
import { inspeccionesService } from "../../inspecciones/services/inspeccionesService";
// FlowSteps temporalmente desactivado; conservar para reactivarlo más adelante.
// import FlowSteps from "../../../shared/components/FlowSteps.vue";
// import { buildPasosFlujo } from "../../../shared/utils/estadoFlujo";
import TestigosTablero from "../../../shared/components/TestigosTablero.vue";
import PhotoSlotGrid from "../../../shared/components/PhotoSlotGrid.vue";
import ClientModal from "../../clientes/components/ClientModal.vue";
import TextImprover from "../../../shared/components/TextImprover.vue";
import ClienteSearchSelect from "../../../shared/components/ClienteSearchSelect.vue";
import VehiculoSearchSelect from "../../../shared/components/VehiculoSearchSelect.vue";
import EmpleadoSearchSelect from "../../../shared/components/EmpleadoSearchSelect.vue";
import RelacionesFlujoEdit from "../../../shared/components/RelacionesFlujoEdit.vue";
import RelacionesFlujo from "../../../shared/components/RelacionesFlujo.vue";
import { relacionesDeRecepcion } from "../../../shared/utils/relacionesFlujo";
import TallerSelect from "../../../shared/components/TallerSelect.vue";
import { useSucursalDocumento } from "../../../shared/composables/useSucursalDocumento";

const {
  tallerId: tallerSucursalId,
  error: tallerSucursalError,
  mostrar: mostrarSucursal,
  sucursal: sucursalDocumento,
  cargarSucursal,
  validar: validarSucursal,
  limpiarError: limpiarErrorSucursal,
} = useSucursalDocumento();

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
const relacionesRecepcion = ref({ cita: [], inspeccion: [], cotizacion: [], orden: [] });
const puedeAgregarRelacion = ref({ cita: true, inspeccion: true, cotizacion: true, orden: true });
const relacionesCargadas = ref(false);
const recepcionData = ref(null);
const pasosRelaciones = computed(() => relacionesDeRecepcion(recepcionData.value || {}));
const tallerSucursalNombre = computed(() => recepcionData.value?.sucursal_nombre || "");

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
  tipo_recepcion: "MANTENIMIENTO",
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
const blueprintImageUrl = ref("");
const marcas = ref([]);
const detallesSyncVersion = ref(0);
const blueprintError = ref("");
const detallesErrors = ref({});
const activeTab = ref("informacion");
const TAB_ORDER = ["informacion", "inspeccion", "evidencias", "autorizacion"];
const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

const tituloPagina = computed(() => (isEditMode ? "Editar recepción" : "Nueva recepción"));

const breadcrumb = computed(() => [
  { label: "Inicio", href: "/" },
  { label: "Recepciones", href: "/crud/recepciones/" },
  { label: tituloPagina.value },
]);

/* FlowSteps temporalmente desactivado; conservar la lógica para reactivarla.
const pasosFlujo = computed(() => {
  const estado = form.estado || "PENDIENTE";
  const inspecciones = Array.isArray(form.inspecciones) ? form.inspecciones : [];
  const inspeccion = inspecciones[0] || null;
  const cotizaciones = Array.isArray(form.cotizaciones_generadas) ? form.cotizaciones_generadas : [];
  const cotizacion = cotizaciones[cotizaciones.length - 1] || null;
  return buildPasosFlujo([
    {
      entidad: "recepcion",
      estado,
      estadoDisplay: form.estado_display,
      id: form.id,
      numero: form.numero_recepcion,
    },
    {
      entidad: "inspeccion",
      estado: inspeccion?.estado,
      estadoDisplay: inspeccion?.estado_display,
      id: inspeccion?.id,
      numero: inspeccion?.numero_inspeccion,
    },
    {
      entidad: "cotizacion",
      estado: cotizacion?.estado || (cotizacion ? "PENDIENTE" : null),
      estadoDisplay: cotizacion?.estado_display,
      id: cotizacion?.id,
      numero: cotizacion?.numero_cotizacion,
    },
    {
      entidad: "orden",
      estado: form.orden_trabajo_estado,
      estadoDisplay: form.orden_trabajo_estado_display,
      id: form.orden_trabajo,
      numero: form.orden_trabajo_numero,
    },
  ]);
});
*/

function goToTab(direction) {
  const next = activeTabIndex.value + direction;
  if (next >= 0 && next < TAB_ORDER.length) {
    irAPaso(TAB_ORDER[next]);
  }
}

// Cambia de paso y lleva la vista al inicio del formulario (los pasos son largos).
const pasosRef = ref(null);
function irAPaso(key) {
  activeTab.value = key;
  nextTick(() => {
    const el = pasosRef.value;
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const PASOS = [
  { key: "informacion", label: "Ingreso", icon: Notebook },
  { key: "inspeccion", label: "Revisión", icon: IconClipboardSearch },
  { key: "evidencias", label: "Evidencias", icon: Camera },
  { key: "autorizacion", label: "Autorización", icon: NotebookPen },
];

// Estilos compartidos con los modales de vehículo y cliente.
const SECCION =
  "p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700";
const TITULO_SECCION =
  "flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200";
const BASE_INPUT =
  "block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-70";
const INPUT_OK =
  "bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white dark:focus:ring-brand-500/40 dark:focus:border-brand-300";
const INPUT_ERROR =
  "bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500 dark:placeholder-red-400";

function inputClass(campo, extra = "") {
  return [BASE_INPUT, campo && formErrors.value[campo] ? INPUT_ERROR : INPUT_OK, extra];
}

// Casilla presentada como ficha seleccionable (inventario, pertenencias).
function fichaClass(activa) {
  return [
    "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg border transition-colors select-none",
    readOnly.value ? "cursor-default" : "cursor-pointer",
    activa
      ? "bg-brand-50 border-brand-500 text-brand-900 dark:bg-brand-700/30 dark:border-brand-300 dark:text-white"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
  ];
}

function marcaFichaClass(activa) {
  return [
    "inline-flex items-center justify-center w-4 h-4 shrink-0 rounded border",
    activa
      ? "bg-brand-900 border-brand-900 text-white dark:bg-brand-300 dark:border-brand-300 dark:text-brand-900"
      : "bg-white border-gray-300 text-transparent dark:bg-gray-700 dark:border-gray-500",
  ];
}

const INVENTARIO = [
  {
    titulo: "Exteriores",
    icon: Car,
    campos: [
      { key: "tiene_espejo_izquierdo", label: "Espejo izquierdo" },
      { key: "tiene_espejo_derecho", label: "Espejo derecho" },
      { key: "tiene_vidrios", label: "Vidrios / Cristales" },
      { key: "tiene_faros_lunas", label: "Faros / Lunas" },
      { key: "tiene_tapa_gasolina", label: "Tapa de gasolina" },
      { key: "tiene_placas", label: "Placas de circulación" },
    ],
  },
  {
    titulo: "Interiores",
    icon: Armchair,
    campos: [
      { key: "tiene_radio", label: "Radio / Mascarilla" },
      { key: "tiene_pantalla", label: "Pantalla / Multimedia" },
      { key: "tiene_encendedor", label: "Encendedor" },
      { key: "tiene_control_puertas", label: "Control de puertas" },
      { key: "tiene_cargador_celular", label: "Cargador de celular" },
      { key: "tiene_tapetes", label: "Tapetes / Alfombras" },
      { key: "tiene_cubresol", label: "Cubresol" },
    ],
  },
  {
    titulo: "Seguridad",
    icon: LifeBuoy,
    campos: [
      { key: "tiene_llanta_repuesto", label: "Llanta de repuesto" },
      { key: "tiene_gata_palanca", label: "Gata y palanca" },
      { key: "tiene_herramientas", label: "Juego de herramientas" },
      { key: "tiene_extintor", label: "Extintor" },
      { key: "tiene_botiquin", label: "Botiquín" },
      { key: "tiene_triangulos", label: "Triángulos de seguridad" },
      { key: "tiene_llave_tuercas", label: "Llave de tuercas" },
    ],
  },
];
const TOTAL_INVENTARIO = INVENTARIO.reduce((n, g) => n + g.campos.length, 0);

function presentesEnGrupo(grupo) {
  return grupo.campos.filter((c) => form[c.key]).length;
}

// Marca todo el grupo; si ya estaba completo, lo desmarca.
function alternarGrupo(grupo) {
  if (readOnly.value) return;
  const completo = presentesEnGrupo(grupo) === grupo.campos.length;
  grupo.campos.forEach((c) => {
    form[c.key] = !completo;
  });
}

const inventarioPresente = computed(() =>
  INVENTARIO.reduce((n, g) => n + presentesEnGrupo(g), 0),
);

const testigosEncendidos = computed(
  () => Object.entries(testigos).filter(([k, v]) => k !== "otros_testigos_observaciones" && v === true).length,
);

const pertenenciasMarcadas = computed(() =>
  PERTENENCIAS.filter((p) => form[p.campo]).map((p) => p.label),
);

const OPCIONES_LLAVES = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3+" },
];

// Seguro / siniestro: se despliega solo cuando aplica.
const mostrarSeguro = ref(false);
const tieneDatosSeguro = computed(() =>
  ["compania_seguro", "numero_poliza", "numero_reclamo", "ajustador_nombre", "ajustador_telefono"].some(
    (k) => (form[k] || "").toString().trim() !== "",
  ),
);
watch(
  [() => form.tipo_recepcion, tieneDatosSeguro],
  ([tipo, conDatos]) => {
    if (tipo === "SINIESTRO" || conDatos) mostrarSeguro.value = true;
  },
  { immediate: true },
);

const TIPOS_DANO = ["Rayón", "Golpe", "Abolladura", "Quiebre", "Pintura", "Óxido"];
const PREFIJO_DANO = new RegExp(`^(${TIPOS_DANO.join("|")}):\\s*`);

function tipoDanoDe(punto) {
  const m = (punto.descripcion || "").match(PREFIJO_DANO);
  return m ? m[1] : "";
}

function aplicarTipoDano(punto, tipo) {
  if (readOnly.value) return;
  const resto = (punto.descripcion || "").replace(PREFIJO_DANO, "");
  sanitizeDetalleCarroceria(punto, `${tipo}: ${resto}`);
}

function quitarMarca(punto) {
  marcas.value = marcas.value.filter((m) => m.id !== punto.id);
  blueprintError.value = "";
}

const kmVehiculo = computed(() => {
  const km = form.vehiculo?.kilometraje_actual;
  return km == null || km === "" ? null : Number(km);
});

// Kilometraje con el que se guardó esta recepción: el del vehículo puede haber
// subido después por recepciones posteriores y no sirve para compararlo.
const kmGuardado = ref(null);
const kmConservado = computed(() => {
  const km = Number(String(form.kilometraje_ingreso ?? "").replace(/\D/g, ""));
  return isEditMode && kmGuardado.value != null && km === kmGuardado.value;
});

const kmDiferencia = computed(() => {
  const km = Number(String(form.kilometraje_ingreso ?? "").replace(/\D/g, ""));
  if (!km || kmVehiculo.value == null || kmConservado.value) return null;
  return km - kmVehiculo.value;
});

const kmDiferenciaTexto = computed(() => {
  const d = kmDiferencia.value;
  if (d == null) return "";
  const signo = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${signo}${formatMiles(Math.abs(d)) || "0"} km`;
});

const kmValido = computed(() => {
  const km = Number(String(form.kilometraje_ingreso ?? "").replace(/\D/g, ""));
  if (!km) return false;
  if (kmVehiculo.value == null || kmConservado.value) return true;
  return km > kmVehiculo.value || (isEditMode && km === kmVehiculo.value);
});

const fotosCargadas = computed(
  () => FOTO_VISTAS.filter((v) => fotosPresence.value[v.key]).length,
);

const danosSinDescribir = computed(
  () => marcas.value.filter((p) => !(p.descripcion || "").trim()).length,
);

const firmaCompleta = computed(
  () => !!firmaClienteData.value && !!form.aceptacion_condiciones,
);

// Decisión del cliente en la autorización: firma y acepta, o no acepta.
const motivoNoAceptacionGuardado = ref("");
const decisionCliente = computed(() => (esNoAceptada.value ? "no_acepta" : "firma"));

function elegirDecision(valor) {
  if (readOnly.value || valor === decisionCliente.value) return;
  if (valor === "no_acepta") {
    clienteNoFirma.value = true;
    if (!form.motivo_no_recepcion && motivoNoAceptacionGuardado.value) {
      form.motivo_no_recepcion = motivoNoAceptacionGuardado.value;
    }
  } else {
    clienteNoFirma.value = false;
    motivoNoAceptacionGuardado.value = form.motivo_no_recepcion || "";
    form.motivo_no_recepcion = "";
    if (formErrors.value.motivo_no_recepcion) {
      const { motivo_no_recepcion: _omit, ...resto } = formErrors.value;
      formErrors.value = resto;
    }
  }
}

// Requisitos para guardar, agrupados por paso (alimentan el avance lateral y el stepper).
const requisitos = computed(() => {
  const noAcepta = esNoAceptada.value;
  const lista = [
    {
      key: "partes",
      label: "Cliente, vehículo y asesor",
      ok: !!form.cliente && !!form.vehiculo && !!form.recibido_por,
      paso: null,
    },
  ];
  if (!noAcepta) {
    lista.push(
      { key: "km", label: "Kilometraje de ingreso", ok: kmValido.value, paso: "informacion" },
      { key: "motivo", label: "Motivo de ingreso", ok: !!(form.motivo_ingreso || "").trim(), paso: "informacion" },
    );
    if (form.ingreso_en_grua) {
      lista.push({ key: "grua", label: "Datos de la grúa", ok: !!(form.datos_grua || "").trim(), paso: "informacion" });
    }
    if (marcas.value.length) {
      lista.push({
        key: "danos",
        label: "Daños descritos",
        detalle: `${marcas.value.length - danosSinDescribir.value}/${marcas.value.length}`,
        ok: danosSinDescribir.value === 0,
        paso: "inspeccion",
      });
    }
    lista.push({
      key: "fotos",
      label: "Fotos del vehículo",
      detalle: `${fotosCargadas.value}/${FOTO_VISTAS.length}`,
      ok: fotosCargadas.value === FOTO_VISTAS.length,
      paso: "evidencias",
    });
    lista.push({ key: "firma", label: "Firma del cliente", ok: firmaCompleta.value, paso: "autorizacion" });
  } else {
    lista.push({
      key: "no_acepta",
      label: "Motivo de no aceptación",
      ok: !!(form.motivo_no_recepcion || "").trim(),
      paso: "autorizacion",
    });
  }
  return lista;
});

const requisitosCumplidos = computed(() => requisitos.value.filter((r) => r.ok).length);
const avancePorcentaje = computed(() =>
  Math.round((requisitosCumplidos.value / requisitos.value.length) * 100),
);

function irARequisito(req) {
  if (req.paso) {
    irAPaso(req.paso);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Revisión no tiene campos obligatorios: cuenta como completa cuando ya registra algo.
const revisionConDatos = computed(
  () => inventarioPresente.value > 0 || testigosEncendidos.value > 0 || marcas.value.length > 0,
)

const ETIQUETA_A_PASO = { Ingreso: "informacion", Revisión: "inspeccion", Evidencias: "evidencias", Autorización: "autorizacion" };

const estadoPasos = computed(() => {
  const conError = new Set(seccionesConErrores.value.map((s) => ETIQUETA_A_PASO[s]).filter(Boolean));
  const resultado = {};
  PASOS.forEach((paso) => {
    const propios = requisitos.value.filter((r) => r.paso === paso.key);
    let estado = "pendiente";
    if (conError.has(paso.key)) estado = "error";
    else if (propios.every((r) => r.ok) && (propios.length > 0 || (paso.key === "inspeccion" && revisionConDatos.value))) estado = "completo";
    resultado[paso.key] = estado;
  });
  return resultado;
});

const resumenPaso = computed(() => ({
  informacion: estadoPasos.value.informacion === "completo" ? "Datos completos" : "Kilometraje y motivo",
  inspeccion: marcas.value.length
    ? `${marcas.value.length} ${marcas.value.length === 1 ? "daño" : "daños"} marcados`
    : "Inventario y daños",
  evidencias: `${fotosCargadas.value}/${FOTO_VISTAS.length} fotos`,
  autorizacion: esNoAceptada.value ? "No aceptada" : firmaCompleta.value ? "Firmada" : "Pendiente de firma",
}));

function pasoCirculoClass(key) {
  const estado = estadoPasos.value[key];
  const activo = activeTab.value === key;
  if (estado === "error") return "bg-red-600 text-white dark:bg-red-500";
  if (estado === "completo") return "bg-brand-900 text-white dark:bg-brand-300 dark:text-brand-900";
  if (activo) return "bg-white border-2 border-brand-900 text-brand-900 dark:bg-gray-800 dark:border-brand-300 dark:text-brand-200";
  return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

const empleados = ref([]);
const recibidoPorSearch = ref("");
const asesorSeleccionado = ref(null);

const firmaClienteData = ref(null);
const firmaClienteCanvas = ref(null);
const isDrawingCliente = ref(false);
const clienteNoFirma = ref(false);
const showContradiccionModal = ref(false);

// Crear inspección desde la recepción (siguiente paso del flujo)
const showModalCrearInspeccion = ref(false);
const creandoInspeccion = ref(false);
const errorCrearInspeccion = ref("");

const inspeccionActual = computed(() => {
  const inspecciones = Array.isArray(form.inspecciones) ? form.inspecciones : [];
  return inspecciones[0] || null;
});
const cotizacionVigenteRecepcion = computed(() => {
  const cotizaciones = Array.isArray(form.cotizaciones_generadas)
    ? form.cotizaciones_generadas
    : [];
  return cotizaciones.find((item) => ["PENDIENTE", "ENVIADA", "ACEPTADA"].includes(item.estado)) || null;
});
const puedeCrearInspeccion = computed(
  () => isEditMode && !inspeccionActual.value && form.estado === "ACEPTADA" && !creandoInspeccion.value,
);

const mensajeCrearInspeccion = computed(() => {
  if (errorCrearInspeccion.value) return errorCrearInspeccion.value;
  const base = `Se generará la inspección de la recepción ${form.numero_recepcion || ""} con el cliente y el vehículo ya registrados.`;
  if (cotizacionVigenteRecepcion.value) {
    return `${base} Además se copiarán los servicios y repuestos cotizados en ${cotizacionVigenteRecepcion.value.numero_cotizacion}.`;
  }
  return `${base} Se creará sin ítems: puedes agregarlos o generar la cotización desde la inspección.`;
});

async function confirmarCrearInspeccion() {
  if (creandoInspeccion.value || !form.id) return;
  creandoInspeccion.value = true;
  errorCrearInspeccion.value = "";
  try {
    const inspeccion = await inspeccionesService.crearDesdeRecepcion(form.id);
    if (inspeccion?.id) {
      showModalCrearInspeccion.value = false;
      window.location.assign(
        `/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}&creada=1`,
      );
      return;
    }
    errorCrearInspeccion.value = "No se pudo crear la inspección. Intenta nuevamente.";
  } catch (error) {
    errorCrearInspeccion.value = error?.message || "No se pudo crear la inspección.";
  } finally {
    creandoInspeccion.value = false;
  }
}

function abrirModalCrearInspeccion() {
  errorCrearInspeccion.value = "";
  showModalCrearInspeccion.value = true;
}

function cancelarCrearInspeccion() {
  showModalCrearInspeccion.value = false;
  errorCrearInspeccion.value = "";
}

const esNoAceptada = computed(
  () => clienteNoFirma.value || (form.motivo_no_recepcion || "").trim() !== "",
);

const mensajeModoLectura = computed(() =>
  form.estado === "NO_ACEPTADA"
    ? "Esta recepción quedó registrada como 'No Aceptada / Sin Firma'; solo puedes consultarla."
    : "Esta recepción ya fue aceptada y firmada por el cliente; solo puedes consultarla.",
);

const tipoRecepcionLabel = computed(() => getTipoTrabajoLabel(form.tipo_recepcion));

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
  { key: "FRONTAL", label: "Vista Frontal", required: true },
  { key: "LATERAL_IZQ", label: "Lateral Izquierda", required: true },
  { key: "LATERAL_DER", label: "Lateral Derecha", required: true },
  { key: "POSTERIOR", label: "Posterior", required: true },
  { key: "TABLERO", label: "Tablero", required: true },
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

function nombreEmpleado(empleado) {
  const user = empleado?.user || {};
  const nombre = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return nombre || user.username || "";
}

const asesorInfo = computed(() => {
  if (asesorSeleccionado.value) return asesorSeleccionado.value;
  return {
    user: {},
    rol: form.recibido_por_rol || "",
    rol_display: form.recibido_por_rol_display || form.recibido_por_rol || "",
  };
});

watch([empleados, () => form.recibido_por], ([lista, recibidoPorId]) => {
  if (!recibidoPorId) {
    asesorSeleccionado.value = null;
    return;
  }
  const encontrado =
    lista.find((empleado) => String(empleado.user?.id) === String(recibidoPorId)) || null;
  asesorSeleccionado.value = encontrado;
  if (encontrado) {
    recibidoPorSearch.value = nombreEmpleado(encontrado);
  }
});

async function loadEmpleados() {
  try {
    const data = await request("/api/auth/empleados/?page=1&page_size=100");
    empleados.value = Array.isArray(data?.results) ? data.results : [];
    if (empleados.value.length > 0 && !form.recibido_por) {
      selectEmpleado(empleados.value[0]);
    }
  } catch (error) {
    console.error("No se pudieron cargar empleados:", error);
  }
}

function selectEmpleado(empleado) {
  asesorSeleccionado.value = empleado || null;
  form.recibido_por = empleado?.user?.id || null;
  recibidoPorSearch.value = nombreEmpleado(empleado);
}

function clearEmpleado() {
  asesorSeleccionado.value = null;
  form.recibido_por = null;
  recibidoPorSearch.value = "";
}

async function loadRecepcion() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await recepcionesService.getById(recepcionId);
    if (data) {
      recepcionData.value = data;
      const esEstadoFinal =
        (data.aceptacion_condiciones && data.fecha_firma_cliente) ||
        data.estado === "NO_ACEPTADA";
      if (esEstadoFinal) {
        readOnly.value = true;
      }
      Object.assign(form, {
        ...data,
        cliente: data.cliente || null,
        vehiculo: data.vehiculo || null,
        tipo_recepcion: normalizarTipoTrabajo(data.tipo_recepcion) || "MANTENIMIENTO",
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
      kmGuardado.value =
        data.kilometraje_ingreso != null ? Number(data.kilometraje_ingreso) : null;
      cargarSucursal(data.sucursal);
      await cargarRelacionesRecepcion(data.id);
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
        // El formulario aún no está montado: la presencia sale de las fotos guardadas.
        fotosPresence.value = Object.fromEntries(
          FOTO_VISTAS.map((v) => [v.key, Boolean(existing[v.key])]),
        );
      } else {
        fotosExisting.value = {};
      }
      await nextTick();
      onFotosChange();
      const descripciones = parseDetallesCarroceria(data.detalles_carroceria);
      // Las marcas guardadas vuelven al diagrama; sin ellas, al guardar se perdían.
      const puntosGuardados = Array.isArray(data.datos_danos_carroceria)
        ? data.datos_danos_carroceria.filter((p) => p && p.x != null && p.y != null)
        : [];
      if (puntosGuardados.length > 0) {
        marcas.value = puntosGuardados.map((p, idx) => ({
          id: p.id || `${Date.now()}-${idx}`,
          x: Number(p.x),
          y: Number(p.y),
          descripcion: p.descripcion || descripciones[idx] || "",
        }));
      } else if (descripciones.length > 0) {
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
            // Conserva la proporción de firmas guardadas con otro tamaño de lienzo.
            const escala = Math.min(canvas.width / img.width, canvas.height / img.height);
            const ancho = img.width * escala;
            const alto = img.height * escala;
            ctx.drawImage(img, (canvas.width - ancho) / 2, (canvas.height - alto) / 2, ancho, alto);
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

async function cargarRelacionesRecepcion(id = recepcionId) {
  relacionesCargadas.value = false;
  if (!id) {
    relacionesRecepcion.value = { cita: [], inspeccion: [], cotizacion: [], orden: [] };
    return;
  }
  try {
    const data = await recepcionesService.listarRelaciones(id);
    relacionesRecepcion.value = data?.relaciones || { cita: [], inspeccion: [], cotizacion: [], orden: [] };
    puedeAgregarRelacion.value = data?.puede_agregar || { cita: true, inspeccion: true, cotizacion: true, orden: true };
    relacionesCargadas.value = true;
  } catch (error) {
    relacionesRecepcion.value = { cita: [], inspeccion: [], cotizacion: [], orden: [] };
    errorMessage.value = error.message || 'No se pudieron cargar las relaciones de flujo.';
  }
}

function vincularRelacion({ tipo, id }) {
  return recepcionesService.actualizarRelacion(recepcionId, { tipo, id, accion: 'vincular' });
}

function desvincularRelacion({ tipo, id }) {
  return recepcionesService.actualizarRelacion(recepcionId, { tipo, id, accion: 'desvincular' });
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
        const conservarKmEnEdicion =
          isEditMode && (km === kmVehiculo || km === kmGuardado.value);
        if (!conservarKmEnEdicion && km <= kmVehiculo) {
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

  if (!validarSucursal()) {
    errorMessage.value = tallerSucursalError.value;
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
      sucursal: sucursalDocumento.value,
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
      // Solo una firma recién dibujada (data URL); la guardada llega como URL
      // del archivo y no se reenvía.
      firma_cliente: esNoAceptada.value
        ? null
        : String(firmaClienteData.value || '').startsWith('data:')
          ? firmaClienteData.value
          : undefined,
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
  <EntityHeader
    :breadcrumb="breadcrumb"
    entity="Recepción"
    :title="tituloPagina"
    :record-number="form.numero_recepcion"
    :mode="isEditMode ? 'edit' : 'create'"
  >
    <template #badges>
      <EstadoRecepcionBadge
        v-if="isEditMode"
        :estado="form.estado"
        :estado-display="form.estado_display"
        size="md"
      />
    </template>
    <template #actions>
      <!--button
        v-if="puedeCrearInspeccion"
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4 text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800"
        title="Crear Inspección"
        @click="abrirModalCrearInspeccion">
        <Loader2 v-if="creandoInspeccion" class="w-4 h-4 animate-spin" />
        <IconReportSearch v-else class="w-5 h-5" />
        Crear Inspección
      </button-->
      <FormSaveActions
        v-if="!readOnly"
        :is-loading="isSaving"
        :is-edit-mode="isEditMode"
        :disabled="readOnly"
        cancel-href="/crud/recepciones/"
        :on-submit="submit"/>
    </template>
  </EntityHeader>
  <!-- FlowSteps temporalmente desactivado.
  <div class="relative mx-auto max-w-6xl p-4 rounded-lg">
    <FlowSteps :steps="pasosFlujo" />
  </div>
  -->

  <div class="px-4 pt-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="readOnly"
          type="info"
          title="Solo lectura"
          :message="mensajeModoLectura"
        />

        <!-- Cliente, vehículo y asesor -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-4']">
            <Users class="w-4 h-4" />
            Cliente y vehículo
          </h4>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr_1fr]">
            <div>
              <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente <span class="text-accent-500">*</span></label>
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
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_identificacion || "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_telefono || "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail class="w-3.5 h-3.5 shrink-0" />
                  <dt>Correo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.cliente_email || "—" }}</dd>
                </div>
              </dl>
            </div>

            <div class="relative">
              <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Vehículo <span class="text-accent-500">*</span></label>
              <VehiculoSearchSelect
                id="vehiculo"
                v-model="vehiculoSearch"
                :cliente-id="form.cliente?.id || null"
                :disabled="readOnly || !form.cliente"
                :placeholder="form.cliente ? 'Buscar placa...' : 'Selecciona un cliente primero'"
                class="relative"
                @select="selectVehiculo"
              />
              <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TagIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Marca:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo ? form.vehiculo.marca : "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Shapes class="w-3.5 h-3.5 shrink-0" />
                  <dt>Modelo:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo ? form.vehiculo.modelo : "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PaintBucket class="w-3.5 h-3.5 shrink-0" />
                  <dt>Color:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ form.vehiculo_color || "—" }}</dd>
                </div>
              </dl>
            </div>

            <div class="relative">
              <label for="asesor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Asesor <span class="text-accent-500">*</span></label>
              <EmpleadoSearchSelect
                id="asesor"
                v-model="recibidoPorSearch"
                placeholder="Buscar asesor..."
                :error="Boolean(formErrors.recibido_por)"
                :error-message="formErrors.recibido_por"
                :disabled="readOnly"
                @select="selectEmpleado"
                @clear="clearEmpleado"
              />
              <dl class="mt-3 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <IdCardIcon class="w-3.5 h-3.5 shrink-0" />
                  <dt>Identificación:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorInfo.user?.identificacion || "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <dt>Teléfono:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorInfo.user?.telefono || "—" }}</dd>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
                  <dt>Rol:</dt>
                  <dd class="truncate font-semibold text-gray-900 dark:text-white">{{ asesorInfo.rol_display || asesorInfo.rol || "—" }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div v-if="mostrarSucursal" class="mt-4 max-w-sm">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Taller emisor <span class="text-accent-500">*</span>
            </label>
            <TallerSelect
              v-model="tallerSucursalId"
              variante="campo"
              :nombre="tallerSucursalNombre"
              :invalid="Boolean(tallerSucursalError)"
              :disabled="readOnly"
              placeholder="Selecciona el taller"
              @change="limpiarErrorSucursal"
            />
            <p v-if="tallerSucursalError" class="mt-2 text-sm text-red-600 dark:text-red-500">
              {{ tallerSucursalError }}
            </p>
          </div>
        </section>

        <div class="bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <div v-if="isLoading" class="p-4 text-sm text-gray-500 dark:text-gray-400">
            Cargando recepción...
          </div>
          <form
            v-else-if="!savedError"
            novalidate
            @submit.prevent="submit">
            <!-- Pasos -->
            <nav ref="pasosRef" aria-label="Pasos de la recepción" class="scroll-mt-20 border-b border-gray-200 dark:border-gray-700">
              <ol class="grid grid-cols-4">
                <li v-for="(paso, index) in PASOS" :key="paso.key">
                  <button
                    type="button"
                    class="flex w-full h-full flex-col items-center gap-1.5 px-2 py-3 -mb-px text-center border-b-2 transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
                    :class="
                      activeTab === paso.key
                        ? 'border-brand-900 bg-brand-50/50 dark:border-brand-300 dark:bg-gray-700/40'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    "
                    :aria-current="activeTab === paso.key ? 'step' : undefined"
                    @click="irAPaso(paso.key)"
                  >
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-sm font-semibold"
                      :class="pasoCirculoClass(paso.key)"
                    >
                      <Check v-if="estadoPasos[paso.key] === 'completo'" class="w-4 h-4" />
                      <CircleAlert v-else-if="estadoPasos[paso.key] === 'error'" class="w-4 h-4" />
                      <template v-else>{{ index + 1 }}</template>
                    </span>
                    <span class="min-w-0">
                      <span
                        class="block text-xs font-semibold sm:text-sm"
                        :class="activeTab === paso.key ? 'text-brand-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'"
                      >
                        {{ paso.label }}
                      </span>
                      <span
                        class="hidden text-xs truncate sm:block"
                        :class="estadoPasos[paso.key] === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'"
                      >
                        {{ estadoPasos[paso.key] === "error" ? "Revisa los campos" : resumenPaso[paso.key] }}
                      </span>
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
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label for="fecha_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Fecha de ingreso <span class="text-accent-500">*</span>
                      </label>
                      <input id="fecha_ingreso" v-model="form.fecha_ingreso" type="datetime-local" :disabled="readOnly" :class="inputClass('fecha_ingreso')" />
                      <p v-if="formErrors.fecha_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_ingreso }}</p>
                    </div>
                    <div>
                      <label for="fecha_salida" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Fecha de salida <span v-if="esNoAceptada" class="text-accent-500">*</span>
                      </label>
                      <input id="fecha_salida" v-model="form.fecha_salida" type="datetime-local" :disabled="readOnly" :class="inputClass('fecha_salida')" />
                      <p v-if="formErrors.fecha_salida" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_salida }}</p>
                      <p v-else class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {{ esNoAceptada ? "Obligatoria: el vehículo no se queda en el taller." : "Opcional. Fecha estimada de entrega." }}
                      </p>
                    </div>
                    <div>
                      <label for="tipo_recepcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Tipo de recepción <span class="text-accent-500">*</span>
                      </label>
                      <select id="tipo_recepcion" v-model="form.tipo_recepcion" :disabled="readOnly" :class="inputClass('tipo_recepcion')">
                        <option v-for="item in TIPOS_TRABAJO_OPCIONES" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </option>
                      </select>
                      <p v-if="formErrors.tipo_recepcion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.tipo_recepcion }}</p>
                    </div>
                  </div>
                </section>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <!-- Motivo -->
                  <section :class="SECCION">
                    <TextImprover
                      v-model="form.motivo_ingreso"
                      contexto="motivo de ingreso"
                      v-slot="{ mejorar, restaurar, mejorando, error, mejorado, tieneOriginal }">
                      <div class="flex items-center justify-between gap-2 mb-3">
                        <h4 :class="TITULO_SECCION">
                          <Wrench class="w-4 h-4" />
                          <label for="motivo_ingreso">Motivo de ingreso <span class="text-accent-500">*</span></label>
                        </h4>
                        <button
                          v-if="!readOnly"
                          type="button"
                          title="Mejorar el texto con IA"
                          :disabled="mejorando || !form.motivo_ingreso"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          @click="mejorar">
                          <Loader2 v-if="mejorando" class="w-4 h-4 animate-spin" />
                          <Wand2 v-else class="w-4 h-4" />
                          {{ mejorando ? "Mejorando..." : "Mejorar texto" }}
                        </button>
                      </div>
                      <textarea
                        id="motivo_ingreso"
                        v-model="form.motivo_ingreso"
                        rows="5"
                        maxlength="500"
                        :disabled="readOnly"
                        placeholder="¿Qué reporta el cliente? Ruidos, fallas, servicio solicitado..."
                        :class="inputClass('motivo_ingreso')"></textarea>
                      <div class="flex items-start justify-between gap-3 mt-1.5">
                        <div class="min-w-0">
                          <p v-if="formErrors.motivo_ingreso" class="text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
                          <p v-if="error" class="text-sm text-red-600 dark:text-red-500">{{ error }}</p>
                          <div v-if="mejorado && !error" class="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
                            <p>Texto mejorado. Revisa antes de guardar.</p>
                            <button v-if="tieneOriginal" type="button" class="font-medium underline hover:no-underline" :disabled="readOnly" @click="restaurar">
                              Restaurar original
                            </button>
                          </div>
                        </div>
                        <span class="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ (form.motivo_ingreso || "").length }}/500</span>
                      </div>
                    </TextImprover>
                  </section>

                  <!-- Estado al ingresar -->
                  <section :class="SECCION">
                    <h4 :class="[TITULO_SECCION, 'mb-4']">
                      <Gauge class="w-4 h-4" />
                      Estado al ingresar
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label for="kilometraje_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Kilometraje <span v-if="!esNoAceptada" class="text-accent-500">*</span>
                        </label>
                        <div class="relative">
                          <input
                            id="kilometraje_ingreso"
                            v-model="kilometrajeDisplay"
                            type="text"
                            inputmode="numeric"
                            :disabled="readOnly"
                            placeholder="Lectura del odómetro"
                            :class="inputClass('kilometraje_ingreso', 'pe-12 tabular-nums')"
                          />
                          <span class="absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-gray-500 pointer-events-none dark:text-gray-400">km</span>
                        </div>
                        <p v-if="formErrors.kilometraje_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.kilometraje_ingreso }}</p>
                        <p v-else-if="kmConservado && vehiculoKilometrajeText && kmGuardado !== kmVehiculo" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Registrado en esta recepción. El vehículo marca hoy {{ vehiculoKilometrajeText }} km.
                        </p>
                        <p v-else-if="vehiculoKilometrajeText" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Último registro: {{ vehiculoKilometrajeText }} km
                          <span
                            v-if="kmDiferencia != null"
                            class="ms-1 font-semibold"
                            :class="kmDiferencia > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                          >
                            {{ kmDiferenciaTexto }}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p id="nivel_combustible_label" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Combustible <span class="text-accent-500">*</span>
                        </p>
                        <div id="nivel_combustible" role="radiogroup" aria-labelledby="nivel_combustible_label">
                          <div class="flex w-full gap-1 p-1 rounded bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:border-gray-600">
                            <button
                              v-for="(opcion, index) in FUEL_LEVELS"
                              :key="opcion.value"
                              type="button"
                              role="radio"
                              :disabled="readOnly"
                              :aria-checked="form.nivel_combustible === opcion.value"
                              :aria-label="opcion.label"
                              :title="opcion.label"
                              class="h-7 flex-1 rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                              :class="opcion.fill <= fuelFill && fuelFill > 0 ? `${SEGMENT_COLORS[index]} shadow-inner` : 'bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600'"
                              @click="form.nivel_combustible = opcion.value"
                              @keydown="onFuelKeydown($event, index)"></button>
                          </div>
                          <div class="flex items-center justify-between mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>Vacío</span>
                            <span class="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                              <Fuel class="w-4 h-4" :class="fuelIcon" />
                              {{ fuelLabel }}
                            </span>
                            <span>Lleno</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label class="inline-flex items-center gap-3" :class="readOnly ? 'cursor-default' : 'cursor-pointer'">
                        <input v-model="form.ingreso_en_grua" type="checkbox" class="sr-only peer" :disabled="readOnly" />
                        <div class="relative w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-200 dark:peer-focus:ring-brand-700 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-900 dark:peer-checked:bg-brand-500"></div>
                        <span class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                          <Truck class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          Ingresó en grúa
                        </span>
                      </label>
                      <div v-if="form.ingreso_en_grua" class="mt-3">
                        <label for="datos_grua" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Datos de la grúa / chófer <span class="text-accent-500">*</span>
                        </label>
                        <input
                          id="datos_grua"
                          :value="form.datos_grua"
                          :disabled="readOnly"
                          placeholder="Empresa, placa de la grúa o nombre del chófer"
                          maxlength="80"
                          :class="inputClass('datos_grua')"
                          @input="sanitizeDatosGrua($event.target.value)" />
                        <p v-if="formErrors.datos_grua" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.datos_grua }}</p>
                      </div>
                    </div>
                  </section>
                </div>

                <!-- Custodia y pertenencias -->
                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <KeyRound class="w-4 h-4" />
                    Custodia y pertenencias
                  </h4>
                  <div class="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-x-8 gap-y-4">
                    <div>
                      <p id="cantidad_llaves_label" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Llaves entregadas</p>
                      <div class="inline-flex rounded-lg shadow-xs" role="radiogroup" aria-labelledby="cantidad_llaves_label">
                        <button
                          v-for="(opcion, i) in OPCIONES_LLAVES"
                          :key="opcion.value"
                          type="button"
                          role="radio"
                          :aria-checked="Number(form.cantidad_llaves) === opcion.value"
                          :disabled="readOnly"
                          class="min-w-12 px-4 py-2 text-sm font-medium border focus:z-10 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-500/40 disabled:cursor-not-allowed"
                          :class="[
                            i === 0 ? 'rounded-s-lg' : '-ms-px',
                            i === OPCIONES_LLAVES.length - 1 ? 'rounded-e-lg' : '',
                            Number(form.cantidad_llaves) === opcion.value
                              ? 'z-10 bg-brand-900 border-brand-900 text-white dark:bg-brand-300 dark:border-brand-300 dark:text-brand-900'
                              : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600',
                          ]"
                          @click="form.cantidad_llaves = opcion.value">
                          {{ opcion.label }}
                        </button>
                      </div>
                      <label :class="[fichaClass(form.tiene_llave_control), 'mt-3']">
                        <input v-model="form.tiene_llave_control" type="checkbox" class="sr-only" :disabled="readOnly" />
                        <span :class="marcaFichaClass(form.tiene_llave_control)"><Check class="w-3 h-3" /></span>
                        Llave con control remoto
                      </label>
                    </div>
                    <div>
                      <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Objetos de valor dejados en el vehículo</p>
                      <div class="flex flex-wrap gap-2">
                        <label v-for="item in PERTENENCIAS" :key="item.campo" :class="fichaClass(form[item.campo])">
                          <input v-model="form[item.campo]" type="checkbox" class="sr-only" :disabled="readOnly" />
                          <span :class="marcaFichaClass(form[item.campo])"><Check class="w-3 h-3" /></span>
                          {{ item.label }}
                        </label>
                      </div>
                      <input
                        id="pertenencias_observaciones"
                        v-model="form.pertenencias_observaciones"
                        type="text"
                        :disabled="readOnly"
                        placeholder="Otros objetos no listados (opcional)"
                        maxlength="255"
                        aria-label="Observaciones de pertenencias"
                        :class="inputClass(null, 'mt-3')"
                      />
                    </div>
                  </div>
                </section>

                <!-- Seguro / siniestro -->
                <section :class="SECCION">
                  <div class="flex items-center justify-between gap-3">
                    <h4 :class="TITULO_SECCION">
                      <ShieldPlus class="w-4 h-4" />
                      Seguro / siniestro
                    </h4>
                    <label class="inline-flex items-center gap-2" :class="readOnly ? 'cursor-default' : 'cursor-pointer'">
                      <span class="text-sm text-gray-600 dark:text-gray-300">Aplica</span>
                      <input v-model="mostrarSeguro" type="checkbox" class="sr-only peer" :disabled="readOnly || tieneDatosSeguro" />
                      <div class="relative w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-200 dark:peer-focus:ring-brand-700 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-900 dark:peer-checked:bg-brand-500"></div>
                    </label>
                  </div>
                  <p v-if="!mostrarSeguro" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Actívalo si el vehículo ingresa por un reclamo a la aseguradora.
                  </p>
                  <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label for="compania_seguro" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Compañía de seguro</label>
                      <input id="compania_seguro" v-model="form.compania_seguro" type="text" maxlength="100" :disabled="readOnly" :class="inputClass('compania_seguro')" />
                    </div>
                    <div>
                      <label for="numero_poliza" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">N° de póliza</label>
                      <input id="numero_poliza" v-model="form.numero_poliza" type="text" maxlength="20" :disabled="readOnly" :class="inputClass('numero_poliza', 'font-mono uppercase')" />
                      <p v-if="formErrors.numero_poliza" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.numero_poliza }}</p>
                    </div>
                    <div>
                      <label for="numero_reclamo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">N° de reclamo / siniestro</label>
                      <input id="numero_reclamo" v-model="form.numero_reclamo" type="text" maxlength="80" :disabled="readOnly" :class="inputClass('numero_reclamo', 'font-mono uppercase')" />
                      <p v-if="formErrors.numero_reclamo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.numero_reclamo }}</p>
                    </div>
                    <div>
                      <label for="ajustador_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Perito del seguro</label>
                      <input id="ajustador_nombre" v-model="form.ajustador_nombre" type="text" maxlength="120" :disabled="readOnly" :class="inputClass('ajustador_nombre')" />
                    </div>
                    <div>
                      <label for="ajustador_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono del perito</label>
                      <input id="ajustador_telefono" v-model="form.ajustador_telefono" type="tel" inputmode="tel" maxlength="15" :disabled="readOnly" :class="inputClass('ajustador_telefono')" />
                    </div>
                  </div>
                </section>
              </div>

              <!-- 2. Revisión -->
              <div v-show="activeTab === 'inspeccion'" class="space-y-4">
                <section :class="SECCION">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h4 :class="TITULO_SECCION">
                      <ListChecks class="w-4 h-4" />
                      Inventario
                    </h4>
                    <span class="px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 tabular-nums">
                      {{ inventarioPresente }}/{{ TOTAL_INVENTARIO }} presentes
                    </span>
                  </div>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Marca los accesorios que el vehículo trae al momento de la recepción.
                  </p>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div v-for="grupo in INVENTARIO" :key="grupo.titulo">
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <p class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                          <component :is="grupo.icon" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          {{ grupo.titulo }}
                          <span class="text-xs font-normal text-gray-500 dark:text-gray-400 tabular-nums">{{ presentesEnGrupo(grupo) }}/{{ grupo.campos.length }}</span>
                        </p>
                        <button
                          v-if="!readOnly"
                          type="button"
                          class="shrink-0 whitespace-nowrap text-xs font-medium text-brand-700 hover:underline dark:text-brand-200"
                          @click="alternarGrupo(grupo)">
                          {{ presentesEnGrupo(grupo) === grupo.campos.length ? "Quitar todo" : "Marcar todo" }}
                        </button>
                      </div>
                      <div class="space-y-1.5">
                        <label v-for="campo in grupo.campos" :key="campo.key" :class="fichaClass(form[campo.key])">
                          <input v-model="form[campo.key]" type="checkbox" class="sr-only" :disabled="readOnly" />
                          <span :class="marcaFichaClass(form[campo.key])"><Check class="w-3 h-3" /></span>
                          {{ campo.label }}
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section :class="SECCION">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h4 :class="TITULO_SECCION">
                      <TriangleAlert class="w-4 h-4" />
                      Testigos del tablero
                    </h4>
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-sm tabular-nums"
                      :class="testigosEncendidos ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
                    >
                      {{ testigosEncendidos ? `${testigosEncendidos} encendido${testigosEncendidos === 1 ? "" : "s"}` : "Ninguno encendido" }}
                    </span>
                  </div>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Toca los testigos que se encienden en el tablero al arrancar el vehículo.
                  </p>
                  <TestigosTablero :model-value="testigos" :disabled="readOnly" />
                </section>

                <section :class="SECCION">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h4 :class="TITULO_SECCION">
                      <MapPin class="w-4 h-4" />
                      Daños en carrocería
                    </h4>
                    <button
                      v-if="!readOnly && marcas.length"
                      type="button"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-red-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                      @click="clearMarcas">
                      <BrushCleaning class="w-4 h-4" />
                      Limpiar marcas
                    </button>
                  </div>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Toca en el diagrama la zona de cada rayón, golpe o detalle y descríbelo en la lista.
                  </p>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      <p v-if="blueprintError" class="mb-2 text-sm text-red-600 dark:text-red-500">{{ blueprintError }}</p>
                      <div class="relative bg-white border border-gray-300 rounded-lg overflow-hidden dark:border-gray-600">
                        <div v-if="!form.vehiculo" class="flex flex-col items-center justify-center gap-2 h-64 text-sm text-gray-500">
                          <Car class="w-8 h-8 text-gray-400" />
                          Selecciona un vehículo para cargar el diagrama.
                        </div>
                        <div v-else class="relative" :class="readOnly ? '' : 'cursor-crosshair'" style="aspect-ratio: 4/3">
                          <img
                            v-if="blueprintImageUrl"
                            :src="blueprintImageUrl"
                            alt="Diagrama del vehículo"
                            class="absolute inset-0 w-full h-full object-contain"
                            @click="onBlueprintClick"
                          />
                          <div class="absolute inset-0 pointer-events-none">
                            <span
                              v-for="(punto, idx) in marcas"
                              :key="punto.id"
                              class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-accent-500 rounded-full ring-2 ring-white shadow -translate-x-1/2 -translate-y-1/2"
                              :style="{ left: punto.x + '%', top: punto.y + '%' }"
                            >
                              {{ idx + 1 }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p v-if="form.vehiculo && !readOnly" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                        {{ marcas.length }}/{{ MAX_DETALLES_CARROCERIA }} marcas
                      </p>
                    </div>

                    <div>
                      <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalle de cada daño</p>
                      <div
                        v-if="!marcas.length"
                        class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-600"
                      >
                        <MapPin class="w-7 h-7 text-gray-400" />
                        <p class="text-sm font-medium text-gray-900 dark:text-white">Sin daños marcados</p>
                        <p class="max-w-xs text-xs text-gray-500 dark:text-gray-400">
                          Si el vehículo llega sin golpes ni rayones, puedes continuar. Cada marca en el diagrama crea aquí una fila para describirla.
                        </p>
                      </div>
                      <ol v-else class="space-y-3">
                        <li
                          v-for="(punto, idx) in marcas"
                          :key="punto.id"
                          class="flex items-start gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-700/40"
                          :class="detallesErrors[idx] ? 'border-red-300 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'"
                        >
                          <span class="inline-flex items-center justify-center w-6 h-6 mt-2 shrink-0 text-xs font-bold text-white bg-accent-500 rounded-full">{{ idx + 1 }}</span>
                          <div class="flex-1 min-w-0">
                            <input
                              :value="punto.descripcion"
                              :disabled="readOnly"
                              type="text"
                              :name="`detalle_carroceria_${punto.id}`"
                              :aria-label="`Descripción del daño ${idx + 1}`"
                              placeholder="Ej.: rayón en puerta trasera izquierda"
                              maxlength="80"
                              :class="[BASE_INPUT, detallesErrors[idx] ? INPUT_ERROR : INPUT_OK, 'bg-white']"
                              @input="sanitizeDetalleCarroceria(punto, $event.target.value)"
                            />
                            <p v-if="detallesErrors[idx]" class="mt-1 text-sm text-red-600 dark:text-red-500">{{ detallesErrors[idx] }}</p>
                            <div v-if="!readOnly" class="flex flex-wrap gap-1.5 mt-2">
                              <button
                                v-for="tipo in TIPOS_DANO"
                                :key="tipo"
                                type="button"
                                class="px-2 py-0.5 text-xs font-medium rounded-full border transition-colors"
                                :class="
                                  tipoDanoDe(punto) === tipo
                                    ? 'bg-brand-900 border-brand-900 text-white dark:bg-brand-300 dark:border-brand-300 dark:text-brand-900'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                "
                                @click="aplicarTipoDano(punto, tipo)">
                                {{ tipo }}
                              </button>
                            </div>
                          </div>
                          <button
                            v-if="!readOnly"
                            type="button"
                            :title="`Quitar el daño ${idx + 1}`"
                            :aria-label="`Quitar el daño ${idx + 1}`"
                            class="inline-flex items-center justify-center w-9 h-9 mt-0.5 shrink-0 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            @click="quitarMarca(punto)">
                            <Trash2 class="w-4 h-4" />
                          </button>
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
                      class="px-2 py-0.5 text-xs font-medium rounded-sm tabular-nums"
                      :class="fotosCargadas === FOTO_VISTAS.length ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
                    >
                      {{ fotosCargadas }}/{{ FOTO_VISTAS.length }} fotos
                    </span>
                  </div>
                  <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Las 5 vistas son obligatorias: respaldan el estado en que el vehículo llegó al taller.
                  </p>
                  <div v-if="formErrors.fotos" class="mb-4">
                    <Alert type="error" :message="formErrors.fotos" />
                  </div>
                  <PhotoSlotGrid
                    ref="fotoGridRef"
                    :slots="FOTO_VISTAS"
                    :existing="fotosExisting"
                    :errors="fotoErrors"
                    :disabled="readOnly"
                    previewable
                    @change="onFotosChange"/>
                </section>
              </div>

              <!-- 4. Autorización -->
              <div v-show="activeTab === 'autorizacion'" class="space-y-4">
                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <ClipboardList class="w-4 h-4" />
                    Resumen para el cliente
                  </h4>
                  <dl class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Kilometraje</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ kilometrajeDisplay ? `${kilometrajeDisplay} km` : "—" }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Combustible</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white">{{ fuelLabel }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Llaves</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white">
                        {{ Number(form.cantidad_llaves) >= 3 ? "3 o más" : form.cantidad_llaves }}{{ form.tiene_llave_control ? " · con control" : "" }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Accesorios</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ inventarioPresente }} de {{ TOTAL_INVENTARIO }} presentes</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Testigos encendidos</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white">{{ testigosEncendidos || "Ninguno" }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Daños marcados</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white">{{ marcas.length || "Ninguno" }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Fotos</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ fotosCargadas }}/{{ FOTO_VISTAS.length }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-gray-500 dark:text-gray-400">Objetos de valor</dt>
                      <dd class="font-semibold text-gray-900 dark:text-white truncate" :title="pertenenciasMarcadas.join(', ')">
                        {{ pertenenciasMarcadas.length ? pertenenciasMarcadas.join(", ") : "Ninguno" }}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section :class="SECCION">
                  <h4 :class="[TITULO_SECCION, 'mb-4']">
                    <Signature class="w-4 h-4" />
                    Decisión del cliente
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label="Decisión del cliente">
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="decisionCliente === 'firma'"
                      :disabled="readOnly"
                      class="flex items-start gap-3 p-4 text-left rounded-lg border-2 transition-colors disabled:cursor-default"
                      :class="decisionCliente === 'firma'
                        ? 'border-brand-900 bg-brand-50 dark:border-brand-300 dark:bg-brand-700/30'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'"
                      @click="elegirDecision('firma')">
                      <PenLine class="w-5 h-5 mt-0.5 shrink-0 text-brand-700 dark:text-brand-200" />
                      <span>
                        <span class="block text-sm font-semibold text-gray-900 dark:text-white">Firma y acepta</span>
                        <span class="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">Deja el vehículo y firma la conformidad del estado registrado.</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="decisionCliente === 'no_acepta'"
                      :disabled="readOnly"
                      class="flex items-start gap-3 p-4 text-left rounded-lg border-2 transition-colors disabled:cursor-default"
                      :class="decisionCliente === 'no_acepta'
                        ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'"
                      @click="elegirDecision('no_acepta')">
                      <UserX class="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        <span class="block text-sm font-semibold text-gray-900 dark:text-white">No acepta / no firma</span>
                        <span class="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">Se guarda como «No Aceptada / Sin Firma» con el motivo.</span>
                      </span>
                    </button>
                  </div>

                  <div v-show="decisionCliente === 'firma'" class="mt-5">
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        Firma del cliente
                        <span v-if="form.fecha_firma_cliente" class="ms-1 text-xs font-normal text-gray-500 dark:text-gray-400">· Firmado el {{ formatFechaFirma(form.fecha_firma_cliente) }}</span>
                      </p>
                      <button
                        v-if="!readOnly && firmaClienteData"
                        type="button"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-red-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                        @click="borrarFirmaCliente">
                        <BrushCleaning class="w-4 h-4" />
                        Borrar firma
                      </button>
                    </div>
                    <div class="relative max-w-2xl bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden dark:border-gray-500">
                      <canvas
                        ref="firmaClienteCanvas"
                        width="600"
                        height="200"
                        class="block w-full h-auto touch-none"
                        :class="readOnly ? '' : 'cursor-crosshair'"
                        @pointerdown="onClientePointerDown"
                        @pointermove="onClientePointerMove"
                        @pointerup="onClientePointerUp"
                        @pointerleave="onClientePointerUp"></canvas>
                      <div class="absolute inset-x-8 bottom-8 border-b border-gray-300 pointer-events-none"></div>
                      <span class="absolute start-8 bottom-9 text-lg text-gray-400 pointer-events-none">✕</span>
                      <p
                        v-if="!firmaClienteData && !readOnly"
                        class="absolute inset-x-0 top-1/3 text-center text-sm text-gray-400 pointer-events-none"
                      >
                        El cliente firma aquí con el dedo o el mouse
                      </p>
                    </div>
                    <label class="flex items-start gap-2 mt-4 max-w-2xl">
                      <input
                        v-model="form.aceptacion_condiciones"
                        type="checkbox"
                        :disabled="readOnly || (isEditMode && form.estado !== 'PENDIENTE')"
                        class="w-4 h-4 mt-0.5 text-brand-900 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 dark:ring-offset-gray-800"
                      />
                      <span class="text-sm text-gray-900 dark:text-white">
                        El cliente acepta las condiciones de recepción y el estado reportado del vehículo.
                      </span>
                    </label>
                    <p v-if="isEditMode && form.estado !== 'PENDIENTE'" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Esta opción no se puede modificar una vez creada la recepción.
                    </p>
                  </div>

                  <div v-if="decisionCliente === 'no_acepta'" class="mt-5 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
                    <label for="motivo_no_recepcion" class="block mb-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                      Motivo de no aceptación <span class="text-accent-500">*</span>
                    </label>
                    <textarea
                      id="motivo_no_recepcion"
                      v-model="form.motivo_no_recepcion"
                      rows="3"
                      maxlength="500"
                      :disabled="readOnly"
                      placeholder="Ej.: el cliente no está de acuerdo con el presupuesto y retira el vehículo."
                      :class="inputClass('motivo_no_recepcion', 'bg-white')"></textarea>
                    <p v-if="formErrors.motivo_no_recepcion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_no_recepcion }}</p>
                    <p class="mt-2 text-xs text-amber-800 dark:text-amber-200">
                      Registra también la
                      <button type="button" class="font-semibold underline hover:no-underline" @click="irAPaso('informacion')">fecha de salida</button>
                      en el paso Ingreso. Kilometraje, motivo y fotos dejan de ser obligatorios.
                    </p>
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
                {{ PASOS[activeTabIndex - 1]?.label || "Anterior" }}
              </button>
              <span class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Paso {{ activeTabIndex + 1 }} de {{ PASOS.length }}</span>
              <button
                v-if="activeTabIndex < PASOS.length - 1"
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-900 bg-white border border-brand-900 rounded-lg hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 dark:bg-gray-800 dark:text-brand-200 dark:border-brand-300 dark:hover:bg-gray-700 dark:focus:ring-brand-700"
                @click="goToTab(1)">
                Siguiente: {{ PASOS[activeTabIndex + 1].label }}
                <ArrowRight class="w-4 h-4" />
              </button>
              <FormSaveActions
                v-else-if="!readOnly"
                :is-loading="isSaving"
                :is-edit-mode="isEditMode"
                cancel-href="/crud/recepciones/"
                text="Guardar recepción"
                color="brand"
                :on-submit="submit"/>
              <span v-else></span>
            </div>
          </form>
        </div>
      </div>

      <aside class="lg:col-span-1 space-y-4">
        <!-- Avance -->
        <section v-if="!readOnly" :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <ListChecks class="w-4 h-4" />
            Avance
          </h4>
          <div class="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>{{ requisitosCumplidos }} de {{ requisitos.length }} requisitos</span>
            <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ avancePorcentaje }}%</span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
            <div
              class="h-2 rounded-full transition-all duration-300"
              :class="avancePorcentaje === 100 ? 'bg-green-600 dark:bg-green-500' : 'bg-brand-900 dark:bg-brand-300'"
              :style="{ width: `${avancePorcentaje}%` }"></div>
          </div>
          <ul class="mt-3 -mx-2 space-y-0.5">
            <li v-for="req in requisitos" :key="req.key">
              <button
                type="button"
                class="flex w-full items-center gap-2.5 px-2 py-1.5 text-sm text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                @click="irARequisito(req)">
                <span
                  class="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full"
                  :class="req.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'border-2 border-dashed border-gray-300 dark:border-gray-500'"
                >
                  <Check v-if="req.ok" class="w-3 h-3" />
                </span>
                <span class="flex-1 min-w-0 truncate" :class="req.ok ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'">{{ req.label }}</span>
                <span v-if="req.detalle" class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ req.detalle }}</span>
              </button>
            </li>
          </ul>
          <p v-if="avancePorcentaje === 100" class="mt-3 text-xs font-medium text-green-700 dark:text-green-400">
            Todo listo para guardar.
          </p>
        </section>

        <!-- Vehículo -->
        <section :class="SECCION">
          <h4 :class="[TITULO_SECCION, 'mb-3']">
            <Car class="w-4 h-4" />
            Vehículo
          </h4>
          <div
            v-if="vehiculoImagenSrc"
            class="h-36 mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <img :src="vehiculoImagenSrc" alt="Foto del vehículo" class="h-full w-full object-contain" />
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center gap-1.5 h-24 mb-3 text-xs text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg dark:bg-gray-700/40 dark:border-gray-600"
          >
            <Camera class="w-5 h-5" />
            Sin foto del vehículo
          </div>
          <p v-if="form.vehiculo" class="mb-3 font-mono text-base font-semibold tracking-widest text-gray-900 dark:text-white">
            {{ formatPlaca(form.vehiculo.placa) }}
          </p>
          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconEngine class="w-4 h-4 shrink-0" stroke-width="1.8" />
                N° motor
              </dt>
              <dd class="font-medium text-gray-900 dark:text-white truncate">{{ form.vehiculo?.numero_motor || "—" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <component :is="transmisionIcon" class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Transmisión
              </dt>
              <dd class="font-medium text-right text-gray-900 dark:text-white">{{ transmisionLabel || "—" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <IconGasStation class="w-4 h-4 shrink-0" stroke-width="1.8" />
                Combustible
              </dt>
              <dd class="font-medium text-gray-900 dark:text-white truncate">{{ combustibleLabel || "—" }}</dd>
            </div>
          </dl>
        </section>

        <template v-if="isEditMode && form.id && relacionesCargadas">
          <section v-if="readOnly" :class="SECCION">
            <h4 :class="[TITULO_SECCION, 'mb-1']">
              <Workflow class="w-4 h-4" />
              Relaciones del flujo
            </h4>
            <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Documentos generados a partir de esta recepción.
            </p>
            <RelacionesFlujo :pasos="pasosRelaciones" />
          </section>
          <RelacionesFlujoEdit
            v-else
            tipo-entidad="recepcion"
            :entidad-id="form.id"
            :relaciones="relacionesRecepcion"
            :puede-agregar="puedeAgregarRelacion"
            :al-vincular="vincularRelacion"
            :al-desvincular="desvincularRelacion"
          />
        </template>
      </aside>
    </div>
  </div>

  <ConfirmModal
    :model-value="showModalCrearInspeccion"
    title="¿Crear la inspección de esta recepción?"
    :message="mensajeCrearInspeccion"
    :icon="IconReportSearch"
    variant="primary"
    confirm-text="Sí, crear inspección"
    confirming-text="Creando..."
    :is-deleting="creandoInspeccion"
    @confirm="confirmarCrearInspeccion"
    @cancel="cancelarCrearInspeccion"
  />

  <div v-if="showContradiccionModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CircleAlert class="w-6 h-6 text-yellow-500" />
          ¿El cliente se retractó?
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="showContradiccionModal = false">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Hay firma y aceptación del cliente, pero también un motivo de no
          aceptación.
        </p>
        <p class="mt-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
          Si continúas se guardará como "No Aceptada / Sin Firma" y se
          descartará la aceptación registrada.
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          @click="showContradiccionModal = false">
          <X class="w-5 h-5 mr-1.5 -ml-1 text-gray-500 dark:text-gray-300" />
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
          @click="confirmarGuardadoNoAceptada">
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
