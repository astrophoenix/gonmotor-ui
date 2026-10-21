<script setup>
import { onMounted, ref } from 'vue';
import { History } from 'lucide-vue-next';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Alert from '../../../shared/components/Alert.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { useAuditoria } from '../composables/useAuditoria';

const { puede, cargado, cargarPermisos } = usePermisos();
const { registros, isLoading, error, page, next, previous, rangeLabel, cargar } = useAuditoria();
const vacios = () => ({ modulo: '', accion: '', desde: '', hasta: '' });
const filtros = ref(vacios());
const search = ref('');
const permisoError = ref('');
let aplicados = {};
const modulos = {
  clientes: 'Clientes', vehiculos: 'Vehículos', proveedores: 'Proveedores', citas: 'Citas',
  recepciones: 'Recepciones', inspecciones: 'Inspecciones', cotizaciones: 'Cotizaciones',
  ordenes: 'Órdenes', gastos: 'Gastos', auth: 'Usuarios y acceso', configuracion: 'Configuración',
  empresas: 'Empresas', notificaciones: 'Notificaciones', repuestos: 'Repuestos', servicios: 'Servicios', core: 'General',
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
  aplicados = { ...filtros.value, search: search.value.trim() };
  cargar(aplicados);
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
  <div v-else-if="cargado">
    <EntityHeader entity="Auditoría" title="Historial de acciones" :icon="History"
      :breadcrumb="[{ label: 'Inicio', href: '/' }, { label: 'Auditoría' }]" />
    <div v-if="error" class="px-4 pt-3"><Alert type="error" :message="error" /></div>
    <div class="p-4 space-y-4 bg-white dark:bg-gray-800">
      <p class="text-sm text-brand-500 dark:text-brand-300">Acciones realizadas en la empresa. Horario de Ecuador. El historial comienza al activar este módulo.</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label class="text-sm text-brand-700 dark:text-brand-300">Usuario o ID del registro
          <input v-model="search" type="search" maxlength="200" placeholder="Buscar…" class="block w-full mt-1 rounded-lg border-brand-300 dark:bg-gray-900" @keydown.enter="aplicarYa" />
        </label>
        <label class="text-sm text-brand-700 dark:text-brand-300">Módulo
          <select v-model="filtros.modulo" class="block w-full mt-1 rounded-lg border-brand-300 dark:bg-gray-900">
            <option value="">Todos</option><option v-for="(nombre, codigo) in modulos" :key="codigo" :value="codigo">{{ nombre }}</option>
          </select>
        </label>
        <label class="text-sm text-brand-700 dark:text-brand-300">Acción
          <input v-model="filtros.accion" list="acciones-auditoria" placeholder="Todas" class="block w-full mt-1 rounded-lg border-brand-300 dark:bg-gray-900" />
          <datalist id="acciones-auditoria"><option v-for="(nombre, codigo) in acciones" :key="codigo" :value="codigo">{{ nombre }}</option></datalist>
        </label>
        <label class="text-sm text-brand-700 dark:text-brand-300">Desde
          <input v-model="filtros.desde" type="date" class="block w-full mt-1 rounded-lg border-brand-300 dark:bg-gray-900" />
        </label>
        <label class="text-sm text-brand-700 dark:text-brand-300">Hasta
          <input v-model="filtros.hasta" type="date" :min="filtros.desde" class="block w-full mt-1 rounded-lg border-brand-300 dark:bg-gray-900" />
        </label>
      </div>
      <FilterActions :show-search="false" :loading="isLoading" @clear="limpiar" />
    </div>
    <EntityTable :columns="columns" :items="registros" :loading="isLoading" empty-text="No hay acciones para los filtros seleccionados."
      show-pagination :next-url="next" :previous-url="previous" :pagination-disabled="isLoading" :range-label="rangeLabel"
      @page-change="delta => cargar(aplicados, page + delta)">
      <template #row="{ item }">
        <tr class="text-sm text-brand-700 dark:text-brand-300">
          <td class="p-4 whitespace-nowrap">{{ fecha(item.fecha) }}</td>
          <td class="p-4">{{ item.usuario_nombre }}</td>
          <td class="p-4">{{ modulos[item.modulo] || item.modulo }}</td>
          <td class="p-4">{{ nombreAccion(item.accion) }}</td>
          <td class="p-4 font-mono text-xs break-all">{{ item.registro_id || '—' }}</td>
          <td class="p-4">{{ item.taller_nombre || 'Empresa' }}</td>
        </tr>
      </template>
    </EntityTable>
  </div>
</template>
