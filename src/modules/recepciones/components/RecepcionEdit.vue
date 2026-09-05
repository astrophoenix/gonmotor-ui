<script setup>
import { onMounted, reactive, ref, watch, nextTick } from 'vue';
import { recepcionesService } from '../services/recepcionesService';
import { request } from '../../../shared/services/httpClient';
import { sanitizeObservaciones } from '../../../shared/utils/sanitize';
import Alert from '../../../shared/components/Alert.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import TestigosTablero from '../../../shared/components/TestigosTablero.vue';
import PhotoSlotGrid from '../../../shared/components/PhotoSlotGrid.vue';
import ClientModal from '../../clientes/components/ClientModal.vue';

const recepcionId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(recepcionId);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});
const fotoErrors = ref({});
const fotosPresence = ref({});

const defaultNow = new Date().toISOString().slice(0, 16);

function toLocalDatetimeInput(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.slice(0, 16);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  return '';
}

const form = reactive({
  cliente: null,
  vehiculo: null,
  tipo_recepcion: 'DIAGNOSTICO',
  motivo_ingreso: '',
  fecha_ingreso: defaultNow,
  fecha_salida: '',
  recibido_por: null,
  kilometraje_ingreso: null,
  nivel_combustible: '1/4',
  ingreso_en_grua: false,
  datos_grua: '',
  tiene_espejo_izquierdo: true,
  tiene_espejo_derecho: true,
  tiene_vidrios: true,
  tiene_radio: true,
  tiene_pantalla: false,
  tiene_encendedor: false,
  tiene_antena: true,
  tiene_control_puertas: false,
  tiene_cargador_celular: false,
  tiene_triangulos: false,
  tiene_cubresol: false,
  tiene_herramientas: false,
  tiene_gata_palanca: true,
  tiene_llanta_repuesto: true,
  tiene_faros_lunas: true,
  tiene_tapa_gasolina: true,
  tiene_placas: true,
  tiene_tapetes: true,
  tiene_extintor: false,
  tiene_botiquin: false,
  tiene_copas_ruedas: true,
  tiene_llave_tuercas: false,
  datos_danos_carroceria: null,
  detalles_carroceria: '',
  cliente_identificacion: '',
  cliente_telefono: '',
  cliente_email: '',
  vehiculo_color: '',
  firma_receptor: null,
  firma_cliente: null,
  fecha_firma_receptor: null,
  fecha_firma_cliente: null,
  aceptacion_condiciones: false,
  estado: 'PENDIENTE',
  motivo_no_recepcion: '',
});

let testigos = reactive({
  testigo_check_engine: false,
  testigo_abs: false,
  testigo_airbag: false,
  testigo_bateria: false,
  testigo_aceite: false,
  testigo_temperatura: false,
  otros_testigos_observaciones: '',
});

const GRUPO_BLUEPRINT_MAP = {
  AUTO: 'liviano',
  JEEP: 'suv',
  CAMN: 'camioneta',
  FURG: 'furgoneta',
  BUS: 'bus',
};
const MAX_DETALLES_CARROCERIA = 20;

const clienteSearch = ref('');
const vehiculoSearch = ref('');
const vehiculoSearchDisplay = ref('');
const clienteOptions = ref([]);
const vehiculoOptions = ref([]);
const showClienteDropdown = ref(false);
const showVehiculoDropdown = ref(false);
const showClientCreateModal = ref(false);
const blueprintImageUrl = ref('');
const marcas = ref([]);
const detallesSyncVersion = ref(0);
const blueprintError = ref('');
const detallesErrors = ref({});

const empleados = ref([]);
const recibidoPorSearch = ref('');
const showEmpleadoDropdown = ref(false);
const empleadoOptions = ref([]);

const firmaReceptorData = ref(null);
const firmaClienteData = ref(null);
const firmaReceptorCanvas = ref(null);
const firmaClienteCanvas = ref(null);
const isDrawingReceptor = ref(false);
const isDrawingCliente = ref(false);
const clienteNoFirma = ref(false);

const FOTO_VISTAS = [
  { key: 'FRONTAL', label: 'Vista Frontal' },
  { key: 'LATERAL_IZQ', label: 'Lateral Izquierda' },
  { key: 'LATERAL_DER', label: 'Lateral Derecha' },
  { key: 'POSTERIOR', label: 'Posterior' },
  { key: 'TABLERO', label: 'Tablero / Kilometraje' },
];

const fotoGridRef = ref(null);
const fotosExisting = ref({});

function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = String(placa).replace(/-/g, '').toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function formatFechaFirma(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function syncDetallesCarroceria() {
  const lines = marcas.value
    .map((punto, idx) => ({ numero: idx + 1, descripcion: (punto.descripcion || '').trim() }))
    .filter(item => item.descripcion.length > 0)
    .map(item => `${item.numero}: ${item.descripcion}`);
  form.detalles_carroceria = lines.join('\n');
  detallesSyncVersion.value += 1;
}

function sanitizeDetalleCarroceria(punto, value) {
  punto.descripcion = sanitizeObservaciones(value).slice(0, 80);
}

function sanitizeDatosGrua(value) {
  form.datos_grua = sanitizeObservaciones(value);
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
  return items.map(item => item.descripcion);
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function onFotosChange() {
  if (fotoGridRef.value) {
    fotosPresence.value = fotoGridRef.value.getPresence();
  }
}

function initCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
  const ctx = canvas.getContext('2d');
  const coords = getCanvasCoords(canvas, event);
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
}

function draw(canvas, isDrawingRef, event) {
  if (!isDrawingRef.value) return;
  const ctx = canvas.getContext('2d');
  const coords = getCanvasCoords(canvas, event);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
}

function stopDrawing(canvas, isDrawingRef, saveRef) {
  if (!isDrawingRef.value) return;
  isDrawingRef.value = false;
  saveRef.value = canvas.toDataURL('image/png');
}

function clearCanvas(canvas, saveRef) {
  if (!canvas) return;
  initCanvas(canvas);
  saveRef.value = null;
}

function onReceptorPointerDown(event) {
  const canvas = firmaReceptorCanvas.value;
  if (!canvas) return;
  startDrawing(canvas, isDrawingReceptor, firmaReceptorData, event);
}

function onReceptorPointerMove(event) {
  const canvas = firmaReceptorCanvas.value;
  if (!canvas) return;
  draw(canvas, isDrawingReceptor, event);
}

function onReceptorPointerUp(event) {
  const canvas = firmaReceptorCanvas.value;
  if (!canvas) return;
  stopDrawing(canvas, isDrawingReceptor, firmaReceptorData);
}

function onClientePointerDown(event) {
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
  if (!canvas) return;
  stopDrawing(canvas, isDrawingCliente, firmaClienteData);
}

function hasCanvasContent(canvas) {
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(1, 1, 1, 1).data;
  return pixel[3] !== 255;
}

async function loadEmpleados() {
  try {
    const data = await request('/api/auth/empleados/?page=1&page_size=100');
    empleados.value = Array.isArray(data?.results) ? data.results : [];
    if (empleados.value.length > 0 && !form.recibido_por) {
      form.recibido_por = empleados.value[0].user?.id || null;
      recibidoPorSearch.value = `${empleados.value[0].user?.first_name || ''} ${empleados.value[0].user?.last_name || ''}`.trim() + ' - ' + (empleados.value[0].rol_display || empleados.value[0].rol);
    }
  } catch (error) {
    console.error('No se pudieron cargar empleados:', error);
  }
}

function selectEmpleado(empleado) {
  form.recibido_por = empleado.user?.id || null;
  recibidoPorSearch.value = `${empleado.user?.first_name || ''} ${empleado.user?.last_name || ''}`.trim() + ' - ' + (empleado.rol_display || empleado.rol);
  showEmpleadoDropdown.value = false;
}

function clearEmpleado() {
  form.recibido_por = null;
  recibidoPorSearch.value = '';
  empleadoOptions.value = [];
}

async function searchEmpleados() {
  const term = recibidoPorSearch.value.trim();
  if (!term) {
    empleadoOptions.value = [];
    return;
  }
  try {
    const params = new URLSearchParams({ search: term, page: '1', page_size: '10' });
    const data = await request(`/api/auth/empleados/?${params.toString()}`);
    empleadoOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar empleados:', error);
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
        errorMessage.value = 'Esta recepción ya fue aceptada y firmada por el cliente, por lo que no es posible editarla.';
        isLoading.value = false;
        return;
      }
      Object.assign(form, {
        ...data,
        cliente: data.cliente || null,
        vehiculo: data.vehiculo || null,
        tipo_recepcion: data.tipo_recepcion || 'DIAGNOSTICO',
        motivo_ingreso: data.motivo_ingreso || '',
        fecha_ingreso: toLocalDatetimeInput(data.fecha_ingreso),
        fecha_salida: toLocalDatetimeInput(data.fecha_salida),
        recibido_por: data.recibido_por || null,
        firma_receptor: data.firma_receptor || null,
        firma_cliente: data.firma_cliente || null,
        fecha_firma_receptor: data.fecha_firma_receptor || null,
        fecha_firma_cliente: data.fecha_firma_cliente || null,
        aceptacion_condiciones: data.aceptacion_condiciones || false,
        estado: data.estado || 'PENDIENTE',
        motivo_no_recepcion: data.motivo_no_recepcion || '',
      });
      clienteNoFirma.value = data.estado === 'NO_ACEPTADA';
      if (data.cliente) {
        form.cliente_identificacion = data.cliente.identificacion || '';
        form.cliente_telefono = data.cliente.telefono || '';
        form.cliente_email = data.cliente.email || '';
        clienteSearch.value = data.cliente.nombre;
      } else {
        form.cliente_identificacion = '';
        form.cliente_telefono = '';
        form.cliente_email = '';
        clienteSearch.value = '';
      }
      if (data.vehiculo) {
        form.vehiculo_color = data.vehiculo.color || '';
        vehiculoSearch.value = data.vehiculo.placa;
        vehiculoSearchDisplay.value = formatPlaca(data.vehiculo.placa);
        await cargarBlueprint(data.vehiculo.grupo_blueprint);
      } else {
        form.vehiculo_color = '';
        vehiculoSearch.value = '';
        vehiculoSearchDisplay.value = '';
      }
      Object.assign(testigos, {
        testigo_check_engine: data.testigo_check_engine || false,
        testigo_abs: data.testigo_abs || false,
        testigo_airbag: data.testigo_airbag || false,
        testigo_bateria: data.testigo_bateria || false,
        testigo_aceite: data.testigo_aceite || false,
        testigo_temperatura: data.testigo_temperatura || false,
        otros_testigos_observaciones: data.otros_testigos_observaciones || '',
      });
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
          descripcion: descripciones[idx] || ''
        }));
      }
      if (data.recibido_por) {
        recibidoPorSearch.value = data.recibido_por_nombre || data.recibido_por.username || '';
      }
      firmaReceptorData.value = data.firma_receptor || null;
      firmaClienteData.value = data.firma_cliente || null;
      await nextTick();
      if (data.firma_receptor) {
        const img = new Image();
        img.onload = () => {
          const canvas = firmaReceptorCanvas.value;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = data.firma_receptor;
      }
      if (data.firma_cliente) {
        const img = new Image();
        img.onload = () => {
          const canvas = firmaClienteCanvas.value;
          if (canvas) {
            const ctx = canvas.getContext('2d');
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
  const grupoFinal = grupo || (form.vehiculo?.grupo_blueprint ? GRUPO_BLUEPRINT_MAP[form.vehiculo?.tipo] : null);
  if (!grupoFinal) {
    blueprintImageUrl.value = '';
    return;
  }
  const candidates = [grupoFinal, 'liviano'];
  for (const candidate of candidates) {
    const url = `/images/blueprint_${candidate}.png`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        blueprintImageUrl.value = url;
        return;
      }
    } catch {
      // ignore and try fallback
    }
  }
  blueprintImageUrl.value = '';
}

function onBlueprintClick(event) {
  if (marcas.value.length >= MAX_DETALLES_CARROCERIA) {
    blueprintError.value = 'No se pueden agregar más de 20 detalles. Eliminá uno existente para continuar.';
    return;
  }
  blueprintError.value = '';
  const container = event.currentTarget;
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  marcas.value = [...marcas.value, { id: Date.now(), x: Math.round(x), y: Math.round(y), descripcion: '' }];
}

async function searchClientes() {
  const term = clienteSearch.value.trim();
  if (!term) {
    clienteOptions.value = [];
    return;
  }

  try {
    const params = new URLSearchParams({ search: term, ordering: 'nombre', page: '1' });
    const data = await request(`/api/clientes/?${params.toString()}`);
    clienteOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar clientes:', error);
  }
}

async function searchVehiculos() {
  const term = vehiculoSearch.value.trim();
  const params = new URLSearchParams({ ordering: 'placa', page: '1' });
  if (term) params.set('search', term);
  if (form.cliente?.id) params.set('cliente', String(form.cliente.id));

  if (!term && !form.cliente?.id) {
    vehiculoOptions.value = [];
    return;
  }

  try {
    const data = await request(`/api/vehiculos/?${params.toString()}`);
    vehiculoOptions.value = Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('No se pudieron buscar vehículos:', error);
  }
}

function selectCliente(cliente) {
  form.cliente = cliente;
  form.cliente_identificacion = cliente.identificacion || '';
  form.cliente_telefono = cliente.telefono || '';
  form.cliente_email = cliente.email || '';
  clienteSearch.value = cliente.nombre;
  showClienteDropdown.value = false;
  form.vehiculo = null;
  form.vehiculo_color = '';
  vehiculoSearch.value = '';
  vehiculoSearchDisplay.value = '';
  searchVehiculos();
  if (vehiculoOptions.value.length === 1) {
    selectVehiculo(vehiculoOptions.value[0]);
  }
}

function selectVehiculo(vehiculo) {
  form.vehiculo = vehiculo;
  form.vehiculo_color = vehiculo.color || '';
  vehiculoSearch.value = vehiculo.placa;
  vehiculoSearchDisplay.value = formatPlaca(vehiculo.placa);
  showVehiculoDropdown.value = false;
  marcas.value = [];
  cargarBlueprint(vehiculo.grupo_blueprint);
}

function clearMarcas() {
  marcas.value = [];
}

function clearCliente() {
  form.cliente = null;
  form.cliente_identificacion = '';
  form.cliente_telefono = '';
  form.cliente_email = '';
  clienteSearch.value = '';
  clienteOptions.value = [];
  clearVehiculo();
}

function onClientCreated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
    const nombre = cliente.nombre || 'el cliente';
    successMessage.value = `Cliente "${nombre}" creado correctamente. Continúa con la recepción.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function onClientReactivated(cliente) {
  showClientCreateModal.value = false;
  if (cliente && cliente.id) {
    selectCliente(cliente);
    const nombre = cliente.nombre || 'el cliente';
    successMessage.value = `Cliente "${nombre}" reactivado correctamente. Continúa con la recepción.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function clearVehiculo() {
  form.vehiculo = null;
  form.vehiculo_color = '';
  vehiculoSearch.value = '';
  vehiculoSearchDisplay.value = '';
  vehiculoOptions.value = [];
}

function validateRecepcion() {
  const errors = {};
  const esNoAceptada = clienteNoFirma.value;

  if (!form.cliente) {
    errors.cliente = 'El cliente es obligatorio.';
  }

  if (!form.vehiculo) {
    errors.vehiculo = 'El vehículo es obligatorio.';
  }

  if (!form.recibido_por) {
    errors.recibido_por = 'El empleado que recibe es obligatorio.';
  }

  if (esNoAceptada && !firmaReceptorData.value) {
    errors.firma_receptor = 'La firma del receptor es obligatoria como testigo del rechazo del cliente.';
  }

  const kmRaw = form.kilometraje_ingreso;
  const kmStr = kmRaw == null ? '' : String(kmRaw).trim();
  if (kmStr === '') {
    errors.kilometraje_ingreso = 'El kilometraje es obligatorio y debe ser mayor a 0.';
  } else {
    const km = Number(kmStr);
    if (Number.isNaN(km)) {
      errors.kilometraje_ingreso = 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
    } else if (km < 0) {
      errors.kilometraje_ingreso = 'El kilometraje no puede ser negativo. Por favor ingresa un valor mayor a 0.';
    } else if (!Number.isInteger(km)) {
      errors.kilometraje_ingreso = 'El kilometraje debe ser un número entero mayor a 0.';
    } else if (!esNoAceptada && km === 0) {
      errors.kilometraje_ingreso = 'El kilometraje debe ser mayor a 0.';
    } else if (!esNoAceptada && form.vehiculo && form.vehiculo.kilometraje_actual != null) {
      const kmVehiculo = Number(form.vehiculo.kilometraje_actual);
      const conservarKmEnEdicion = isEditMode && km === kmVehiculo;
      if (km < kmVehiculo || (km === kmVehiculo && !conservarKmEnEdicion)) {
        errors.kilometraje_ingreso = `El kilometraje de ingreso debe ser mayor al kilometraje registrado del vehículo (${kmVehiculo} km).`;
      }
    }
  }

  if (!form.fecha_ingreso) {
    errors.fecha_ingreso = 'La fecha de ingreso es obligatoria.';
  }

  if (!esNoAceptada && !form.tipo_recepcion) {
    errors.tipo_recepcion = 'El tipo de recepción es obligatorio.';
  }

  if (!esNoAceptada && (!form.motivo_ingreso || !form.motivo_ingreso.trim())) {
    errors.motivo_ingreso = 'El motivo de ingreso es obligatorio.';
  }

  if (esNoAceptada && !(form.motivo_no_recepcion || '').trim()) {
    errors.motivo_no_recepcion = 'Registra el motivo por el cual el cliente no desea firmar la recepción.';
  }

  if (form.ingreso_en_grua && !form.datos_grua) {
    errors.datos_grua = 'Ingresa los datos de la grúa o chófer.';
  }

  const detallesVacios = marcas.value.filter(p => !(p.descripcion || '').trim());
  if (detallesVacios.length > 0) {
    errors.detalles_carroceria = 'Completa todas las descripciones de carrocería.';
  }

  const fotoErrs = {};
  FOTO_VISTAS.forEach((v) => {
    if (!fotosPresence.value[v.key]) {
      fotoErrs[v.key] = `Debes subir la foto de ${v.label.toLowerCase()}.`;
    }
  });
  fotoErrors.value = fotoErrs;
  if (Object.keys(fotoErrs).length > 0) {
    errors.fotos = 'Las 5 fotos de la recepción son obligatorias.';
  }

  formErrors.value = errors;
  detallesErrors.value = {};
  marcas.value.forEach((p, idx) => {
    if (!(p.descripcion || '').trim()) {
      detallesErrors.value[idx] = 'La descripción es obligatoria.';
    }
  });

  return Object.keys(errors).length === 0;
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};
  isSaving.value = true;

  try {
    const isValid = validateRecepcion();
    if (!isValid) {
      errorMessage.value = 'Completa correctamente los campos obligatorios.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isSaving.value = false;
      return;
    }

    const payload = {
      cliente: form.cliente?.id || null,
      vehiculo: form.vehiculo?.id || null,
      tipo_recepcion: form.tipo_recepcion,
      motivo_ingreso: form.motivo_ingreso?.trim() || '',
      fecha_ingreso: form.fecha_ingreso || defaultNow,
      fecha_salida: form.fecha_salida || null,
      recibido_por: form.recibido_por || null,
      kilometraje_ingreso: Number(form.kilometraje_ingreso),
      nivel_combustible: form.nivel_combustible,
      ingreso_en_grua: form.ingreso_en_grua,
      datos_grua: form.ingreso_en_grua ? form.datos_grua : null,
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
      testigo_check_engine: testigos.testigo_check_engine,
      testigo_abs: testigos.testigo_abs,
      testigo_airbag: testigos.testigo_airbag,
      testigo_bateria: testigos.testigo_bateria,
      testigo_aceite: testigos.testigo_aceite,
      testigo_temperatura: testigos.testigo_temperatura,
      otros_testigos_observaciones: testigos.otros_testigos_observaciones || '',
      datos_danos_carroceria: marcas.value,
      detalles_carroceria: form.detalles_carroceria || '',
      firma_receptor: firmaReceptorData.value,
      firma_cliente: clienteNoFirma.value ? null : firmaClienteData.value,
      aceptacion_condiciones: clienteNoFirma.value ? false : (isEditMode ? undefined : !!form.aceptacion_condiciones),
      estado: clienteNoFirma.value ? 'NO_ACEPTADA' : (form.estado || 'PENDIENTE'),
      motivo_no_recepcion: (form.motivo_no_recepcion || '').trim() || null,
    };

    const fd = new FormData();
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === undefined || value === null) {
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
      successMessage.value = 'Recepción actualizada correctamente.';
    } else {
      await recepcionesService.create(fd);
      successMessage.value = 'Recepción creada correctamente.';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

watch(() => clienteSearch.value, () => {
  if (!clienteSearch.value.trim()) {
    clearCliente();
    return;
  }
  searchClientes();
});

watch(() => vehiculoSearch.value, () => {
  searchVehiculos();
});

watch(() => recibidoPorSearch.value, () => {
  if (!recibidoPorSearch.value.trim()) {
    clearEmpleado();
    return;
  }
  searchEmpleados();
});

watch(() => form.vehiculo?.tipo, (tipo) => {
  const grupo = tipo ? GRUPO_BLUEPRINT_MAP[tipo] : null;
  if (grupo) {
    cargarBlueprint(grupo);
  } else {
    blueprintImageUrl.value = '';
  }
});

watch(() => marcas.value, () => {
  syncDetallesCarroceria();
}, { deep: true });

watch(() => form.motivo_ingreso, (val) => {
  const clean = sanitizeObservaciones(val);
  if (clean !== val) form.motivo_ingreso = clean;
});

function cancelarClienteNoFirma() {
  clienteNoFirma.value = false;
  formErrors.value = { ...formErrors.value, motivo_no_recepcion: '' };
}

onMounted(() => {
  loadRecepcion();
  loadEmpleados();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/recepciones/" class="hover:text-primary-600">Recepciones</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Nueva' }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
      {{ isEditMode ? 'Editar recepción' : 'Nueva recepción' }}
    </h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando recepción...</div>
      <form v-else-if="!errorMessage" class="space-y-6" novalidate @submit.prevent="submit">
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
          <div class="relative col-span-1">
            <label for="cliente" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cliente</label>
            <div class="flex">
              <input
                id="cliente"
                v-model="clienteSearch"
                autocomplete="off"
                placeholder="Buscar cliente..."
                :class="['block w-full p-2.5 text-sm rounded-l-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.cliente ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
                 @focus="showClienteDropdown = true"
                 @blur="async () => { await wait(150); showClienteDropdown = false; }"
              />
              <button
                type="button"
                title="Crear cliente nuevo"
                aria-label="Crear cliente nuevo"
                class="shrink-0 inline-flex items-center px-3 py-2.5 text-white bg-primary-blue-500 border border-primary-blue-500 rounded-r-lg hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300"
                @click="showClientCreateModal = true"
              >
                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12h4m-2 2v-4M4 18v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm8-10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                </svg>
              </button>
            </div>
            <p v-if="formErrors.cliente" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.cliente }}</p>
            <div v-if="showClienteDropdown && clienteOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in clienteOptions"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @mousedown="selectCliente(item)"
              >
                {{ item.nombre }}
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="cliente_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</label>
            <input
              id="cliente_identificacion"
              :value="form.cliente_identificacion"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="cliente_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
            <input
              id="cliente_telefono"
              :value="form.cliente_telefono"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="cliente_email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo</label>
            <input
              id="cliente_email"
              :value="form.cliente_email"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
        </div>

        <h5 class="mb-3 text-base font-semibold text-gray-800 dark:text-gray-200">Datos del Vehículo</h5>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="relative col-span-1">
            <label for="vehiculo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
            <input
              id="vehiculo"
              v-model="vehiculoSearchDisplay"
              autocomplete="off"
              placeholder="Buscar placa..."
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.vehiculo ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
               @focus="showVehiculoDropdown = true; vehiculoSearchDisplay = vehiculoSearch"
               @blur="async () => { await wait(150); showVehiculoDropdown = false; vehiculoSearch = vehiculoSearchDisplay.replace(/-/g, '').toUpperCase(); vehiculoSearchDisplay = formatPlaca(vehiculoSearch); }"
            />
            <p v-if="formErrors.vehiculo" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.vehiculo }}</p>
            <div v-if="showVehiculoDropdown && vehiculoOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in vehiculoOptions"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @mousedown="selectVehiculo(item)"
              >
                {{ formatPlaca(item.placa) }}
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="vehiculo_marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
            <input
              id="vehiculo_marca"
              :value="form.vehiculo ? form.vehiculo.marca : ''"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="vehiculo_modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
            <input
              id="vehiculo_modelo"
              :value="form.vehiculo ? form.vehiculo.modelo : ''"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>

          <div class="col-span-1">
            <label for="vehiculo_color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
            <input
              id="vehiculo_color"
              v-model="form.vehiculo_color"
              type="text"
              disabled
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
            Información de Ingreso
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="col-span-1">
            <label for="fecha_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Ingreso</label>
            <input
              id="fecha_ingreso"
              v-model="form.fecha_ingreso"
              type="datetime-local"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.fecha_ingreso ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.fecha_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.fecha_ingreso }}</p>
          </div>

          <div class="col-span-1">
            <label for="fecha_salida" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Fecha de Salida (estimada)</label>
            <input
              id="fecha_salida"
              v-model="form.fecha_salida"
              type="datetime-local"
              class="block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white"
            />
          </div>

           <div class="col-span-1">
            <label for="tipo_recepcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de Recepción</label>
            <select id="tipo_recepcion" v-model="form.tipo_recepcion" :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.tipo_recepcion ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']">
              <option value="PREVENTIVO">Mantenimiento Preventivo</option>
              <option value="CORRECTIVO">Reparación Correctiva</option>
              <option value="DIAGNOSTICO">Solo Diagnóstico / Escaneo</option>
              <option value="ESTETICA">Enderezada, Pintura o Detailing</option>
              <option value="GARANTIA">Garantía / Retorno</option>
            </select>
            <p v-if="formErrors.tipo_recepcion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.tipo_recepcion }}</p>
          </div>

          <div class="col-span-1">
            <label for="motivo_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motivo de Ingreso</label>
            <textarea id="motivo_ingreso" v-model="form.motivo_ingreso" rows="2" placeholder="Describe la razón por la que el cliente trae el vehículo..." :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_ingreso ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"></textarea>
            <p v-if="formErrors.motivo_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.motivo_ingreso }}</p>
          </div>

          <div class="relative col-span-1">
            <label for="recibido_por" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recibido por</label>
            <input
              id="recibido_por"
              v-model="recibidoPorSearch"
              autocomplete="off"
              placeholder="Buscar empleado..."
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.recibido_por ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
               @focus="showEmpleadoDropdown = true"
               @blur="async () => { await wait(150); showEmpleadoDropdown = false; }"
            />
            <p v-if="formErrors.recibido_por" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.recibido_por }}</p>
            <div v-if="showEmpleadoDropdown && empleadoOptions.length" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600">
              <button
                v-for="item in empleadoOptions"
                :key="item.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                @mousedown="selectEmpleado(item)"
              >
                {{ item.user?.first_name }} {{ item.user?.last_name }} - {{ item.rol_display || item.rol }}
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="kilometraje_ingreso" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje de Ingreso</label>
            <input
              id="kilometraje_ingreso"
              v-model="form.kilometraje_ingreso"
              type="number"
              min="1"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.kilometraje_ingreso ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.kilometraje_ingreso" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.kilometraje_ingreso }}</p>
          </div>

          <div class="col-span-1">
            <label for="nivel_combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nivel de Combustible</label>
            <select id="nivel_combustible" v-model="form.nivel_combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              <option value="VACIO">Vacío</option>
              <option value="RESERVA">Reserva</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="3/4">3/4</option>
              <option value="LLENO">Lleno</option>
            </select>
          </div>

          <div class="col-span-1 flex items-center mt-6">
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.ingreso_en_grua" type="checkbox" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              <span class="ml-3 text-sm font-medium text-gray-900 dark:text-white">¿Ingresó en grúa?</span>
            </label>
          </div>

          <div v-if="form.ingreso_en_grua" class="col-span-1">
            <label for="datos_grua" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Datos de la grúa / Chófer</label>
            <input
              id="datos_grua"
              :value="form.datos_grua"
              @input="sanitizeDatosGrua($event.target.value)"
              placeholder="Datos Grúa / chófer"
              maxlength="80"
              :class="['block w-full p-2.5 text-sm rounded-lg bg-gray-50 border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.datos_grua ? 'bg-red-50 border-red-500 text-red-900 dark:bg-gray-700 dark:text-red-500 dark:border-red-500' : '']"
            />
            <p v-if="formErrors.datos_grua" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.datos_grua }}</p>
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 7 2 2 4-4m-5-9v4h4V3h-4Z"/>
            </svg>
            Inventario del Vehículo
          </span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Elementos Exteriores / Mecánicos</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_espejo_izquierdo', label: 'Espejo Izquierdo' },
                { key: 'tiene_espejo_derecho', label: 'Espejo Derecho' },
                { key: 'tiene_vidrios', label: 'Vidrios / Cristales' },
                { key: 'tiene_faros_lunas', label: 'Faros / Lunas' },
                { key: 'tiene_tapa_gasolina', label: 'Tapa de Gasolina' },
                { key: 'tiene_placas', label: 'Placas de Circulación' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Interiores / Confort</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_radio', label: 'Radio / Mascarilla' },
                { key: 'tiene_pantalla', label: 'Pantalla / Multimedia' },
                { key: 'tiene_encendedor', label: 'Encendedor' },
                { key: 'tiene_control_puertas', label: 'Control de Puertas' },
                { key: 'tiene_cargador_celular', label: 'Cargador de Celular' },
                { key: 'tiene_tapetes', label: 'Tapetes / Alfombras' },
                { key: 'tiene_cubresol', label: 'Cubresol' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seguridad y Emergencia</p>
            <div class="space-y-2">
              <label v-for="field in [
                { key: 'tiene_llanta_repuesto', label: 'Llanta de Repuesto' },
                { key: 'tiene_gata_palanca', label: 'Gata y Palanca' },
                { key: 'tiene_herramientas', label: 'Juego de Herramientas' },
                { key: 'tiene_extintor', label: 'Extintor' },
                { key: 'tiene_botiquin', label: 'Botiquín' },
                { key: 'tiene_triangulos', label: 'Triángulos de Seguridad' },
                { key: 'tiene_llave_tuercas', label: 'Llave de Tuercas' },
              ]" :key="field.key" class="flex items-center">
                <input v-model="form[field.key]" type="checkbox" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <span class="ml-2 text-sm text-gray-900 dark:text-white">{{ field.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            Luces Tablero
          </span>
        </h4>

        <TestigosTablero v-model="testigos" />

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
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
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marcación de Daños (Clic en el diagrama)</p>
            <p v-if="blueprintError" class="mb-2 text-sm text-red-600 dark:text-red-500">{{ blueprintError }}</p>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <div v-if="!form.vehiculo" class="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">Selecciona un vehículo para cargar el diagrama.</div>
              <div v-else class="relative" style="aspect-ratio: 4/3;">
                <img v-if="blueprintImageUrl" :src="blueprintImageUrl" class="absolute inset-0 w-full h-full object-contain" @click="onBlueprintClick" />
                <div class="absolute inset-0 pointer-events-none">
                  <span
                    v-for="(punto, idx) in marcas"
                    :key="punto.id"
                    class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full -translate-x-1/2 -translate-y-1/2"
                    :style="{ left: punto.x + '%', top: punto.y + '%' }"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex justify-center mt-3">
              <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20" @click="clearMarcas">
                <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                </svg>
                Limpiar marcaciones
              </button>
            </div>
          </div>

          <div class="col-span-1">
            <label for="detalles_carroceria" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Detalles de Carrocería</label>
            <div class="mt-2 space-y-2">
              <div v-for="(punto, idx) in marcas" :key="punto.id" class="flex items-start gap-2">
                <span class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full mt-1">{{ idx + 1 }}</span>
                <div class="flex-1">
                <input
                  :value="punto.descripcion"
                  @input="sanitizeDetalleCarroceria(punto, $event.target.value)"
                  type="text"
                  :name="`detalle_carroceria_${punto.id}`"
                  placeholder="Descripción del daño..."
                  maxlength="80"
                  :class="['block w-full p-2 text-sm bg-white border rounded-lg dark:bg-gray-700 dark:text-white', detallesErrors[idx] ? 'border-red-500 text-red-900 dark:text-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600']"
                />
                <p v-if="detallesErrors[idx]" class="mt-1 text-sm text-red-600 dark:text-red-500">{{ detallesErrors[idx] }}</p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ punto.descripcion.length }}/80</p>
                </div>
                <button type="button" class="inline-flex items-center justify-center w-8 h-8 text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20 mt-1" @click="marcas = marcas.filter(m => m.id !== punto.id)">
                  <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm5.757-1a1 1 0 1 0 0 2h8.486a1 1 0 1 0 0-2H7.757Z" clip-rule="evenodd"/>
                  </svg>
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

        <h4 class="mb-1 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M3 7a1 1 0 0 1 1-1h11.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M8 4h1v3H8V4Zm4 0h1v3h-1V4Zm4 0h2v3h-2V4Z"/>
            </svg>
            Evidencia Fotográfica del Vehículo
          </span>
        </h4>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Debes adjuntar las 5 vistas obligatorias del estado del vehículo en el momento de la recepción.
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
            previewable
            @change="onFotosChange"
          />
        </div>

        <h4 class="mb-4 text-xl font-semibold dark:text-white">
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
            <div v-if="form.fecha_firma_receptor" class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Firmado el {{ formatFechaFirma(form.fecha_firma_receptor) }}
            </div>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <canvas
                ref="firmaReceptorCanvas"
                width="400"
                height="150"
                class="w-full h-auto bg-white touch-none"
                @pointerdown="onReceptorPointerDown"
                @pointermove="onReceptorPointerMove"
                @pointerup="onReceptorPointerUp"
                @pointerleave="onReceptorPointerUp"
              ></canvas>
            </div>
            <div class="flex justify-between items-center mt-2">
              <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20" @click="clearCanvas(firmaReceptorCanvas.value, firmaReceptorData)">
                <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm5.757-1a1 1 0 1 0 0 2h8.486a1 1 0 1 0 0-2H7.757Z" clip-rule="evenodd"/>
                </svg>
                Borrar firma receptor
              </button>
              <span class="text-xs text-gray-500 dark:text-gray-400">Firme del receptor</span>
            </div>
            <p v-if="formErrors.firma_receptor" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.firma_receptor }}</p>
          </div>

          <div class="col-span-1">
            <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Firma del Cliente</p>
            <div v-if="form.fecha_firma_cliente" class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Firmado el {{ formatFechaFirma(form.fecha_firma_cliente) }}
            </div>
            <div class="relative bg-white border border-gray-300 rounded-lg dark:bg-white dark:border-gray-600 overflow-hidden">
              <canvas
                ref="firmaClienteCanvas"
                width="400"
                height="150"
                class="w-full h-auto bg-white touch-none"
                @pointerdown="onClientePointerDown"
                @pointermove="onClientePointerMove"
                @pointerup="onClientePointerUp"
                @pointerleave="onClientePointerUp"
              ></canvas>
            </div>
            <div class="flex justify-between items-center mt-2">
              <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-400 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20" @click="clearCanvas(firmaClienteCanvas.value, firmaClienteData)">
                <svg class="w-5 h-5 text-red-700 dark:text-red-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm5.757-1a1 1 0 1 0 0 2h8.486a1 1 0 1 0 0-2H7.757Z" clip-rule="evenodd"/>
                </svg>
                Borrar firma cliente
              </button>
              <span class="text-xs text-gray-500 dark:text-gray-400">Firma del cliente</span>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <label class="flex items-center gap-2">
            <input
              v-model="form.aceptacion_condiciones"
              type="checkbox"
              :disabled="isEditMode"
              class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              El cliente acepta las condiciones de recepción y el estado reportado del vehículo.
            </span>
          </label>
          <p v-if="isEditMode" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Esta opción no se puede modificar una vez creada la recepción.
          </p>
        </div>

        <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <template v-if="!clienteNoFirma">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-500"
              @click="clienteNoFirma = true"
            >
              <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4.243a1 1 0 1 0-2 0V11H7.757a1 1 0 1 0 0 2H11v3.243a1 1 0 1 0 2 0V13h3.243a1 1 0 1 0 0-2H13V7.757Z" clip-rule="evenodd"/>
              </svg>
              El cliente no desea firmar
            </button>
          </template>
          <template v-else>
            <div class="p-4 bg-yellow-50 border border-yellow-300 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-500">
              <p class="mb-2 text-sm font-medium text-yellow-900 dark:text-yellow-200">
                El cliente no firmará la recepción. Registra el motivo y guarda para dejar la recepción como "No Aceptada / Sin Firma".
              </p>
              <textarea
                v-model="form.motivo_no_recepcion"
                rows="3"
                placeholder="Registra el motivo por el cual el cliente no aceptó las condiciones o no dejó el vehículo..."
                :class="['block w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 dark:bg-gray-700 dark:text-white', formErrors.motivo_no_recepcion ? 'bg-yellow-50 border-yellow-500 text-yellow-900 dark:bg-gray-700 dark:text-yellow-500 dark:border-yellow-500' : '']"
              ></textarea>
              <p v-if="formErrors.motivo_no_recepcion" class="mt-2 text-sm text-yellow-600 dark:text-yellow-500">{{ formErrors.motivo_no_recepcion }}</p>
              <div class="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-yellow-700 border border-yellow-400 rounded hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-500 dark:hover:bg-yellow-900/20"
                  @click="cancelarClienteNoFirma"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </template>
        </div>

        <div class="col-span-1 md:col-span-4">
          <FormSaveActions
            :is-loading="isSaving"
            :is-edit-mode="isEditMode"
            cancel-href="/crud/recepciones/"
            :on-submit="submit"
          />
        </div>
      </form>
    </div>
  </div>

  <ClientModal
    v-model="showClientCreateModal"
    @created="onClientCreated"
    @reactivated="onClientReactivated"
  />
</template>
