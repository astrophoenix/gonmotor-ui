import './style.css';
import 'flowbite/dist/flowbite.js';
import './sidebar';
import './charts';
import './dark-mode';
import { mountLogin, mountRegister } from './modules/auth';
import { mountClients, mountClientEdit, mountClientDetail } from './modules/clientes';
import { mountProveedores, mountProveedorEdit, mountProveedorDetail } from './modules/proveedores';
import { mountVehicles, mountVehicleEdit, mountVehicleDetail } from './modules/vehiculos';
import { mountRecepciones, mountRecepcionDetail, mountRecepcionEdit } from './modules/recepciones';
import { mountInspecciones, mountInspeccionEdit, mountInspeccionDetail } from './modules/inspecciones';
import { mountCotizaciones, mountCotizacionEdit, mountCotizacionDetail } from './modules/cotizaciones';
import { mountOrdenes, mountOrdenDetail, mountOrdenEdit } from './modules/ordenes';
import { mountCitas } from './modules/citas';
import { mountCalendario } from './modules/calendario';
import { mountEmpleados, mountEmpleadoDetail } from './modules/empleados';
import { mountUsuarios } from './modules/usuarios';
import { mountRepuestos } from './modules/inventario/repuestos';
import { mountServicios } from './modules/inventario/servicios';
import { mountProfileEdit } from './modules/auth';
import { mountEmpresaConfig, mountTalleresConfig, mountRoles } from './modules/configuracion';
import { mountNotificaciones } from './modules/notificaciones';
import { mountDashboard } from './modules/dashboard';
import { mountDashboardV2 } from './modules/dashboard-v2';
import UserMenu from './shared/components/UserMenu.vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';

// Have the courage to follow your heart and intuition.


if (document.getElementById("default-table") && typeof simpleDatatables.DataTable !== 'undefined') {
    const dataTable = new simpleDatatables.DataTable("#default-table", {
        searchable: false,
        perPageSelect: false
    });
}

const pinia = createPinia();

const dashboardApp = document.getElementById('dashboard-app');

if (dashboardApp) {
  mountDashboard(dashboardApp, pinia);
}

const dashboardV2App = document.getElementById('dashboard-v2-app');

if (dashboardV2App) {
  mountDashboardV2(dashboardV2App, pinia);
}

const loginApp = document.getElementById('login-app');

if (loginApp) {
    mountLogin(loginApp, pinia);
}

const registerApp = document.getElementById('register-app');

if (registerApp) {
    mountRegister(registerApp, pinia);
}

const clientsApp = document.getElementById('clients-app');

if (clientsApp) {
    mountClients(clientsApp, pinia);
}

const clientEditApp = document.getElementById('client-edit-app');

if (clientEditApp) {
  mountClientEdit(clientEditApp, pinia);
}

const clientDetailApp = document.getElementById('client-detail-app');

if (clientDetailApp) {
  mountClientDetail(clientDetailApp, pinia);
}

const proveedoresApp = document.getElementById('proveedores-app');

if (proveedoresApp) {
  mountProveedores(proveedoresApp, pinia);
}

const proveedorEditApp = document.getElementById('proveedor-edit-app');

if (proveedorEditApp) {
  mountProveedorEdit(proveedorEditApp, pinia);
}

const proveedorDetailApp = document.getElementById('proveedor-detail-app');

if (proveedorDetailApp) {
  mountProveedorDetail(proveedorDetailApp, pinia);
}

const vehiclesApp = document.getElementById('vehicles-app');

if (vehiclesApp) {
  mountVehicles(vehiclesApp, pinia);
}

const vehicleEditApp = document.getElementById('vehicle-edit-app');

if (vehicleEditApp) {
  mountVehicleEdit(vehicleEditApp, pinia);
}

const vehicleDetailApp = document.getElementById('vehicle-ver-app');

if (vehicleDetailApp) {
  mountVehicleDetail(vehicleDetailApp, pinia);
}

const recepcionesApp = document.getElementById('recepciones-app');

if (recepcionesApp) {
  mountRecepciones(recepcionesApp, pinia);
}

const recepcionDetailApp = document.getElementById('recepcion-detail-app');

if (recepcionDetailApp) {
  mountRecepcionDetail(recepcionDetailApp, pinia);
}

const recepcionEditApp = document.getElementById('recepcion-edit-app');

if (recepcionEditApp) {
  mountRecepcionEdit(recepcionEditApp, pinia);
}

const inspeccionesApp = document.getElementById('inspecciones-app');

if (inspeccionesApp) {
  mountInspecciones(inspeccionesApp, pinia);
}

const inspeccionEditApp = document.getElementById('inspeccion-edit-app');

if (inspeccionEditApp) {
  mountInspeccionEdit(inspeccionEditApp, pinia);
}

const inspeccionDetailApp = document.getElementById('inspeccion-detail-app');

if (inspeccionDetailApp) {
  mountInspeccionDetail(inspeccionDetailApp, pinia);
}

const cotizacionesApp = document.getElementById('cotizaciones-app');

if (cotizacionesApp) {
  mountCotizaciones(cotizacionesApp, pinia);
}

const cotizacionEditApp = document.getElementById('cotizacion-edit-app');

if (cotizacionEditApp) {
  mountCotizacionEdit(cotizacionEditApp, pinia);
}

const cotizacionDetailApp = document.getElementById('cotizacion-detail-app');

if (cotizacionDetailApp) {
  mountCotizacionDetail(cotizacionDetailApp, pinia);
}

const ordenesApp = document.getElementById('ordenes-app');

if (ordenesApp) {
  mountOrdenes(ordenesApp, pinia);
}

const ordenDetailApp = document.getElementById('orden-detail-app');

if (ordenDetailApp) {
  mountOrdenDetail(ordenDetailApp, pinia);
}

const ordenEditApp = document.getElementById('orden-edit-app');

if (ordenEditApp) {
  mountOrdenEdit(ordenEditApp, pinia);
}

const userMenuApp = document.getElementById('user-menu-app');

if (userMenuApp) {
    createApp(UserMenu).use(pinia).mount(userMenuApp);
}

const citasApp = document.getElementById('citas-app');

if (citasApp) {
  mountCitas(citasApp, pinia);
}

const calendarioApp = document.getElementById('calendario-app');

if (calendarioApp) {
  mountCalendario(calendarioApp, pinia);
}

const profileEditApp = document.getElementById('profile-edit-app');

if (profileEditApp) {
    mountProfileEdit(profileEditApp, pinia);
}

const empleadosApp = document.getElementById('empleados-app');

if (empleadosApp) {
    mountEmpleados(empleadosApp, pinia);
}

const empleadoDetailApp = document.getElementById('empleado-detail-app');

if (empleadoDetailApp) {
    mountEmpleadoDetail(empleadoDetailApp, pinia);
}

const empresaConfigApp = document.getElementById('empresa-config-app');

if (empresaConfigApp) {
    mountEmpresaConfig(empresaConfigApp, pinia);
}

const talleresConfigApp = document.getElementById('talleres-config-app');

if (talleresConfigApp) {
    mountTalleresConfig(talleresConfigApp, pinia);
}

const rolesApp = document.getElementById('roles-app');

if (rolesApp) {
    mountRoles(rolesApp, pinia);
}

const usuariosApp = document.getElementById('usuarios-app');

if (usuariosApp) {
    mountUsuarios(usuariosApp, pinia);
}

const repuestosApp = document.getElementById('repuestos-app');

if (repuestosApp) {
  mountRepuestos(repuestosApp, pinia);
}

const serviciosApp = document.getElementById('servicios-app');

if (serviciosApp) {
  mountServicios(serviciosApp, pinia);
}

const notificacionesApp = document.getElementById('notificaciones-app');

if (notificacionesApp) {
  mountNotificaciones(notificacionesApp, pinia);
}
