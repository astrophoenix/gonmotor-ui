<script setup>
import { onMounted, ref } from 'vue';
import { FileClock, Filter, Search } from 'lucide-vue-next';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Alert from '../../../shared/components/Alert.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { useAuditoria } from '../composables/useAuditoria';

const { puede, cargado, cargarPermisos } = usePermisos();
const { registros, isLoading, error, page, total, next, previous, cargar } = useAuditoria();
const vacios = () => ({ modulo: '', accion: '', desde: '', hasta: '' });
const filtros = ref(vacios());
const search = ref('');
const permisoError = ref('');
const aplicados = ref({});
const exportError = ref('');
const inputClass = 'block w-full px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800';
const modulos = {
  clientes: 'Clientes', vehiculos: 'Vehículos', proveedores: 'Proveedores', citas: 'Citas',
  recepciones: 'Recepciones', inspecciones: 'Inspecciones', cotizaciones: 'Cotizaciones',
  ordenes: 'Órdenes', gastos: 'Gastos', auth: 'Usuarios y acceso', configuracion: 'Configuración',
  empresas: 'Empresas', notificaciones: 'Notificaciones', repuestos: 'Repuestos', servicios: 'Servicios', compras: 'Compras', core: 'General',
};
const acciones = {
  create: 'Crear', update: 'Editar', partial_update: 'Editar parcialmente', destroy: 'Eliminar',
  iniciar_sesion: 'Iniciar sesión', reactivar: 'Reactivar', anular: 'Anular', importar: 'Importar',
};
const columns = ['Fecha y hora', 'Usuario', 'Módulo', 'Acción', 'Registro', 'Taller'];
const fecha = valor => new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Guayaquil',
}).format(new Date(valor));
const nombreAccion = valor => acciones[valor] || valor.replace(/[_-]/g, ' ');

function aplicar() {
  if (!cargado.value || !puede('auditoria', 'ver')) return;
  aplicados.value = { ...filtros.value, search: search.value.trim() };
  cargar(aplicados.value);
}
const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros, busqueda: search,
  firma: () => ({ ...filtros.value, search: search.value.trim() }), aplicar,
});
function limpiar() {
  filtros.value = vacios();
  search.value = '';
  marcarAplicado();
  aplicar();
}
onMounted(async () => {
  try {
    await cargarPermisos();
    aplicar();
  } catch (e) {
    permisoError.value = e.message || 'No se pudieron consultar los permisos.';
  }
});
</script>

<template>
  <Alert v-if="permisoError" type="error" :message="permisoError" />
  <SinAcceso v-else-if="cargado && !puede('auditoria', 'ver')" seccion="Auditoría" />
  <template v-else-if="cargado">
    <EntityHeader mode="list" entity="Auditoría" :icon="FileClock"
      :breadcrumb="[{ label: 'Inicio', href: '/' }, { label: 'Auditoría' }]" />
    <div v-if="error || exportError" class="px-4 pt-3">
      <Alert v-if="error" type="error" :message="error" />
      <Alert v-if="exportError" type="error" :message="exportError" dismissible @dismiss="exportError = ''" />
    </div>
    <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
      <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
        <div class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-default-medium">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
            <Filter class="w-5 h-5" /> Búsqueda
          </h2>
          <div class="flex flex-wrap items-center gap-2">
            <FilterActions :show-search="false" :loading="isLoading" @clear="limpiar" />
          </div>
        </div>
        <div class="p-4">
          <div class="flex flex-wrap items-end gap-3 min-w-0">
            <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-md">
              <label for="auditoria-search" class="block mb-1 text-sm font-medium text-heading">Usuario o ID del registro</label>
              <form class="relative" @submit.prevent="aplicarYa">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Search class="w-4 h-4 text-body" />
                </div>
                <input id="auditoria-search" v-model="search" type="search" maxlength="200" placeholder="Buscar usuario o registro…" :class="[inputClass, 'ps-9 pe-3']" />
              </form>
            </div>
            <div class="w-full sm:w-auto sm:shrink-0">
              <label for="auditoria-modulo" class="block mb-1 text-sm font-medium text-heading">Módulo</label>
              <select id="auditoria-modulo" v-model="filtros.modulo" :class="[inputClass, 'sm:w-56']">
                <option value="">Todos los módulos</option>
                <option v-for="(nombre, codigo) in modulos" :key="codigo" :value="codigo">{{ nombre }}</option>
              </select>
            </div>
            <div class="w-full sm:w-auto sm:shrink-0">
              <label for="auditoria-accion" class="block mb-1 text-sm font-medium text-heading">Acción</label>
              <input id="auditoria-accion" v-model="filtros.accion" list="acciones-auditoria" placeholder="Todas las acciones" :class="[inputClass, 'sm:w-52']" />
              <datalist id="acciones-auditoria"><option v-for="(nombre, codigo) in acciones" :key="codigo" :value="codigo">{{ nombre }}</option></datalist>
            </div>
            <div class="w-full sm:w-auto sm:shrink-0">
              <label for="auditoria-desde" class="block mb-1 text-sm font-medium text-heading">Desde</label>
              <input id="auditoria-desde" v-model="filtros.desde" type="date" :class="[inputClass, 'sm:w-44']" />
            </div>
            <div class="w-full sm:w-auto sm:shrink-0">
              <label for="auditoria-hasta" class="block mb-1 text-sm font-medium text-heading">Hasta</label>
              <input id="auditoria-hasta" v-model="filtros.hasta" type="date" :min="filtros.desde" :class="[inputClass, 'sm:w-44']" />
            </div>
          </div>
        </div>
      </div>
      <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Auditoría</h2>
          <div class="flex flex-wrap items-center gap-2">
            <EntityActionButtons entity="auditoria" :show-add="false" :export-params="aplicados"
              @pdfExportError="exportError = $event" @excelExportError="exportError = $event" />
          </div>
        </div>
        <EntityTable :columns="columns" :items="registros" :loading="isLoading" loading-text="Cargando historial…"
          empty-text="No hay acciones para los filtros seleccionados." wrapper-class="w-full"
          >
          <template #row="{ item }">
            <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
              <td class="px-4 py-3 text-heading whitespace-nowrap">{{ fecha(item.fecha) }}</td>
              <td class="px-4 py-3 text-heading whitespace-nowrap">{{ item.usuario_nombre }}</td>
              <td class="px-4 py-3 text-body">{{ modulos[item.modulo] || item.modulo }}</td>
              <td class="px-4 py-3 text-body">{{ nombreAccion(item.accion) }}</td>
              <td class="px-4 py-3 font-mono text-xs text-body break-all">{{ item.registro_id || '—' }}</td>
              <td class="px-4 py-3 text-body">{{ item.taller_nombre || 'Empresa' }}</td>
            </tr>
          </template>
          <template #pagination>
            <Pagination :total="total" :current-page="page" :next-url="next" :previous-url="previous"
              :disabled="isLoading" item-word="acción" item-plural="acciones"
              empty-text="No hay acciones para los filtros seleccionados."
              @page="pagina => cargar(aplicados, pagina)" />
          </template>
        </EntityTable>
      </div>
    </div>
  </template>
</template>
