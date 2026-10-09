<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  Banknote, BarChart3, Building2, CalendarDays, Car, Circle, CircleCheck,
  ClipboardCheck, ClipboardList, Contact, ChevronDown, ChevronRight, FileText,
  Headset, IdCard, Info, ListChecks, MoreVertical, Package, Pencil, Plus,
  Receipt, Save, Search, ShieldCheck, Truck, UserCog, Users, Warehouse, Wrench, X,
} from 'lucide-vue-next';
import { request } from '../../../shared/services/httpClient';
import { useToast } from '../../../shared/composables/useToast';
import Alert from '../../../shared/components/Alert.vue';

const { showSuccess } = useToast();

const tabs = [
  { id: 'permisos', label: 'Permisos' },
  { id: 'usuarios', label: 'Usuarios asignados' },
];

const ICONOS_ROL = {
  ADMIN_SISTEMA: ShieldCheck,
  ADMIN_EMPRESA: Building2,
  ADMIN_TALLER: Warehouse,
  ASESOR: Headset,
  MECANICO: Wrench,
  CAJERO: Banknote,
};

const DESCRIPCIONES_ROL = {
  ADMIN_SISTEMA: 'Control total del sistema y de todas las empresas.',
  ADMIN_EMPRESA: 'Administra todos los módulos de su empresa.',
  ADMIN_TALLER: 'Opera y administra su taller o sucursal.',
  ASESOR: 'Recibe, cotiza y acompaña la orden de servicio.',
  MECANICO: 'Ejecuta el trabajo y consume repuestos.',
  CAJERO: 'Cobra, factura y consulta.',
};

const RECURSOS_EXTRA = {
  empresa: { icono: Building2, descripcion: 'Datos del negocio y configuración' },
  talleres: { icono: Warehouse, descripcion: 'Sucursales y su configuración' },
  usuarios: { icono: Users, descripcion: 'Cuentas de acceso y roles' },
  empleados: { icono: IdCard, descripcion: 'Personal de la empresa' },
  clientes: { icono: Contact, descripcion: 'Registro de clientes' },
  vehiculos: { icono: Car, descripcion: 'Vehículos de los clientes' },
  proveedores: { icono: Truck, descripcion: 'Proveedores y catálogo' },
  citas: { icono: CalendarDays, descripcion: 'Agenda de citas' },
  recepciones: { icono: ClipboardList, descripcion: 'Recepción de vehículos' },
  inspecciones: { icono: ClipboardCheck, descripcion: 'Inspecciones y checklists' },
  cotizaciones: { icono: FileText, descripcion: 'Presupuestos y cotizaciones' },
  ordenes: { icono: ListChecks, descripcion: 'Órdenes de trabajo' },
  inventario: { icono: Package, descripcion: 'Repuestos y servicios' },
  facturacion: { icono: Receipt, descripcion: 'Cobros y caja' },
  reportes: { icono: BarChart3, descripcion: 'Reportes e indicadores' },
};

const roles = ref([]);
const catalogo = ref({ recursos: [], acciones: [] });
const selectedId = ref(null);
const detalle = ref(null);
const activeTab = ref('permisos');
const isLoading = ref(true);
const isDetailLoading = ref(false);
const errorMessage = ref('');
const guardando = ref(false);
const accionesAbiertas = ref(false);

const borrador = ref({ permisos: {}, acciones: [] });
const snapshot = ref({ permisos: {}, acciones: [] });

const nuevoRolOpen = ref(false);
const nuevoRol = ref({ nombre: '', descripcion: '', is_active: true });
const guardandoNuevoRol = ref(false);
const nuevoRolErrors = ref({});

const editarRolOpen = ref(false);
const editarRol = ref({ nombre: '', descripcion: '', is_active: true });
const guardandoEditarRol = ref(false);
const editarRolErrors = ref({});

const buscar = ref('');
const estadoFiltro = ref('todos');
const rolMenuAbierto = ref(null);

const selectedRole = computed(() => roles.value.find((r) => r.id === selectedId.value) || null);

const rolesFiltrados = computed(() => {
  const term = (buscar.value || '').trim().toLowerCase();
  return roles.value.filter((r) => {
    if (estadoFiltro.value === 'activos' && !r.is_active) return false;
    if (estadoFiltro.value === 'inactivos' && r.is_active) return false;
    if (!term) return true;
    return (r.nombre || '').toLowerCase().includes(term)
      || (r.codigo || '').toLowerCase().includes(term);
  });
});

const isSystem = computed(() => Boolean(detalle.value?.es_sistema));
const dirty = computed(() => {
  if (!detalle.value) return false;
  return JSON.stringify(borrador.value) !== JSON.stringify(snapshot.value);
});

function rolIcono(rol) {
  return ICONOS_ROL[rol.codigo] || UserCog;
}

function rolDescripcion(rol) {
  if (rol.descripcion) return rol.descripcion;
  return DESCRIPCIONES_ROL[rol.codigo] || 'Rol personalizado de la empresa.';
}

function recursoExtra(codigo) {
  return RECURSOS_EXTRA[codigo] || { icono: ShieldCheck, descripcion: '' };
}

function recursoNombre(codigo) {
  const recurso = (catalogo.value.recursos || []).find((r) => r.codigo === codigo);
  return recurso ? recurso.nombre : codigo;
}

async function cargarRoles() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const data = await request('/api/auth/roles/');
    roles.value = Array.isArray(data) ? data : [];
    if (roles.value.length && !roles.value.find((r) => r.id === selectedId.value)) {
      selectedId.value = roles.value[0].id;
    }
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos cargar los roles.';
  } finally {
    isLoading.value = false;
  }
}

async function cargarCatalogo() {
  try {
    const data = await request('/api/auth/recursos/');
    catalogo.value = {
      recursos: data.recursos || [],
      acciones: data.acciones || [],
    };
  } catch (error) {
    catalogo.value = { recursos: [], acciones: [] };
  }
}

async function cargarDetalle(id) {
  if (!id) return;
  isDetailLoading.value = true;
  try {
    const data = await request(`/api/auth/roles/${id}/`);
    detalle.value = data;
    snapshot.value = {
      permisos: JSON.parse(JSON.stringify(data.permisos || {})),
      acciones: [...(data.acciones || [])],
    };
    borrador.value = JSON.parse(JSON.stringify(snapshot.value));
    accionesAbiertas.value = false;
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos cargar el rol.';
  } finally {
    isDetailLoading.value = false;
  }
}

function seleccionar(id) {
  selectedId.value = id;
  activeTab.value = 'permisos';
  cargarDetalle(id);
}

function togglePermiso(recurso, accion, checked) {
  const celda = borrador.value.permisos[recurso] || { ver: false, modificar: false };
  celda[accion] = checked;
  if (accion === 'modificar' && checked) celda.ver = true;
  if (accion === 'ver' && !checked) celda.modificar = false;
  borrador.value.permisos[recurso] = celda;
}

function toggleAccion(codigo, checked) {
  if (checked) {
    if (!borrador.value.acciones.includes(codigo)) borrador.value.acciones.push(codigo);
  } else {
    borrador.value.acciones = borrador.value.acciones.filter((a) => a !== codigo);
  }
}

function cancelarCambios() {
  borrador.value = JSON.parse(JSON.stringify(snapshot.value));
}

async function guardar() {
  if (!detalle.value) return;
  guardando.value = true;
  errorMessage.value = '';
  try {
    const permisos = (catalogo.value.recursos || []).map((r) => ({
      recurso: r.codigo,
      ver: Boolean(borrador.value.permisos[r.codigo]?.ver),
      modificar: Boolean(borrador.value.permisos[r.codigo]?.modificar),
    }));
    await request(`/api/auth/roles/${detalle.value.id}/permisos/`, {
      method: 'PUT',
      body: JSON.stringify({ permisos }),
    });
    await request(`/api/auth/roles/${detalle.value.id}/acciones/`, {
      method: 'PUT',
      body: JSON.stringify({ acciones: borrador.value.acciones }),
    });
    snapshot.value = JSON.parse(JSON.stringify(borrador.value));
    showSuccess('Cambios guardados correctamente.');
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos guardar los cambios.';
  } finally {
    guardando.value = false;
  }
}

async function crearRol() {
  guardandoNuevoRol.value = true;
  nuevoRolErrors.value = {};
  errorMessage.value = '';
  try {
    const data = await request('/api/auth/roles/', {
      method: 'POST',
      body: JSON.stringify({ ...nuevoRol.value }),
    });
    nuevoRolOpen.value = false;
    showSuccess('Rol creado correctamente.');
    await cargarRoles();
    seleccionar(data.id);
  } catch (error) {
    nuevoRolErrors.value = { general: error.message || 'No pudimos crear el rol.' };
  } finally {
    guardandoNuevoRol.value = false;
  }
}

function abrirEditarRol() {
  if (!detalle.value) return;
  editarRol.value = {
    nombre: detalle.value.nombre,
    descripcion: detalle.value.descripcion || '',
    is_active: detalle.value.is_active,
  };
  editarRolOpen.value = true;
}

async function guardarEditarRol() {
  guardandoEditarRol.value = true;
  editarRolErrors.value = {};
  errorMessage.value = '';
  try {
    await request(`/api/auth/roles/${detalle.value.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ ...editarRol.value }),
    });
    editarRolOpen.value = false;
    showSuccess('Rol actualizado correctamente.');
    await cargarRoles();
    await cargarDetalle(detalle.value.id);
  } catch (error) {
    editarRolErrors.value = { general: error.message || 'No pudimos actualizar el rol.' };
  } finally {
    guardandoEditarRol.value = false;
  }
}

async function alternarActivo(rol) {
  try {
    await request(`/api/auth/roles/${rol.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !rol.is_active }),
    });
    showSuccess(rol.is_active ? 'Rol desactivado correctamente.' : 'Rol reactivado correctamente.');
    await cargarRoles();
    if (selectedId.value === rol.id) await cargarDetalle(rol.id);
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos cambiar el estado del rol.';
  } finally {
    rolMenuAbierto.value = null;
  }
}

onMounted(async () => {
  await Promise.all([cargarRoles(), cargarCatalogo()]);
  if (selectedId.value) await cargarDetalle(selectedId.value);
});
</script>

<template>
  <!-- Encabezado de página -->
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex flex-1 min-w-0 items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-fg-brand-strong">
          <ShieldCheck class="w-5 h-5" />
        </span>
        <div class="min-w-0">
          <h1 class="text-lg font-semibold leading-8 text-heading sm:text-xl">Roles y permisos</h1>
          <p class="text-sm text-body mt-0.5">
            Gestiona los roles del sistema y sus permisos. Puedes crear roles personalizados y asignar los permisos que necesites.
          </p>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-primary-600 text-white border border-primary-600 hover:bg-primary-700"
        @click="nuevoRolOpen = true"
      >
        <Plus class="w-4 h-4" />
        Nuevo rol
      </button>
    </div>
  </div>

  <div v-if="errorMessage" class="px-4 pt-3">
    <Alert type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
  </div>

  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <div v-if="isLoading" class="text-sm text-body">Cargando roles...</div>

    <div v-else-if="!roles.length" class="text-sm text-body">No hay roles disponibles.</div>

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[28%_72%]">

      <!-- Columna izquierda: lista de roles -->
      <aside class="rounded-base bg-neutral-primary-soft border border-default shadow-xs">
        <div class="flex items-center justify-between gap-2 px-4 pt-4">
          <h2 class="text-sm font-semibold text-heading">Roles</h2>
          <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-secondary-soft border border-default text-body">{{ rolesFiltrados.length }}</span>
        </div>

        <div class="flex items-center gap-2 px-4 mt-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-body/60" />
            <input
              v-model="buscar"
              type="text"
              placeholder="Buscar rol"
              class="w-full rounded-base border border-default-medium bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-heading placeholder:text-body/60 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            >
          </div>
          <select
            v-model="estadoFiltro"
            class="w-28 rounded-base border border-default-medium bg-white dark:bg-gray-800 px-2 py-2 text-sm text-heading focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        <ul class="mt-3 divide-y divide-default max-h-[420px] overflow-y-auto border-t border-default-medium">
          <li
            v-for="rol in rolesFiltrados"
            :key="rol.id"
            class="flex items-start justify-between gap-2 cursor-pointer px-4 py-3"
            :class="selectedId === rol.id
              ? 'bg-brand-soft border-l-[3px] border-brand-600'
              : 'border-l-[3px] border-transparent hover:bg-neutral-secondary-soft/70'"
            @click="seleccionar(rol.id)"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="selectedId === rol.id
                ? 'bg-brand-600/10 text-fg-brand-strong'
                : 'bg-neutral-secondary-soft text-body'"
            >
              <component :is="rolIcono(rol)" class="w-4.5 h-4.5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-heading truncate">{{ rol.nombre }}</p>
              <p class="text-xs text-body truncate mt-0.5">{{ rolDescripcion(rol) }}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 mt-0.5">
              <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-secondary-soft border border-default text-body">
                Nivel {{ rol.nivel }}
              </span>
              <span v-if="!rol.es_sistema" class="relative">
                <button
                  type="button"
                  class="p-1 rounded text-body hover:bg-neutral-secondary-soft"
                  @click.stop="rolMenuAbierto = rolMenuAbierto === rol.id ? null : rol.id"
                >
                  <MoreVertical class="w-4 h-4" />
                </button>
                <div
                  v-if="rolMenuAbierto === rol.id"
                  class="absolute right-0 z-10 mt-1 w-44 rounded-base bg-white dark:bg-gray-800 border border-default shadow-md"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm text-heading hover:bg-neutral-secondary-soft"
                    @click="seleccionar(rol.id); abrirEditarRol()"
                  >
                    <Pencil class="w-4 h-4" />
                    Editar información
                  </button>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm text-heading hover:bg-neutral-secondary-soft"
                    @click="alternarActivo(rol)"
                  >
                    <X v-if="rol.is_active" class="w-4 h-4" />
                    <Check v-else class="w-4 h-4" />
                    {{ rol.is_active ? 'Desactivar rol' : 'Activar rol' }}
                  </button>
                </div>
              </span>
            </div>
          </li>
        </ul>

        <div class="flex items-start gap-2.5 p-4 border-t border-default-medium bg-brand-50 dark:bg-brand-100/10">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-fg-brand-strong">
            <Info class="w-3.5 h-3.5" />
          </span>
          <p class="text-xs text-body leading-relaxed">
            Los roles personalizados se crean según las necesidades de cada empresa. Todos parten de la misma lista de recursos y permisos del sistema.
          </p>
        </div>
      </aside>

      <!-- Columna derecha: detalle -->
      <section v-if="selectedRole" class="rounded-base bg-neutral-primary-soft border border-default shadow-xs">
        <template v-if="isDetailLoading">
          <div class="p-6 text-sm text-body">Cargando detalle...</div>
        </template>

        <template v-else-if="detalle">
          <div class="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-default-medium">
            <div class="flex items-center gap-3 min-w-0">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                <component :is="rolIcono(detalle)" class="w-6 h-6" />
              </span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-xl font-semibold text-heading">{{ detalle.nombre }}</h2>
                  <span
                    v-if="!detalle.is_active"
                    class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-danger-soft border border-danger-subtle text-fg-danger-strong"
                  >
                    Inactivo
                  </span>
                </div>
                <p class="text-sm text-body mt-1">{{ rolDescripcion(detalle) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!isSystem"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-base bg-neutral-secondary-soft border border-default text-body hover:bg-neutral-secondary-soft/70"
                @click="abrirEditarRol"
              >
                <Pencil class="w-4 h-4" />
                Editar rol
              </button>
              <button
                v-if="!isSystem"
                type="button"
                class="p-1.5 rounded text-body hover:bg-neutral-secondary-soft"
                @click="rolMenuAbierto = rolMenuAbierto === detalle.id ? null : detalle.id"
              >
                <MoreVertical class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4 border-b border-default-medium">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-body">Nivel de acceso</p>
              <p class="mt-1.5">
                <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-secondary-soft border border-default text-body">
                  Nivel {{ detalle.nivel }}
                </span>
              </p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-body">Talleres asignados</p>
              <p class="mt-1.5 text-sm text-heading">
                {{ detalle.ver_todos_talleres ? 'Todos los talleres de su empresa' : 'Talleres asignados' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-body">Usuarios asignados</p>
              <p class="mt-1.5 inline-flex items-center gap-1.5 text-sm text-heading">
                <Users class="w-4 h-4 text-body" />
                {{ detalle.usuarios.length }} {{ detalle.usuarios.length === 1 ? 'usuario' : 'usuarios' }}
              </p>
            </div>
          </div>

          <div class="px-5 pt-2 border-b border-default-medium">
            <nav class="flex gap-1">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="px-3 py-2.5 text-sm font-medium border-b-2 -mb-px"
                :class="activeTab === tab.id
                  ? 'border-brand-600 text-fg-brand-strong'
                  : 'border-transparent text-body hover:text-heading'"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>

          <div class="p-5">
            <!-- Pestaña: Permisos -->
            <div v-if="activeTab === 'permisos'">
              <div class="flex flex-wrap items-center justify-end gap-4 mb-4 text-xs text-body">
                <span class="inline-flex items-center gap-1.5">
                  <CircleCheck class="w-4 h-4 text-fg-brand-strong" />
                  Permiso habilitado
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <Circle class="w-4 h-4 text-body/40" />
                  Sin permiso
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <CircleCheck class="w-4 h-4 text-accent-500" />
                  Permiso especial
                </span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="text-xs uppercase text-body">
                    <tr class="border-b border-default-medium">
                      <th class="py-2 pe-2 font-semibold">Recursos del sistema</th>
                      <th class="py-2 px-2 text-center font-semibold w-20">Ver</th>
                      <th class="py-2 ps-2 text-center font-semibold w-28">Modificar</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="recurso in catalogo.recursos"
                      :key="recurso.codigo"
                      class="border-b border-default last:border-0"
                    >
                      <td class="py-2.5 pe-2">
                        <div class="flex items-center gap-3">
                          <span
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-fg-brand-strong"
                          >
                            <component :is="recursoExtra(recurso.codigo).icono" class="w-4 h-4" />
                          </span>
                          <div class="min-w-0">
                            <p class="font-semibold text-heading">{{ recurso.nombre }}</p>
                            <p class="text-xs text-body">{{ recursoExtra(recurso.codigo).descripcion }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 px-2 text-center">
                        <label v-if="!isSystem" class="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            class="w-4 h-4 rounded border-default-medium text-brand-600 focus:ring-brand focus:ring-2 dark:bg-gray-700"
                            :checked="Boolean(borrador.permisos[recurso.codigo]?.ver)"
                            @change="togglePermiso(recurso.codigo, 'ver', $event.target.checked)"
                          >
                        </label>
                        <input
                          v-else
                          type="checkbox"
                          class="w-4 h-4 rounded border-default-medium text-brand-600 dark:bg-gray-700 opacity-70"
                          :checked="Boolean(detalle.permisos[recurso.codigo]?.ver)"
                          disabled
                        >
                      </td>
                      <td class="py-2.5 ps-2 text-center">
                        <label v-if="!isSystem" class="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            class="w-4 h-4 rounded border-default-medium text-brand-600 focus:ring-brand focus:ring-2 dark:bg-gray-700"
                            :checked="Boolean(borrador.permisos[recurso.codigo]?.modificar)"
                            @change="togglePermiso(recurso.codigo, 'modificar', $event.target.checked)"
                          >
                        </label>
                        <input
                          v-else
                          type="checkbox"
                          class="w-4 h-4 rounded border-default-medium text-brand-600 dark:bg-gray-700 opacity-70"
                          :checked="Boolean(detalle.permisos[recurso.codigo]?.modificar)"
                          disabled
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Sección colapsable: Acciones especiales -->
              <div class="mt-4 overflow-hidden rounded-base border border-default">
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 bg-neutral-secondary-soft/50 hover:bg-neutral-secondary-soft"
                  @click="accionesAbiertas = !accionesAbiertas"
                >
                  <span class="flex items-center gap-2.5 min-w-0">
                    <ChevronDown v-if="accionesAbiertas" class="w-4 h-4 shrink-0 text-body" />
                    <ChevronRight v-else class="w-4 h-4 shrink-0 text-body" />
                    <span class="min-w-0 text-left">
                      <span class="block text-sm font-semibold text-heading">Acciones especiales</span>
                      <span class="block text-xs text-body mt-0.5">
                        Permisos adicionales para acciones específicas del recurso.
                      </span>
                    </span>
                  </span>
                  <span class="flex items-center gap-2 shrink-0">
                    <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-brand-soft border border-brand-subtle text-fg-brand-strong">
                      {{ borrador.acciones.length }} {{ borrador.acciones.length === 1 ? 'acción' : 'acciones' }}
                    </span>
                    <ChevronRight class="w-4 h-4 text-body" />
                  </span>
                </button>

                <div v-if="accionesAbiertas" class="border-t border-default divide-y divide-default">
                  <div
                    v-for="accion in catalogo.acciones"
                    :key="accion.codigo"
                    class="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-fg-brand-strong">
                        <component :is="recursoExtra(accion.recurso__codigo || accion.recurso_codigo).icono" class="w-3.5 h-3.5" />
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-heading">{{ accion.nombre }}</p>
                        <p class="text-xs text-body">
                          {{ accion.descripcion ? `${accion.descripcion} · ` : '' }}{{ recursoNombre(accion.recurso__codigo || accion.recurso_codigo) }}
                        </p>
                      </div>
                    </div>
                    <label v-if="!isSystem" class="inline-flex items-center shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        class="w-4 h-4 rounded border-default-medium text-accent-500 focus:ring-accent-400 focus:ring-2 dark:bg-gray-700"
                        :checked="borrador.acciones.includes(accion.codigo)"
                        @change="toggleAccion(accion.codigo, $event.target.checked)"
                      >
                    </label>
                    <CircleCheck
                      v-else-if="borrador.acciones.includes(accion.codigo)"
                      class="w-4 h-4 shrink-0 text-accent-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Pestaña: Usuarios asignados -->
            <div v-else>
              <div v-if="!detalle.usuarios.length" class="text-sm text-body text-center py-8 border border-dashed border-default rounded-base">
                Todavía no hay usuarios asignados a este rol.
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="text-xs uppercase text-body">
                    <tr class="border-b border-default-medium">
                      <th class="py-2 pe-2 font-semibold">Usuario</th>
                      <th class="py-2 px-2 font-semibold">Correo</th>
                      <th class="py-2 ps-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="usuario in detalle.usuarios" :key="usuario.id" class="border-b border-default last:border-0">
                      <td class="py-2.5 pe-2 text-heading">{{ usuario.nombre }}</td>
                      <td class="py-2.5 px-2 text-body">{{ usuario.email }}</td>
                      <td class="py-2.5 ps-2">
                        <span
                          class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                          :class="usuario.estado_acceso === 'Activo'
                            ? 'bg-success-soft border border-success-subtle text-fg-success-strong'
                            : 'bg-danger-soft border border-danger-subtle text-fg-danger-strong'"
                        >
                          {{ usuario.estado_acceso }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer del panel -->
          <div v-if="!isSystem" class="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-default-medium">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base bg-neutral-secondary-soft border border-default text-body hover:bg-neutral-secondary-soft/70 disabled:opacity-50"
              :disabled="!dirty || guardando"
              @click="cancelarCambios"
            >
              <X class="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 disabled:opacity-50"
              :disabled="!dirty || guardando"
              @click="guardar"
            >
              <Save class="w-4 h-4" />
              {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </template>
      </section>
    </div>

    <!-- Modal: Nuevo rol -->
    <div
      v-if="nuevoRolOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self=""
    >
      <div class="w-full max-w-lg rounded-base bg-white dark:bg-gray-800 border border-default shadow-lg">
        <div class="flex items-center justify-between px-5 py-4 border-b border-default-medium">
          <h3 class="text-lg font-semibold text-heading">Nuevo rol</h3>
          <button
            type="button"
            class="p-1 rounded text-body hover:bg-neutral-secondary-soft"
            @click="nuevoRolOpen = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-5 py-4">
          <Alert
            v-if="nuevoRolErrors.general"
            type="error"
            :message="nuevoRolErrors.general"
            dismissible
            @dismiss="nuevoRolErrors.general = ''"
          />
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="rol-nombre" class="block mb-1 text-sm font-medium text-heading">Nombre del rol</label>
              <input
                id="rol-nombre"
                v-model="nuevoRol.nombre"
                type="text"
                placeholder="Ej. Supervisor de taller"
                class="w-full rounded-base border border-default-medium bg-white dark:bg-gray-800 px-3 py-2 text-sm text-heading placeholder:text-body/60 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              >
              <p v-if="nuevoRolErrors.nombre" class="mt-1 text-xs text-accent-500">{{ nuevoRolErrors.nombre }}</p>
            </div>
            <div>
              <label for="rol-descripcion" class="block mb-1 text-sm font-medium text-heading">Descripción (opcional)</label>
              <textarea
                id="rol-descripcion"
                v-model="nuevoRol.descripcion"
                rows="3"
                placeholder="Qué hace este rol, a quién está dirigido..."
                class="w-full rounded-base border border-default-medium bg-white dark:bg-gray-800 px-3 py-2 text-sm text-heading placeholder:text-body/60 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              ></textarea>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-heading cursor-pointer">
              <input
                type="checkbox"
                v-model="nuevoRol.is_active"
                class="w-4 h-4 rounded border-default-medium text-primary-600 focus:ring-primary-600 focus:ring-2 dark:bg-gray-700"
              >
              Rol activo
            </label>
            <p class="text-xs text-body">
              El rol se creará para la empresa en sesión. Podrás configurar sus permisos después de crearlo.
            </p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-default-medium">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base bg-neutral-secondary-soft border border-default text-body hover:bg-neutral-secondary-soft/70"
            @click="nuevoRolOpen = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 disabled:opacity-50"
            :disabled="guardandoNuevoRol || !nuevoRol.nombre.trim()"
            @click="crearRol"
          >
            <Save class="w-4 h-4" />
            {{ guardandoNuevoRol ? 'Creando...' : 'Crear rol' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Editar rol -->
    <div
      v-if="editarRolOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self=""
    >
      <div class="w-full max-w-lg rounded-base bg-white dark:bg-gray-800 border border-default shadow-lg">
        <div class="flex items-center justify-between px-5 py-4 border-b border-default-medium">
          <h3 class="text-lg font-semibold text-heading">Editar rol</h3>
          <button
            type="button"
            class="p-1 rounded text-body hover:bg-neutral-secondary-soft"
            @click="editarRolOpen = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-5 py-4">
          <Alert
            v-if="editarRolErrors.general"
            type="error"
            :message="editarRolErrors.general"
            dismissible
            @dismiss="editarRolErrors.general = ''"
          />
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="rol-editar-nombre" class="block mb-1 text-sm font-medium text-heading">Nombre del rol</label>
              <input
                id="rol-editar-nombre"
                v-model="editarRol.nombre"
                type="text"
                class="w-full rounded-base border border-default-medium bg-white dark:bg-gray-800 px-3 py-2 text-sm text-heading focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              >
            </div>
            <div>
              <label for="rol-editar-descripcion" class="block mb-1 text-sm font-medium text-heading">Descripción</label>
              <textarea
                id="rol-editar-descripcion"
                v-model="editarRol.descripcion"
                rows="3"
                class="w-full rounded-base border border-default-medium bg-white dark:bg-gray-800 px-3 py-2 text-sm text-heading focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              ></textarea>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-heading cursor-pointer">
              <input
                type="checkbox"
                v-model="editarRol.is_active"
                class="w-4 h-4 rounded border-default-medium text-primary-600 focus:ring-primary-600 focus:ring-2 dark:bg-gray-700"
              >
              Rol activo
            </label>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-default-medium">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base bg-neutral-secondary-soft border border-default text-body hover:bg-neutral-secondary-soft/70"
            @click="editarRolOpen = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 disabled:opacity-50"
            :disabled="guardandoEditarRol || !editarRol.nombre.trim()"
            @click="guardarEditarRol"
          >
            <Save class="w-4 h-4" />
            {{ guardandoEditarRol ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>