<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  Ban, Banknote, BarChart3, Bell, Building2, CalendarDays, Car, Check, ChevronDown, ChevronRight,
  ClipboardCheck, ClipboardList, Contact, Eye, FileText, Headset, IdCard, Info, ListChecks,
  MoreVertical, Package, Pen, PencilLine, Plus, Power, Receipt, RotateCcw, Save, Search,
  Settings2, ShieldCheck, ShieldUser, Sparkles, Truck, UserCog, UserRoundPlus, Users, Wallet,
  Warehouse, Wrench, X
} from 'lucide-vue-next';
import InfoPopover from '../../../shared/components/InfoPopover.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { request } from '../../../shared/services/httpClient';
import { useToast } from '../../../shared/composables/useToast';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';

const { showSuccess } = useToast();

/*
 * Tonos de apoyo (además del navy de marca) para distinguir roles y grupos
 * de recursos de un vistazo. Clases completas para que Tailwind las detecte.
 */
const TONOS = {
  brand: {
    suave: 'bg-brand-100 text-brand-700 dark:bg-brand-500/30 dark:text-brand-100',
    solido: 'bg-brand-700 text-white dark:bg-brand-500',
    barra: 'bg-brand-700 dark:bg-brand-300',
  },
  violet: {
    suave: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    solido: 'bg-violet-600 text-white',
    barra: 'bg-violet-600 dark:bg-violet-400',
  },
  sky: {
    suave: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    solido: 'bg-sky-600 text-white',
    barra: 'bg-sky-600 dark:bg-sky-400',
  },
  amber: {
    suave: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    solido: 'bg-amber-500 text-white',
    barra: 'bg-amber-500 dark:bg-amber-400',
  },
  emerald: {
    suave: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    solido: 'bg-emerald-600 text-white',
    barra: 'bg-emerald-600 dark:bg-emerald-400',
  },
  teal: {
    suave: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    solido: 'bg-teal-600 text-white',
    barra: 'bg-teal-600 dark:bg-teal-400',
  },
};

const ROLES_SISTEMA = {
  ADMIN_SISTEMA: { icono: ShieldCheck, tono: 'brand', descripcion: 'Control total del sistema y de todas las empresas.' },
  ADMIN_EMPRESA: { icono: Building2, tono: 'brand', descripcion: 'Administra todos los módulos de su empresa.' },
  ADMIN_TALLER: { icono: Warehouse, tono: 'violet', descripcion: 'Opera y administra su taller.' },
  ASESOR: { icono: Headset, tono: 'sky', descripcion: 'Recibe, cotiza y acompaña la orden de servicio.' },
  MECANICO: { icono: Wrench, tono: 'amber', descripcion: 'Ejecuta el trabajo y consume repuestos.' },
  CAJERO: { icono: Banknote, tono: 'emerald', descripcion: 'Cobra, factura y consulta.' },
};

const NIVELES = {
  1: 'Operativo',
  2: 'Gestión de taller',
  3: 'Administración de empresa',
  4: 'Sistema',
};

const RECURSOS_EXTRA = {
  empresa: { icono: Building2, descripcion: 'Datos del negocio y configuración' },
  talleres: { icono: Warehouse, descripcion: 'Talleres y su configuración' },
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
  gastos: { icono: Wallet, descripcion: 'Egresos del taller' },
  notificaciones: { icono: Bell, descripcion: 'Recordatorios por WhatsApp' },
};

/** Agrupa los recursos por área; lo que no esté aquí cae en «Otros». */
const GRUPOS_RECURSOS = [
  { id: 'config', titulo: 'Configuración', icono: Settings2, tono: 'brand', recursos: ['empresa', 'talleres', 'usuarios', 'empleados'] },
  { id: 'clientes', titulo: 'Clientes y agenda', icono: Contact, tono: 'sky', recursos: ['clientes', 'vehiculos', 'notificaciones'] },
  { id: 'flujo', titulo: 'Flujo del taller', icono: Wrench, tono: 'violet', recursos: ['citas', 'recepciones', 'inspecciones', 'cotizaciones', 'ordenes'] },
  { id: 'inventario', titulo: 'Inventario y compras', icono: Package, tono: 'amber', recursos: ['inventario', 'proveedores'] },
  { id: 'finanzas', titulo: 'Finanzas', icono: Wallet, tono: 'emerald', recursos: ['facturacion', 'compras', 'gastos', 'reportes'] },
];

const NIVELES_PERMISO = [
  { id: 'ninguno', label: 'Sin acceso', icono: Ban, activo: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-600 dark:text-white dark:ring-gray-500' },
  { id: 'ver', label: 'Ver', icono: Eye, activo: 'bg-sky-600 text-white shadow-sm' },
  { id: 'modificar', label: 'Modificar', icono: PencilLine, activo: 'bg-emerald-600 text-white shadow-sm' },
];

const FILTROS_ESTADO = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'inactivos', label: 'Inactivos' },
];

const roles = ref([]);
const catalogo = ref({ recursos: [], acciones: [] });
const selectedId = ref(null);
const detalle = ref(null);

const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificarRoles = computed(() => puede('usuarios'));
// La API dice si este rol se puede editar (permiso, propio rol, jerarquía).
const editable = computed(() => puedeModificarRoles.value && detalle.value?.editable !== false);
// El motivo solo se muestra a quien sí edita roles: en modo consulta ya lo dice el chip.
const motivoNoEditable = computed(() => (
  puedeModificarRoles.value && detalle.value && !editable.value ? detalle.value.motivo_no_editable : ''
));
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
const menuDetalleAbierto = ref(false);

const confirmarDescarte = ref(false);
const rolPendiente = ref(null);
const confirmarRestablecer = ref(false);

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

const gruposRoles = computed(() => [
  { id: 'sistema', titulo: 'Roles del sistema', roles: rolesFiltrados.value.filter((r) => r.es_sistema) },
  { id: 'propios', titulo: 'Roles personalizados', roles: rolesFiltrados.value.filter((r) => !r.es_sistema) },
]);

const isSystem = computed(() => Boolean(detalle.value?.es_sistema));

const gruposRecursos = computed(() => {
  const recursos = catalogo.value.recursos || [];
  const usados = new Set();
  const grupos = GRUPOS_RECURSOS.map((g) => {
    const lista = g.recursos
      .map((codigo) => recursos.find((r) => r.codigo === codigo))
      .filter(Boolean);
    lista.forEach((r) => usados.add(r.codigo));
    return { ...g, lista };
  });
  const otros = recursos.filter((r) => !usados.has(r.codigo));
  if (otros.length) {
    grupos.push({ id: 'otros', titulo: 'Otros', icono: ShieldCheck, tono: 'teal', lista: otros });
  }
  return grupos.filter((g) => g.lista.length);
});

const resumenPermisos = computed(() => {
  const recursos = catalogo.value.recursos || [];
  let modificar = 0;
  let soloVer = 0;
  recursos.forEach((r) => {
    const nivel = nivelPermiso(r.codigo);
    if (nivel === 'modificar') modificar += 1;
    else if (nivel === 'ver') soloVer += 1;
  });
  return { total: recursos.length, modificar, soloVer, conAcceso: modificar + soloVer };
});

const cambios = computed(() => {
  if (!detalle.value) return 0;
  const recursos = (catalogo.value.recursos || []).filter(
    (r) => nivelPermiso(r.codigo) !== nivelPermiso(r.codigo, snapshot.value)
  ).length;
  const antes = new Set(snapshot.value.acciones);
  const ahora = new Set(borrador.value.acciones);
  const acciones = [...ahora].filter((a) => !antes.has(a)).length
    + [...antes].filter((a) => !ahora.has(a)).length;
  return recursos + acciones;
});
const dirty = computed(() => cambios.value > 0);

function infoRol(rol) {
  return ROLES_SISTEMA[rol?.codigo] || { icono: UserCog, tono: 'teal', descripcion: 'Rol personalizado de la empresa.' };
}

function rolIcono(rol) {
  return infoRol(rol).icono;
}

function rolTono(rol) {
  return TONOS[infoRol(rol).tono] || TONOS.teal;
}

function rolDescripcion(rol) {
  return rol.descripcion || infoRol(rol).descripcion;
}

function recursoExtra(codigo) {
  return RECURSOS_EXTRA[codigo] || { icono: ShieldCheck, descripcion: '' };
}

function recursoNombre(codigo) {
  const recurso = (catalogo.value.recursos || []).find((r) => r.codigo === codigo);
  return recurso ? recurso.nombre : codigo;
}

function iniciales(nombre) {
  return (nombre || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function nivelPermiso(codigo, fuente = borrador.value) {
  const celda = fuente.permisos[codigo];
  if (celda?.modificar) return 'modificar';
  if (celda?.ver) return 'ver';
  return 'ninguno';
}

// El flujo del taller se consulta completo (regla del backend): dar o quitar
// «Ver» en un documento se aplica a todo el flujo; «Modificar» es independiente.
const RECURSOS_FLUJO = ['citas', 'recepciones', 'inspecciones', 'cotizaciones', 'ordenes'];

function fijarNivel(codigo, nivel) {
  if (!editable.value) return;
  borrador.value.permisos[codigo] = {
    ver: nivel !== 'ninguno',
    modificar: nivel === 'modificar',
  };
  if (!RECURSOS_FLUJO.includes(codigo)) return;
  RECURSOS_FLUJO.filter((otro) => otro !== codigo).forEach((otro) => {
    const actual = nivelPermiso(otro);
    if (nivel === 'ninguno' && actual !== 'ninguno') {
      borrador.value.permisos[otro] = { ver: false, modificar: false };
    } else if (nivel !== 'ninguno' && actual === 'ninguno') {
      borrador.value.permisos[otro] = { ver: true, modificar: false };
    }
  });
}

function fijarNivelGrupo(grupo, nivel) {
  if (!editable.value) return;
  grupo.lista.forEach((r) => fijarNivel(r.codigo, nivel));
}

function nivelGrupo(grupo) {
  const niveles = new Set(grupo.lista.map((r) => nivelPermiso(r.codigo)));
  return niveles.size === 1 ? [...niveles][0] : null;
}

function accesosGrupo(grupo) {
  return grupo.lista.filter((r) => nivelPermiso(r.codigo) !== 'ninguno').length;
}

function recursoCambiado(codigo) {
  return nivelPermiso(codigo) !== nivelPermiso(codigo, snapshot.value);
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
  if (id === selectedId.value) return;
  if (dirty.value) {
    rolPendiente.value = id;
    confirmarDescarte.value = true;
    return;
  }
  irARol(id);
}

function irARol(id) {
  selectedId.value = id;
  activeTab.value = 'permisos';
  menuDetalleAbierto.value = false;
  cargarDetalle(id);
}

function descartarYCambiar() {
  confirmarDescarte.value = false;
  cancelarCambios();
  if (rolPendiente.value) irARol(rolPendiente.value);
  rolPendiente.value = null;
}

function toggleAccion(codigo, checked) {
  if (!editable.value) return;
  if (checked) {
    if (!borrador.value.acciones.includes(codigo)) borrador.value.acciones.push(codigo);
  } else {
    borrador.value.acciones = borrador.value.acciones.filter((a) => a !== codigo);
  }
}

function cancelarCambios() {
  borrador.value = JSON.parse(JSON.stringify(snapshot.value));
}

async function restablecer() {
  if (!detalle.value) return;
  guardando.value = true;
  errorMessage.value = '';
  try {
    await request(`/api/auth/roles/${detalle.value.id}/permisos/`, { method: 'DELETE' });
    await request(`/api/auth/roles/${detalle.value.id}/acciones/`, { method: 'DELETE' });
    showSuccess('El rol vuelve a la configuración del sistema.');
    await cargarRoles();
    await cargarDetalle(detalle.value.id);
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos restablecer el rol.';
  } finally {
    guardando.value = false;
    confirmarRestablecer.value = false;
  }
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
    await cargarRoles();
  } catch (error) {
    errorMessage.value = error.message || 'No pudimos guardar los cambios.';
  } finally {
    guardando.value = false;
  }
}

function abrirNuevoRol() {
  nuevoRol.value = { nombre: '', descripcion: '', is_active: true };
  nuevoRolErrors.value = {};
  nuevoRolOpen.value = true;
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
  menuDetalleAbierto.value = false;
  editarRol.value = {
    nombre: detalle.value.nombre,
    descripcion: detalle.value.descripcion || '',
    is_active: detalle.value.is_active,
  };
  editarRolErrors.value = {};
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
  menuDetalleAbierto.value = false;
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
  }
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (sinAcceso('usuarios')) return;
  await Promise.all([cargarRoles(), cargarCatalogo()]);
  if (selectedId.value) await cargarDetalle(selectedId.value);
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('usuarios')" seccion="Roles y permisos" />
  <template v-else>
  <EntityHeader
    mode="list"
    :icon="ShieldCheck"
    entity="Roles y permisos"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Configuración' },
      { label: 'Roles y permisos' },
    ]"
  >
    <template #title-aside>
      <ModoConsultaChip v-if="soloConsulta('usuarios')" objeto="los roles y sus permisos" acciones="crearlos o ajustarlos" />
    </template>
    <template #actions>
      <button
        v-if="puedeModificarRoles"
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-brand-900 text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-200 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus:ring-brand-800"
        @click="abrirNuevoRol"
      >
        <Plus class="w-4 h-4" />
        Nuevo rol
      </button>
    </template>
  </EntityHeader>

  <div v-if="errorMessage" class="px-4 pt-3">
    <Alert type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
  </div>

  <div class="px-4 sm:px-6 lg:px-8 mt-4" :class="dirty ? 'pb-28' : 'pb-6'">
    <div v-if="isLoading" class="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] animate-pulse">
      <div class="h-96 rounded-base bg-gray-100 dark:bg-gray-800"></div>
      <div class="h-96 rounded-base bg-gray-100 dark:bg-gray-800"></div>
    </div>

    <div v-else-if="!roles.length" class="text-sm text-body">No hay roles disponibles.</div>

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">

      <!-- Columna izquierda: lista de roles -->
      <aside class="lg:self-start flex flex-col rounded-base bg-white border border-gray-200 shadow-xs dark:bg-gray-800 dark:border-gray-700">
        <div class="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="buscar"
              type="text"
              placeholder="Buscar rol"
              class="w-full rounded-base border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm text-heading placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
          </div>
          <div class="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700" role="tablist" aria-label="Filtrar por estado">
            <button
              v-for="f in FILTROS_ESTADO"
              :key="f.id"
              type="button"
              role="tab"
              :aria-selected="estadoFiltro === f.id"
              class="flex-1 rounded-md px-2 py-1 text-xs font-medium transition"
              :class="estadoFiltro === f.id
                ? 'bg-white text-heading shadow-sm dark:bg-gray-600 dark:text-white'
                : 'text-body hover:text-heading dark:text-gray-400 dark:hover:text-white'"
              @click="estadoFiltro = f.id"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="max-h-80 lg:max-h-none overflow-y-auto p-2">
          <template v-for="grupo in gruposRoles" :key="grupo.id">
            <p class="flex items-center justify-between px-2 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ grupo.titulo }}
              <span class="font-medium normal-case tracking-normal">{{ grupo.roles.length }}</span>
            </p>

            <button
              v-for="rol in grupo.roles"
              :key="rol.id"
              type="button"
              class="group w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition"
              :class="[
                selectedId === rol.id
                  ? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-700/30 dark:ring-brand-500/50'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                !rol.is_active && 'opacity-60',
              ]"
              :aria-current="selectedId === rol.id ? 'true' : undefined"
              @click="seleccionar(rol.id)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="rolTono(rol).suave">
                <component :is="rolIcono(rol)" class="w-5 h-5" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-heading truncate dark:text-white">{{ rol.nombre }}</span>
                  <span
                    v-if="rol.personalizado"
                    class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                    title="Ajustado para tu empresa"
                  ></span>
                </span>
                <span class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="inline-flex items-center gap-1">
                    <Users class="w-3.5 h-3.5" />
                    {{ rol.usuarios_count ?? 0 }}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Nivel {{ rol.nivel }}</span>
                  <span v-if="!rol.is_active" class="rounded bg-gray-200 px-1.5 py-px text-[10px] font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200">Inactivo</span>
                </span>
              </span>
              <ChevronRight
                class="w-4 h-4 shrink-0 transition"
                :class="selectedId === rol.id ? 'text-brand-700 dark:text-brand-200' : 'text-gray-300 group-hover:text-gray-500 dark:text-gray-600'"
              />
            </button>

            <button
              v-if="puedeModificarRoles && grupo.id === 'propios' && !grupo.roles.length && !buscar"
              type="button"
              class="w-full flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-body hover:border-brand-400 hover:bg-brand-50/60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700/50"
              @click="abrirNuevoRol"
            >
              <UserRoundPlus class="w-5 h-5 shrink-0 text-brand-500 dark:text-brand-300" />
              Crea un rol a la medida de tu equipo
            </button>
          </template>

          <p v-if="!rolesFiltrados.length" class="px-3 py-8 text-center text-sm text-body dark:text-gray-400">
            Ningún rol coincide con la búsqueda.
          </p>
        </div>

        <div class="flex gap-2.5 p-4 border-t border-gray-200 dark:border-gray-700">
          <Info class="w-4 h-4 shrink-0 mt-0.5 text-brand-500 dark:text-brand-300" />
          <p class="text-xs leading-relaxed text-body dark:text-gray-400">
            Los roles del sistema traen permisos sugeridos; ajustarlos solo afecta a tu empresa.
            <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>indica un rol ajustado.</span>
          </p>
        </div>
      </aside>

      <!-- Columna derecha: detalle -->
      <section v-if="selectedRole" class="min-w-0 space-y-5">
        <div v-if="isDetailLoading && !detalle" class="h-96 rounded-base bg-gray-100 animate-pulse dark:bg-gray-800"></div>

        <template v-else-if="detalle">
          <!-- Ficha del rol -->
          <div class="rounded-base bg-white border border-gray-200 shadow-xs dark:bg-gray-800 dark:border-gray-700" :class="isDetailLoading && 'opacity-60'">
            <div class="flex flex-wrap items-start justify-between gap-4 p-5">
              <div class="flex items-start gap-4 min-w-0">
                <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" :class="rolTono(detalle).solido">
                  <component :is="rolIcono(detalle)" class="w-7 h-7" />
                </span>
                <div class="min-w-0">
                  <h2 class="text-xl font-semibold text-heading dark:text-white">{{ detalle.nombre }}</h2>
                  <p class="text-sm text-body mt-0.5 dark:text-gray-400">{{ rolDescripcion(detalle) }}</p>
                  <div class="flex flex-wrap items-center gap-1.5 mt-2">
                    <span
                      v-if="detalle.es_sistema"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-500/30 dark:text-brand-100"
                    >
                      <ShieldCheck class="w-3.5 h-3.5" />
                      Rol del sistema
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                    >
                      <Sparkles class="w-3.5 h-3.5" />
                      Personalizado
                    </span>
                    <span
                      v-if="detalle.personalizado"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Ajustado para tu empresa
                    </span>
                    <span
                      v-if="!detalle.is_active"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                    >
                      <Power class="w-3.5 h-3.5" />
                      Inactivo
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="editable && isSystem && detalle.personalizado"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  @click="confirmarRestablecer = true"
                >
                  <RotateCcw class="w-4 h-4" />
                  Restablecer
                </button>
                <button
                  v-if="editable && !isSystem"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  @click="abrirEditarRol"
                >
                  <Pen class="w-4 h-4" />
                  Editar
                </button>
                <span v-if="editable && !isSystem" class="relative">
                  <button
                    type="button"
                    class="p-2 rounded-base border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Más acciones"
                    @click="menuDetalleAbierto = !menuDetalleAbierto"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </button>
                  <div
                    v-if="menuDetalleAbierto"
                    class="absolute right-0 z-20 mt-1 w-48 rounded-base bg-white border border-gray-200 shadow-lg py-1 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                      @click="alternarActivo(detalle)"
                    >
                      <X v-if="detalle.is_active" class="w-4 h-4" />
                      <Check v-else class="w-4 h-4" />
                      {{ detalle.is_active ? 'Desactivar rol' : 'Activar rol' }}
                    </button>
                  </div>
                </span>
              </div>
            </div>

            <!-- Por qué este rol no se edita (propio rol, nivel superior): restricción con motivo -->
            <p v-if="motivoNoEditable" class="flex items-start gap-2 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:px-5">
              <Info class="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
              {{ motivoNoEditable }}
            </p>

            <!-- Indicadores -->
            <dl class="grid grid-cols-2 xl:grid-cols-4 border-t border-gray-200 dark:border-gray-700 [&>div]:p-4 [&>div]:border-gray-200 dark:[&>div]:border-gray-700">
              <div class="border-r border-b xl:border-b-0">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Nivel de acceso</dt>
                <dd class="mt-1.5">
                  <div class="flex gap-1" aria-hidden="true">
                    <span
                      v-for="n in 3"
                      :key="n"
                      class="h-1.5 flex-1 rounded-full"
                      :class="n <= detalle.nivel ? rolTono(detalle).barra : 'bg-gray-200 dark:bg-gray-700'"
                    ></span>
                  </div>
                  <p class="mt-1.5 text-sm font-semibold text-heading dark:text-white">
                    {{ NIVELES[detalle.nivel] || `Nivel ${detalle.nivel}` }}
                    <span class="font-normal text-gray-500 dark:text-gray-400">· Nivel {{ detalle.nivel }}</span>
                  </p>
                </dd>
              </div>
              <div class="border-b xl:border-b-0 xl:border-r">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Alcance</dt>
                <dd class="mt-1.5 flex items-start gap-2">
                  <Warehouse class="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                  <span class="text-sm font-semibold text-heading dark:text-white">
                    {{ detalle.ver_todos_talleres ? 'Todos los talleres' : 'Solo talleres asignados' }}
                  </span>
                </dd>
              </div>
              <div class="border-r">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Usuarios</dt>
                <dd class="mt-1.5 flex items-center gap-2">
                  <div v-if="detalle.usuarios.length" class="flex -space-x-1.5">
                    <span
                      v-for="u in detalle.usuarios.slice(0, 3)"
                      :key="u.id"
                      class="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white text-[11px] font-semibold dark:ring-gray-800"
                      :class="rolTono(detalle).suave"
                    >
                      {{ iniciales(u.nombre) }}
                    </span>
                  </div>
                  <span class="whitespace-nowrap text-sm font-semibold text-heading dark:text-white">
                    {{ detalle.usuarios.length }} {{ detalle.usuarios.length === 1 ? 'usuario' : 'usuarios' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Módulos con acceso</dt>
                <dd class="mt-1.5">
                  <p class="text-sm font-semibold text-heading dark:text-white">
                    {{ resumenPermisos.conAcceso }}
                    <span class="font-normal text-gray-500 dark:text-gray-400">de {{ resumenPermisos.total }}</span>
                  </p>
                  <div class="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <span class="bg-emerald-500" :style="{ width: `${(resumenPermisos.modificar / (resumenPermisos.total || 1)) * 100}%` }"></span>
                    <span class="bg-sky-500" :style="{ width: `${(resumenPermisos.soloVer / (resumenPermisos.total || 1)) * 100}%` }"></span>
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          <!-- Pestañas -->
          <div class="rounded-base bg-white border border-gray-200 shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-3 border-b border-gray-200 dark:border-gray-700">
              <nav class="flex gap-4" role="tablist">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === 'permisos'"
                  class="inline-flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition"
                  :class="activeTab === 'permisos'
                    ? 'border-brand-700 text-brand-900 dark:border-brand-200 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                  @click="activeTab = 'permisos'"
                >
                  Permisos
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === 'usuarios'"
                  class="inline-flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition"
                  :class="activeTab === 'usuarios'
                    ? 'border-brand-700 text-brand-900 dark:border-brand-200 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                  @click="activeTab = 'usuarios'"
                >
                  Usuarios
                  <span class="rounded-full bg-gray-100 px-2 py-px text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{{ detalle.usuarios.length }}</span>
                </button>
              </nav>
              <div v-if="activeTab === 'permisos'" class="hidden sm:flex items-center gap-3 pb-3 text-xs text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500"></span>Sin acceso</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-sky-500"></span>Solo ver</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>Ver y modificar</span>
              </div>
            </div>

            <!-- Pestaña: Permisos -->
            <div v-if="activeTab === 'permisos'" class="p-3 sm:p-5 space-y-4">
              <div
                v-for="grupo in gruposRecursos"
                :key="grupo.id"
                class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" :class="TONOS[grupo.tono].suave">
                      <component :is="grupo.icono" class="w-4 h-4" />
                    </span>
                    <h3 class="text-sm font-semibold text-heading dark:text-white">{{ grupo.titulo }}</h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ accesosGrupo(grupo) }}/{{ grupo.lista.length }}</span>
                    <InfoPopover
                      v-if="grupo.id === 'flujo'"
                      etiqueta="Cómo funcionan los permisos del flujo"
                      :secciones="[{ titulo: 'Se consulta completo', texto: 'Los documentos del flujo se muestran unos dentro de otros, así que «Ver» se aplica a todos a la vez. «Modificar» se elige por separado en cada uno.' }]"
                    />
                  </div>
                  <div v-if="editable" class="flex items-center gap-1 text-xs">
                    <span class="hidden md:inline text-gray-500 dark:text-gray-400 me-1">Todo el grupo:</span>
                    <button
                      v-for="nivel in NIVELES_PERMISO"
                      :key="nivel.id"
                      type="button"
                      class="rounded-md px-2 py-1 font-medium transition"
                      :class="nivelGrupo(grupo) === nivel.id
                        ? 'bg-white text-heading ring-1 ring-gray-300 dark:bg-gray-600 dark:text-white dark:ring-gray-500'
                        : 'text-gray-500 hover:bg-white hover:text-heading dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white'"
                      @click="fijarNivelGrupo(grupo, nivel.id)"
                    >
                      {{ nivel.label }}
                    </button>
                  </div>
                </div>

                <ul class="divide-y divide-gray-100 dark:divide-gray-700">
                  <li
                    v-for="recurso in grupo.lista"
                    :key="recurso.codigo"
                    class="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between transition"
                    :class="recursoCambiado(recurso.codigo) && 'bg-amber-50/70 dark:bg-amber-500/5'"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <component :is="recursoExtra(recurso.codigo).icono" class="w-4 h-4" />
                      </span>
                      <div class="min-w-0">
                        <p class="flex items-center gap-2 text-sm font-medium text-heading dark:text-white">
                          {{ recurso.nombre }}
                          <span
                            v-if="recursoCambiado(recurso.codigo)"
                            class="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          >
                            Cambiado
                          </span>
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ recursoExtra(recurso.codigo).descripcion }}</p>
                      </div>
                    </div>

                    <!-- En lectura, el nivel como texto (no como botones bloqueados) -->
                    <span
                      v-if="!editable"
                      class="inline-flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 text-xs font-medium"
                      :class="NIVELES_PERMISO.find((n) => n.id === nivelPermiso(recurso.codigo)).activo"
                    >
                      <component :is="NIVELES_PERMISO.find((n) => n.id === nivelPermiso(recurso.codigo)).icono" class="w-3.5 h-3.5" />
                      {{ NIVELES_PERMISO.find((n) => n.id === nivelPermiso(recurso.codigo)).label }}
                    </span>
                    <div
                      v-else
                      class="grid grid-cols-3 shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700 sm:w-[19rem]"
                      role="radiogroup"
                      :aria-label="`Acceso a ${recurso.nombre}`"
                    >
                      <button
                        v-for="nivel in NIVELES_PERMISO"
                        :key="nivel.id"
                        type="button"
                        role="radio"
                        :aria-checked="nivelPermiso(recurso.codigo) === nivel.id"
                        class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition"
                        :class="nivelPermiso(recurso.codigo) === nivel.id
                          ? nivel.activo
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                        @click="fijarNivel(recurso.codigo, nivel.id)"
                      >
                        <component :is="nivel.icono" class="hidden sm:block w-3.5 h-3.5" />
                        {{ nivel.label }}
                      </button>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- Acciones especiales: solo si el catálogo trae alguna -->
              <div v-if="catalogo.acciones.length" class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700"
                  @click="accionesAbiertas = !accionesAbiertas"
                >
                  <span class="flex items-center gap-2.5 min-w-0 text-left">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" :class="TONOS.teal.suave">
                      <Sparkles class="w-4 h-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block text-sm font-semibold text-heading dark:text-white">Acciones especiales</span>
                      <span class="block text-xs text-gray-500 dark:text-gray-400">Permisos para acciones puntuales de un módulo.</span>
                    </span>
                  </span>
                  <span class="flex items-center gap-2 shrink-0">
                    <span class="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                      {{ borrador.acciones.length }}/{{ catalogo.acciones.length }}
                    </span>
                    <ChevronDown class="w-4 h-4 text-gray-500 transition" :class="accionesAbiertas && 'rotate-180'" />
                  </span>
                </button>

                <ul v-if="accionesAbiertas" class="divide-y divide-gray-100 dark:divide-gray-700">
                  <li
                    v-for="accion in catalogo.acciones"
                    :key="accion.codigo"
                    class="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <component :is="recursoExtra(accion.recurso__codigo || accion.recurso_codigo).icono" class="w-3.5 h-3.5" />
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-heading dark:text-white">{{ accion.nombre }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ accion.descripcion ? `${accion.descripcion} · ` : '' }}{{ recursoNombre(accion.recurso__codigo || accion.recurso_codigo) }}
                        </p>
                      </div>
                    </div>
                    <span
                      v-if="!editable"
                      class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="borrador.acciones.includes(accion.codigo)
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                    >
                      {{ borrador.acciones.includes(accion.codigo) ? 'Concedida' : 'No concedida' }}
                    </span>
                    <label v-else class="relative inline-flex items-center shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        class="sr-only peer"
                        :checked="borrador.acciones.includes(accion.codigo)"
                        @change="toggleAccion(accion.codigo, $event.target.checked)"
                      >
                      <span class="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-teal-600 dark:bg-gray-600 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"></span>
                    </label>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Pestaña: Usuarios -->
            <div v-else class="p-4 sm:p-5">
              <div
                v-if="!detalle.usuarios.length"
                class="flex flex-col items-center gap-2 py-10 text-center border border-dashed border-gray-300 rounded-lg dark:border-gray-600"
              >
                <span class="flex h-12 w-12 items-center justify-center rounded-full" :class="rolTono(detalle).suave">
                  <Users class="w-6 h-6" />
                </span>
                <p class="text-sm font-medium text-heading dark:text-white">Nadie tiene este rol todavía</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Asígnalo a un usuario desde la pantalla de Usuarios.</p>
                <a
                  href="/configuracion/usuarios/"
                  class="mt-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <UserRoundPlus class="w-4 h-4" />
                  Ir a Usuarios
                </a>
              </div>
              <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <li
                  v-for="usuario in detalle.usuarios"
                  :key="usuario.id"
                  class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold" :class="rolTono(detalle).suave">
                    {{ iniciales(usuario.nombre) }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-heading truncate dark:text-white">{{ usuario.nombre }}</p>
                    <p class="text-xs text-gray-500 truncate dark:text-gray-400">{{ usuario.email }}</p>
                  </div>
                  <span
                    class="inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="usuario.estado_acceso === 'Activo'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="usuario.estado_acceso === 'Activo' ? 'bg-emerald-500' : 'bg-gray-400'"></span>
                    {{ usuario.estado_acceso }}
                  </span>
                </li>
              </ul>
            </div>

            <!-- Barra de cambios pendientes -->
            <div
              v-if="dirty && !confirmarDescarte"
              class="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[30rem] dark:bg-gray-800/95 dark:border-amber-500/40"
            >
              <p class="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <span class="h-2 w-2 rounded-full bg-amber-500"></span>
                {{ cambios }} {{ cambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar' }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  :disabled="guardando"
                  @click="cancelarCambios"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-brand-900 text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
                  :disabled="guardando"
                  @click="guardar"
                >
                  <Save class="w-4 h-4" />
                  {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <ConfirmModal
      v-model="confirmarDescarte"
      title="Descartar cambios"
      :message="`Tienes ${cambios} ${cambios === 1 ? 'cambio' : 'cambios'} sin guardar en ${detalle?.nombre || 'este rol'}. Si cambias de rol se perderán.`"
      :icon="Info"
      variant="primary"
      confirm-text="Descartar y cambiar"
      @confirm="descartarYCambiar"
      @cancel="rolPendiente = null"
    />

    <ConfirmModal
      v-model="confirmarRestablecer"
      title="Restablecer rol"
      :message="`${detalle?.nombre || 'El rol'} volverá a los permisos sugeridos por el sistema. Los ajustes de tu empresa se perderán.`"
      :icon="RotateCcw"
      variant="primary"
      confirm-text="Restablecer"
      confirming-text="Restableciendo..."
      :is-deleting="guardando"
      @confirm="restablecer"
    />

    <!-- Modal: Nuevo rol -->
    <div
      v-if="nuevoRolOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-lg rounded-base bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <span class="inline-flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="TONOS.teal.suave">
              <ShieldUser class="w-5 h-5" />
            </span>
            <h3 class="text-lg font-semibold text-heading dark:text-white">Nuevo rol</h3>
          </span>
          <button
            type="button"
            class="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Cerrar"
            @click="nuevoRolOpen = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-5 py-4">
          <Alert v-if="nuevoRolErrors.general" type="error" :message="nuevoRolErrors.general" dismissible @dismiss="nuevoRolErrors.general = ''" />
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="rol-nombre" class="block mb-1 text-sm font-medium text-heading dark:text-white">Nombre <span class="text-accent-500 dark:text-accent-400">*</span></label>
              <input
                id="rol-nombre"
                v-model="nuevoRol.nombre"
                type="text"
                placeholder="Ej. Supervisor de patio"
                class="w-full rounded-base border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-heading placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
              <p v-if="nuevoRolErrors.nombre" class="mt-1 text-xs text-danger">{{ nuevoRolErrors.nombre }}</p>
            </div>
            <div>
              <label for="rol-descripcion" class="block mb-1 text-sm font-medium text-heading dark:text-white">Descripción (opcional)</label>
              <textarea
                id="rol-descripcion"
                v-model="nuevoRol.descripcion"
                rows="3"
                placeholder="Qué hace este rol, a quién está dirigido..."
                class="w-full rounded-base border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-heading placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              ></textarea>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-heading cursor-pointer dark:text-white">
              <input
                v-model="nuevoRol.is_active"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              >
              Rol activo
            </label>
            <p class="flex gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
              <Info class="w-4 h-4 shrink-0" />
              El rol se crea sin permisos para tu empresa. Después de crearlo eliges a qué módulos tiene acceso.
            </p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="nuevoRolOpen = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-brand-900 text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
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
    >
      <div class="w-full max-w-lg rounded-base bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <span class="inline-flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="rolTono(detalle).suave">
              <Pen class="w-5 h-5" />
            </span>
            <h3 class="text-lg font-semibold text-heading dark:text-white">Editar rol</h3>
          </span>
          <button
            type="button"
            class="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Cerrar"
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
              <label for="rol-editar-nombre" class="block mb-1 text-sm font-medium text-heading dark:text-white">Nombre del rol</label>
              <input
                id="rol-editar-nombre"
                v-model="editarRol.nombre"
                type="text"
                class="w-full rounded-base border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-heading focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
            </div>
            <div>
              <label for="rol-editar-descripcion" class="block mb-1 text-sm font-medium text-heading dark:text-white">Descripción</label>
              <textarea
                id="rol-editar-descripcion"
                v-model="editarRol.descripcion"
                rows="3"
                class="w-full rounded-base border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-heading focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              ></textarea>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-heading cursor-pointer dark:text-white">
              <input
                v-model="editarRol.is_active"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              >
              Rol activo
            </label>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="editarRolOpen = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-base bg-brand-900 text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
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
</template>
