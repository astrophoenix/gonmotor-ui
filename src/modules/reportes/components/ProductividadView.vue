<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Users, Search } from 'lucide-vue-next';
import Alert from '@/shared/components/Alert.vue';
import EntityHeader from '@/shared/components/EntityHeader.vue';
import EntityTable from '@/shared/components/EntityTable.vue';
import SinAcceso from '@/shared/components/SinAcceso.vue';
import TallerSelect from '@/shared/components/TallerSelect.vue';
import { usePermisos } from '@/shared/composables/usePermisos';
import { formatCurrency } from '@/shared/utils/format';
import { createLatestRequest, isAbortError } from '@/shared/utils/search';
import { useAuthStore } from '../../auth/stores/authStore';
import { fetchProductividad } from '../services/reportesService';

const { sinAcceso, puede, cargado, cargarPermisos } = usePermisos();
const auth = useAuthStore();
function iso(fecha) {
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const hoy = new Date();
const filtros = reactive({
  fecha_desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
  fecha_hasta: iso(hoy), taller_id: auth.tallerId || null,
});
const datos = ref(null);
const cargando = ref(false);
const error = ref('');
const latest = createLatestRequest();
const columnas = ['Mecánico', 'Órdenes', 'Servicios completados', 'Horas aplicadas', 'Mano de obra sin IVA', 'Comisión (%)', 'Comisión a pagar'];
const resumen = computed(() => datos.value?.resumen || {});
const numero = (valor) => Number(valor || 0).toLocaleString('es-EC', { maximumFractionDigits: 2 });
const puedeTodos = computed(() => auth.esTodosLosTalleres && Boolean(auth.user?.es_admin_talleres));

async function consultar() {
  if (!cargado.value || !puede('reportes', 'ver')) return;
  if (!filtros.fecha_desde || !filtros.fecha_hasta || filtros.fecha_desde > filtros.fecha_hasta) {
    latest.cancel();
    cargando.value = false;
    error.value = 'Indica un rango de fechas válido.';
    return;
  }
  const { id, signal } = latest.begin();
  cargando.value = true;
  error.value = '';
  try {
    const respuesta = await fetchProductividad({ ...filtros }, { signal });
    if (latest.isCurrent(id)) datos.value = respuesta;
  } catch (err) {
    if (latest.isCurrent(id) && !isAbortError(err)) error.value = err.data?.error || err.message || 'No se pudo cargar el reporte.';
  } finally {
    if (latest.isCurrent(id)) cargando.value = false;
  }
}
onMounted(async () => {
  await cargarPermisos().catch(() => {});
  await consultar();
});
onBeforeUnmount(() => latest.cancel());
</script>

<template>
  <p v-if="!cargado" role="status" class="p-4">Cargando permisos…</p>
  <SinAcceso v-else-if="sinAcceso('reportes')" seccion="Productividad y comisiones" />
  <div v-else class="min-h-screen bg-brand-50 dark:bg-gray-900">
    <EntityHeader entity="Productividad y comisiones" :icon="Users" :breadcrumb="[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Productividad y comisiones' }]" />
    <div class="space-y-5 p-4 sm:p-6">
      <form class="rounded-lg border border-brand-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800" @submit.prevent="consultar">
        <div class="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="productividad-desde" class="mb-2 block text-sm font-medium text-brand-900 dark:text-white">Desde</label>
            <input id="productividad-desde" v-model="filtros.fecha_desde" type="date" required class="w-full rounded-lg border border-brand-300 bg-brand-50 p-2.5 text-base text-brand-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <label for="productividad-hasta" class="mb-2 block text-sm font-medium text-brand-900 dark:text-white">Hasta</label>
            <input id="productividad-hasta" v-model="filtros.fecha_hasta" type="date" required class="w-full rounded-lg border border-brand-300 bg-brand-50 p-2.5 text-base text-brand-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <span class="mb-2 block text-sm font-medium text-brand-900 dark:text-white">Taller</span>
            <TallerSelect v-model="filtros.taller_id" variante="campo" :permitir-todos="puedeTodos" :placeholder="auth.tallerNombre || 'Talleres de mi alcance'" />
          </div>
          <button type="submit" :disabled="cargando" class="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-brand-700">
            <Search class="h-4 w-4" />{{ cargando ? 'Consultando…' : 'Buscar' }}
          </button>
        </div>
        <p class="mt-3 text-xs text-brand-500 dark:text-brand-300">Por fecha de entrega de la OT. Máximo 366 días.</p>
      </form>
      <Alert v-if="error" type="error" :message="error" />
      <p v-if="cargando" role="status" class="text-sm text-brand-500 dark:text-brand-300">Cargando productividad…</p>
      <template v-if="datos">
        <p class="text-sm text-brand-700 dark:text-brand-200">Resultados del {{ datos.periodo.desde }} al {{ datos.periodo.hasta }}.</p>
        <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div v-for="tarjeta in [
            { titulo: 'Órdenes distintas', valor: numero(resumen.ordenes) },
            { titulo: 'Servicios completados', valor: numero(resumen.servicios_completados) },
            { titulo: 'Horas aplicadas', valor: numero(resumen.horas_aplicadas) },
            { titulo: 'Mano de obra sin IVA', valor: formatCurrency(resumen.mano_obra) },
            { titulo: 'Comisión a pagar', valor: formatCurrency(resumen.comision) },
          ]" :key="tarjeta.titulo" class="rounded-lg border border-brand-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <dt class="text-sm text-brand-500 dark:text-brand-300">{{ tarjeta.titulo }}</dt>
            <dd class="mt-2 text-xl font-semibold tabular-nums text-brand-900 dark:text-white">{{ tarjeta.valor }}</dd>
          </div>
        </dl>
        <EntityTable class="productividad-tabla" :columns="columnas" :items="datos.mecanicos" mobile-cards empty-text="No hay servicios internos aprobados y completados en órdenes entregadas en este periodo.">
          <template #row="{ item }">
            <tr class="text-sm text-brand-900 dark:text-brand-100">
              <td data-label="Mecánico" class="p-4 font-medium break-words">{{ item.nombre }}</td>
              <td data-label="Órdenes" class="p-4 tabular-nums">{{ numero(item.ordenes) }}</td>
              <td data-label="Servicios completados" class="p-4 tabular-nums">{{ numero(item.servicios_completados) }}</td>
              <td data-label="Horas aplicadas" class="p-4 tabular-nums">{{ numero(item.horas_aplicadas) }}</td>
              <td data-label="Mano de obra sin IVA" class="p-4 tabular-nums">{{ formatCurrency(item.mano_obra) }}</td>
              <td data-label="Comisión (%)" class="p-4 tabular-nums">{{ numero(item.comision_porcentaje) }} %</td>
              <td data-label="Comisión a pagar" class="p-4 font-semibold tabular-nums">{{ formatCurrency(item.comision) }}</td>
            </tr>
          </template>
        </EntityTable>
        <section class="rounded-lg border border-brand-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 class="font-semibold text-brand-900 dark:text-white">Cómo se calcula</h2>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-brand-700 dark:text-brand-200">
            <li v-for="(definicion, clave) in datos.definiciones" :key="clave">{{ definicion }}</li>
          </ul>
          <a v-if="puede('empleados', 'modificar')" href="/crud/empleados/" class="mt-4 inline-block text-sm font-medium text-brand-700 underline dark:text-brand-200">Configurar porcentajes en Empleados</a>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .productividad-tabla :deep(table), .productividad-tabla :deep(tbody), .productividad-tabla :deep(tr) { display: block; width: 100%; min-width: 0; }
  .productividad-tabla :deep(thead) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .productividad-tabla :deep(td) { display: flex; justify-content: space-between; gap: 1rem; padding: .65rem 1rem; }
  .productividad-tabla :deep(td[data-label])::before { content: attr(data-label); flex: 0 0 45%; font-weight: 400; }
  .productividad-tabla :deep(tr + tr) { border-top: 1px solid var(--color-brand-300); }
}
</style>
