<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import {
  ArrowDownToLine, ArrowUpFromLine, Ban, Banknote, Loader2, Lock, LockOpen, RotateCcw,
} from 'lucide-vue-next';
import { IconCashRegister } from '@tabler/icons-vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import PdfExportButton from '../../../shared/components/PdfExportButton.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateTime } from '../../../shared/utils/datetime';
import { useAuthStore } from '../../auth/stores/authStore';
import { cajaService } from '../services/cajaService';
import CerrarCajaModal from './CerrarCajaModal.vue';
import MotivoModal from './MotivoModal.vue';
import MovimientoCajaModal from './MovimientoCajaModal.vue';

/**
 * Caja del taller: abrir la jornada, ver lo cobrado por forma de pago y el
 * efectivo esperado, registrar ingresos/egresos, cerrar con el efectivo
 * contado, e historial de cierres (PDF y reapertura para administradores).
 */
const authStore = useAuthStore();
const { puede, tieneAccion, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeOperar = computed(() => puede('facturacion'));

const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const BOTON = 'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700';
const BOTON_PRIMARIO = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-800 focus:ring-4 focus:ring-brand-200 disabled:opacity-60';

// Con «Todos los talleres» hay que elegir de qué taller es la caja.
const tallerElegido = ref(null);
const requiereTaller = computed(() => authStore.esTodosLosTalleres && !tallerElegido.value);

const estado = ref(null);
const cargando = ref(false);
const alert = ref({ type: 'default', message: '' });

const montoInicial = ref('');
const errorApertura = ref('');
const abriendo = ref(false);

const tipoMovimiento = ref(null);
const mostrarCierre = ref(false);
const accionMotivo = ref(null);

const sesiones = ref([]);
const totalSesiones = ref(0);
const paginaSesiones = ref(1);
const siguiente = ref(null);
const anterior = ref(null);

const sesion = computed(() => estado.value?.sesion || null);
const resumen = computed(() => sesion.value?.resumen || null);

const movimientosDelDia = computed(() => {
  if (!sesion.value) return [];
  const pagos = (sesion.value.pagos || []).map((p) => ({
    clave: `p-${p.id}`,
    fecha: p.fecha,
    titulo: `${p.tipo_display} · ${p.forma_pago_display}`,
    detalle: `${p.numero_orden} · ${p.cliente_nombre}${p.referencia ? ` · ${p.referencia}` : ''}`,
    href: `/crud/ordenes/ver/?id=${encodeURIComponent(p.orden_id)}`,
    monto: p.monto,
    salida: p.tipo === 'DEVOLUCION',
    anulado: p.anulado,
    usuario: p.registrado_por_nombre,
  }));
  const movimientos = (sesion.value.movimientos || []).map((m) => ({
    clave: `m-${m.id}`,
    id: m.id,
    fecha: m.fecha,
    titulo: `${m.tipo_display} de efectivo${m.gasto ? ' · gasto' : ''}`,
    detalle: `${m.motivo}${m.anulable_desde_caja === false ? ' · Anulación desde Compras' : ''}`,
    monto: m.monto,
    salida: m.tipo === 'EGRESO',
    anulado: m.anulado,
    usuario: m.registrado_por_nombre,
    anulable: m.anulable_desde_caja !== false,
  }));
  return [...pagos, ...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
});

const mostrarMovimiento = computed({
  get: () => Boolean(tipoMovimiento.value),
  set: (valor) => { if (!valor) tipoMovimiento.value = null; },
});
const mostrarMotivo = computed({
  get: () => Boolean(accionMotivo.value),
  set: (valor) => { if (!valor) accionMotivo.value = null; },
});

function mostrar(type, message) {
  alert.value = { type, message };
}

async function cargarEstado() {
  if (requiereTaller.value) {
    estado.value = null;
    return;
  }
  cargando.value = true;
  try {
    estado.value = await cajaService.estado({ taller: tallerElegido.value });
    montoInicial.value = estado.value.ultimo_cierre?.efectivo_contado ?? '0.00';
  } catch (error) {
    mostrar('error', [].concat(error.data?.taller || [])[0] || error.message || 'No se pudo cargar la caja.');
  } finally {
    cargando.value = false;
  }
}

async function cargarSesiones(page = 1) {
  try {
    const data = await cajaService.sesiones({ page, taller: tallerElegido.value, estado: 'CERRADA' });
    sesiones.value = data.results || [];
    totalSesiones.value = data.count;
    siguiente.value = data.next;
    anterior.value = data.previous;
    paginaSesiones.value = page;
  } catch (error) {
    mostrar('error', error.message || 'No se pudo cargar el historial de cierres.');
  }
}

function recargar() {
  return Promise.all([cargarEstado(), cargarSesiones(paginaSesiones.value)]);
}

async function abrirCaja() {
  const monto = Number(montoInicial.value);
  if (montoInicial.value === '' || Number.isNaN(monto) || monto < 0) {
    errorApertura.value = 'Ingresa el efectivo con el que abres la caja.';
    return;
  }
  abriendo.value = true;
  errorApertura.value = '';
  try {
    await cajaService.abrir({ taller: tallerElegido.value, monto_inicial: monto.toFixed(2) });
    mostrar('success', 'Caja abierta. Ya puedes registrar pagos.');
    await cargarEstado();
  } catch (error) {
    errorApertura.value = [].concat(error.data?.monto_inicial || error.data?.taller || [])[0] || error.message || 'No se pudo abrir la caja.';
  } finally {
    abriendo.value = false;
  }
}

async function onMovimiento(movimiento) {
  mostrar('success', `${movimiento.tipo_display} de ${formatCurrency(movimiento.monto)} registrado.`);
  await cargarEstado();
}

async function onCerrada(cerrada) {
  const diferencia = Number(cerrada.diferencia);
  mostrar('success', diferencia
    ? `Caja cerrada con un ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${formatCurrency(Math.abs(diferencia))}.`
    : 'Caja cerrada. El efectivo cuadra.');
  await recargar();
}

function anularMovimiento(item) {
  accionMotivo.value = {
    titulo: 'Anular movimiento',
    descripcion: `${item.titulo}: ${formatCurrency(item.monto)} (${item.detalle}).`,
    textoConfirmar: 'Anular',
    peligro: true,
    confirmar: async (motivo) => {
      await cajaService.anularMovimiento(item.id, motivo);
      mostrar('success', 'Movimiento anulado.');
      await cargarEstado();
    },
  };
}

function reabrirSesion(item) {
  accionMotivo.value = {
    titulo: 'Reabrir caja',
    descripcion: `Caja del ${formatDateTime(item.fecha_apertura)} (${item.taller.nombre}). Volverá a admitir pagos y movimientos hasta que se cierre de nuevo.`,
    textoConfirmar: 'Reabrir',
    peligro: false,
    confirmar: async (motivo) => {
      await cajaService.reabrir(item.id, motivo);
      mostrar('success', 'Caja reabierta.');
      await recargar();
    },
  };
}

function claseDiferencia(valor) {
  const numero = Number(valor);
  if (!numero) return 'text-emerald-700 dark:text-emerald-300';
  return 'text-amber-700 dark:text-amber-300';
}

watch(tallerElegido, () => recargar());

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('facturacion')) recargar();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('facturacion')" seccion="Caja" />
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Caja"
      :icon="IconCashRegister"
      :breadcrumb="[{ label: 'Inicio', href: '/' }, { label: 'Caja' }]"
    >
      <template #title-aside>
        <ModoConsultaChip v-if="soloConsulta('facturacion')" objeto="la caja" acciones="abrirla, cerrarla o registrar movimientos" />
      </template>
    </EntityHeader>

    <div v-if="alert.message" class="px-4 pt-3">
      <Alert :type="alert.type" :message="alert.message" dismissible @dismiss="alert.message = ''" />
    </div>

    <div class="px-4 pb-6 mt-4 space-y-4 sm:px-6 lg:px-8">
      <div v-if="authStore.esTodosLosTalleres" :class="SECCION">
        <label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Taller de la caja</label>
        <div class="max-w-sm">
          <TallerSelect v-model="tallerElegido" variante="campo" placeholder="Elige un taller" />
        </div>
      </div>

      <div v-if="requiereTaller" :class="[SECCION, 'text-sm text-center text-gray-500 dark:text-gray-400']">
        Elige el taller para ver su caja.
      </div>

      <div v-else-if="cargando && !estado" :class="[SECCION, 'flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400']">
        <Loader2 class="w-4 h-4 animate-spin" />
        Cargando caja...
      </div>

      <template v-else-if="estado">
        <!-- Caja cerrada: abrir la jornada -->
        <section v-if="!sesion" :class="SECCION">
          <h3 :class="[TITULO_SECCION, 'mb-2']">
            <Lock class="w-4 h-4" />
            Caja cerrada · {{ estado.taller.nombre }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Abre la caja para registrar los pagos del día.
            <template v-if="estado.ultimo_cierre">
              El último cierre fue el {{ formatDateTime(estado.ultimo_cierre.fecha_cierre) }} con
              {{ formatCurrency(estado.ultimo_cierre.efectivo_contado) }} contados.
            </template>
          </p>
          <form v-if="puedeOperar" class="flex flex-col gap-3 mt-4 sm:flex-row sm:items-end" novalidate @submit.prevent="abrirCaja">
            <div class="w-full sm:w-56">
              <label for="monto-inicial" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Efectivo inicial</label>
              <div class="relative">
                <span class="absolute inset-y-0 flex items-center text-sm text-gray-500 start-0 ps-3 dark:text-gray-400">$</span>
                <input
                  id="monto-inicial"
                  v-model="montoInicial"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  class="block w-full p-2.5 ps-7 text-sm rounded shadow-xs tabular-nums bg-gray-50 border border-gray-300 text-gray-900 focus:ring-2 focus:ring-brand-200 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              </div>
            </div>
            <button type="submit" :disabled="abriendo" :class="BOTON_PRIMARIO">
              <Loader2 v-if="abriendo" class="w-4 h-4 animate-spin" />
              <LockOpen v-else class="w-4 h-4" />
              Abrir caja
            </button>
          </form>
          <p v-if="errorApertura" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ errorApertura }}</p>
        </section>

        <!-- Caja abierta: resumen del día -->
        <template v-else>
          <section :class="SECCION">
            <div class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 :class="TITULO_SECCION">
                  <LockOpen class="w-4 h-4" />
                  Caja abierta · {{ sesion.taller.nombre }}
                </h3>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Desde {{ formatDateTime(sesion.fecha_apertura) }} por {{ sesion.abierta_por_nombre || '—' }}
                  <template v-if="sesion.reaperturas"> · reabierta: {{ sesion.motivo_reapertura }}</template>
                </p>
              </div>
              <div v-if="puedeOperar" class="flex flex-wrap gap-2">
                <button type="button" :class="BOTON" @click="tipoMovimiento = 'INGRESO'">
                  <ArrowDownToLine class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Ingreso
                </button>
                <button type="button" :class="BOTON" @click="tipoMovimiento = 'EGRESO'">
                  <ArrowUpFromLine class="w-4 h-4 text-red-600 dark:text-red-400" />
                  Egreso
                </button>
                <button type="button" :class="BOTON_PRIMARIO" @click="mostrarCierre = true">
                  <Lock class="w-4 h-4" />
                  Cerrar caja
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                <p class="text-xs text-gray-500 dark:text-gray-400">Efectivo inicial</p>
                <p class="text-lg font-semibold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(resumen.monto_inicial) }}</p>
              </div>
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                <p class="text-xs text-gray-500 dark:text-gray-400">Cobrado hoy (todas las formas)</p>
                <p class="text-lg font-semibold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(resumen.total_pagos) }}</p>
              </div>
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                <p class="text-xs text-gray-500 dark:text-gray-400">Ingresos / egresos</p>
                <p class="text-lg font-semibold text-gray-900 tabular-nums dark:text-white">
                  +{{ formatCurrency(resumen.ingresos) }} / −{{ formatCurrency(resumen.egresos) }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-200 dark:bg-brand-700/20 dark:ring-brand-500/40">
                <p class="text-xs text-brand-700 dark:text-brand-200">Efectivo esperado en caja</p>
                <p class="text-xl font-bold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(resumen.efectivo_esperado) }}</p>
              </div>
            </div>

            <div v-if="resumen.por_forma.length" class="mt-4 overflow-x-auto border border-gray-100 rounded-lg dark:border-gray-700">
              <table class="w-full text-sm">
                <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th class="px-4 py-2 font-medium text-left">Forma de pago</th>
                    <th class="px-4 py-2 font-medium text-right">Cobrado</th>
                    <th class="px-4 py-2 font-medium text-right">Devuelto</th>
                    <th class="px-4 py-2 font-medium text-right">Neto</th>
                  </tr>
                </thead>
                <tbody class="text-gray-700 divide-y divide-gray-100 dark:text-gray-300 dark:divide-gray-700">
                  <tr v-for="fila in resumen.por_forma" :key="fila.forma_pago">
                    <td class="px-4 py-2 text-gray-900 dark:text-white">{{ fila.forma_pago_display }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ formatCurrency(fila.pagos) }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ Number(fila.devoluciones) ? `−${formatCurrency(fila.devoluciones)}` : '—' }}</td>
                    <td class="px-4 py-2 font-semibold text-right tabular-nums">{{ formatCurrency(fila.neto) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section :class="SECCION">
            <h3 :class="[TITULO_SECCION, 'mb-3']">
              <Banknote class="w-4 h-4" />
              Movimientos de la jornada
            </h3>
            <p v-if="!movimientosDelDia.length" class="text-sm text-gray-500 dark:text-gray-400">Aún no hay movimientos.</p>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
              <li v-for="item in movimientosDelDia" :key="item.clave" class="flex items-start justify-between gap-3 py-2.5" :class="item.anulado ? 'opacity-60' : ''">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white" :class="item.anulado ? 'line-through' : ''">{{ item.titulo }}</p>
                  <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                    {{ formatDateTime(item.fecha) }} ·
                    <a v-if="item.href" :href="item.href" class="hover:underline">{{ item.detalle }}</a>
                    <template v-else>{{ item.detalle }}</template>
                    <template v-if="item.usuario"> · {{ item.usuario }}</template>
                    <template v-if="item.anulado"> · anulado</template>
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span
                    class="text-sm font-semibold tabular-nums"
                    :class="[item.salida ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white', item.anulado ? 'line-through' : '']">
                    {{ item.salida ? '−' : '' }}{{ formatCurrency(item.monto) }}
                  </span>
                  <button
                    v-if="item.anulable && !item.anulado && puedeOperar"
                    type="button"
                    class="inline-flex items-center justify-center text-gray-400 rounded w-7 h-7 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                    title="Anular movimiento"
                    aria-label="Anular movimiento"
                    @click="anularMovimiento(item)">
                    <Ban class="w-4 h-4" />
                  </button>
                </div>
              </li>
            </ul>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Los pagos de órdenes se anulan desde la ficha de cada orden.</p>
          </section>
        </template>

        <!-- Historial de cierres -->
        <section :class="SECCION">
          <h3 :class="[TITULO_SECCION, 'mb-3']">
            <Lock class="w-4 h-4" />
            Cierres anteriores
          </h3>
          <p v-if="!sesiones.length" class="text-sm text-gray-500 dark:text-gray-400">Todavía no hay cierres.</p>
          <div v-else class="overflow-x-auto border border-gray-100 rounded-lg dark:border-gray-700">
            <table class="w-full text-sm">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th class="px-4 py-2 font-medium text-left">Jornada</th>
                  <th v-if="authStore.esTodosLosTalleres" class="px-4 py-2 font-medium text-left">Taller</th>
                  <th class="px-4 py-2 font-medium text-right">Esperado</th>
                  <th class="px-4 py-2 font-medium text-right">Contado</th>
                  <th class="px-4 py-2 font-medium text-right">Diferencia</th>
                  <th class="px-4 py-2 font-medium text-left">Cerró</th>
                  <th class="px-4 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-gray-700 divide-y divide-gray-100 dark:text-gray-300 dark:divide-gray-700">
                <tr v-for="item in sesiones" :key="item.id">
                  <td class="px-4 py-2 text-gray-900 whitespace-nowrap dark:text-white">
                    {{ formatDateTime(item.fecha_apertura) }}
                    <span v-if="item.reaperturas" class="ms-1 text-xs text-gray-500 dark:text-gray-400" :title="item.motivo_reapertura">(reabierta)</span>
                  </td>
                  <td v-if="authStore.esTodosLosTalleres" class="px-4 py-2 whitespace-nowrap">{{ item.taller.nombre }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatCurrency(item.efectivo_esperado) }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatCurrency(item.efectivo_contado) }}</td>
                  <td class="px-4 py-2 font-semibold text-right tabular-nums" :class="claseDiferencia(item.diferencia)" :title="item.observacion_cierre">
                    {{ formatCurrency(item.diferencia) }}
                  </td>
                  <td class="px-4 py-2 whitespace-nowrap">{{ item.cerrada_por_nombre || '—' }}</td>
                  <td class="px-4 py-2">
                    <div class="flex items-center justify-end gap-2">
                      <PdfExportButton
                        :descargador="() => cajaService.pdf(item.id)"
                        label="PDF"
                        title="Descargar el cierre en PDF"
                        @error="(mensaje) => mostrar('error', mensaje)" />
                      <button
                        v-if="tieneAccion('reabrir_caja') && puedeOperar"
                        type="button"
                        :class="BOTON"
                        title="Reabrir esta caja"
                        @click="reabrirSesion(item)">
                        <RotateCcw class="w-4 h-4" />
                        Reabrir
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            v-if="totalSesiones > sesiones.length"
            :total="totalSesiones"
            :current-page="paginaSesiones"
            :next-url="siguiente"
            :previous-url="anterior"
            item-word="cierre"
            @page="cargarSesiones" />
        </section>
      </template>
    </div>

    <MovimientoCajaModal
      v-model="mostrarMovimiento"
      :sesion-id="sesion?.id || ''"
      :tipo="tipoMovimiento || 'EGRESO'"
      :efectivo-disponible="resumen?.efectivo_esperado || 0"
      :puede-registrar-gasto="Boolean(estado?.puede_registrar_gasto)"
      @registrado="onMovimiento" />
    <CerrarCajaModal v-model="mostrarCierre" :sesion="sesion" @cerrada="onCerrada" />
    <MotivoModal
      v-if="accionMotivo"
      v-model="mostrarMotivo"
      :titulo="accionMotivo.titulo"
      :descripcion="accionMotivo.descripcion"
      :texto-confirmar="accionMotivo.textoConfirmar"
      :peligro="accionMotivo.peligro"
      :confirmar="accionMotivo.confirmar" />
  </div>
</template>
