import './style.css';
import 'flowbite/dist/flowbite.js';
import './sidebar';
import './charts';
import './dark-mode';
import { mountLogin, mountRegister } from './modules/auth';
import { mountClients, mountClientEdit } from './modules/clientes';
import { mountVehicles, mountVehicleEdit } from './modules/vehiculos';
import { mountRecepciones, mountRecepcionDetail, mountRecepcionEdit } from './modules/recepciones';
import { mountProfileEdit } from './modules/auth';
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

const vehiclesApp = document.getElementById('vehicles-app');

if (vehiclesApp) {
  mountVehicles(vehiclesApp, pinia);
}

const vehicleEditApp = document.getElementById('vehicle-edit-app');

if (vehicleEditApp) {
  mountVehicleEdit(vehicleEditApp, pinia);
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

const userMenuApp = document.getElementById('user-menu-app');

if (userMenuApp) {
    createApp(UserMenu).use(pinia).mount(userMenuApp);
}

const profileEditApp = document.getElementById('profile-edit-app');

if (profileEditApp) {
    mountProfileEdit(profileEditApp, pinia);
}
