import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpresaView from './components/EmpresaView.vue';
import SucursalesView from './components/SucursalesView.vue';

export function mountEmpresaConfig(element, pinia = createPinia()) {
  createApp(EmpresaView).use(pinia).mount(element);
}

export function mountSucursalesConfig(element, pinia = createPinia()) {
  createApp(SucursalesView).use(pinia).mount(element);
}