<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Loader2, Plus, ShoppingCart, Trash2, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import CatalogoSelect from '../../../shared/components/CatalogoSelect.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { proveedoresService } from '../../proveedores/services/proveedoresService';
import { repuestosService } from '../../inventario/repuestos/services/repuestosService';
import { FORMAS_PAGO } from '../../pagos/constants/pagos';
import { CONDICIONES_COMPRA, IVA_COMPRA } from '../constants/compras';
import { comprasService } from '../services/comprasService';

/**
 * Registro de una factura de proveedor. Al guardar, el backend suma el stock
 * de cada repuesto y recalcula su costo promedio; a contado deja la compra
 * pagada. Emite `created` con la compra.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'created']);

const INPUT = 'block w-full p-2.5 text-sm rounded border shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white';
const OK = 'bg-gray-50 border-gray-300 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600';
const MAL = 'bg-red-50 border-red-500 focus:ring-red-200';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';

function hoy() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function lineaVacia() {
  return { clave: Date.now() + Math.random(), texto: '', repuesto: null, cantidad: '1', costo_unitario: '', iva_porcentaje: '0.15' };
}

const form = reactive({
  proveedor: null,
  numero_factura: '',
  fecha: hoy(),
  condicion: 'CREDITO',
  fecha_vencimiento: '',
  forma_pago: 'EFECTIVO',
  observaciones: '',
  lineas: [lineaVacia()],
});
let inicial = '';
const errores = ref({});
const errorMessage = ref('');
const guardando = ref(false);
const confirmandoDescarte = ref(false);

const catalogo = ref([]);
const busquedaProveedor = ref('');
const proveedores = ref([]);
const buscandoProveedor = ref(false);
let temporizador = null;

const hayCambios = computed(() => JSON.stringify(form) !== inicial);

const totales = computed(() => form.lineas.reduce((acc, linea) => {
  const subtotal = (Number(linea.cantidad) || 0) * (Number(linea.costo_unitario) || 0);
  acc.subtotal += subtotal;
  acc.iva += subtotal * Number(linea.iva_porcentaje || 0);
  return acc;
}, { subtotal: 0, iva: 0 }));

watch(() => props.modelValue, async (abierto) => {
  if (!abierto) return;
  Object.assign(form, {
    proveedor: null, numero_factura: '', fecha: hoy(), condicion: 'CREDITO', fecha_vencimiento: '',
    forma_pago: 'EFECTIVO', observaciones: '', lineas: [lineaVacia()],
  });
  inicial = JSON.stringify(form);
  busquedaProveedor.value = '';
  proveedores.value = [];
  errores.value = {};
  errorMessage.value = '';
  confirmandoDescarte.value = false;
  if (!catalogo.value.length) {
    try {
      catalogo.value = (await repuestosService.opciones()).results || [];
    } catch {
      catalogo.value = [];
    }
  }
});

function buscarProveedores() {
  clearTimeout(temporizador);
  const termino = busquedaProveedor.value.trim();
  if (termino.length < 2) {
    proveedores.value = [];
    return;
  }
  temporizador = setTimeout(async () => {
    buscandoProveedor.value = true;
    try {
      proveedores.value = (await proveedoresService.list({ search: termino, estado: 'activo' })).results || [];
    } catch {
      proveedores.value = [];
    } finally {
      buscandoProveedor.value = false;
    }
  }, 300);
}

function elegirProveedor(proveedor) {
  form.proveedor = { id: proveedor.id, nombre: proveedor.nombre, identificacion: proveedor.identificacion };
  busquedaProveedor.value = '';
  proveedores.value = [];
}

function elegirRepuesto(item, linea) {
  linea.repuesto = item.id;
  linea.texto = `${item.codigo} - ${item.nombre}`;
  linea.iva_porcentaje = Number(item.iva_porcentaje_defecto) ? '0.15' : '0';
}

function cerrar() {
  if (guardando.value) return;
  if (hayCambios.value && !confirmandoDescarte.value) {
    confirmandoDescarte.value = true;
    return;
  }
  emit('update:modelValue', false);
}

function validar() {
  const nuevos = {};
  if (!form.proveedor) nuevos.proveedor = 'Selecciona el proveedor.';
  if (!form.numero_factura.trim()) nuevos.numero_factura = 'Indica el número de factura.';
  if (!form.fecha) nuevos.fecha = 'Indica la fecha de la factura.';
  const lineas = form.lineas.filter((l) => l.repuesto || l.texto.trim());
  if (!lineas.length) nuevos.lineas = 'Agrega al menos un repuesto.';
  else if (lineas.some((l) => !l.repuesto)) nuevos.lineas = 'Elige cada repuesto del catálogo.';
  else if (lineas.some((l) => !(Number(l.cantidad) > 0) || Number(l.costo_unitario) < 0 || l.costo_unitario === '')) {
    nuevos.lineas = 'Cada línea necesita cantidad mayor a cero y costo unitario.';
  }
  errores.value = nuevos;
  return !Object.keys(nuevos).length;
}

async function guardar() {
  if (guardando.value || !validar()) return;
  guardando.value = true;
  errorMessage.value = '';
  try {
    const compra = await comprasService.create({
      proveedor: form.proveedor.id,
      numero_factura: form.numero_factura.trim(),
      fecha: form.fecha,
      condicion: form.condicion,
      fecha_vencimiento: form.condicion === 'CREDITO' && form.fecha_vencimiento ? form.fecha_vencimiento : null,
      forma_pago: form.forma_pago,
      observaciones: form.observaciones.trim(),
      detalles: form.lineas.filter((l) => l.repuesto).map((l) => ({
        repuesto: l.repuesto,
        cantidad: Number(l.cantidad).toFixed(2),
        costo_unitario: Number(l.costo_unitario).toFixed(2),
        iva_porcentaje: l.iva_porcentaje,
      })),
    });
    emit('created', compra);
    emit('update:modelValue', false);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    const campo = (nombre) => [].concat(data[nombre] || [])[0];
    errores.value = {
      proveedor: campo('proveedor'),
      numero_factura: campo('numero_factura'),
      fecha: campo('fecha'),
      fecha_vencimiento: campo('fecha_vencimiento'),
      lineas: data.detalles ? (typeof data.detalles[0] === 'string' ? data.detalles[0] : 'Revisa las líneas de la compra.') : undefined,
    };
    if (!Object.values(errores.value).some(Boolean)) {
      errorMessage.value = error.message || 'No se pudo registrar la compra.';
    }
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-4xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ShoppingCart class="w-5 h-5" />
          Registrar compra
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="cerrar">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form class="px-6 py-4 space-y-5" novalidate @submit.prevent="guardar">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

        <!-- Factura -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="relative md:col-span-2">
            <label for="compra-proveedor" :class="ETIQUETA">Proveedor <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <div v-if="form.proveedor" class="flex items-center justify-between gap-2 p-2.5 text-sm border rounded bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600">
              <span class="truncate text-gray-900 dark:text-white">
                {{ form.proveedor.nombre }}
                <span class="text-xs text-gray-500 dark:text-gray-400">· {{ form.proveedor.identificacion }}</span>
              </span>
              <button type="button" class="text-xs font-medium text-brand-700 hover:underline dark:text-brand-200" @click="form.proveedor = null">Cambiar</button>
            </div>
            <template v-else>
              <input
                id="compra-proveedor"
                v-model="busquedaProveedor"
                type="search"
                autocomplete="off"
                placeholder="Busca por nombre o RUC"
                :class="[INPUT, errores.proveedor ? MAL : OK]"
                @input="buscarProveedores">
              <ul
                v-if="proveedores.length"
                class="absolute z-20 w-full mt-1 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 dark:bg-gray-700 dark:border-gray-600">
                <li v-for="proveedor in proveedores" :key="proveedor.id">
                  <button type="button" class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600" @click="elegirProveedor(proveedor)">
                    {{ proveedor.nombre }} <span class="text-xs text-gray-500 dark:text-gray-400">· {{ proveedor.identificacion }}</span>
                  </button>
                </li>
              </ul>
              <p v-else-if="busquedaProveedor.trim().length >= 2 && !buscandoProveedor" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sin coincidencias. Registra el proveedor en <a href="/crud/proveedores/" class="underline">Proveedores</a>.
              </p>
            </template>
            <p v-if="errores.proveedor" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.proveedor }}</p>
          </div>
          <div>
            <label for="compra-factura" :class="ETIQUETA">N.º de factura <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <input id="compra-factura" v-model="form.numero_factura" type="text" maxlength="30" placeholder="001-001-000000123" :class="[INPUT, errores.numero_factura ? MAL : OK]">
            <p v-if="errores.numero_factura" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.numero_factura }}</p>
          </div>
          <div>
            <label for="compra-fecha" :class="ETIQUETA">Fecha de la factura <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <input id="compra-fecha" v-model="form.fecha" type="date" :class="[INPUT, errores.fecha ? MAL : OK]">
            <p v-if="errores.fecha" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.fecha }}</p>
          </div>
          <div>
            <label for="compra-condicion" :class="ETIQUETA">Condición</label>
            <select id="compra-condicion" v-model="form.condicion" :class="[INPUT, OK]">
              <option v-for="c in CONDICIONES_COMPRA" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div v-if="form.condicion === 'CREDITO'">
            <label for="compra-vence" :class="ETIQUETA">Vence</label>
            <input id="compra-vence" v-model="form.fecha_vencimiento" type="date" :class="[INPUT, errores.fecha_vencimiento ? MAL : OK]">
            <p v-if="errores.fecha_vencimiento" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errores.fecha_vencimiento }}</p>
          </div>
          <div v-else>
            <label for="compra-forma" :class="ETIQUETA">Forma de pago</label>
            <select id="compra-forma" v-model="form.forma_pago" :class="[INPUT, OK]">
              <option v-for="f in FORMAS_PAGO" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
            <p v-if="form.forma_pago === 'EFECTIVO'" class="mt-2 text-xs text-brand-500 dark:text-brand-300">Se registra una salida de la caja abierta del taller. Debe haber efectivo suficiente.</p>
          </div>
        </div>

        <!-- Líneas -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Repuestos comprados</p>
            <button type="button" class="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-200" @click="form.lineas.push(lineaVacia())">
              <Plus class="w-4 h-4" />
              Agregar línea
            </button>
          </div>
          <div class="space-y-3">
            <div v-for="(linea, index) in form.lineas" :key="linea.clave" class="grid grid-cols-12 gap-2 p-3 border border-gray-200 rounded-lg dark:border-gray-700">
              <div class="col-span-12 md:col-span-5">
                <label :for="`compra-rep-${linea.clave}`" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Repuesto</label>
                <CatalogoSelect
                  v-model="linea.texto"
                  :input-id="`compra-rep-${linea.clave}`"
                  :catalogo="catalogo"
                  mostrar-stock
                  placeholder="Busca por código o nombre"
                  mensaje-sin-resultados="Sin coincidencias. Crea el repuesto en Inventario."
                  @update:model-value="linea.repuesto = null"
                  @select="elegirRepuesto($event, linea)" />
              </div>
              <div class="col-span-4 md:col-span-2">
                <label :for="`compra-cant-${linea.clave}`" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Cantidad</label>
                <input :id="`compra-cant-${linea.clave}`" v-model="linea.cantidad" type="number" min="0.01" step="0.01" :class="[INPUT, OK, 'tabular-nums']">
              </div>
              <div class="col-span-4 md:col-span-2">
                <label :for="`compra-costo-${linea.clave}`" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Costo unit. (sin IVA)</label>
                <input :id="`compra-costo-${linea.clave}`" v-model="linea.costo_unitario" type="number" min="0" step="0.01" :class="[INPUT, OK, 'tabular-nums']">
              </div>
              <div class="col-span-3 md:col-span-2">
                <label :for="`compra-iva-${linea.clave}`" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">IVA</label>
                <select :id="`compra-iva-${linea.clave}`" v-model="linea.iva_porcentaje" :class="[INPUT, OK]">
                  <option v-for="opcion in IVA_COMPRA" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
                </select>
              </div>
              <div class="flex items-end justify-end col-span-1">
                <button
                  type="button"
                  class="p-2 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-gray-700"
                  :disabled="form.lineas.length === 1"
                  aria-label="Quitar línea"
                  @click="form.lineas.splice(index, 1)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <p v-if="errores.lineas" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ errores.lineas }}</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="md:col-span-2">
            <label for="compra-obs" :class="ETIQUETA">Observaciones</label>
            <input id="compra-obs" v-model="form.observaciones" type="text" maxlength="255" :class="[INPUT, OK]">
          </div>
          <dl class="space-y-1 text-sm">
            <div class="flex justify-between text-gray-600 dark:text-gray-300"><dt>Subtotal</dt><dd class="tabular-nums">{{ formatCurrency(totales.subtotal) }}</dd></div>
            <div class="flex justify-between text-gray-600 dark:text-gray-300"><dt>IVA</dt><dd class="tabular-nums">{{ formatCurrency(totales.iva) }}</dd></div>
            <div class="flex justify-between pt-1 font-semibold text-gray-900 border-t border-gray-200 dark:text-white dark:border-gray-700"><dt>Total</dt><dd class="tabular-nums">{{ formatCurrency(totales.subtotal + totales.iva) }}</dd></div>
          </dl>
        </div>
      </form>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <template v-if="confirmandoDescarte">
          <p class="me-auto text-sm text-gray-700 dark:text-gray-300">¿Descartar los datos ingresados?</p>
          <button type="button" class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 font-medium text-sm px-4 py-2.5" @click="confirmandoDescarte = false">
            Seguir editando
          </button>
          <button type="button" class="text-white bg-red-600 rounded hover:bg-red-700 font-medium text-sm px-4 py-2.5" @click="cerrar">
            Descartar
          </button>
        </template>
        <template v-else>
          <button type="button" class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 font-medium text-sm px-4 py-2.5" :disabled="guardando" @click="cerrar">
            Cancelar
          </button>
          <button
            type="button"
            :disabled="guardando"
            class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
            @click="guardar">
            <Loader2 v-if="guardando" class="w-5 h-5 animate-spin" />
            {{ guardando ? 'Registrando...' : 'Registrar compra' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
