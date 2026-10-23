<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import {
  FileSpreadsheet, ArrowDownRight, ArrowUpRight, ClipboardList, Gauge, Loader2, Minus, Receipt, Wallet,
} from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { formatCurrency } from '../../../shared/utils/format';
import { useAuthStore } from '../../auth/stores/authStore';
import { descargarResumenExcel, descargarResumenPdf, fetchResumenNegocio } from '../services/reportesService';
import { descargarBlob, filenameDesdeContentDisposition } from '@/shared/utils/download';
import FacturadoCobradoChart from './FacturadoCobradoChart.vue';

/**
 * Resumen del negocio para el dueño (RF-07): lo que hoy calcula a mano en su
 * Excel, del periodo elegido frente al anterior de igual duración. Las
 * definiciones de cada cifra las da el backend (`definiciones`).
 */
const authStore = useAuthStore();
const { sinAcceso, cargarPermisos } = usePermisos();

const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const ATAJOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'semana', etiqueta: 'Esta semana' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mes_pasado', etiqueta: 'Mes pasado' },
  { clave: 'rango', etiqueta: 'Rango' },
];

// Indicadores en tarjetas. `inverso`: que suba es malo (gastos, costos, deuda).
const TARJETAS = [
  { clave: 'facturado', titulo: 'Facturado', ayuda: 'facturado' },
  { clave: 'cobrado', titulo: 'Cobrado', ayuda: 'cobrado' },
  { clave: 'por_cobrar', titulo: 'Por cobrar', ayuda: 'por_cobrar', inverso: true },
  { clave: 'gastos', titulo: 'Gastos', inverso: true },
  { clave: 'costo_trabajos', titulo: 'Costo de los trabajos', ayuda: 'costo_trabajos', inverso: true },
  { clave: 'utilidad', titulo: 'Utilidad', ayuda: 'utilidad', destacado: true },
  { clave: 'ticket_promedio', titulo: 'Ticket promedio', ayuda: 'ticket_promedio' },
  { clave: 'ordenes_entregadas', titulo: 'Órdenes entregadas', entero: true },
];

function iso(fecha) {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function rangoDe(clave) {
  const hoy = new Date();
  if (clave === 'hoy') return [iso(hoy), iso(hoy)];
  if (clave === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return [iso(lunes), iso(hoy)];
  }
  if (clave === 'mes_pasado') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return [iso(inicio), iso(fin)];
  }
  return [iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy)];
}

const atajo = ref('mes');
const [desdeInicial, hastaInicial] = rangoDe('mes');
const fechaDesde = ref(desdeInicial);
const fechaHasta = ref(hastaInicial);
const tallerId = ref(null);

const datos = ref(null);
const cargando = ref(false);
const error = ref('');

const parametros = computed(() => ({
  fecha_desde: fechaDesde.value,
  fecha_hasta: fechaHasta.value,
  taller_id: tallerId.value,
}));

function formatoFecha(valor) {
  if (!valor) return '';
  const [anio, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${anio}`;
}

function valor(tarjeta, kpi) {
  return tarjeta.entero ? Number(kpi).toLocaleString('es-EC') : formatCurrency(kpi);
}

function tendencia(tarjeta) {
  const kpi = datos.value?.kpis?.[tarjeta.clave];
  const variacion = Number(kpi?.variacion) || 0;
  if (!kpi || variacion === 0) return { icono: Minus, clase: 'text-gray-500 dark:text-gray-400', texto: 'Sin cambio' };
  const sube = variacion > 0;
  const bueno = tarjeta.inverso ? !sube : sube;
  const pct = kpi.variacion_pct === null || kpi.variacion_pct === undefined ? '' : ` (${sube ? '+' : ''}${kpi.variacion_pct}%)`;
  const monto = tarjeta.entero ? Math.abs(variacion).toLocaleString('es-EC') : formatCurrency(Math.abs(variacion));
  return {
    icono: sube ? ArrowUpRight : ArrowDownRight,
    clase: bueno ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-400',
    texto: `${sube ? '+' : '−'}${monto}${pct}`,
  };
}

const exportandoExcel = ref(false);
async function exportarExcel() {
  if (exportandoExcel.value) return;
  exportandoExcel.value = true;
  error.value = '';
  try {
    const { blob, contentDisposition } = await descargarResumenExcel({ ...parametros.value });
    descargarBlob(blob, filenameDesdeContentDisposition(contentDisposition, 'resumen_negocio.xlsx'));
  } catch (err) { error.value = err.message || 'No se pudo exportar el resumen a Excel.'; }
  finally { exportandoExcel.value = false; }
}

async function consultar() {
  if (fechaDesde.value && fechaHasta.value && fechaDesde.value > fechaHasta.value) {
    error.value = 'La fecha inicial no puede ser posterior a la final.';
    return;
  }
  cargando.value = true;
  error.value = '';
  try {
    datos.value = await fetchResumenNegocio(parametros.value);
  } catch (err) {
    error.value = err.data?.error || err.message || 'No se pudo cargar el resumen.';
  } finally {
    cargando.value = false;
  }
}

function elegirAtajo(clave) {
  atajo.value = clave;
  if (clave === 'rango') return;
  [fechaDesde.value, fechaHasta.value] = rangoDe(clave);
}

watch(parametros, consultar);

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('reportes')) consultar();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('reportes')" seccion="Resumen del negocio" />
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Resumen del negocio"
      :icon="Gauge"
      :breadcrumb="[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Resumen del negocio' }]"
    >
      <template #actions>
        <button type="button" :disabled="exportandoExcel" title="Exportar el resumen en Excel" class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-medium text-brand-900 disabled:opacity-50 dark:bg-gray-800 dark:text-white" @click="exportarExcel">
          <Loader2 v-if="exportandoExcel" class="h-5 w-5 animate-spin" />
          <FileSpreadsheet v-else class="h-5 w-5" />
          {{ exportandoExcel ? 'Generando…' : 'Excel' }}
        </button>
        <PdfExportButton
          :descargador="() => descargarResumenPdf(parametros)"
          title="Exportar el resumen en PDF"
          @error="(mensaje) => (error = mensaje)" />
      </template>
    </EntityHeader>

    <div class="px-4 pb-6 mt-4 space-y-4 sm:px-6 lg:px-8">
      <!-- Periodo -->
      <section :class="SECCION">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Periodo">
          <button
            v-for="opcion in ATAJOS"
            :key="opcion.clave"
            type="button"
            class="px-3 py-1.5 text-sm font-medium rounded-full border"
            :class="atajo === opcion.clave
              ? 'bg-brand-900 text-white border-brand-900 dark:bg-brand-300 dark:text-brand-900 dark:border-brand-300'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'"
            :aria-pressed="atajo === opcion.clave"
            @click="elegirAtajo(opcion.clave)">
            {{ opcion.etiqueta }}
          </button>
        </div>
        <div class="flex flex-wrap items-end gap-3 mt-3">
          <div v-if="atajo === 'rango'" class="w-full sm:w-44">
            <label for="resumen-desde" class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
            <input
              id="resumen-desde"
              v-model="fechaDesde"
              type="date"
              class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          </div>
          <div v-if="atajo === 'rango'" class="w-full sm:w-44">
            <label for="resumen-hasta" class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
            <input
              id="resumen-hasta"
              v-model="fechaHasta"
              type="date"
              class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          </div>
          <!-- Solo con «Todos los talleres»: con un taller activo el backend ya filtra por él. -->
          <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:max-w-[22rem]">
            <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Taller</label>
            <TallerSelect v-model="tallerId" variante="campo" placeholder="Todos los talleres" permitirTodos />
          </div>
        </div>
        <p v-if="datos" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Del {{ formatoFecha(datos.periodo.desde) }} al {{ formatoFecha(datos.periodo.hasta) }},
          comparado con el {{ formatoFecha(datos.periodo_anterior.desde) }} al {{ formatoFecha(datos.periodo_anterior.hasta) }}.
        </p>
      </section>

      <Alert v-if="error" type="error" :message="error" dismissible @dismiss="error = ''" />

      <div v-if="cargando && !datos" :class="[SECCION, 'flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
        <Loader2 class="w-4 h-4 animate-spin" />
        Calculando resumen...
      </div>

      <template v-if="datos">
        <!-- Indicadores -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" :class="cargando ? 'opacity-60' : ''">
          <div
            v-for="tarjeta in TARJETAS"
            :key="tarjeta.clave"
            class="p-4 border rounded-lg shadow-xs"
            :class="tarjeta.destacado
              ? 'bg-brand-50 border-brand-200 dark:bg-brand-700/20 dark:border-brand-500/40'
              : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'"
            :title="tarjeta.ayuda ? datos.definiciones[tarjeta.ayuda] : ''">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ tarjeta.titulo }}</p>
            <p
              class="mt-1 text-lg font-bold tabular-nums sm:text-2xl"
              :class="tarjeta.clave === 'utilidad' && Number(datos.kpis.utilidad.actual) < 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'">
              {{ valor(tarjeta, datos.kpis[tarjeta.clave].actual) }}
            </p>
            <p class="flex items-center gap-1 mt-1 text-xs font-medium tabular-nums" :class="tendencia(tarjeta).clase">
              <component :is="tendencia(tarjeta).icono" class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {{ tendencia(tarjeta).texto }}
            </p>
          </div>
        </div>

        <section :class="SECCION">
          <h3 :class="[TITULO_SECCION, 'mb-2']">
            <Receipt class="w-4 h-4" />
            Facturado y cobrado {{ datos.serie.agrupacion === 'mes' ? 'por mes' : 'por día' }}
          </h3>
          <FacturadoCobradoChart :puntos="datos.serie.puntos" />
        </section>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section :class="SECCION">
            <h3 :class="[TITULO_SECCION, 'mb-3']">
              <Wallet class="w-4 h-4" />
              Cobrado por forma de pago
            </h3>
            <p v-if="!datos.actual.cobrado.por_forma.length" class="text-sm text-gray-500 dark:text-gray-400">Sin cobros en el periodo.</p>
            <table v-else class="w-full text-sm">
              <tbody class="text-gray-700 divide-y divide-gray-100 dark:text-gray-300 dark:divide-gray-700">
                <tr v-for="fila in datos.actual.cobrado.por_forma" :key="fila.forma_pago">
                  <td class="py-2 text-gray-700 dark:text-gray-300">
                    {{ fila.forma_pago_display }}
                    <span v-if="Number(fila.devoluciones)" class="text-xs text-gray-500 dark:text-gray-400">
                      (devuelto {{ formatCurrency(fila.devoluciones) }})
                    </span>
                  </td>
                  <td class="py-2 font-semibold text-right text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(fila.neto) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section :class="SECCION">
            <h3 :class="[TITULO_SECCION, 'mb-3']">
              <Receipt class="w-4 h-4" />
              Gastos por categoría
            </h3>
            <p v-if="!datos.actual.gastos.por_categoria.length" class="text-sm text-gray-500 dark:text-gray-400">Sin gastos registrados en el periodo.</p>
            <table v-else class="w-full text-sm">
              <tbody class="text-gray-700 divide-y divide-gray-100 dark:text-gray-300 dark:divide-gray-700">
                <tr v-for="fila in datos.actual.gastos.por_categoria" :key="fila.categoria">
                  <td class="py-2 text-gray-700 dark:text-gray-300">{{ fila.categoria_display }}</td>
                  <td class="py-2 font-semibold text-right text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(fila.total) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section :class="SECCION">
            <h3 :class="[TITULO_SECCION, 'mb-3']">
              <ClipboardList class="w-4 h-4" />
              Órdenes del periodo
            </h3>
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div><dt class="text-xs text-gray-500 dark:text-gray-400">Creadas</dt><dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ datos.actual.ordenes.creadas }}</dd></div>
              <div><dt class="text-xs text-gray-500 dark:text-gray-400">Entregadas</dt><dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ datos.actual.ordenes.entregadas }}</dd></div>
              <div><dt class="text-xs text-gray-500 dark:text-gray-400">Abiertas al cierre</dt><dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ datos.actual.ordenes.abiertas }}</dd></div>
              <div><dt class="text-xs text-gray-500 dark:text-gray-400">Anuladas</dt><dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ datos.actual.ordenes.anuladas }}</dd></div>
            </dl>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Facturado sin IVA {{ formatCurrency(datos.actual.ingresos) }} · base 0 % {{ formatCurrency(datos.actual.facturado.base_0) }} ·
              base gravada {{ formatCurrency(datos.actual.facturado.base_gravada) }} · IVA {{ formatCurrency(datos.actual.facturado.iva) }}
            </p>
          </section>

          <section :class="SECCION">
            <h3 :class="[TITULO_SECCION, 'mb-3']">
              <Gauge class="w-4 h-4" />
              Servicios que más facturan
            </h3>
            <p v-if="!datos.top_servicios.length" class="text-sm text-gray-500 dark:text-gray-400">Sin servicios entregados en el periodo.</p>
            <ol v-else class="space-y-2 text-sm">
              <li v-for="(servicio, indice) in datos.top_servicios" :key="servicio.descripcion" class="flex items-baseline justify-between gap-3">
                <span class="min-w-0 truncate text-gray-700 dark:text-gray-300">
                  <span class="text-gray-400">{{ indice + 1 }}.</span> {{ servicio.descripcion }}
                  <span class="text-xs text-gray-500 dark:text-gray-400">({{ servicio.veces }})</span>
                </span>
                <span class="font-semibold text-gray-900 tabular-nums whitespace-nowrap dark:text-white">{{ formatCurrency(servicio.total) }}</span>
              </li>
            </ol>
          </section>
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          Utilidad = {{ datos.definiciones.utilidad }} Por cobrar: {{ datos.definiciones.por_cobrar }}
        </p>
      </template>
    </div>
  </div>
</template>
