import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpresaView from './components/EmpresaView.vue';
import TalleresView from './components/TalleresView.vue';
import RolesView from './components/RolesView.vue';

export function mountEmpresaConfig(element, pinia = createPinia()) {
  createApp(EmpresaView).use(pinia).mount(element);
}

export function mountTalleresConfig(element, pinia = createPinia()) {
  createApp(TalleresView).use(pinia).mount(element);
}

export function mountRoles(element, pinia = createPinia()) {
  createApp(RolesView).use(pinia).mount(element);
}